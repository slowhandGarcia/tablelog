import { Chess } from "chess.js";

// A small, dependency-free chess engine for the offline "vs Computer" mode.
// Negamax + alpha-beta over chess.js move generation, scored with material +
// piece-square tables. Depth scales with difficulty; "easy" also plays a
// random move some of the time so it's beatable for casual players.

export type Difficulty = "easy" | "medium" | "hard";

const MATE = 1_000_000;
const INF = 1_000_000_000;

const VALUE: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

// All tables are written rank-8-first (row 0 = rank 8), from White's view —
// the same layout chess.js `.board()` returns. Black pieces mirror vertically.
// prettier-ignore
const PST: Record<string, number[]> = {
  p: [
      0,  0,  0,  0,  0,  0,  0,  0,
     50, 50, 50, 50, 50, 50, 50, 50,
     10, 10, 20, 30, 30, 20, 10, 10,
      5,  5, 10, 25, 25, 10,  5,  5,
      0,  0,  0, 20, 20,  0,  0,  0,
      5, -5,-10,  0,  0,-10, -5,  5,
      5, 10, 10,-20,-20, 10, 10,  5,
      0,  0,  0,  0,  0,  0,  0,  0,
  ],
  n: [
    -50,-40,-30,-30,-30,-30,-40,-50,
    -40,-20,  0,  0,  0,  0,-20,-40,
    -30,  0, 10, 15, 15, 10,  0,-30,
    -30,  5, 15, 20, 20, 15,  5,-30,
    -30,  0, 15, 20, 20, 15,  0,-30,
    -30,  5, 10, 15, 15, 10,  5,-30,
    -40,-20,  0,  5,  5,  0,-20,-40,
    -50,-40,-30,-30,-30,-30,-40,-50,
  ],
  b: [
    -20,-10,-10,-10,-10,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5, 10, 10,  5,  0,-10,
    -10,  5,  5, 10, 10,  5,  5,-10,
    -10,  0, 10, 10, 10, 10,  0,-10,
    -10, 10, 10, 10, 10, 10, 10,-10,
    -10,  5,  0,  0,  0,  0,  5,-10,
    -20,-10,-10,-10,-10,-10,-10,-20,
  ],
  r: [
      0,  0,  0,  0,  0,  0,  0,  0,
      5, 10, 10, 10, 10, 10, 10,  5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
     -5,  0,  0,  0,  0,  0,  0, -5,
      0,  0,  0,  5,  5,  0,  0,  0,
  ],
  q: [
    -20,-10,-10, -5, -5,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5,  5,  5,  5,  0,-10,
     -5,  0,  5,  5,  5,  5,  0, -5,
      0,  0,  5,  5,  5,  5,  0, -5,
    -10,  5,  5,  5,  5,  5,  0,-10,
    -10,  0,  5,  0,  0,  0,  0,-10,
    -20,-10,-10, -5, -5,-10,-10,-20,
  ],
  k: [
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -20,-30,-30,-40,-40,-30,-30,-20,
    -10,-20,-20,-20,-20,-20,-20,-10,
     20, 20,  0,  0,  0,  0, 20, 20,
     20, 30, 10,  0,  0, 10, 30, 20,
  ],
};

// Material + positional score from White's perspective (positive = good for White).
function evaluateWhite(chess: Chess): number {
  let score = 0;
  const board = chess.board();
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const cell = board[r][f];
      if (!cell) continue;
      const idx = r * 8 + f;
      if (cell.color === "w") score += VALUE[cell.type] + PST[cell.type][idx];
      else score -= VALUE[cell.type] + PST[cell.type][(7 - r) * 8 + f];
    }
  }
  return score;
}

interface SimpleMove {
  from: string;
  to: string;
  promotion?: string;
}

// Order captures first (and by captured-piece value) to sharpen alpha-beta pruning.
function orderMoves(moves: any[]): any[] {
  return [...moves].sort((a, b) => {
    const av = a.captured ? VALUE[a.captured] : 0;
    const bv = b.captured ? VALUE[b.captured] : 0;
    return bv - av;
  });
}

function negamax(chess: Chess, depth: number, alpha: number, beta: number): number {
  if (chess.isCheckmate()) return -MATE - depth; // side to move is mated (deeper = worse discount)
  if (chess.isDraw()) return 0;
  if (depth === 0) {
    return (chess.turn() === "w" ? 1 : -1) * evaluateWhite(chess);
  }

  let best = -INF;
  for (const m of orderMoves(chess.moves({ verbose: true }))) {
    chess.move({ from: m.from, to: m.to, promotion: m.promotion });
    const score = -negamax(chess, depth - 1, -beta, -alpha);
    chess.undo();
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Returns the engine's chosen move for the side to move, or null if none. */
export function bestMove(fen: string, difficulty: Difficulty): SimpleMove | null {
  const chess = new Chess(fen);
  const moves = chess.moves({ verbose: true });
  if (moves.length === 0) return null;

  // Easy occasionally blunders into a random legal move.
  if (difficulty === "easy" && Math.random() < 0.4) {
    const m = pick(moves);
    return { from: m.from, to: m.to, promotion: m.promotion };
  }

  const depth = difficulty === "hard" ? 3 : difficulty === "medium" ? 2 : 1;

  let bestScore = -INF;
  let bestMoves: any[] = [];
  for (const m of orderMoves(moves)) {
    chess.move({ from: m.from, to: m.to, promotion: m.promotion });
    const score = -negamax(chess, depth - 1, -INF, INF);
    chess.undo();
    if (score > bestScore) {
      bestScore = score;
      bestMoves = [m];
    } else if (score === bestScore) {
      bestMoves.push(m);
    }
  }

  const chosen = pick(bestMoves);
  return { from: chosen.from, to: chosen.to, promotion: chosen.promotion };
}
