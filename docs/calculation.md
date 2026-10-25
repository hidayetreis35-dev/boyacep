# Paint calculation rules

Source: `src/engine/`. Tests: `src/engine/__tests__/engine.test.ts`.

The engine is deterministic: the same input always gives the same output, and no AI is involved.

## Areas

| Value | Formula |
| --- | --- |
| Perimeter | 2 × (length + width) |
| Gross wall | perimeter × ceiling height |
| Door / window deduction | width × height × count, summed |
| Net wall | gross wall − deductions (0 when walls are not painted) |
| Ceiling | length × width (0 when the ceiling is not painted) |

Validation rejects: non-positive or absurd dimensions (side > 50 m, height > 10 m), coats outside 1–4, openings taller than the ceiling, openings larger than the walls, and a room with neither walls nor ceiling selected.

## Paint

```
litres = (area × coats / spreadRate + area × (absorption − 1) / spreadRate) × (1 + waste)
```

- `spreadRate`: m² per litre for one coat. Manufacturer or user value when given, else 10 m²/L (estimate).
- `absorption`: extra paint on the first coat for absorbent surfaces. Painted 1.00, plasterboard 1.05, new plaster 1.15, concrete 1.20 (estimates).
- `waste`: 10 % (estimate).
- Primer is recommended for new plaster, plasterboard, concrete, or any surface in poor condition: total area / 10 m²/L × 1.1.

## Cans

`planPackages` finds the can combination with the least leftover, then the fewest cans (exact search). Default sizes 15, 7.5 and 2.5 L.

## Materials (all estimates)

| Item | Rule |
| --- | --- |
| Filler | 0.1 kg/m² for minor repair, 0.5 kg/m² for poor walls |
| Sandpaper | 1 sheet per 10 m² of repaired area |
| Roller + tray, corner brush | 1 each, 2 above 100 m² |
| Masking tape | floor and ceiling lines + opening edges, 25 m rolls |
| Drop sheet | floor area / 20 m² |

## Quick estimate (whole home)

Wall area = net floor area × factor by home type: 1+0 2.3, 1+1 2.4, 2+1 2.6, 3+1 2.8, 4+1 3.0, 5+1 3.2, 6+1 3.4. Ceilings = floor area.

**Open item:** these factors, the absorption values and the filler rates are draft values that still need a professional painter's check.
