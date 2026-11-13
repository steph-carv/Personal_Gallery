"use client";

import { useEffect, useMemo } from "react";
import {
  ARCHITRAVE_WIDTH,
  WALL_THICKNESS,
  type Doorway as DoorwayData,
} from "@/lib/gallery/layout";
import { architraveProfile } from "../geometry/profiles";
import { sweepProfile, type Vec2 } from "../geometry/sweepProfile";
import { makeCanvas, useCanvasTexture } from "../textures/canvasText";

/** Each room draws its half of the wall's thickness, so the two halves meet. */
const HALF_THICKNESS = WALL_THICKNESS / 2;
const PLAQUE = { width: 1.5, height: 0.34, depth: 0.025, gap: 0.42 };

/**
 * A doorway, drawn in its wall's local frame: the moulded architrave round
 * the opening, the reveals (the inside faces of the opening), a stone
 * threshold, and a plaque above naming the room it leads to.
 */
export function Doorway({ door, trimColor }: { door: DoorwayData; trimColor: string }) {
  const hw = door.width / 2;
  const H = door.height;

  const architrave = useMemo(() => {
    // Up the right jamb, across the top, down the left: anticlockwise round
    // the opening, so "outward" (away from the opening) is the profile's +d.
    const path: Vec2[] = [
      [hw, 0],
      [hw, H],
      [-hw, H],
      [-hw, 0],
    ];
    return sweepProfile(path, architraveProfile(ARCHITRAVE_WIDTH));
  }, [hw, H]);
  useEffect(() => () => architrave.dispose(), [architrave]);

  return (
    <group position-x={door.x}>
      <mesh geometry={architrave} castShadow receiveShadow>
        <meshStandardMaterial color={trimColor} roughness={0.6} />
      </mesh>

      {/* Reveals: the two jambs, facing into the opening, and the soffit above. */}
      <mesh position={[-hw, H / 2, -HALF_THICKNESS / 2]} rotation-y={Math.PI / 2} receiveShadow>
        <planeGeometry args={[HALF_THICKNESS, H]} />
        <meshStandardMaterial color={trimColor} roughness={0.8} />
      </mesh>
      <mesh position={[hw, H / 2, -HALF_THICKNESS / 2]} rotation-y={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[HALF_THICKNESS, H]} />
        <meshStandardMaterial color={trimColor} roughness={0.8} />
      </mesh>
      <mesh position={[0, H, -HALF_THICKNESS / 2]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[door.width, HALF_THICKNESS]} />
        <meshStandardMaterial color={trimColor} roughness={0.8} />
      </mesh>

      {/* Stone threshold across the gap between the two rooms' floors. */}
      <mesh
        position={[0, 0.003, -HALF_THICKNESS / 2]}
        rotation-x={-Math.PI / 2}
        receiveShadow
        userData={{ floor: true }}
      >
        <planeGeometry args={[door.width, HALF_THICKNESS]} />
        <meshStandardMaterial color="#8d8372" roughness={0.6} />
      </mesh>

      <group position={[0, H + PLAQUE.gap, 0]}>
        <RoomPlaque label={door.toLabel} />
      </group>
    </group>
  );
}

/** The plaque above a doorway: "ROOM 2" over the room's name, gilt on black. */
function RoomPlaque({ label }: { label: string }) {
  const [number, name] = label.split(" · ");
  const texture = useCanvasTexture(label, (fonts) => {
    const pxPerMetre = 1400;
    const w = Math.round(PLAQUE.width * pxPerMetre);
    const h = Math.round(PLAQUE.height * pxPerMetre);
    const { canvas, ctx } = makeCanvas(w, h);
    ctx.fillStyle = "#16120e";
    ctx.fillRect(0, 0, w, h);
    // Fine gilt border.
    ctx.strokeStyle = "#c9a45a";
    ctx.lineWidth = 6;
    ctx.strokeRect(18, 18, w - 36, h - 36);
    ctx.textAlign = "center";
    ctx.fillStyle = "#d9b25c";
    ctx.font = `600 54px ${fonts.sans}`;
    ctx.letterSpacing = "18px";
    ctx.fillText(number.toUpperCase(), w / 2, h * 0.4);
    ctx.letterSpacing = "0px";
    ctx.fillStyle = "#efe7d4";
    ctx.font = `italic 500 132px ${fonts.serif}`;
    ctx.fillText(name ?? "", w / 2, h * 0.8, w - 100);
    return canvas;
  });

  return (
    <mesh position-z={PLAQUE.depth / 2} castShadow>
      <boxGeometry args={[PLAQUE.width, PLAQUE.height, PLAQUE.depth]} />
      <meshStandardMaterial attach="material-0" color="#16120e" />
      <meshStandardMaterial attach="material-1" color="#16120e" />
      <meshStandardMaterial attach="material-2" color="#16120e" />
      <meshStandardMaterial attach="material-3" color="#16120e" />
      {/* Keyed on the texture: a material built before its map existed
          would keep rendering without it. */}
      <meshStandardMaterial
        key={texture ? "drawn" : "blank"}
        attach="material-4"
        map={texture}
        color={texture ? "#ffffff" : "#16120e"}
        roughness={0.5}
        metalness={0.1}
      />
      <meshStandardMaterial attach="material-5" color="#16120e" />
    </mesh>
  );
}
