"use client";

import { useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { DoubleSide, Vector3, type Mesh } from "three";

export interface ScenePalette {
  ground: string;
  surface: string;
  deep: string;
  line: string;
  ink: string;
  magenta: string;
}

/** Camera viewpoint, picked by the active story chapter. */
export type PoolView = "front" | "side";

export interface PoolSceneProps {
  /** What a sale pays as a share of what the wallet shows (0..1), from exitQuote(). The magenta liquid. */
  payout: number;
  /** Sell tax as a share of the wallet number (0..1). Drawn as an INK layer above the liquid. */
  taxCut: number;
  /** 24h LP drain as a share of the wallet number (0..1). Drawn as a DEEP layer above the tax. */
  drainCut: number;
  /** Relative sizes (0..1) of the queued wallets, largest first. */
  bags: number[];
  /** How many of those wallets have already sold (the story slider). */
  sold: number;
  /** Your bag relative to the largest wallet. */
  yourBag: number;
  palette: ScenePalette;
  reduced: boolean;
  view: PoolView;
  /** Bumped by the "Reset view" button: the camera returns to the chapter's viewpoint. */
  resetKey: number;
  onPour: () => void;
}

const H = 2.4;
const BASE_Y = 0.1;
const RADIUS = 1.12;
const TARGET: [number, number, number] = [-2.2, 0.9, 0];
// Front: the pool and the queue in three quarters. Side: low, looking along the holder line.
const VIEWS: Record<PoolView, [number, number, number]> = {
  front: [-3.2, 3.6, 7.4],
  side: [-9, 1.9, 2.6],
};

/**
 * One horizontal slice of the pool between `start` and `start + size` (shares of
 * the wallet number). Eases toward its target with damping, snaps under reduced
 * motion, and asks for frames only while it moves (frameloop="demand").
 */
function LiquidLayer({
  start,
  size,
  color,
  rim,
  opacity = 1,
  reduced,
}: {
  start: number;
  size: number;
  color: string;
  rim?: string;
  opacity?: number;
  reduced: boolean;
}) {
  const body = useRef<Mesh>(null);
  const ring = useRef<Mesh>(null);
  const cur = useRef({ start, size });
  // Stable initial transforms, so a re-render never resets the eased values.
  const init = useRef({ pos: [0, BASE_Y + (start + size / 2) * H, 0] as [number, number, number], scale: [1, Math.max(size, 0.0001), 1] as [number, number, number], ringY: BASE_Y + (start + size) * H });
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => invalidate(), [start, size, reduced, invalidate]);

  useFrame((state, delta) => {
    const m = body.current;
    if (!m) return;
    const c = cur.current;
    const k = reduced ? 1 : Math.min(1, delta * 5);
    c.start += (start - c.start) * k;
    c.size += (size - c.size) * k;
    const h = Math.max(0.0001, c.size);
    m.scale.y = h;
    m.position.y = BASE_Y + (c.start + h / 2) * H;
    m.visible = c.size > 0.002;
    if (ring.current) {
      ring.current.position.y = BASE_Y + (c.start + h) * H;
      ring.current.visible = m.visible;
    }
    if (Math.abs(start - c.start) > 0.001 || Math.abs(size - c.size) > 0.001) state.invalidate();
  });

  return (
    <>
      <mesh ref={body} position={init.current.pos} scale={init.current.scale}>
        <cylinderGeometry args={[RADIUS, RADIUS, H, 48]} />
        <meshBasicMaterial color={color} transparent={opacity < 1} opacity={opacity} />
      </mesh>
      {rim ? (
        <mesh ref={ring} position={[0, init.current.ringY, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[RADIUS, 0.025, 6, 64]} />
          <meshBasicMaterial color={rim} />
        </mesh>
      ) : null}
    </>
  );
}

/**
 * Signature 3: eases the camera between the front view and the low side view
 * when the story chapter changes. Under reduced motion it snaps with no tween.
 * OrbitControls stay on for dragging; this only moves the camera on a view
 * change or a "Reset view" press.
 */
function CameraRig({ view, reduced, resetKey }: { view: PoolView; reduced: boolean; resetKey: number }) {
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const controls = useThree((s) => s.controls) as unknown as { update?: () => void } | null;
  const goal = useRef(new Vector3(...VIEWS.front));
  const moving = useRef(false);

  useEffect(() => {
    goal.current.set(...VIEWS[view]);
    if (reduced) {
      camera.position.copy(goal.current);
      camera.lookAt(...TARGET);
      controls?.update?.();
      moving.current = false;
    } else {
      moving.current = true;
    }
    invalidate();
  }, [view, reduced, resetKey, camera, controls, invalidate]);

  useFrame((state, delta) => {
    if (!moving.current) return;
    camera.position.lerp(goal.current, Math.min(1, delta * 3));
    if (camera.position.distanceTo(goal.current) < 0.02) {
      camera.position.copy(goal.current);
      moving.current = false;
    }
    camera.lookAt(...TARGET);
    controls?.update?.();
    state.invalidate();
  });

  return null;
}

/** One interactive object: the token's liquidity pool with the holder queue lined up at its edge. */
function PoolVessel({ payout, taxCut, drainCut, bags, sold, yourBag, palette, reduced, onPour }: PoolSceneProps) {
  const pay = Math.max(0.03, Math.min(1, payout));
  const tax = Math.max(0, Math.min(1 - pay, taxCut));
  const drain = Math.max(0, Math.min(1 - pay - tax, drainCut));
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
        <meshBasicMaterial color={palette.deep} />
      </mesh>
      <mesh position={[0, BASE_Y + H / 2 + 0.1, 0]}>
        <cylinderGeometry args={[1.3, 1.3, H + 0.2, 48, 1, true]} />
        <meshBasicMaterial color={palette.line} transparent opacity={0.45} side={DoubleSide} />
      </mesh>
      <mesh position={[0, BASE_Y + H + 0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.3, 0.05, 8, 64]} />
        <meshBasicMaterial color={palette.ink} />
      </mesh>
      <LiquidLayer start={0} size={pay} color={palette.magenta} rim={palette.ink} reduced={reduced} />
      <LiquidLayer start={pay} size={tax} color={palette.ink} opacity={0.85} reduced={reduced} />
      <LiquidLayer start={pay + tax} size={drain} color={palette.deep} rim={palette.line} reduced={reduced} />
      {bags.map((size, i) => {
        const s = 0.22 + 0.5 * size;
        const gone = i < sold;
        return (
          <mesh key={i} position={[-1.9 - i * 0.62, BASE_Y + (gone ? 0.04 : s / 2), 0.6]} scale={gone ? [s, 0.08, s] : [s, s, s]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color={gone ? palette.line : palette.ink} />
          </mesh>
        );
      })}
      <mesh position={[-1.9 - bags.length * 0.62, BASE_Y + (0.22 + 0.5 * yourBag) / 2, 0.6]}>
        <boxGeometry args={[0.22 + 0.5 * yourBag, 0.22 + 0.5 * yourBag, 0.22 + 0.5 * yourBag]} />
        <meshBasicMaterial color={palette.magenta} />
      </mesh>
    </group>
  );
}

/** Requests a frame whenever the story state changes, since the loop only renders on demand. */
function Invalidator({ stamp }: { stamp: string }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => invalidate(), [stamp, invalidate]);
  return null;
}

export default function PoolScene(props: PoolSceneProps) {
  const { view, reduced, resetKey } = props;
  return (
    <Canvas frameloop="demand" dpr={[1, 2]} camera={{ position: VIEWS.front, fov: 42 }} gl={{ antialias: true, alpha: true }} aria-hidden="true">
      <Invalidator stamp={[props.payout, props.taxCut, props.drainCut, props.sold, props.bags.length, props.yourBag].join("|")} />
      <PoolVessel {...props} />
      <OrbitControls
        makeDefault
        target={TARGET}
        enablePan={false}
        enableZoom={false}
        enableDamping={!reduced}
        minPolarAngle={0.5}
        maxPolarAngle={1.45}
      />
      <CameraRig view={view} reduced={reduced} resetKey={resetKey} />
    </Canvas>
  );
}
