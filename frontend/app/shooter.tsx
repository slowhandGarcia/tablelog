import { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";

// ── Constants ─────────────────────────────────────────────────────────────────
const { width: SW } = Dimensions.get("window");

const PLAYER_W = 38;
const PLAYER_H = 32;
const BULLET_W = 5;
const BULLET_H = 14;
const ENEMY_SIZE = 40;
const PLAYER_SPEED = 5.5;
const BULLET_SPEED = 12;
const FIRE_COOLDOWN = 9;   // frames between auto-fire shots
const BASE_SPAWN = 88;     // frames between spawns at score 0

const RETRO = Platform.select({ ios: "Courier New", android: "monospace", default: "monospace" });

const ENEMIES = [
  { emoji: "🍗", hp: 1, speed: 1.5, pts: 10, zigzag: false },
  { emoji: "🍔", hp: 2, speed: 0.9, pts: 25, zigzag: false },
  { emoji: "🍟", hp: 1, speed: 2.2, pts: 15, zigzag: false },
  { emoji: "🌮", hp: 1, speed: 1.3, pts: 20, zigzag: true  },
] as const;

// Static star field – computed once, never mutated
const STARS = Array.from({ length: 70 }, (_, i) => ({
  id: i,
  x: (i * 139.5) % SW,
  y: (i * 113.7) % 900,
  o: 0.1 + (i % 6) * 0.07,
  r: i % 5 === 0 ? 1.5 : 1,
}));

let _uid = 1;
const uid = () => _uid++;

// ── Types ─────────────────────────────────────────────────────────────────────
type Phase = "idle" | "playing" | "dead";

interface Bullet { id: number; x: number; y: number }
interface Enemy {
  id: number; x: number; y: number;
  type: number; hp: number;
  hit: number;  // flash frames remaining
  dx: number;   // horizontal drift for zigzag
}
interface GS {
  px: number;
  bullets: Bullet[];
  enemies: Enemy[];
  score: number;
  hiScore: number;
  lives: number;
  fireCd: number;
  spawnCd: number;
  starOff: number;
}

const makeGS = (hiScore: number): GS => ({
  px: SW / 2 - PLAYER_W / 2,
  bullets: [],
  enemies: [],
  score: 0,
  hiScore,
  lives: 3,
  fireCd: 0,
  spawnCd: 60,
  starOff: 0,
});

// ── Component ─────────────────────────────────────────────────────────────────
export default function ShooterScreen() {
  const insets = useSafeAreaInsets();
  const HUD_H = 50;
  const CTRL_H = 108 + insets.bottom;

  const [gameH, setGameH] = useState(0);
  const gameHRef = useRef(0);

  const [phase, setPhase] = useState<Phase>("idle");
  const phaseRef = useRef<Phase>("idle");
  const [, forceRender] = useState(0);
  const [hiScore, setHiScore] = useState(0);

  const gs = useRef<GS>(makeGS(0));
  const ctrl = useRef({ left: false, right: false, fire: false });
  const rafId = useRef(0);

  // ── Game loop ───────────────────────────────────────────────────────────────
  // All state accessed via refs so useCallback deps stay empty (stable reference).
  const gameLoop = useCallback((_ts: number) => {
    if (phaseRef.current !== "playing") return;

    const g = gs.current;
    const GH = gameHRef.current;
    if (GH === 0) { rafId.current = requestAnimationFrame(gameLoop); return; }

    const PLAYER_Y = GH - PLAYER_H - 6;

    // Scroll stars
    g.starOff = (g.starOff + 0.6) % GH;

    // Player movement
    if (ctrl.current.left)  g.px = Math.max(0, g.px - PLAYER_SPEED);
    if (ctrl.current.right) g.px = Math.min(SW - PLAYER_W, g.px + PLAYER_SPEED);

    // Auto-fire
    g.fireCd = Math.max(0, g.fireCd - 1);
    if (ctrl.current.fire && g.fireCd === 0) {
      g.bullets.push({ id: uid(), x: g.px + PLAYER_W / 2, y: PLAYER_Y });
      g.fireCd = FIRE_COOLDOWN;
    }

    // Move bullets up, cull off-screen
    for (let i = g.bullets.length - 1; i >= 0; i--) {
      g.bullets[i].y -= BULLET_SPEED;
      if (g.bullets[i].y < -BULLET_H) g.bullets.splice(i, 1);
    }

    // Move enemies down
    const speedMult = 1 + Math.floor(g.score / 200) * 0.2;
    for (let i = g.enemies.length - 1; i >= 0; i--) {
      const e = g.enemies[i];
      e.hit = Math.max(0, e.hit - 1);
      e.y += ENEMIES[e.type].speed * speedMult;
      if (ENEMIES[e.type].zigzag) {
        e.x += e.dx;
        if (e.x <= 0 || e.x >= SW - ENEMY_SIZE) e.dx *= -1;
      }
      if (e.y > GH) {
        g.enemies.splice(i, 1);
        g.lives--;
        if (g.lives <= 0) {
          phaseRef.current = "dead";
          cancelAnimationFrame(rafId.current);
          setHiScore((h) => Math.max(h, g.score));
          setPhase("dead");
          return;
        }
      }
    }

    // Spawn
    g.spawnCd--;
    if (g.spawnCd <= 0) {
      const interval = Math.max(32, BASE_SPAWN - Math.floor(g.score / 100) * 7);
      g.spawnCd = interval;
      const type = Math.floor(Math.random() * ENEMIES.length);
      g.enemies.push({
        id: uid(),
        x: Math.random() * (SW - ENEMY_SIZE),
        y: -ENEMY_SIZE,
        type,
        hp: ENEMIES[type].hp,
        hit: 0,
        dx: ENEMIES[type].zigzag ? (Math.random() > 0.5 ? 1.6 : -1.6) : 0,
      });
    }

    // Bullet × Enemy collisions
    for (let bi = g.bullets.length - 1; bi >= 0; bi--) {
      const b = g.bullets[bi];
      let consumed = false;
      for (let ei = g.enemies.length - 1; ei >= 0; ei--) {
        const e = g.enemies[ei];
        if (
          b.x - BULLET_W / 2 < e.x + ENEMY_SIZE &&
          b.x + BULLET_W / 2 > e.x &&
          b.y               < e.y + ENEMY_SIZE &&
          b.y + BULLET_H    > e.y
        ) {
          e.hp--;
          e.hit = 6;
          consumed = true;
          if (e.hp <= 0) {
            g.score += ENEMIES[e.type].pts;
            if (g.score > g.hiScore) g.hiScore = g.score;
            g.enemies.splice(ei, 1);
          }
          break;
        }
      }
      if (consumed) g.bullets.splice(bi, 1);
    }

    // Player × Enemy collisions
    for (let i = g.enemies.length - 1; i >= 0; i--) {
      const e = g.enemies[i];
      if (
        g.px           < e.x + ENEMY_SIZE &&
        g.px + PLAYER_W > e.x &&
        PLAYER_Y        < e.y + ENEMY_SIZE &&
        PLAYER_Y + PLAYER_H > e.y
      ) {
        g.enemies.splice(i, 1);
        g.lives--;
        if (g.lives <= 0) {
          phaseRef.current = "dead";
          cancelAnimationFrame(rafId.current);
          setHiScore((h) => Math.max(h, g.score));
          setPhase("dead");
          return;
        }
      }
    }

    forceRender((n) => n + 1);
    rafId.current = requestAnimationFrame(gameLoop);
  }, []); // stable – all state via refs

  const startGame = useCallback(() => {
    cancelAnimationFrame(rafId.current);
    gs.current = makeGS(Math.max(hiScore, gs.current.score));
    phaseRef.current = "playing";
    setPhase("playing");
    rafId.current = requestAnimationFrame(gameLoop);
  }, [gameLoop, hiScore]);

  useEffect(() => () => { cancelAnimationFrame(rafId.current); }, []);

  // ── Render ──────────────────────────────────────────────────────────────────
  const g = gs.current;
  const PLAYER_Y = gameH - PLAYER_H - 6;
  const livesArr = [0, 1, 2];

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── HUD ─────────────────────────────────────────────────────────── */}
      <View style={[styles.hud, { paddingTop: insets.top + 4, height: HUD_H + insets.top }]}>
        <View style={styles.livesRow}>
          {livesArr.map((i) => (
            <View key={i} style={[styles.lifeIcon, { opacity: i < g.lives ? 1 : 0.15 }]} />
          ))}
        </View>

        <View style={styles.scoreWrap}>
          <Text style={[styles.scoreLabel, { fontFamily: RETRO }]}>SCORE</Text>
          <Text style={[styles.scoreVal,   { fontFamily: RETRO }]}>
            {String(g.score).padStart(6, "0")}
          </Text>
        </View>

        <View style={styles.hiWrap}>
          <Text style={[styles.hiLabel, { fontFamily: RETRO }]}>BEST</Text>
          <Text style={[styles.hiVal,   { fontFamily: RETRO }]}>
            {String(Math.max(g.hiScore, hiScore)).padStart(6, "0")}
          </Text>
        </View>

        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.exitBtn}>
          <Text style={[styles.exitText, { fontFamily: RETRO }]}>✕</Text>
        </Pressable>
      </View>

      {/* ── Game area ───────────────────────────────────────────────────── */}
      <View
        style={styles.gameArea}
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          gameHRef.current = h;
          setGameH(h);
        }}
      >
        {/* Scrolling star field */}
        {STARS.map((s) => (
          <View
            key={s.id}
            style={[
              styles.star,
              {
                left: s.x,
                top: gameH > 0 ? (s.y + g.starOff) % gameH : s.y,
                opacity: s.o,
                width: s.r * 2,
                height: s.r * 2,
                borderRadius: s.r,
              },
            ]}
          />
        ))}

        {/* Bullets */}
        {g.bullets.map((b) => (
          <View
            key={b.id}
            style={[styles.bullet, { left: b.x - BULLET_W / 2, top: b.y }]}
          />
        ))}

        {/* Enemies */}
        {g.enemies.map((e) => (
          <View
            key={e.id}
            style={[
              styles.enemyWrap,
              { left: e.x, top: e.y },
              e.hit > 0 && styles.enemyFlash,
            ]}
          >
            <Text style={styles.enemyEmoji}>{ENEMIES[e.type].emoji}</Text>
            {ENEMIES[e.type].hp > 1 && (
              <View style={styles.hpTrack}>
                <View
                  style={[
                    styles.hpFill,
                    { width: `${(e.hp / ENEMIES[e.type].hp) * 100}%` as any },
                  ]}
                />
              </View>
            )}
          </View>
        ))}

        {/* Player ship */}
        {phase === "playing" && gameH > 0 && (
          <View style={[styles.ship, { left: g.px, top: PLAYER_Y }]}>
            <View style={styles.shipCannon} />
            <View style={styles.shipCockpit} />
            <View style={styles.shipBody} />
            <View style={styles.shipWings} />
            <View style={styles.shipExhaust}>
              <View style={styles.exhaustNozzle} />
              <View style={styles.exhaustNozzle} />
            </View>
          </View>
        )}

        {/* Start / Game-over overlay */}
        {phase !== "playing" && (
          <View style={styles.overlay}>
            {phase === "idle" ? (
              <>
                <Text style={[styles.overlayTitle,  { fontFamily: RETRO }]}>
                  FOOD INVADERS
                </Text>
                <Text style={[styles.overlayHint,   { fontFamily: RETRO }]}>
                  Destroy the flying food!
                </Text>
                <Text style={styles.overlayEnemies}>🍗  🍔  🍟  🌮</Text>
                <View style={styles.overlayLegend}>
                  {ENEMIES.map((en, i) => (
                    <Text key={i} style={[styles.legendRow, { fontFamily: RETRO }]}>
                      {en.emoji}  {String(en.pts).padStart(2, " ")} PTS
                      {en.hp > 1   ? "  ★ TOUGH" : ""}
                      {en.zigzag   ? "  ↔ DODGE" : ""}
                    </Text>
                  ))}
                </View>
                <Pressable onPress={startGame} style={styles.startBtn}>
                  <Text style={[styles.startBtnText, { fontFamily: RETRO }]}>▶  START GAME</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={[styles.overlayTitle, { fontFamily: RETRO, color: "#ff4444" }]}>
                  GAME OVER
                </Text>
                <Text style={[styles.overlayScore, { fontFamily: RETRO }]}>
                  SCORE  {String(g.score).padStart(6, "0")}
                </Text>
                {g.score > 0 && g.score >= hiScore && (
                  <Text style={[styles.newHi, { fontFamily: RETRO }]}>
                    ★  NEW HIGH SCORE  ★
                  </Text>
                )}
                <Pressable onPress={startGame} style={styles.startBtn}>
                  <Text style={[styles.startBtnText, { fontFamily: RETRO }]}>▶  PLAY AGAIN</Text>
                </Pressable>
                <Pressable onPress={() => router.back()} style={styles.quitBtn}>
                  <Text style={[styles.quitBtnText, { fontFamily: RETRO }]}>QUIT</Text>
                </Pressable>
              </>
            )}
          </View>
        )}
      </View>

      {/* ── Controls ────────────────────────────────────────────────────── */}
      <View style={[styles.controls, { paddingBottom: insets.bottom + 8, height: CTRL_H }]}>
        {/* Left / Right movement */}
        <View style={styles.moveCluster}>
          <Pressable
            style={styles.ctrlBtn}
            onPressIn={() => (ctrl.current.left = true)}
            onPressOut={() => (ctrl.current.left = false)}
          >
            <Text style={[styles.ctrlGlyph, { fontFamily: RETRO }]}>◀</Text>
          </Pressable>
          <Pressable
            style={styles.ctrlBtn}
            onPressIn={() => (ctrl.current.right = true)}
            onPressOut={() => (ctrl.current.right = false)}
          >
            <Text style={[styles.ctrlGlyph, { fontFamily: RETRO }]}>▶</Text>
          </Pressable>
        </View>

        {/* Fire */}
        <Pressable
          style={styles.fireBtn}
          onPressIn={() => (ctrl.current.fire = true)}
          onPressOut={() => (ctrl.current.fire = false)}
        >
          <Text style={[styles.fireGlyph, { fontFamily: RETRO }]}>FIRE</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000010" },

  // HUD
  hud: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 14,
    paddingBottom: 8,
    backgroundColor: "#000018",
    borderBottomWidth: 1,
    borderBottomColor: "#003322",
    gap: 10,
  },
  livesRow: { flexDirection: "row", gap: 5, alignItems: "center", minWidth: 52 },
  lifeIcon: { width: 10, height: 14, backgroundColor: "#00d4ff", borderRadius: 2 },
  scoreWrap: { flex: 1, alignItems: "center" },
  scoreLabel: { fontSize: 9, color: "#00aa66", letterSpacing: 2 },
  scoreVal:   { fontSize: 20, color: "#00ff88", letterSpacing: 3 },
  hiWrap: { alignItems: "flex-end" },
  hiLabel: { fontSize: 9, color: "#665500", letterSpacing: 1 },
  hiVal:   { fontSize: 13, color: "#ffcc00", letterSpacing: 2 },
  exitBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 4,
    marginLeft: 4,
  },
  exitText: { fontSize: 13, color: "#555" },

  // Game area
  gameArea: { flex: 1, backgroundColor: "#000010", overflow: "hidden" },

  // Stars
  star: { position: "absolute", backgroundColor: "#ffffff" },

  // Bullets
  bullet: {
    position: "absolute",
    width: BULLET_W,
    height: BULLET_H,
    backgroundColor: "#39ff14",
    borderRadius: 3,
  },

  // Enemies
  enemyWrap: {
    position: "absolute",
    width: ENEMY_SIZE,
    height: ENEMY_SIZE + 6,
    alignItems: "center",
  },
  enemyFlash: { opacity: 0.35 },
  enemyEmoji: { fontSize: 30 },
  hpTrack: {
    width: ENEMY_SIZE - 6,
    height: 3,
    backgroundColor: "#330000",
    borderRadius: 2,
    marginTop: 2,
    overflow: "hidden",
  },
  hpFill: { height: "100%", backgroundColor: "#ff4444", borderRadius: 2 },

  // Player ship — layered rectangles give a pixel-art silhouette
  ship: { position: "absolute", width: PLAYER_W, alignItems: "center" },
  shipCannon:  { width: 5,         height: 9,  backgroundColor: "#00d4ff", borderRadius: 2 },
  shipCockpit: { width: 14,        height: 8,  backgroundColor: "#00aacc", borderRadius: 3, marginTop: -2 },
  shipBody:    { width: PLAYER_W,  height: 11, backgroundColor: "#0077aa", borderRadius: 3, marginTop: -2 },
  shipWings:   { width: PLAYER_W + 10, height: 6, backgroundColor: "#005588", borderRadius: 2, marginTop: -2 },
  shipExhaust: { flexDirection: "row", gap: 10, marginTop: 1 },
  exhaustNozzle: { width: 6, height: 5, backgroundColor: "#ff6600", borderRadius: 3 },

  // Overlays
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,16,0.88)",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingHorizontal: 24,
  },
  overlayTitle:   { fontSize: 32, color: "#00ff88", letterSpacing: 5, textAlign: "center" },
  overlayHint:    { fontSize: 13, color: "#006644", letterSpacing: 1 },
  overlayEnemies: { fontSize: 30, letterSpacing: 6 },
  overlayLegend:  { gap: 4, alignItems: "flex-start" },
  legendRow:      { fontSize: 12, color: "#447766", letterSpacing: 1 },
  overlayScore:   { fontSize: 22, color: "#ffcc00", letterSpacing: 4, marginBottom: 6 },
  newHi:          { fontSize: 13, color: "#ffcc00", letterSpacing: 2 },
  startBtn: {
    marginTop: 8,
    borderWidth: 2,
    borderColor: "#00ff88",
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 4,
  },
  startBtnText: { fontSize: 16, color: "#00ff88", letterSpacing: 3 },
  quitBtn:      { marginTop: 4, paddingVertical: 8, paddingHorizontal: 20 },
  quitBtnText:  { fontSize: 13, color: "#445544", letterSpacing: 2 },

  // Controls
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 28,
    backgroundColor: "#000018",
    borderTopWidth: 1,
    borderTopColor: "#003322",
  },
  moveCluster: { flexDirection: "row", gap: 14 },
  ctrlBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: "#00884d",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#001a0d",
  },
  ctrlGlyph: { fontSize: 22, color: "#00ff88" },
  fireBtn: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 2,
    borderColor: "#cc2200",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1a0500",
  },
  fireGlyph: { fontSize: 15, color: "#ff4422", letterSpacing: 2 },
});
