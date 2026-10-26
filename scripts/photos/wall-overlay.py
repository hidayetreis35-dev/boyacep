"""Builds the overlay that lets the app repaint the wall of a room photo.

The app draws the chosen colour, then this PNG on top. Outside the wall the
PNG is the photo itself. On the wall it is black with an alpha that follows
the wall's shading, so any colour underneath keeps the light and shadows of
the real wall.

Usage: python3 scripts/photos/wall-overlay.py <photo.jpg> <config.json> <out.webp|out.png> [preview.png]

The app's overlay is built with:
  python3 scripts/photos/wall-overlay.py assets/photos/colour-room.jpg scripts/photos/colour-room.json assets/photos/colour-room-wall.webp

The config gives seed points on the wall, the colour tolerance of the fill,
and polygons that are never wall (furniture, frames, lamps):
  {"seeds": [[x, y], ...], "tolerance": 3, "minLum": 170, "maxSat": 25,
   "exclude": [[[x, y], ...], ...], "include": [[[x, y], ...], ...],
   "match": [{"minLum": 150, "maxSat": 18, "maxWarm": 6, "area": [[x, y], ...]}]}
Each "match" rule also takes every pixel outside the excluded polygons that
looks like the wall (light, grey, not warm), optionally only inside "area".
This reaches wall seen between leaves and shadowed wall near the floor.
"""

import json
import sys
from collections import deque

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


def polygon_mask(size, polygons):
    canvas = Image.new('L', size, 0)
    draw = ImageDraw.Draw(canvas)
    for poly in polygons:
        draw.polygon([tuple(p) for p in poly], fill=255)
    return np.asarray(canvas) > 0


def grow(smooth, lum, sat, seeds, tolerance, min_lum, max_sat, blocked):
    h, w = lum.shape
    mask = np.zeros((h, w), bool)
    queue = deque()
    for x, y in seeds:
        if not blocked[y, x]:
            mask[y, x] = True
            queue.append((y, x))
    while queue:
        y, x = queue.popleft()
        here = smooth[y, x]
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not mask[ny, nx] and not blocked[ny, nx]:
                if np.abs(smooth[ny, nx] - here).max() <= tolerance and lum[ny, nx] >= min_lum and sat[ny, nx] <= max_sat:
                    mask[ny, nx] = True
                    queue.append((ny, nx))
    return mask


def main():
    photo_path, config_path, out_path = sys.argv[1:4]
    preview_path = sys.argv[4] if len(sys.argv) > 4 else None
    config = json.load(open(config_path))
    photo = Image.open(photo_path).convert('RGB')
    rgb = np.asarray(photo).astype(np.float32)
    smooth = np.asarray(photo.filter(ImageFilter.GaussianBlur(1.2))).astype(np.float32)
    lum = smooth.mean(axis=2)
    sat = smooth.max(axis=2) - smooth.min(axis=2)

    blocked = polygon_mask(photo.size, config.get('exclude', []))
    wall = grow(smooth, lum, sat, config['seeds'], config.get('tolerance', 3), config.get('minLum', 170), config.get('maxSat', 25), blocked)
    wall |= polygon_mask(photo.size, config.get('include', [])) & ~blocked
    warm = smooth[..., 0] - smooth[..., 2]
    for rule in config.get('match', []):
        looks = (lum >= rule['minLum']) & (sat <= rule['maxSat']) & (warm <= rule['maxWarm']) & ~blocked
        if 'area' in rule:
            looks &= polygon_mask(photo.size, [rule['area']])
        wall |= looks

    # Close pinholes left by JPEG noise, then soften the edge by a pixel.
    m = Image.fromarray((wall * 255).astype(np.uint8))
    m = m.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
    m = np.asarray(m).astype(np.float32) / 255

    # Shading: the brightest wall shows the colour as is, darker parts darken it.
    ref = np.percentile(lum[wall], 97) if wall.any() else 255
    shade = np.clip(1 - np.asarray(photo.convert('L').filter(ImageFilter.GaussianBlur(2))).astype(np.float32) / ref, 0, 1)

    alpha = m * shade + (1 - m)
    safe = np.where(alpha > 0, alpha, 1)
    colour = rgb * ((1 - m) / safe)[..., None]
    out = np.dstack([np.clip(colour, 0, 255), alpha * 255]).astype(np.uint8)
    overlay = Image.fromarray(out, 'RGBA')
    if out_path.endswith('.webp'):
        overlay.save(out_path, quality=85, method=6)
    else:
        overlay.save(out_path, optimize=True)

    if preview_path:
        tiles = []
        for hex_colour in ('#A3B49A', '#C46A4A', '#1F3A5F', '#F1E3C8'):
            base = Image.new('RGBA', photo.size, hex_colour)
            tiles.append(Image.alpha_composite(base, Image.open(out_path)).convert('RGB'))
        sheet = Image.new('RGB', (photo.width * 2, photo.height * 2))
        for i, tile in enumerate(tiles):
            sheet.paste(tile, ((i % 2) * photo.width, (i // 2) * photo.height))
        sheet.save(preview_path)
    print(f'wall covers {wall.mean():.0%} of the photo')


if __name__ == '__main__':
    main()
