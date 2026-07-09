import { useEffect, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

import {
  WALLS,
  FLOORS,
  WALL_HEIGHT,
  EYE,
  PLAYER_START,
  CHEF,
  LADLE,
  INTERACT_RADIUS,
  collides,
} from "./levelData";

export interface ControlState {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
}

export type NearId = "chef" | "ladle" | null;

const MOVE_SPEED = 3.2; // units / second
const TURN_SPEED = 2.2; // radians / second

interface SceneProps {
  controls: RefObject<ControlState>;
  onNearby: (id: NearId) => void;
  ladleCollected: boolean;
}

// First-person player: drives the R3F camera from the on-screen controls, with
// simple per-axis wall collision and proximity detection for interactables.
function PlayerController({ controls, onNearby, ladleCollected }: SceneProps) {
  const camera = useThree((s) => s.camera);
  const yaw = useRef(PLAYER_START.yaw);
  const px = useRef(PLAYER_START.x);
  const pz = useRef(PLAYER_START.z);
  const lastNear = useRef<NearId>(null);

  useEffect(() => {
    camera.rotation.order = "YXZ";
    camera.position.set(px.current, EYE, pz.current);
    camera.rotation.set(0, yaw.current, 0);
  }, [camera]);

  useFrame((_, rawDelta) => {
    const c = controls.current;
    const dt = Math.min(rawDelta, 0.05); // clamp to avoid teleporting on frame hitches

    // Turn
    if (c.left) yaw.current += TURN_SPEED * dt;
    if (c.right) yaw.current -= TURN_SPEED * dt;
    camera.rotation.set(0, yaw.current, 0);

    // Move along facing (forward = -Z rotated by yaw)
    const dir = (c.forward ? 1 : 0) - (c.back ? 1 : 0);
    if (dir !== 0) {
      const fx = -Math.sin(yaw.current);
      const fz = -Math.cos(yaw.current);
      const step = MOVE_SPEED * dt * dir;
      const nx = px.current + fx * step;
      const nz = pz.current + fz * step;
      // Resolve axes independently so the player slides along walls.
      if (!collides(nx, pz.current)) px.current = nx;
      if (!collides(px.current, nz)) pz.current = nz;
      camera.position.set(px.current, EYE, pz.current);
    }

    // Proximity to interactables
    let near: NearId = null;
    if (Math.hypot(px.current - CHEF.x, pz.current - CHEF.z) < INTERACT_RADIUS) {
      near = "chef";
    } else if (!ladleCollected && Math.hypot(px.current - LADLE.x, pz.current - LADLE.z) < INTERACT_RADIUS) {
      near = "ladle";
    }
    if (near !== lastNear.current) {
      lastNear.current = near;
      onNearby(near);
    }
  });

  return null;
}

function Chef() {
  return (
    <group position={[CHEF.x, 0, CHEF.z]} rotation={[0, Math.PI, 0]}>
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.35, 0.42, 1.2, 14]} />
        <meshStandardMaterial color="#ececee" />
      </mesh>
      <mesh position={[0, 0.55, 0.34]}>
        <boxGeometry args={[0.5, 0.85, 0.06]} />
        <meshStandardMaterial color="#c94b3b" />
      </mesh>
      <mesh position={[0, 1.42, 0]}>
        <sphereGeometry args={[0.26, 16, 16]} />
        <meshStandardMaterial color="#e8b58a" />
      </mesh>
      {/* chef's hat */}
      <mesh position={[0, 1.78, 0]}>
        <cylinderGeometry args={[0.24, 0.24, 0.32, 14]} />
        <meshStandardMaterial color="#f7f7f7" />
      </mesh>
      <mesh position={[0, 1.98, 0]}>
        <sphereGeometry args={[0.27, 14, 14]} />
        <meshStandardMaterial color="#f7f7f7" />
      </mesh>
    </group>
  );
}

function Ladle() {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y += 0.02;
    ref.current.position.y = 1.05 + Math.sin(state.clock.elapsedTime * 2) * 0.15;
  });
  return (
    <group ref={ref} position={[LADLE.x, 1.05, LADLE.z]}>
      <mesh>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color="#ffcf3f" emissive="#a86f00" emissiveIntensity={0.9} metalness={0.7} roughness={0.25} />
      </mesh>
      <mesh position={[0, -0.4, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 0.6, 8]} />
        <meshStandardMaterial color="#ffcf3f" emissive="#a86f00" emissiveIntensity={0.6} metalness={0.7} roughness={0.25} />
      </mesh>
    </group>
  );
}

export function DungeonScene({ controls, onNearby, ladleCollected }: SceneProps) {
  return (
    <>
      <color attach="background" args={["#0b0b12"]} />
      <fog attach="fog" args={["#0b0b12", 7, 26]} />

      <ambientLight intensity={0.55} />
      <directionalLight position={[6, 12, 4]} intensity={0.6} />
      <pointLight position={[CHEF.x, 2.2, CHEF.z]} intensity={7} distance={9} color="#ffd28a" />
      {!ladleCollected && (
        <pointLight position={[LADLE.x, 1.4, LADLE.z]} intensity={9} distance={7} color="#ffcc33" />
      )}

      {/* Floors */}
      {FLOORS.map((f, i) => (
        <mesh key={`floor-${i}`} position={[f.x, 0, f.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[f.w, f.d]} />
          <meshStandardMaterial color="#2b2420" />
        </mesh>
      ))}

      {/* Walls */}
      {WALLS.map((w, i) => (
        <mesh key={`wall-${i}`} position={[w.x, WALL_HEIGHT / 2, w.z]}>
          <boxGeometry args={[w.w, WALL_HEIGHT, w.d]} />
          <meshStandardMaterial color="#4a4038" />
        </mesh>
      ))}

      <Chef />
      {!ladleCollected && <Ladle />}

      <PlayerController controls={controls} onNearby={onNearby} ladleCollected={ladleCollected} />
    </>
  );
}
