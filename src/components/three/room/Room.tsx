"use client";

import { useEffect, useMemo } from "react";
import type { Texture } from "three";
import type { Room as RoomData } from "@/lib/gallery/types";
import { sweepProfile, rectanglePath } from "../geometry/sweepProfile";
import { corniceProfile, dadoProfile, skirtingProfile } from "../geometry/profiles";
import {
  createOakFloorTextures,
  createPlasterTexture,
  FLOOR_TILE_METRES,
} from "../textures/proceduralTextures";
import { DADO_HEIGHT, WALLS, wallTransform } from "./wallTransforms";
import { Ceiling } from "./Ceiling";

/**
 * The room's architecture: four walls (upper and lower sections), cornice,
 * dado rail, skirting, oak floor and ceiling with a skylight.
 *
 * Walls and floor receive shadows but don't cast them; only frames and the
 * bench cast, which keeps shadow rendering cheap.
 */
export function Room({ room }: { room: RoomData }) {
  const { width, depth, height, theme } = room;

  const plaster = useMemo(() => createPlasterTexture(), []);
  const floor = useMemo(() => {
    const textures = createOakFloorTextures();
    for (const t of [textures.map, textures.roughnessMap]) {
      t.repeat.set(width / FLOOR_TILE_METRES, depth / FLOOR_TILE_METRES);
    }
    return textures;
  }, [width, depth]);

  // Trims are swept around the room's floor plan, then stood upright: the
  // profile's z becomes height. rotateX(-90°) maps plan y to world -z, which
  // is fine because the plan is symmetric.
  const trims = useMemo(() => {
    const plan = rectanglePath(width, depth);
    const build = (profile: Parameters<typeof sweepProfile>[1]) => {
      const geometry = sweepProfile(plan, profile, { closed: true });
      geometry.rotateX(-Math.PI / 2);
      return geometry;
    };
    return {
      cornice: build(corniceProfile(height)),
      dado: build(dadoProfile(DADO_HEIGHT)),
      skirting: build(skirtingProfile()),
    };
  }, [width, depth, height]);

  useEffect(
    () => () => {
      plaster.dispose();
      floor.map.dispose();
      floor.roughnessMap.dispose();
      Object.values(trims).forEach((g) => g.dispose());
    },
    [plaster, floor, trims],
  );

  return (
    <group>
      {WALLS.map((wall) => {
        const t = wallTransform(room, wall);
        return (
          <group key={wall} position={t.position} rotation-y={t.rotationY}>
            <WallSection
              length={t.length}
              bottom={DADO_HEIGHT}
              top={height}
              color={theme.wallColor}
              plaster={plaster}
            />
            <WallSection
              length={t.length}
              bottom={0}
              top={DADO_HEIGHT}
              color={theme.lowerWallColor}
              plaster={plaster}
            />
          </group>
        );
      })}

      <mesh geometry={trims.cornice} receiveShadow>
        <meshStandardMaterial color={theme.trimColor} roughness={0.7} />
      </mesh>
      <mesh geometry={trims.dado} receiveShadow castShadow>
        <meshStandardMaterial color={theme.trimColor} roughness={0.55} />
      </mesh>
      <mesh geometry={trims.skirting} receiveShadow>
        <meshStandardMaterial color="#1c1210" roughness={0.5} />
      </mesh>

      {/* Floor. Tagged so clicks on it mean "walk here". */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow userData={{ floor: true }}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial
          map={floor.map}
          roughnessMap={floor.roughnessMap}
          roughness={0.85}
          metalness={0}
          envMapIntensity={0.6}
        />
      </mesh>

      <Ceiling room={room} />
    </group>
  );
}

/** One horizontal band of a wall, in the wall's local frame. */
function WallSection({
  length,
  bottom,
  top,
  color,
  plaster,
}: {
  length: number;
  bottom: number;
  top: number;
  color: string;
  plaster: Texture;
}) {
  const sectionHeight = top - bottom;
  // Each section needs its own repeat, so give it a lightweight clone (the
  // image data is shared).
  const map = useMemo(() => {
    const clone = plaster.clone();
    clone.repeat.set(length / 2.5, sectionHeight / 2.5);
    clone.needsUpdate = true;
    return clone;
  }, [plaster, length, sectionHeight]);
  useEffect(() => () => map.dispose(), [map]);

  return (
    <mesh position={[0, bottom + sectionHeight / 2, 0]} receiveShadow>
      <planeGeometry args={[length, sectionHeight]} />
      <meshStandardMaterial
        color={color}
        map={map}
        bumpMap={map}
        bumpScale={0.4}
        roughness={0.92}
        envMapIntensity={0.4}
      />
    </mesh>
  );
}
