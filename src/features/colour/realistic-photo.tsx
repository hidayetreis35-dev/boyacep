import { PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans/700Bold';
import {
  AlphaType,
  Canvas,
  Circle,
  ColorType,
  FilterMode,
  Group,
  ImageFormat,
  Image as SkiaImage,
  ImageShader,
  MipmapMode,
  Path,
  processUniforms,
  Rect,
  Shader,
  Skia,
  TileMode,
  useImage,
  useTypeface,
  type SkCanvas,
  type SkImage,
  type SkTypeface,
} from '@shopify/react-native-skia';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, View } from 'react-native';

import { t } from '@/i18n';
import type { PhotoSurface, WallOutline } from '@/lib/database.types';
import { radius, usePalette } from '@/ui/theme';

import { isUsableOutline } from './outline';
import { pressPoint, stageLabel, type PhotoCaption, type PhotoStageProps } from './photo-stage-types';
import {
  DARKER_WEIGHT,
  DEFAULT_TOLERANCE,
  edgeMap,
  hexToLab,
  HIGHLIGHT_KNEE,
  LIGHTER_WEIGHT,
  maskToRgba,
  meanLab,
  photoWhite,
  polygonMask,
  sampleColour,
  selectRegion,
  TINT,
  toLabImage,
  workingSize,
  type Lab,
  type LabImage,
} from './recolour';

const float = (v: number) => v.toFixed(3);

/**
 * Recolours the selected pixels keeping the photo's light, shade and tint.
 * Same rule as `recolourPixel` in recolour.ts. On the soft edge of the mask it
 * decides pixel by pixel, at full resolution, whether the colour still matches
 * the surface, so the paint stops on the real edge of a frame or a sofa.
 */
const RECOLOUR = Skia.RuntimeEffect.Make(`
uniform shader photo;
uniform shader mask;
uniform float3 swatchLab;
uniform float white;
uniform float3 wallLab;
uniform float tolerance;
uniform float amount;
uniform float preview;
uniform float3 highlight;

float toLin(float c) { return c <= 0.04045 ? c / 12.92 : pow((c + 0.055) / 1.055, 2.4); }
float fromLin(float v) { return v <= 0.0031308 ? v * 12.92 : 1.055 * pow(v, 1.0 / 2.4) - 0.055; }
float fLab(float t) { return t > 0.008856 ? pow(t, 1.0 / 3.0) : 7.787037 * t + 16.0 / 116.0; }
float fInv(float t) { float t3 = t * t * t; return t3 > 0.008856 ? t3 : (116.0 * t - 16.0) / 903.3; }

half4 main(float2 xy) {
  half4 mk = mask.eval(xy);
  float m = mk.a;
  if (m < 0.004) { return half4(0.0); }
  // Red (premultiplied) marks real edges; elsewhere the mask fades out on purpose and stays soft.
  float sharp = mk.r / m;
  half4 c = photo.eval(xy);
  float3 lin = float3(toLin(c.r), toLin(c.g), toLin(c.b));
  float fx = fLab(dot(lin, float3(0.4124564, 0.3575761, 0.1804375)) / 0.95047);
  float fy = fLab(dot(lin, float3(0.2126729, 0.7151522, 0.0721750)));
  float fz = fLab(dot(lin, float3(0.0193339, 0.1191920, 0.9503041)) / 1.08883);
  float3 lab = float3(116.0 * fy - 16.0, 500.0 * (fx - fy), 200.0 * (fy - fz));

  if (tolerance > 0.0 && m < 0.996 && sharp > 0.5) {
    float s = clamp((wallLab.x + 16.0) / (lab.x + 16.0), 0.67, 1.5);
    float wL = lab.x < wallLab.x ? ${float(DARKER_WEIGHT)} : ${float(LIGHTER_WEIGHT)};
    float d = length(float3((lab.x - wallLab.x) * wL, lab.y * s - wallLab.y, lab.z * s - wallLab.z));
    m = (1.0 - smoothstep(tolerance * 0.7, tolerance * 1.3, d)) * smoothstep(0.1, 0.9, m);
    if (m < 0.004) { return half4(0.0); }
  }
  if (preview > 0.5) { float p = 0.5 * m; return half4(half3(highlight) * p, p); }

  float k = (white + 16.0) / 116.0;
  float3 paintLab = float3((swatchLab.x + 16.0) * k - 16.0, swatchLab.y * k, swatchLab.z * k);

  float knee = max(${float(HIGHLIGHT_KNEE)}, paintLab.x);
  float L = (lab.x + 16.0) * ((paintLab.x + 16.0) / (wallLab.x + 16.0)) - 16.0;
  if (L > knee) { L = knee + (100.0 - knee) * (1.0 - exp(-(L - knee) / max(0.5, 100.0 - knee))); }
  L = max(L, 0.0);
  float light = (L + 16.0) / (paintLab.x + 16.0);
  float a = paintLab.y * light + (lab.y - wallLab.y) * ${float(TINT)};
  float b = paintLab.z * light + (lab.z - wallLab.z) * ${float(TINT)};

  float gy = (L + 16.0) / 116.0;
  float3 xyz = float3(fInv(gy + a / 500.0) * 0.95047, fInv(gy), fInv(gy - b / 200.0) * 1.08883);
  float3 rgbLin = clamp(float3(
    3.2404542 * xyz.x - 1.5371385 * xyz.y - 0.4985314 * xyz.z,
    -0.9692660 * xyz.x + 1.8760108 * xyz.y + 0.0415560 * xyz.z,
    0.0556434 * xyz.x - 0.2040259 * xyz.y + 1.0572252 * xyz.z), 0.0, 1.0);
  float3 rgb = float3(fromLin(rgbLin.r), fromLin(rgbLin.g), fromLin(rgbLin.b));
  float alpha = m * amount;
  return half4(half3(rgb) * alpha, alpha);
}
`)!;

const SMOOTH = { filter: FilterMode.Linear, mipmap: MipmapMode.None };

/** The photo shrunk to the working size, as Lab pixels with its edges found, for selecting. */
function useWorkingCopy(image: SkImage | null): LabImage | null {
  return useMemo(() => {
    if (!image) return null;
    const size = workingSize(image.width(), image.height());
    const surface = Skia.Surface.Make(size.width, size.height);
    if (!surface) return null;
    // Smooth downscaling, so wall texture averages out instead of turning into noise.
    surface
      .getCanvas()
      .drawImageRectOptions(
        image,
        Skia.XYWHRect(0, 0, image.width(), image.height()),
        Skia.XYWHRect(0, 0, size.width, size.height),
        FilterMode.Linear,
        MipmapMode.Linear,
        Skia.Paint(),
      );
    surface.flush();
    const pixels = surface.makeImageSnapshot().readPixels(0, 0, {
      width: size.width,
      height: size.height,
      colorType: ColorType.RGBA_8888,
      alphaType: AlphaType.Unpremul,
    });
    if (!pixels || pixels instanceof Float32Array) return null;
    const img = toLabImage(pixels, size.width, size.height);
    edgeMap(img);
    return img;
  }, [image]);
}

type Geometry = { points: WallOutline; seeds?: WallOutline; excludes?: WallOutline; tolerance?: number };

function maskOf(img: LabImage, g: Geometry): Uint8Array {
  if (g.seeds && g.seeds.length > 0) return selectRegion(img, { seeds: g.seeds, excludes: g.excludes, tolerance: g.tolerance ?? DEFAULT_TOLERANCE });
  return polygonMask(g.points, img.width, img.height);
}

type PaintMask = { image: SkImage; wall: Lab; tolerance: number };

/** A surface's mask as an image, with the photo's colour under it, at the working size. */
function paintMask(img: LabImage, g: Geometry): PaintMask | null {
  const mask = maskOf(img, g);
  const data = Skia.Data.fromBytes(maskToRgba(mask, img.width, img.height));
  const image = Skia.Image.MakeImage(
    { width: img.width, height: img.height, colorType: ColorType.RGBA_8888, alphaType: AlphaType.Unpremul },
    data,
    img.width * 4,
  );
  // Corner outlines are where the user drew them; only tapped surfaces snap to colour edges.
  const snap = g.seeds && g.seeds.length > 0 ? (g.tolerance ?? DEFAULT_TOLERANCE) : 0;
  return image ? { image, wall: meanLab(img, mask), tolerance: snap } : null;
}

function useMask(img: LabImage | null, g: Geometry): PaintMask | null {
  const key = JSON.stringify([g.points, g.seeds ?? null, g.excludes ?? null, g.tolerance ?? null]);
  return useMemo(() => {
    if (!img) return null;
    const [points, seeds, excludes, tolerance] = JSON.parse(key) as [WallOutline, WallOutline | null, WallOutline | null, number | null];
    return paintMask(img, { points, seeds: seeds ?? undefined, excludes: excludes ?? undefined, tolerance: tolerance ?? undefined });
  }, [img, key]);
}

function recolourUniforms(mask: PaintMask, hex: string | null, white: number, amount: number, preview: boolean, highlight: string) {
  const h = parseInt(highlight.slice(1), 16);
  return {
    swatchLab: hexToLab(hex ?? '#808080'),
    white,
    wallLab: mask.wall,
    tolerance: mask.tolerance,
    amount,
    preview: preview ? 1 : 0,
    highlight: [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255],
  };
}

/** Long side of the shared photo: sharp on a phone, small enough for messaging apps. */
const SHARE_SIZE = 1280;
const CAPTION_BACK = 'rgba(20, 27, 45, 0.74)';

/** A dark rounded box in the bottom-left corner: one line per painted surface, then the note in smaller type. */
function drawCaption(canvas: SkCanvas, typeface: SkTypeface, { lines, note }: PhotoCaption, width: number, height: number) {
  const size = Math.max(14, Math.round(Math.min(width, height) * 0.034));
  const big = Skia.Font(typeface, size);
  const small = Skia.Font(typeface, Math.round(size * 0.72));
  const pad = Math.round(size * 0.7);
  const rows = [...lines.map((text) => ({ text, font: big })), { text: note, font: small }];
  const metrics = rows.map(({ text, font }) => {
    const m = font.getMetrics();
    return { width: font.measureText(text).width, ascent: -m.ascent, height: m.descent - m.ascent };
  });
  const boxWidth = Math.min(width - 2 * pad, Math.max(...metrics.map((m) => m.width)) + 2 * pad);
  const boxHeight = metrics.reduce((sum, m) => sum + m.height, 0) + 2 * pad;
  const top = height - pad - boxHeight;
  const back = Skia.Paint();
  back.setColor(Skia.Color(CAPTION_BACK));
  canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(pad, top, boxWidth, boxHeight), pad, pad), back);
  let y = top + pad;
  rows.forEach(({ text, font }, i) => {
    const ink = Skia.Paint();
    ink.setColor(Skia.Color(i < lines.length ? '#FFFFFF' : 'rgba(255, 255, 255, 0.8)'));
    canvas.drawText(text, 2 * pad, y + metrics[i].ascent, ink, font);
    y += metrics[i].height;
  });
}

type PaintedOptions = { white: number; surfaces: PhotoSurface[]; amount: number; typeface: SkTypeface | null; caption: PhotoCaption };

/** The painted photo as a JPEG for sharing: same recolouring as the screen, without guides, with a caption. */
function renderPainted(photo: SkImage, img: LabImage, { white, surfaces, amount, typeface, caption }: PaintedOptions): Uint8Array | null {
  const scale = Math.min(1, SHARE_SIZE / Math.max(photo.width(), photo.height()));
  const width = Math.max(1, Math.round(photo.width() * scale));
  const height = Math.max(1, Math.round(photo.height() * scale));
  const surface = Skia.Surface.Make(width, height);
  if (!surface) return null;
  const canvas = surface.getCanvas();
  const all = Skia.XYWHRect(0, 0, width, height);
  canvas.drawImageRectOptions(photo, Skia.XYWHRect(0, 0, photo.width(), photo.height()), all, FilterMode.Linear, MipmapMode.Linear, Skia.Paint());
  const stretch = (w: number, h: number) => Skia.Matrix().scale(width / w, height / h);
  const photoShader = photo.makeShaderOptions(TileMode.Clamp, TileMode.Clamp, SMOOTH.filter, SMOOTH.mipmap, stretch(photo.width(), photo.height()));
  for (const s of surfaces) {
    const mask = s.hex ? paintMask(img, s) : null;
    if (!mask) continue;
    const maskShader = mask.image.makeShaderOptions(TileMode.Clamp, TileMode.Clamp, SMOOTH.filter, SMOOTH.mipmap, stretch(img.width, img.height));
    const paint = Skia.Paint();
    const uniforms = processUniforms(RECOLOUR, recolourUniforms(mask, s.hex, white, amount, false, '#000000'));
    paint.setShader(RECOLOUR.makeShaderWithChildren(uniforms, [photoShader, maskShader]));
    canvas.drawRect(all, paint);
  }
  if (typeface) drawCaption(canvas, typeface, caption, width, height);
  surface.flush();
  return surface.makeImageSnapshot().encodeToBytes(ImageFormat.JPEG, 88);
}

function Layer({
  photo,
  img,
  white,
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
  /** How light white looks in the photo (`photoWhite`). */
  white: number;
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
  return (
    <Rect x={0} y={0} width={width} height={height}>
      <Shader source={RECOLOUR} uniforms={recolourUniforms(mask, hex, white, amount, preview, highlight)}>
        <ImageShader image={photo} fit="fill" rect={{ x: 0, y: 0, width, height }} sampling={SMOOTH} />
        <ImageShader image={mask.image} fit="fill" rect={{ x: 0, y: 0, width, height }} sampling={SMOOTH} />
      </Shader>
    </Rect>
  );
}

/** SVG path text for an outline drawn at the given size. */
function outlinePath(points: WallOutline, width: number, height: number, close: boolean): string {
  const d = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${(x * width).toFixed(1)} ${(y * height).toFixed(1)}`).join(' ');
  return close ? `${d} Z` : d;
}

const REMOVE_COLOUR = '#D92D20';

/** Realistic preview drawn with Skia; works on phone (Expo Go) and web. */
export default function RealisticPhoto({
  uri,
  aspect,
  surfaces,
  active,
  draft,
  drawing: selecting,
  showColour,
  amount,
  onTap,
  picking,
  pickedAt,
  onPick,
  exportRef,
}: PhotoStageProps) {
  // While picking a colour the selection on hold stays hidden, and taps go to the picker.
  const drawing = selecting && !picking;
  const p = usePalette();
  const photo = useImage(uri);
  const img = useWorkingCopy(photo);
  const white = useMemo(() => (img ? photoWhite(img) : 100), [img]);
  const [width, setWidth] = useState(0);
  const height = width > 0 ? width / aspect : 0;
  const ready = !!photo && !!img && width > 0;
  // The caption's typeface; without it the shared photo simply has no caption.
  const typeface = useTypeface(PlusJakartaSans_700Bold);

  useEffect(() => {
    if (!exportRef) return;
    exportRef.current = photo && img ? (caption) => renderPainted(photo, img, { white, surfaces, amount, typeface, caption }) : null;
    return () => {
      exportRef.current = null;
    };
  }, [exportRef, photo, img, white, surfaces, amount, typeface]);

  const label = t(stageLabel({ picking, drawing, draft }));
  const touchable = drawing || !!picking;
  const activeSurface: PhotoSurface | undefined = surfaces[active];

  return (
    <View
      testID="wall-canvas"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ width: '100%', borderRadius: radius.lg, overflow: 'hidden', backgroundColor: p.surfaceMuted }}>
      {width > 0 ? (
        <Pressable
          onPress={(e) => {
            const pt = touchable ? pressPoint(e, width, height) : null;
            if (!pt) return;
            if (picking) {
              if (img) onPick?.(sampleColour(img, pt, white), pt);
            } else onTap(pt);
          }}
          disabled={!touchable}
          accessibilityRole={touchable ? 'button' : 'image'}
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
                        white={white}
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
                  white={white}
                  geometry={{ points: [], seeds: draft.points, excludes: draft.excludes, tolerance: draft.tolerance }}
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
                    <Group key={`p${i}`}>
                      <Circle cx={x * width} cy={y * height} r={8} color={i === 0 || draft.mode === 'tap' ? p.cta : p.primary} />
                      <Circle cx={x * width} cy={y * height} r={8} color="#FFFFFF" style="stroke" strokeWidth={2} />
                    </Group>
                  ))
                : null}
              {drawing && draft.mode === 'tap'
                ? draft.excludes.map(([x, y], i) => (
                    <Group key={`x${i}`}>
                      <Circle cx={x * width} cy={y * height} r={9} color={REMOVE_COLOUR} />
                      <Circle cx={x * width} cy={y * height} r={9} color="#FFFFFF" style="stroke" strokeWidth={2} />
                      <Path
                        path={`M${(x * width - 4).toFixed(1)} ${(y * height).toFixed(1)} L${(x * width + 4).toFixed(1)} ${(y * height).toFixed(1)}`}
                        style="stroke"
                        strokeWidth={2.5}
                        color="#FFFFFF"
                      />
                    </Group>
                  ))
                : null}
              {!drawing && !picking && activeSurface && !activeSurface.seeds?.length && isUsableOutline(activeSurface.points) ? (
                <Path path={outlinePath(activeSurface.points, width, height, true)} style="stroke" strokeWidth={2} color="#FFFFFF" />
              ) : null}
              {picking && pickedAt ? (
                <Group>
                  <Circle cx={pickedAt[0] * width} cy={pickedAt[1] * height} r={14} color="#141B2D" style="stroke" strokeWidth={5} />
                  <Circle cx={pickedAt[0] * width} cy={pickedAt[1] * height} r={14} color="#FFFFFF" style="stroke" strokeWidth={2.5} />
                </Group>
              ) : null}
            </Canvas>
          ) : (
            <View style={{ width, height }}>
              <Image source={{ uri }} style={{ width, height }} resizeMode="cover" />
              <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color="#FFFFFF" accessibilityLabel={t('Yükleniyor')} />
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
