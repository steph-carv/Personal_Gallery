"use client";

import { useEffect, useMemo } from "react";
import { PlaneGeometry } from "three";
import type { PlacedRoom } from "@/lib/gallery/layout";
import { corniceProfile, dadoProfile, skirtingProfile } from "../geometry/profiles";
import { rectanglePath, sweepProfile, type ProfilePoint } from "../geometry/sweepProfile";
import { sharedTextures } from "../textures/proceduralTextures";
import { Ceiling } from "./Ceiling";
import { Doorway } from "./Doorway";
import { doorsOn, trimPaths, wallRectGeometry, wallRects } from "./doorways";
import { EmptyRoomSign } from "./EmptyRoomSign";
import { DADO_HEIGHT, WALLS, wallTransform } from "./wallTransforms";

/**
 * One room's architecture, centred on its own origin (the parent group puts
 * it in place): four walls with doorways cut out, cornice, dado rail and
 * skirting (broken at the doorways), oak floor, skylit ceiling, and a sign if
 * the room is empty.
 *
 * Walls and floor receive shadows but don't cast them; only frames, trims and
 * the bench cast, which keeps shadow rendering cheap.
 */
export function Room({ room }: { room: PlacedRoom }) {
  const { width, depth, height, theme } = room;
  const textures = sharedTextures();

  // Walls: each band (lower, upper) split into pieces around the doorways.
  const walls = useMemo(
    () =>
      WALLS.map((wall) => {
        const t = wallTransform(room, wall);
        const doors = doorsOn(room, wall);
        const upper = wallRects(t.length, DADO_HEIGHT, height, doors).map((r) =>
          wallRectGeometry(r, 1),
        );
        const lower = wallRects(t.length, 0, DADO_HEIGHT, doors).map((r) => wallRectGeometry(r, 1));
        return { wall, t, doors, upper, lower };
      }),
    [room, height],
  );

  // Trims are swept round the room's floor plan, then stood upright: the
  // profile's z becomes height. rotateX(−90°) maps plan y to world −z.
  const trims = useMemo(() => {
    const build = (profile: ProfilePoint[], broken: boolean) =>
      (broken ? trimPaths(room) : [{ path: rectanglePath(width, depth), closed: true }]).map(
        ({ path, closed }) => {
          const geometry = sweepProfile(path, profile, { closed, caps: !closed });
          geometry.rotateX(-Math.PI / 2);
          return geometry;
        },
      );
    return {
      // The cornice runs above the doorways, so it's never broken.
      cornice: build(corniceProfile(height), false),
      dado: build(dadoProfile(DADO_HEIGHT), true),
      skirting: build(skirtingProfile(), true),
    };
  }, [room, width, depth, height]);

  // Floor with UVs in metres, so the shared floor texture tiles at true size.
  const floor = useMemo(() => {
    const geometry = new PlaneGeometry(width, depth);
    const uv = geometry.getAttribute("uv");
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * width, uv.getY(i) * depth);
    return geometry;
  }, [width, depth]);

  useEffect(
    () => () => {
      walls.forEach((w) => [...w.upper, ...w.lower].forEach((g) => g.dispose()));
      Object.values(trims).forEach((list) => list.forEach((g) => g.dispose()));
      floor.dispose();
    },
    [walls, trims, floor],
  );

  // An empty room gets its sign on the first wall without a doorway, north first.
  const signWall =
    room.placements.length === 0 ? WALLS.find((w) => doorsOn(room, w).length === 0) : undefined;

  return (
    <group>
      {walls.map(({ wall, t, doors, upper, lower }) => (
        <group key={wall} position={t.position} rotation-y={t.rotationY}>
          {upper.map((geometry, i) => (
            <mesh key={`u${i}`} geometry={geometry} receiveShadow>
              <WallMaterial color={theme.wallColor} />
            </mesh>
          ))}
          {lower.map((geometry, i) => (
            <mesh key={`l${i}`} geometry={geometry} receiveShadow>
              <WallMaterial color={theme.lowerWallColor} />
            </mesh>
          ))}
          {doors.map((door) => (
            <Doorway key={door.toRoomId} door={door} trimColor={theme.trimColor} />
          ))}
          {wall === signWall && <EmptyRoomSign />}
        </group>
      ))}

      {trims.cornice.map((geometry, i) => (
        <mesh key={`c${i}`} geometry={geometry} receiveShadow>
          <meshStandardMaterial color={theme.trimColor} roughness={0.7} />
        </mesh>
      ))}
      {trims.dado.map((geometry, i) => (
        <mesh key={`d${i}`} geometry={geometry} receiveShadow castShadow>
          <meshStandardMaterial color={theme.trimColor} roughness={0.55} />
        </mesh>
      ))}
      {trims.skirting.map((geometry, i) => (
        <mesh key={`s${i}`} geometry={geometry} receiveShadow>
          <meshStandardMaterial color="#1c1210" roughness={0.5} />
        </mesh>
      ))}

      {/* Floor. Tagged so clicks on it mean "walk here". */}
      <mesh geometry={floor} rotation-x={-Math.PI / 2} receiveShadow userData={{ floor: true }}>
        <meshStandardMaterial
          map={textures.floor.map}
          roughnessMap={textures.floor.roughnessMap}
          roughness={0.85}
          metalness={0}
          envMapIntensity={0.6}
        />
      </mesh>

      <Ceiling room={room} />
    </group>
  );
}

function WallMaterial({ color }: { color: string }) {
  const { plaster } = sharedTextures();
  return (
    <meshStandardMaterial
      color={color}
      map={plaster}
      bumpMap={plaster}
      bumpScale={0.4}
      roughness={0.92}
      envMapIntensity={0.4}
    />
  );
}
