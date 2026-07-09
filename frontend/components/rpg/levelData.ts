// Level geometry for the Food Adventure dungeon crawler.
// A top-down layout (X = horizontal, Z = depth) of two rooms joined by a
// corridor, expressed as axis-aligned boxes so it doubles as collision data.

export interface Box {
  x: number; // center X
  z: number; // center Z
  w: number; // size along X
  d: number; // size along Z
}

export const WALL_HEIGHT = 2.6;
export const EYE = 1.5; // camera/player eye height
export const PLAYER_RADIUS = 0.35;

// ── Floors (rendered as planes; also mark walkable space) ────────────────────
export const FLOORS: Box[] = [
  { x: 0, z: 0, w: 10, d: 10 }, // Kitchen (Room A)
  { x: 0, z: 8, w: 3, d: 6 }, // Corridor
  { x: 0, z: 16, w: 10, d: 10 }, // Pantry (Room B)
];

// ── Walls (rendered as boxes; used for collision) ────────────────────────────
export const WALLS: Box[] = [
  // Kitchen perimeter — doorway gap on the north side (x in [-1.5, 1.5])
  { x: 0, z: -5, w: 10.3, d: 0.3 }, // south
  { x: -3.25, z: 5, w: 3.5, d: 0.3 }, // north-left
  { x: 3.25, z: 5, w: 3.5, d: 0.3 }, // north-right
  { x: -5, z: 0, w: 0.3, d: 10.3 }, // west
  { x: 5, z: 0, w: 0.3, d: 10.3 }, // east

  // Corridor sides
  { x: -1.5, z: 8, w: 0.3, d: 6 },
  { x: 1.5, z: 8, w: 0.3, d: 6 },

  // Pantry perimeter — doorway gap on the south side
  { x: -3.25, z: 11, w: 3.5, d: 0.3 }, // south-left
  { x: 3.25, z: 11, w: 3.5, d: 0.3 }, // south-right
  { x: 0, z: 21, w: 10.3, d: 0.3 }, // north
  { x: -5, z: 16, w: 0.3, d: 10.3 }, // west
  { x: 5, z: 16, w: 0.3, d: 10.3 }, // east
];

// ── Entities ─────────────────────────────────────────────────────────────────
export const PLAYER_START = { x: 0, z: -3.5, yaw: Math.PI }; // yaw=PI faces +Z (toward pantry)
export const CHEF = { x: 0, z: 2.5 };
export const LADLE = { x: 0, z: 18 };
export const INTERACT_RADIUS = 2.2;

// Circle-vs-AABB test (Minkowski-expanded): is a player of `radius` at (x,z)
// intersecting any wall?
export function collides(x: number, z: number, radius: number = PLAYER_RADIUS): boolean {
  for (const w of WALLS) {
    const minX = w.x - w.w / 2 - radius;
    const maxX = w.x + w.w / 2 + radius;
    const minZ = w.z - w.d / 2 - radius;
    const maxZ = w.z + w.d / 2 + radius;
    if (x > minX && x < maxX && z > minZ && z < maxZ) return true;
  }
  return false;
}
