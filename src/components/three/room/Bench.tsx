"use client";

import { RoundedBox } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import { createTuftedLeatherTextures, TUFT_SPACING } from "../textures/proceduralTextures";

/**
 * Buttoned leather gallery bench on a dark wooden base, built from simple
 * shapes. It sits in the middle of the room with its long side running
 * east–west, so you can sit facing the far wall.
 *
 * `BENCH_FOOTPRINT` is used by the walking controls so you can't walk
 * through it.
 */
export const BENCH_FOOTPRINT = { width: 1.9, depth: 0.62 };

const SEAT_HEIGHT = 0.46;
const CUSHION_THICKNESS = 0.14;
const LEATHER = "#4a2119";
const WOOD = "#2b1a10";

export function Bench(props: { position?: [number, number, number]; rotationY?: number }) {
  const { width, depth } = BENCH_FOOTPRINT;
  const leather = useMemo(() => {
    const { bumpMap } = createTuftedLeatherTextures();
    bumpMap.repeat.set(width / TUFT_SPACING, depth / TUFT_SPACING);
    return bumpMap;
  }, [width, depth]);
  useEffect(() => () => leather.dispose(), [leather]);

  // Buttons on a diamond grid matching the bump map's tile.
  const buttons = useMemo(() => {
    const out: [number, number][] = [];
    const cols = Math.round(width / TUFT_SPACING);
    const rows = Math.round(depth / TUFT_SPACING);
    for (let i = 1; i < cols * 2; i++) {
      for (let j = 1; j < rows * 2; j++) {
        // Diamond grid: alternate rows are shifted by half a tile.
        if ((i + j) % 2 !== 0) continue;
        out.push([-width / 2 + (i * TUFT_SPACING) / 2, -depth / 2 + (j * TUFT_SPACING) / 2]);
      }
    }
    return out;
  }, [width, depth]);

  const cushionTop = SEAT_HEIGHT;
  const cushionCentre = cushionTop - CUSHION_THICKNESS / 2;
  const legHeight = cushionTop - CUSHION_THICKNESS - 0.06;
  const legX = width / 2 - 0.12;
  const legZ = depth / 2 - 0.08;

  return (
    <group position={props.position} rotation-y={props.rotationY ?? 0}>
      {/* Cushion */}
      <RoundedBox
        args={[width, CUSHION_THICKNESS, depth]}
        radius={0.05}
        smoothness={4}
        position-y={cushionCentre}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color={LEATHER}
          roughness={0.55}
          bumpMap={leather}
          bumpScale={3}
          envMapIntensity={0.8}
        />
      </RoundedBox>

      {/* Buttons */}
      {buttons.map(([x, z], i) => (
        <mesh key={i} position={[x, cushionTop - 0.008, z]}>
          <sphereGeometry args={[0.011, 8, 6]} />
          <meshStandardMaterial color="#2a120d" roughness={0.4} />
        </mesh>
      ))}

      {/* Wooden apron under the cushion */}
      <mesh position-y={cushionTop - CUSHION_THICKNESS - 0.03} castShadow>
        <boxGeometry args={[width - 0.06, 0.06, depth - 0.06]} />
        <meshStandardMaterial color={WOOD} roughness={0.45} />
      </mesh>

      {/* Six tapered legs */}
      {[-legX, 0, legX].flatMap((x) =>
        [-legZ, legZ].map((z) => (
          <mesh key={`${x},${z}`} position={[x, legHeight / 2, z]} castShadow>
            <cylinderGeometry args={[0.028, 0.02, legHeight, 12]} />
            <meshStandardMaterial color={WOOD} roughness={0.45} />
          </mesh>
        )),
      )}
    </group>
  );
}
