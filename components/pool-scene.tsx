"use client";

import { useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { DoubleSide, type Mesh } from "three";

export interface ScenePalette {
  ground: string;
  surface: string;
  deep: string;
  line: string;
  ink: string;
  magenta: string;
}

export interface PoolSceneProps {
  /** Share of the pool's USD side still there when your order arrives (0..1). */
  level: number;
  /** Relative sizes (0..1) of the queued wallets, largest first. */
  bags: number[];
  /** How many of those wallets have already sold. */
  sold: number;
  /** Your bag relative to the largest wallet. */
  yourBag: number;
  palette: ScenePalette;
  reduced: boolean;
  onPour: () => void;
}

const H = 2.4;
const BASE_Y = 0.1;

function Liquid({ level, reduced, color }: { level: number; reduced: boolean; color: string }) {
  const ref = useRef<Mesh>(null);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => invalidate(), [level, invalidate]);

  useFrame((state, delta) => {
    const m = ref.current;
    if (!m) return;
    const target = Math.max(0.03, Math.min(1, level));
    const next = reduced ? target : m.scale.y + (target - m.scale.y) * Math.min(1, delta * 5);
    m.scale.y = next;
    m.position.y = BASE_Y + (next * H) / 2;
    if (Math.abs(next - target) > 0.002) state.invalidate();
  });

  return (
    <mesh ref={ref} position={[0, BASE_Y + H / 2, 0]}>
      <cylinderGeometry args={[1.12, 1.12, H, 48]} />
      <meshStandardMaterial color={color} roughness={0.55} />
    </mesh>
  );
}

/** One interactive object: the token's liquidity pool with the holder queue lined up at its edge. */
function PoolVessel({ level, bags, sold, yourBag, palette, reduced, onPour }: PoolSceneProps) {
  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        onPour();
      }}
      onPointerOver={() => (document.body.style.cursor = "pointer")}
      onPointerOut={() => (document.body.style.cursor = "")}
    >
      <mesh position={[-1.4, 0, 0]}>
        <boxGeometry args={[9, 0.2, 3.4]} />
        <meshStandardMaterial color={palette.deep} />
      </mesh>
      <mesh position={[0, BASE_Y + H / 2 + 0.1, 0]}>
        <cylinderGeometry args={[1.3, 1.3, H + 0.2, 48, 1, true]} />
        <meshStandardMaterial color={palette.line} transparent opacity={0.45} side={DoubleSide} />
      </mesh>
      <mesh position={[0, BASE_Y + H + 0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.3, 0.05, 8, 64]} />
        <meshStandardMaterial color={palette.ink} />
      </mesh>
      <Liquid level={level} reduced={reduced} color={palette.magenta} />
      {bags.map((size, i) => {
        const s = 0.22 + 0.5 * size;
        const gone = i < sold;
        return (
          <mesh key={i} position={[-1.9 - i * 0.62, BASE_Y + (gone ? 0.04 : s / 2), 0.6]} scale={gone ? [s, 0.08, s] : [s, s, s]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color={gone ? palette.line : palette.ink} />
          </mesh>
        );
      })}
      <mesh position={[-1.9 - bags.length * 0.62, BASE_Y + (0.22 + 0.5 * yourBag) / 2, 0.6]}>
        <boxGeometry args={[0.22 + 0.5 * yourBag, 0.22 + 0.5 * yourBag, 0.22 + 0.5 * yourBag]} />
        <meshStandardMaterial color={palette.magenta} />
      </mesh>
    </group>
  );
}

export default function PoolScene(props: PoolSceneProps) {
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 2]}
      camera={{ position: [-3.2, 3.6, 7.4], fov: 42 }}
      gl={{ antialias: true, alpha: true }}
      aria-hidden="true"
    >
      <ambientLight intensity={1.1} color={props.palette.ground} />
      <directionalLight position={[4, 7, 5]} intensity={1.4} color={props.palette.ground} />
      <PoolVessel {...props} />
      <OrbitControls
        target={[-2.2, 0.9, 0]}
        enablePan={false}
        enableZoom={false}
        enableDamping={!props.reduced}
        minPolarAngle={0.5}
        maxPolarAngle={1.45}
      />
    </Canvas>
  );
}
