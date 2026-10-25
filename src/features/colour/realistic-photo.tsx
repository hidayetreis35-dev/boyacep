import {
  AlphaType,
  Canvas,
  Circle,
  ColorType,
  Group,
  Image as SkiaImage,
  ImageShader,
  Path,
  Rect,
  Shader,
  Skia,
  useImage,
  type SkImage,
} from '@shopify/react-native-skia';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, View } from 'react-native';

import type { PhotoSurface, WallOutline } from '@/lib/database.types';
import { radius, usePalette } from '@/ui/theme';

import { isUsableOutline } from './outline';
import { CORNER_LABEL, pressPoint, TAP_LABEL, type PhotoStageProps } from './photo-stage-types';
import { hexToLab, maskToRgba, meanLightness, polygonMask, selectRegion, toLabImage, workingSize, type LabImage } from './recolour';

/**
 * Recolours the selected pixels keeping the photo's light and shade: the
 * paint's hue and saturation, with each pixel's lightness moved relative to
 * the wall's average. Same rule as `recolourPixel` in recolour.ts.
 */
const RECOLOUR = Skia.RuntimeEffect.Make(`
uniform shader photo;
uniform shader mask;
uniform float3 paintLab;
uniform float wallL;
uniform float amount;
uniform float preview;
uniform float3 highlight;

float toLin(float c) { return c <= 0.04045 ? c / 12.92 : pow((c + 0.055) / 1.055, 2.4); }
float fromLin(float v) { return v <= 0.0031308 ? v * 12.92 : 1.055 * pow(v, 1.0 / 2.4) - 0.055; }
float fLab(float t) { return t > 0.008856 ? pow(t, 1.0 / 3.0) : 7.787037 * t + 16.0 / 116.0; }
float fInv(float t) { float t3 = t * t * t; return t3 > 0.008856 ? t3 : (116.0 * t - 16.0) / 903.3; }

half4 main(float2 xy) {
  float m = mask.eval(xy).a;
  if (m < 0.004) { return half4(0.0); }
  if (preview > 0.5) { float p = 0.5 * m; return half4(half3(highlight) * p, p); }
  half4 c = photo.eval(xy);
  float Y = dot(float3(toLin(c.r), toLin(c.g), toLin(c.b)), float3(0.2126729, 0.7151522, 0.0721750));
  float L = 116.0 * fLab(Y) - 16.0;
  float dev = L - wallL;
  float outL;
  if (paintLab.x <= wallL) {
    outL = L * (paintLab.x / max(1.0, wallL));
  } else {
    outL = paintLab.x + (dev > 0.0 ? dev * min(1.0, (100.0 - paintLab.x) / max(1.0, 100.0 - wallL)) : dev);
  }
  outL = clamp(outL, 0.0, 100.0);
  float fy = (outL + 16.0) / 116.0;
  float3 xyz = float3(fInv(fy + paintLab.y / 500.0) * 0.95047, fInv(fy), fInv(fy - paintLab.z / 200.0) * 1.08883);
  float3 lin = clamp(float3(
    3.2404542 * xyz.x - 1.5371385 * xyz.y - 0.4985314 * xyz.z,
    -0.9692660 * xyz.x + 1.8760108 * xyz.y + 0.0415560 * xyz.z,
    0.0556434 * xyz.x - 0.2040259 * xyz.y + 1.0572252 * xyz.z), 0.0, 1.0);
  float3 rgb = float3(fromLin(lin.r), fromLin(lin.g), fromLin(lin.b));
  float a = m * amount;
  return half4(half3(rgb) * a, a);
}
`)!;

/** The photo shrunk to the working size, as Lab pixels for selecting. */
function useWorkingCopy(image: SkImage | null): LabImage | null {
  return useMemo(() => {
    if (!image) return null;
    const size = workingSize(image.width(), image.height());
    const surface = Skia.Surface.Make(size.width, size.height);
    if (!surface) return null;
    surface
      .getCanvas()
      .drawImageRect(image, Skia.XYWHRect(0, 0, image.width(), image.height()), Skia.XYWHRect(0, 0, size.width, size.height), Skia.Paint());
    surface.flush();
    const pixels = surface.makeImageSnapshot().readPixels(0, 0, {
      width: size.width,
      height: size.height,
      colorType: ColorType.RGBA_8888,
      alphaType: AlphaType.Unpremul,
    });
    if (!pixels || pixels instanceof Float32Array) return null;
    return toLabImage(pixels, size.width, size.height);
  }, [image]);
}

type Geometry = { points: WallOutline; seeds?: WallOutline; tolerance?: number };

function maskOf(img: LabImage, g: Geometry): Uint8Array {
  if (g.seeds && g.seeds.length > 0) return selectRegion(img, { seeds: g.seeds, tolerance: g.tolerance ?? 15 });
  return polygonMask(g.points, img.width, img.height);
}

function useMask(img: LabImage | null, g: Geometry): { image: SkImage; wallL: number } | null {
  const key = JSON.stringify([g.points, g.seeds ?? null, g.tolerance ?? null]);
  return useMemo(() => {
    if (!img) return null;
    const geometry = JSON.parse(key) as [WallOutline, WallOutline | null, number | null];
    const mask = maskOf(img, { points: geometry[0], seeds: geometry[1] ?? undefined, tolerance: geometry[2] ?? undefined });
    const data = Skia.Data.fromBytes(maskToRgba(mask));
    const image = Skia.Image.MakeImage(
      { width: img.width, height: img.height, colorType: ColorType.RGBA_8888, alphaType: AlphaType.Unpremul },
      data,
      img.width * 4,
    );
    return image ? { image, wallL: meanLightness(img, mask) } : null;
  }, [img, key]);
}

function Layer({
  photo,
  img,
  geometry,
  width,
  height,
  hex,
  amount,
  preview,
  highlight,
}: {
  photo: SkImage;
  img: LabImage;
  geometry: Geometry;
  width: number;
  height: number;
  hex: string | null;
  amount: number;
  preview: boolean;
  highlight: string;
}) {
  const mask = useMask(img, geometry);
  if (!mask || (!hex && !preview)) return null;
  const paint = hexToLab(hex ?? '#808080');
  const h = parseInt(highlight.slice(1), 16);
  return (
    <Rect x={0} y={0} width={width} height={height}>
      <Shader
        source={RECOLOUR}
        uniforms={{
          paintLab: paint,
          wallL: mask.wallL,
          amount,
          preview: preview ? 1 : 0,
          highlight: [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255],
        }}>
        <ImageShader image={photo} fit="fill" rect={{ x: 0, y: 0, width, height }} />
        <ImageShader image={mask.image} fit="fill" rect={{ x: 0, y: 0, width, height }} />
      </Shader>
    </Rect>
  );
}

/** SVG path text for an outline drawn at the given size. */
function outlinePath(points: WallOutline, width: number, height: number, close: boolean): string {
  const d = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${(x * width).toFixed(1)} ${(y * height).toFixed(1)}`).join(' ');
  return close ? `${d} Z` : d;
}

/** Realistic preview drawn with Skia; works on phone (Expo Go) and web. */
export default function RealisticPhoto({ uri, aspect, surfaces, active, draft, drawing, showColour, amount, onTap }: PhotoStageProps) {
  const p = usePalette();
  const photo = useImage(uri);
  const img = useWorkingCopy(photo);
  const [width, setWidth] = useState(0);
  const height = width > 0 ? width / aspect : 0;
  const ready = !!photo && !!img && width > 0;

  const label = drawing ? (draft.mode === 'tap' ? TAP_LABEL : CORNER_LABEL) : 'Oda fotoğrafı ve renk önizlemesi';
  const activeSurface: PhotoSurface | undefined = surfaces[active];

  return (
    <View
      testID="wall-canvas"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ width: '100%', borderRadius: radius.lg, overflow: 'hidden', backgroundColor: p.surfaceMuted }}>
      {width > 0 ? (
        <Pressable
          onPress={(e) => {
            if (!drawing) return;
            const pt = pressPoint(e, width, height);
            if (pt) onTap(pt);
          }}
          disabled={!drawing}
          accessibilityRole={drawing ? 'button' : 'image'}
          accessibilityLabel={label}
          style={{ width, height }}>
          {ready ? (
            <Canvas style={{ width, height }} pointerEvents="none">
              <SkiaImage image={photo} x={0} y={0} width={width} height={height} fit="fill" />
              {showColour
                ? surfaces.map((s, i) =>
                    drawing && i === active ? null : (
                      <Layer
                        key={`${i}-${s.label}`}
                        photo={photo}
                        img={img}
                        geometry={s}
                        width={width}
                        height={height}
                        hex={s.hex}
                        amount={amount}
                        preview={false}
                        highlight={p.cta}
                      />
                    ),
                  )
                : null}
              {drawing && draft.mode === 'tap' && draft.points.length > 0 ? (
                <Layer
                  photo={photo}
                  img={img}
                  geometry={{ points: [], seeds: draft.points, tolerance: draft.tolerance }}
                  width={width}
                  height={height}
                  hex={null}
                  amount={1}
                  preview
                  highlight={p.cta}
                />
              ) : null}
              {drawing && draft.mode === 'corners' && draft.points.length > 1 ? (
                <Path
                  path={outlinePath(draft.points, width, height, isUsableOutline(draft.points))}
                  style="stroke"
                  strokeWidth={2}
                  color="#FFFFFF"
                />
              ) : null}
              {drawing
                ? draft.points.map(([x, y], i) => (
                    <Group key={i}>
                      <Circle cx={x * width} cy={y * height} r={8} color={i === 0 || draft.mode === 'tap' ? p.cta : p.primary} />
                      <Circle cx={x * width} cy={y * height} r={8} color="#FFFFFF" style="stroke" strokeWidth={2} />
                    </Group>
                  ))
                : null}
              {!drawing && activeSurface && !activeSurface.seeds?.length && isUsableOutline(activeSurface.points) ? (
                <Path path={outlinePath(activeSurface.points, width, height, true)} style="stroke" strokeWidth={2} color="#FFFFFF" />
              ) : null}
            </Canvas>
          ) : (
            <View style={{ width, height }}>
              <Image source={{ uri }} style={{ width, height }} resizeMode="cover" />
              <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color="#FFFFFF" />
              </View>
            </View>
          )}
        </Pressable>
      ) : (
        <View style={{ aspectRatio: aspect }} />
      )}
    </View>
  );
}
