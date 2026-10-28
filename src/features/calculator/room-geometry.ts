/**
 * Maths for the calculator's live room drawing: a cut-away "dollhouse" view
 * of a room from its front corner, drawn in isometric projection. The two
 * back walls and the floor are shown, and the ceiling is swung open on the
 * top of the right-hand wall like a box lid, so its underside (the side that
 * gets painted) faces the viewer. The two front walls are left out so the
 * user can see in.
 *
 * World axes, in metres: x runs along the room's length (the right-hand back
 * wall), y along its width (the left-hand back wall), z up. The back corner
 * is at the origin. Pure functions only, so the drawing can be unit tested.
 */

export type Pt = { x: number; y: number };
export type Quad = readonly [Pt, Pt, Pt, Pt];
export type Segment = readonly [Pt, Pt];

/** The drawing's coordinate box; the view scales it to the card's width. */
export const VIEW = { width: 340, height: 260, padX: 24, padY: 12 } as const;

/** Drawn, faded, until the user has typed valid measurements. */
export const SAMPLE_ROOM = { length: 4, width: 3.5, height: 2.6 } as const;

/** Rooms up to this size grow on screen as the numbers grow; bigger rooms shrink to fit. */
const REFERENCE_ROOM = { length: 4, width: 4, height: 2.6 } as const;

/** How far the ceiling lid is swung open, in degrees from closed. */
const LID_ANGLE = (55 * Math.PI) / 180;
const LID_COS = Math.cos(LID_ANGLE);
const LID_SIN = Math.sin(LID_ANGLE);
/** Thickness of the walls, floor slab and ceiling in the drawing, in metres. */
const WALL = 0.14;
const SLAB = 0.18;
const LID = 0.1;

const DOOR = { width: 0.9, height: 2.1 };
const WINDOW = { width: 1.2, height: 1.4, sill: 0.9 };

const COS30 = Math.cos(Math.PI / 6);

export type SceneOpenings = { count: number; width: number; height: number };

export type SceneInput = {
  length: number;
  width: number;
  height: number;
  doors: SceneOpenings;
  windows: SceneOpenings;
};

export type Transform = { scale: number; dx: number; dy: number };

export type RoomScene = {
  /** False when the measurements are missing or out of range: the drawing then shows a sample room. */
  measured: boolean;
  /** The room actually drawn, in metres. */
  room: { length: number; width: number; height: number };
  transform: Transform;
  floor: Quad;
  /** Lines between the floor boards. */
  boards: Segment[];
  /** The front edges of the floor slab. */
  slabLeft: Quad;
  slabRight: Quad;
  /** Inside faces of the two back walls: these get painted. */
  leftWall: Quad;
  rightWall: Quad;
  /** The cut ends and tops of the walls, which show their thickness. */
  leftEnd: Quad;
  rightEnd: Quad;
  leftTop: Quad;
  rightTop: Quad;
  /** The ceiling swung open: its underside (painted), its free edge and its side. */
  ceiling: Quad;
  ceilingEdge: Quad;
  ceilingSide: Quad;
  /** Doors sit on the left wall, windows on the right one; only as many as fit are drawn. */
  doors: Quad[];
  windows: Quad[];
  /** Openings counted but not drawn because the wall is full. */
  hidden: { doors: number; windows: number };
  /** Where the length, width and height labels go, in view coordinates. */
  labels: { length: Pt; width: Pt; height: Pt };
};

type Vec3 = { x: number; y: number; z: number };

function iso({ x, y, z }: Vec3): Pt {
  return { x: (x - y) * COS30, y: (x + y) * 0.5 - z };
}

function apply(t: Transform, p: Pt): Pt {
  return { x: round(p.x * t.scale + t.dx), y: round(p.y * t.scale + t.dy) };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function valid(n: number): boolean {
  return Number.isFinite(n) && n > 0;
}

/** Every outer corner of the drawing, used to fit it into the view box. */
function outline(room: { length: number; width: number; height: number }): Vec3[] {
  const { length: L, width: W, height: H } = room;
  const free = lidFree(W, H);
  return [
    { x: -WALL, y: -WALL, z: H },
    { x: L, y: -WALL, z: -SLAB },
    { x: -WALL, y: W, z: -SLAB },
    { x: L, y: W, z: -SLAB },
    { x: 0, y: free.y - LID_SIN * LID, z: free.z + LID_COS * LID },
    { x: L, y: free.y, z: free.z },
  ];
}

/** Where the lid's free edge ends up once swung open on the right-hand wall's top. */
function lidFree(width: number, height: number): { y: number; z: number } {
  return { y: width * LID_COS, z: height + width * LID_SIN };
}

function fitScale(room: { length: number; width: number; height: number }): { scale: number; minX: number; maxX: number; minY: number; maxY: number } {
  const pts = outline(room).map(iso);
  const minX = Math.min(...pts.map((p) => p.x));
  const maxX = Math.max(...pts.map((p) => p.x));
  const minY = Math.min(...pts.map((p) => p.y));
  const maxY = Math.max(...pts.map((p) => p.y));
  const scale = Math.min((VIEW.width - 2 * VIEW.padX) / (maxX - minX), (VIEW.height - 2 * VIEW.padY) / (maxY - minY));
  return { scale, minX, maxX, minY, maxY };
}

/**
 * Where to put `count` openings of `size` metres along a wall `wallLength`
 * long: evenly spaced, each with room around it. Returns the start of each
 * opening; openings that don't fit are left out.
 */
export function spreadAlong(wallLength: number, size: number, count: number): number[] {
  const fits = Math.floor(wallLength / (size + 0.4));
  const n = Math.max(0, Math.min(count, fits));
  const slot = wallLength / Math.max(n, 1);
  return Array.from({ length: n }, (_, i) => round(slot * (i + 0.5) - size / 2));
}

/**
 * The drawing for the measurements typed so far. Bad or missing numbers fall
 * back to the sample room, so the picture never breaks while the user types.
 */
export function roomScene(input: SceneInput): RoomScene {
  const measured = valid(input.length) && valid(input.width) && valid(input.height) && input.length <= 50 && input.width <= 50 && input.height <= 10;
  const room = measured
    ? { length: clamp(input.length, 1, 30), width: clamp(input.width, 1, 30), height: clamp(input.height, 2, 5) }
    : { ...SAMPLE_ROOM };
  const { length: L, width: W, height: H } = room;

  const fit = fitScale(room);
  const scale = Math.min(fit.scale, fitScale(REFERENCE_ROOM).scale);
  const transform: Transform = {
    scale,
    dx: VIEW.width / 2 - (scale * (fit.minX + fit.maxX)) / 2,
    dy: VIEW.height / 2 - (scale * (fit.minY + fit.maxY)) / 2,
  };
  const at = (x: number, y: number, z: number) => apply(transform, iso({ x, y, z }));
  const quad = (a: Vec3, b: Vec3, c: Vec3, d: Vec3): Quad => [at(a.x, a.y, a.z), at(b.x, b.y, b.z), at(c.x, c.y, c.z), at(d.x, d.y, d.z)];
  const v = (x: number, y: number, z: number): Vec3 => ({ x, y, z });

  // Boards run along the length, about 18 cm wide, never more than 16 lines.
  const boardStep = Math.max(0.18, W / 16);
  const boards: Segment[] = [];
  for (let y = boardStep; y < W - 0.05; y += boardStep) boards.push([at(0, y, 0), at(L, y, 0)]);

  // Doors on the left wall (along the width), windows on the right wall (along the length).
  const door = {
    width: valid(input.doors.width) ? clamp(input.doors.width, 0.4, 3) : DOOR.width,
    height: Math.min(valid(input.doors.height) ? clamp(input.doors.height, 1, 4) : DOOR.height, H - 0.08),
  };
  const win = {
    width: valid(input.windows.width) ? clamp(input.windows.width, 0.3, 4) : WINDOW.width,
    height: Math.min(valid(input.windows.height) ? clamp(input.windows.height, 0.3, 3) : WINDOW.height, H - 0.5),
  };
  const sill = clamp(Math.min(WINDOW.sill, H - win.height - 0.25), 0.2, WINDOW.sill);
  const doorCount = Math.max(0, Math.floor(input.doors.count));
  const windowCount = Math.max(0, Math.floor(input.windows.count));
  const doorStarts = spreadAlong(W, door.width, doorCount);
  const windowStarts = spreadAlong(L, win.width, windowCount);

  const free = lidFree(W, H);
  // The lid's thickness points away from its painted underside.
  const up = { y: -LID_SIN * LID, z: LID_COS * LID };

  return {
    measured,
    room,
    transform,
    floor: quad(v(0, 0, 0), v(L, 0, 0), v(L, W, 0), v(0, W, 0)),
    boards,
    slabLeft: quad(v(-WALL, W, 0), v(L, W, 0), v(L, W, -SLAB), v(-WALL, W, -SLAB)),
    slabRight: quad(v(L, -WALL, 0), v(L, W, 0), v(L, W, -SLAB), v(L, -WALL, -SLAB)),
    leftWall: quad(v(0, 0, 0), v(0, W, 0), v(0, W, H), v(0, 0, H)),
    rightWall: quad(v(0, 0, 0), v(L, 0, 0), v(L, 0, H), v(0, 0, H)),
    leftEnd: quad(v(-WALL, W, 0), v(0, W, 0), v(0, W, H), v(-WALL, W, H)),
    rightEnd: quad(v(L, -WALL, 0), v(L, 0, 0), v(L, 0, H), v(L, -WALL, H)),
    leftTop: quad(v(-WALL, -WALL, H), v(0, 0, H), v(0, W, H), v(-WALL, W, H)),
    rightTop: quad(v(-WALL, -WALL, H), v(L, -WALL, H), v(L, 0, H), v(0, 0, H)),
    ceiling: quad(v(0, 0, H), v(L, 0, H), v(L, free.y, free.z), v(0, free.y, free.z)),
    ceilingEdge: quad(v(0, free.y, free.z), v(L, free.y, free.z), v(L, free.y + up.y, free.z + up.z), v(0, free.y + up.y, free.z + up.z)),
    ceilingSide: quad(v(L, 0, H), v(L, free.y, free.z), v(L, free.y + up.y, free.z + up.z), v(L, up.y, H + up.z)),
    doors: doorStarts.map((y) => quad(v(0, y, 0), v(0, y + door.width, 0), v(0, y + door.width, door.height), v(0, y, door.height))),
    windows: windowStarts.map((x) =>
      quad(v(x, 0, sill), v(x + win.width, 0, sill), v(x + win.width, 0, sill + win.height), v(x, 0, sill + win.height)),
    ),
    hidden: { doors: doorCount - doorStarts.length, windows: windowCount - windowStarts.length },
    labels: {
      length: offset(at(L / 2, W, -SLAB), -12, 12),
      width: offset(at(L, W / 2, -SLAB), 12, 12),
      height: offset(at(0, W, H / 2), 24, 0),
    },
  };
}

function offset(p: Pt, dx: number, dy: number): Pt {
  return { x: round(p.x + dx), y: round(p.y + dy) };
}

/**
 * A point on a quad, `u` across from its first corner to its second and `v`
 * up from its first corner to its fourth, both from 0 to 1. Used to place
 * cracks and patches on a wall, or details on a door.
 */
export function onQuad(q: Quad, u: number, v: number): Pt {
  const [a, b, , d] = q;
  return { x: round(a.x + (b.x - a.x) * u + (d.x - a.x) * v), y: round(a.y + (b.y - a.y) * u + (d.y - a.y) * v) };
}

/** SVG path data for a closed polygon. */
export function pathOf(points: readonly Pt[]): string {
  return `M${points.map((p) => `${p.x} ${p.y}`).join(' L')} Z`;
}

/** SVG path data for an open line. */
export function lineOf(points: readonly Pt[]): string {
  return `M${points.map((p) => `${p.x} ${p.y}`).join(' L')}`;
}

/** The smallest box around some points, for positioning a piece of the drawing on its own. */
export function boundsOf(points: readonly Pt[], margin = 0): { x: number; y: number; width: number; height: number } {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const x = Math.min(...xs) - margin;
  const y = Math.min(...ys) - margin;
  return { x: round(x), y: round(y), width: round(Math.max(...xs) + margin - x), height: round(Math.max(...ys) + margin - y) };
}
