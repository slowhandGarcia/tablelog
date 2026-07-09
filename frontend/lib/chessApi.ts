import { api } from "./api";

// ── Types mirroring chessgame/serializers.py ──────────────────────────────────
export interface ChessUser {
  id: number;
  username: string;
  avatar_url?: string | null;
}

export type GameStatus = "waiting" | "active" | "finished" | "aborted";
export type GameResult = "" | "white" | "black" | "draw";
export type PlayerColor = "white" | "black";

export interface ChessGameDTO {
  id: number;
  creator: ChessUser;
  white: ChessUser | null;
  black: ChessUser | null;
  winner: ChessUser | null;
  fen: string;
  moves: string[];
  last_move: { from?: string; to?: string };
  status: GameStatus;
  result: GameResult;
  turn: PlayerColor;
  my_color: PlayerColor | null;
  created_at: string;
  updated_at: string;
}

export interface MovePayload {
  from: string;
  to: string;
  promotion?: string;
  san: string;
  fen: string;
  is_game_over: boolean;
  result?: Exclude<GameResult, "">;
}

// DRF PageNumberPagination wraps lists in { results: [...] }.
function unwrap<T>(data: any): T[] {
  return Array.isArray(data) ? data : (data?.results ?? []);
}

export const chessApi = {
  listOpenGames: async (): Promise<ChessGameDTO[]> => {
    const { data } = await api.get("/chess/games/", { params: { filter: "open" } });
    return unwrap<ChessGameDTO>(data);
  },
  listMyGames: async (): Promise<ChessGameDTO[]> => {
    const { data } = await api.get("/chess/games/", { params: { filter: "mine" } });
    return unwrap<ChessGameDTO>(data);
  },
  createGame: async (color: PlayerColor | "random"): Promise<ChessGameDTO> => {
    const { data } = await api.post("/chess/games/", { color });
    return data;
  },
  getGame: async (id: number | string): Promise<ChessGameDTO> => {
    const { data } = await api.get(`/chess/games/${id}/`);
    return data;
  },
  joinGame: async (id: number | string): Promise<ChessGameDTO> => {
    const { data } = await api.post(`/chess/games/${id}/join/`);
    return data;
  },
  makeMove: async (id: number | string, payload: MovePayload): Promise<ChessGameDTO> => {
    const { data } = await api.post(`/chess/games/${id}/move/`, payload);
    return data;
  },
  resignGame: async (id: number | string): Promise<ChessGameDTO> => {
    const { data } = await api.post(`/chess/games/${id}/resign/`);
    return data;
  },
  cancelGame: async (id: number | string): Promise<void> => {
    await api.post(`/chess/games/${id}/cancel/`);
  },
};
