"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useState } from "react";
import type { PerspectiveCamera } from "three";

/**
 * Phase 1 "hello world" for the 3D stack: a patch of oxblood wall with a dado
 * rail, a gilt frame, a wall label and a spotlight. It only proves that
 * three.js + React Three Fiber render in the app. The real room, with
 * procedural frame profiles and proper materials, is Phase 2.
 *
 * Units are metres, as they will be everywhere in the 3D code.
 */

const WALL = "#5e1d20";
const LOWER_WALL = "#3f1315";
const CREAM = "#efe7d4";
const GILT = "#d9b25c";

// Painting size in metres (roughly a 4:5 portrait).
const PAINTING_W = 0.8;
const PAINTING_H = 1.0;
const FRAME_W = 0.09; // width of each frame side
const FRAME_D = 0.06; // how far the frame sticks out from the wall
const CENTRE_Y = 1.75; // eye-ish height

/** Four boxes around the painting. Phase 2 replaces this with a swept moulding profile. */
function SimpleGiltFrame() {
  const outerW = PAINTING_W + FRAME_W * 2;
  const outerH = PAINTING_H + FRAME_W * 2;
  const sides: { pos: [number, number, number]; size: [number, number, number] }[] = [
    { pos: [0, (PAINTING_H + FRAME_W) / 2, 0], size: [outerW, FRAME_W, FRAME_D] }, // top
    { pos: [0, -(PAINTING_H + FRAME_W) / 2, 0], size: [outerW, FRAME_W, FRAME_D] }, // bottom
    { pos: [-(PAINTING_W + FRAME_W) / 2, 0, 0], size: [FRAME_W, outerH, FRAME_D] }, // left
    { pos: [(PAINTING_W + FRAME_W) / 2, 0, 0], size: [FRAME_W, outerH, FRAME_D] }, // right
  ];

  return (
    <group position={[0, CENTRE_Y, FRAME_D / 2]}>
      {sides.map((side, i) => (
        <mesh key={i} position={side.pos} castShadow>
          <boxGeometry args={side.size} />
          <meshStandardMaterial color={GILT} metalness={0.55} roughness={0.35} />
        </mesh>
      ))}
      {/* The canvas: an empty warm ground until real artwork textures arrive. */}
      <mesh position={[0, 0, -FRAME_D / 2 + 0.01]} receiveShadow>
        <planeGeometry args={[PAINTING_W, PAINTING_H]} />
        <meshStandardMaterial color="#2a2118" roughness={0.9} />
      </mesh>
    </group>
  );
}

function Wall() {
  return (
    <group>
      {/* Upper wall */}
      <mesh position={[0, 2.5, 0]} receiveShadow>
        <planeGeometry args={[12, 5]} />
        <meshStandardMaterial color={WALL} roughness={0.95} />
      </mesh>
      {/* Darker lower wall below the dado rail */}
      <mesh position={[0, 0.45, 0.005]} receiveShadow>
        <planeGeometry args={[12, 0.9]} />
        <meshStandardMaterial color={LOWER_WALL} roughness={0.95} />
      </mesh>
      {/* Dado rail at 0.9 m */}
      <mesh position={[0, 0.9, 0.02]} castShadow>
        <boxGeometry args={[12, 0.05, 0.04]} />
        <meshStandardMaterial color={CREAM} roughness={0.6} />
      </mesh>
      {/* Wooden floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 3]} receiveShadow>
        <planeGeometry args={[12, 6]} />
        <meshStandardMaterial color="#4a3222" roughness={0.7} />
      </mesh>
    </group>
  );
}

function WallLabel() {
  return (
    <mesh position={[PAINTING_W / 2 + 0.35, 1.35, 0.008]} receiveShadow>
      <planeGeometry args={[0.18, 0.12]} />
      <meshStandardMaterial color={CREAM} roughness={0.8} />
    </mesh>
  );
}

/** Eases the camera towards the pointer so the scene feels physical. */
function CameraSway({ enabled }: { enabled: boolean }) {
  useFrame(({ camera, pointer }, delta) => {
    const cam = camera as PerspectiveCamera;
    const targetX = enabled ? pointer.x * 0.35 : 0;
    const targetY = enabled ? CENTRE_Y - 0.1 + pointer.y * 0.15 : CENTRE_Y - 0.1;
    // Frame-rate independent easing: never snap (HANDOVER.md §6).
    const t = 1 - Math.exp(-delta * 2.5);
    cam.position.x += (targetX - cam.position.x) * t;
    cam.position.y += (targetY - cam.position.y) * t;
    cam.lookAt(0, CENTRE_Y - 0.15, 0);
  });
  return null;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

export default function HelloScene() {
  const reducedMotion = usePrefersReducedMotion();
  return (
    <div className="absolute inset-0" aria-hidden="true">
      <Canvas
        // PCF shadows; three r18x removed the soft variant R3F uses by default.
        shadows="percentage"
        dpr={[1, 1.5]}
        camera={{ position: [0, CENTRE_Y - 0.1, 3.2], fov: 65 }}
        fallback={<div className="bg-oxblood h-full w-full" />}
      >
        <color attach="background" args={["#0e0c0a"]} />
        <fog attach="fog" args={["#0e0c0a", 4, 9]} />
        <ambientLight intensity={0.6} color="#ffe7c4" />
        <hemisphereLight args={["#fff1dc", "#2a1a10", 0.5]} />
        <spotLight
          position={[0, 4.2, 2.2]}
          target-position={[0, CENTRE_Y, 0]}
          angle={0.42}
          penumbra={0.75}
          intensity={40}
          decay={2}
          color="#ffe2b0"
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-bias={-0.0005}
        />
        <Wall />
        <SimpleGiltFrame />
        <WallLabel />
        <CameraSway enabled={!reducedMotion} />
      </Canvas>
    </div>
  );
}
