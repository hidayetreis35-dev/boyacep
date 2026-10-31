import { boundsOf, onQuad, pathOf, roomScene, SAMPLE_ROOM, spreadAlong, VIEW, type RoomScene, type SceneInput } from '../room-geometry';

const openings = { doors: { count: 1, width: 0.9, height: 2.1 }, windows: { count: 1, width: 1.2, height: 1.4 } };
const room = (length: number, width: number, height = 2.6, extra: Partial<SceneInput> = {}): RoomScene =>
  roomScene({ length, width, height, ...openings, ...extra });

function allPoints(s: RoomScene) {
  return [
    s.floor,
    s.slabLeft,
    s.slabRight,
    s.leftWall,
    s.rightWall,
    s.leftEnd,
    s.rightEnd,
    s.leftTop,
    s.rightTop,
    s.ceiling,
    s.ceilingEdge,
    s.ceilingSide,
    ...s.doors,
    ...s.windows,
  ].flat();
}

describe('roomScene', () => {
  it('draws a sample room until the measurements make sense', () => {
    for (const s of [room(NaN, 3), room(0, 3), room(4, 3, 0), room(60, 3)]) {
      expect(s.measured).toBe(false);
      expect(s.room).toEqual(SAMPLE_ROOM);
    }
    expect(room(4, 3).measured).toBe(true);
    expect(room(4, 3).room).toEqual({ length: 4, width: 3, height: 2.6 });
  });

  it('keeps every room, tiny or huge, inside the drawing', () => {
    for (const s of [room(1, 1, 2), room(4, 3.5), room(30, 2, 5), room(45, 45, 9)]) {
      const box = boundsOf(allPoints(s));
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(VIEW.width);
      expect(box.y + box.height).toBeLessThanOrEqual(VIEW.height);
    }
  });

  it('grows with the room up to a large room, then shrinks big rooms to fit', () => {
    const floorWidth = (s: RoomScene) => boundsOf(s.floor).width;
    expect(floorWidth(room(2.5, 2.5))).toBeLessThan(floorWidth(room(3, 3)));
    expect(floorWidth(room(3, 3))).toBeLessThan(floorWidth(room(4, 4)));
    expect(room(2.5, 2.5).transform.scale).toBe(room(4, 4).transform.scale);
    expect(room(8, 8).transform.scale).toBeLessThan(room(4, 4).transform.scale);
  });

  it('puts doors on the left wall and windows on the right one, only as many as fit', () => {
    const s = room(4, 3, 2.6, { doors: { count: 2, width: 0.9, height: 2.1 }, windows: { count: 10, width: 1.2, height: 1.4 } });
    expect(s.doors).toHaveLength(2);
    expect(s.windows).toHaveLength(2);
    expect(s.hidden).toEqual({ doors: 0, windows: 8 });
    expect(room(4, 3, 2.6, { doors: { count: 0, width: 0.9, height: 2.1 } }).doors).toHaveLength(0);
  });

  it('swings the ceiling open above the walls, so it never hides them', () => {
    const s = room(4, 3.5);
    const walls = boundsOf([...s.leftWall, ...s.rightWall]);
    const lid = boundsOf(s.ceiling);
    // The lid hangs from the top of the right-hand wall and rises from there.
    expect(s.ceiling[0]).toEqual(s.rightWall[3]);
    expect(s.ceiling[1]).toEqual(s.rightWall[2]);
    expect(lid.y).toBeLessThan(walls.y);
  });

  it('keeps doors and windows under the ceiling and falls back to standard sizes', () => {
    const low = room(4, 3, 2, { doors: { count: 1, width: NaN, height: 3 }, windows: { count: 1, width: 1.2, height: 2.5 } });
    const wall = boundsOf(low.leftWall);
    const door = boundsOf(low.doors[0]);
    expect(door.y).toBeGreaterThan(wall.y);
    const right = boundsOf(low.rightWall);
    const win = boundsOf(low.windows[0]);
    expect(win.y).toBeGreaterThan(right.y);
    expect(win.y + win.height).toBeLessThan(right.y + right.height);
  });
});

describe('spreadAlong', () => {
  it('centres one opening and spaces several evenly', () => {
    expect(spreadAlong(3.5, 0.9, 1)).toEqual([1.3]);
    expect(spreadAlong(4, 1, 2)).toEqual([0.5, 2.5]);
    expect(spreadAlong(1, 0.9, 1)).toEqual([]);
  });
});

describe('drawing helpers', () => {
  const q = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ] as const;

  it('finds points on a face and writes SVG paths', () => {
    expect(onQuad(q, 0, 0)).toEqual({ x: 0, y: 0 });
    expect(onQuad(q, 0.5, 1)).toEqual({ x: 5, y: 10 });
    expect(pathOf(q)).toBe('M0 0 L10 0 L10 10 L0 10 Z');
    expect(boundsOf(q, 1)).toEqual({ x: -1, y: -1, width: 12, height: 12 });
  });
});
