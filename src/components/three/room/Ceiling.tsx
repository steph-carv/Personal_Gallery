"use client";

import type { Room } from "@/lib/gallery/types";

/**
 * Ceiling with a laylight (skylight) in the middle, like the National
 * Gallery's top-lit rooms.
 *
 * The flat ceiling is four strips around a rectangular opening. Above the
 * opening is a short recessed well lined in the ceiling colour, capped with a
 * glowing glass panel divided by glazing bars. The glass is emissive: it glows
 * but doesn't light anything. The daylight itself comes from the directional
 * light and the environment set up in GalleryScene.
 */
export function Ceiling({ room }: { room: Room }) {
  const { width, depth, height } = room;
  const holeW = width * 0.5;
  const holeD = depth * 0.4;
  const wellDepth = 0.35;
  const bars = { x: 6, z: 3 };
  const barSize = 0.05;
  const color = room.theme.ceilingColor;

  // Strips around the opening: [centre x, centre z, size x, size z].
  const sideW = (width - holeW) / 2;
  const endD = (depth - holeD) / 2;
  const strips: [number, number, number, number][] = [
    [-(holeW + sideW) / 2, 0, sideW, depth], // west strip, full depth
    [(holeW + sideW) / 2, 0, sideW, depth], // east strip, full depth
    [0, -(holeD + endD) / 2, holeW, endD], // north strip between them
    [0, (holeD + endD) / 2, holeW, endD], // south strip
  ];

  return (
    <group position-y={height}>
      {strips.map(([x, z, sx, sz], i) => (
        <mesh key={i} position={[x, 0, z]} rotation-x={Math.PI / 2}>
          <planeGeometry args={[sx, sz]} />
          <meshStandardMaterial color={color} roughness={0.95} />
        </mesh>
      ))}

      {/* Glass at the top of the well, facing down */}
      <mesh position-y={wellDepth} rotation-x={Math.PI / 2}>
        <planeGeometry args={[holeW, holeD]} />
        <meshStandardMaterial
          color="#000000"
          emissive="#f6e8cf"
          emissiveIntensity={0.95}
          toneMapped={false}
        />
      </mesh>

      {/* Glazing bars, just under the glass */}
      {Array.from({ length: bars.x - 1 }, (_, i) => (
        <mesh
          key={`bx${i}`}
          position={[-holeW / 2 + ((i + 1) * holeW) / bars.x, wellDepth - 0.03, 0]}
        >
          <boxGeometry args={[barSize, 0.05, holeD]} />
          <meshStandardMaterial color="#3a332b" roughness={0.6} />
        </mesh>
      ))}
      {Array.from({ length: bars.z - 1 }, (_, i) => (
        <mesh
          key={`bz${i}`}
          position={[0, wellDepth - 0.03, -holeD / 2 + ((i + 1) * holeD) / bars.z]}
        >
          <boxGeometry args={[holeW, 0.05, barSize]} />
          <meshStandardMaterial color="#3a332b" roughness={0.6} />
        </mesh>
      ))}

      {/* The four inner sides of the well, each facing into the opening */}
      {(
        [
          [0, -holeD / 2, holeW, 0],
          [0, holeD / 2, holeW, Math.PI],
          [-holeW / 2, 0, holeD, Math.PI / 2],
          [holeW / 2, 0, holeD, -Math.PI / 2],
        ] as const
      ).map(([x, z, length, rot], i) => (
        <mesh key={i} position={[x, wellDepth / 2, z]} rotation-y={rot}>
          <planeGeometry args={[length, wellDepth]} />
          <meshStandardMaterial color={color} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}
