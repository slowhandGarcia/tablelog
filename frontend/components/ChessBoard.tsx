import { memo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";

// A purely presentational chessboard. The parent owns the chess.js instance and
// passes down the current piece layout plus highlight sets; the board just
// renders squares/pieces and reports taps via `onSquarePress`.

export type PieceType = "p" | "n" | "b" | "r" | "q" | "k";
export type PieceColor = "w" | "b";
export interface BoardPiece {
  square: string;
  type: PieceType;
  color: PieceColor;
}

interface Props {
  // 8×8 matrix exactly as returned by chess.js `.board()` (rank 8 first).
  board: (BoardPiece | null)[][];
  orientation: "white" | "black";
  selected?: string | null;
  legalTargets?: string[];
  lastMove?: { from?: string; to?: string } | null;
  checkSquare?: string | null;
  interactive?: boolean;
  onSquarePress?: (square: string) => void;
  size: number;
}

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

// Filled glyphs for both colors; color is applied via text color for crisp,
// consistent pieces (the outlined "white" glyphs render poorly on many fonts).
//
// Each glyph gets a trailing U+FE0E (VARIATION SELECTOR-15) to force *text*
// presentation. Without it iOS renders ♟ (U+265F) as a fixed-color emoji that
// ignores our `color`, so white pawns come out black. VS-15 makes every piece
// a plain text glyph that honors the color we set.
const VS = String.fromCodePoint(0xfe0e); // VARIATION SELECTOR-15: forces text (non-emoji) presentation
const GLYPH: Record<PieceType, string> = {
  k: "♚" + VS,
  q: "♛" + VS,
  r: "♜" + VS,
  b: "♝" + VS,
  n: "♞" + VS,
  p: "♟" + VS,
};

const LIGHT = "#EBECD0";
const DARK = "#769656";
const SELECTED = "rgba(255, 214, 92, 0.55)";
const LASTMOVE = "rgba(255, 214, 92, 0.32)";
const CHECK = "rgba(226, 64, 64, 0.75)";

function ChessBoardComponent({
  board,
  orientation,
  selected,
  legalTargets = [],
  lastMove,
  checkSquare,
  interactive = true,
  onSquarePress,
  size,
}: Props) {
  const square = Math.floor(size / 8);
  const boardSize = square * 8;
  const pieceFont = Math.round(square * 0.74);
  const targets = new Set(legalTargets);

  // Map every occupied square -> piece, so empty squares (null cells) still
  // resolve to a coordinate for rendering/highlighting.
  const pieceMap: Record<string, BoardPiece> = {};
  for (const row of board) {
    for (const cell of row) {
      if (cell) pieceMap[cell.square] = cell;
    }
  }

  const ranks = orientation === "white" ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];
  const files = orientation === "white" ? FILES : [...FILES].reverse();

  return (
    <View style={[styles.board, { width: boardSize, height: boardSize }]}>
      {ranks.map((rank, ri) =>
        files.map((file, fi) => {
          const sq = `${file}${rank}`;
          const fileIdx = FILES.indexOf(file);
          const isDark = (fileIdx + rank) % 2 === 1;
          const piece = pieceMap[sq];
          const isTarget = targets.has(sq);
          const isCapture = isTarget && !!piece;
          const isLastMove = lastMove && (lastMove.from === sq || lastMove.to === sq);
          const isCheck = checkSquare === sq;

          return (
            <Pressable
              key={sq}
              disabled={!interactive}
              onPress={() => onSquarePress?.(sq)}
              style={{
                width: square,
                height: square,
                backgroundColor: isDark ? DARK : LIGHT,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* Highlight layers */}
              {isLastMove && <View style={[styles.fill, { backgroundColor: LASTMOVE }]} />}
              {isCheck && <View style={[styles.fill, styles.checkFill, { backgroundColor: CHECK }]} />}
              {selected === sq && <View style={[styles.fill, { backgroundColor: SELECTED }]} />}

              {/* Coordinate labels along the edges */}
              {fi === 0 && (
                <Text style={[styles.rankLabel, { color: isDark ? LIGHT : DARK }]}>{rank}</Text>
              )}
              {ri === 7 && (
                <Text style={[styles.fileLabel, { color: isDark ? LIGHT : DARK }]}>{file}</Text>
              )}

              {/* Piece */}
              {piece && (
                <Text
                  style={[
                    styles.piece,
                    {
                      fontSize: pieceFont,
                      color: piece.color === "w" ? "#FFFFFF" : "#1A1A1A",
                      textShadowColor: piece.color === "w" ? "#00000088" : "#FFFFFF55",
                    },
                  ]}
                >
                  {GLYPH[piece.type]}
                </Text>
              )}

              {/* Legal-move indicators (drawn above the piece for captures) */}
              {isTarget && !isCapture && (
                <View
                  style={{
                    position: "absolute",
                    width: square * 0.32,
                    height: square * 0.32,
                    borderRadius: square * 0.16,
                    backgroundColor: "rgba(20, 20, 20, 0.28)",
                  }}
                />
              )}
              {isCapture && (
                <View
                  style={{
                    position: "absolute",
                    width: square * 0.92,
                    height: square * 0.92,
                    borderRadius: square * 0.46,
                    borderWidth: square * 0.08,
                    borderColor: "rgba(20, 20, 20, 0.28)",
                  }}
                />
              )}
            </Pressable>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderRadius: 6,
    overflow: "hidden",
  },
  fill: { ...StyleSheet.absoluteFillObject },
  checkFill: { borderRadius: 999 },
  piece: {
    fontWeight: "900",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1.5,
    includeFontPadding: false,
  },
  rankLabel: {
    position: "absolute",
    top: 1,
    left: 2,
    fontSize: 9,
    fontWeight: "700",
    opacity: 0.9,
  },
  fileLabel: {
    position: "absolute",
    bottom: 0,
    right: 2,
    fontSize: 9,
    fontWeight: "700",
    opacity: 0.9,
  },
});

export const ChessBoard = memo(ChessBoardComponent);
