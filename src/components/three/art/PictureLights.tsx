"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { MathUtils, Object3D, type SpotLight } from "three";
import type { PlacedRoom } from "@/lib/gallery/layout";
import { tourOrder } from "@/lib/gallery/tour";
import { useGalleryStore } from "@/lib/gallery/useGalleryStore";
import { framedSize, wallToWorld } from "./placementGeometry";

/** Spotlight brightness, normally and when the painting is hovered or selected. */
const INTENSITY = 45;
const HIGHLIGHT = 70;
/** Most paintings in one room that get a spotlight of their own. */
export const MAX_PICTURE_LIGHTS = 12;

/**
 * A fixed pool of ceiling spotlights, aimed at the paintings in the room
 * you're in.
 *
 * Why a pool: three.js compiles each material's shader for an exact number of
 * lights. Adding or removing lights as you walk between rooms would recompile
 * every material, a visible hitch in the doorway. Instead the pool always has
 * the same lights; walking into a new room just re-aims them (unused ones sit
 * at zero brightness), and they fade up on the new room's paintings.
 */
export function PictureLights({ room, poolSize }: { room: PlacedRoom; poolSize: number }) {
  const count = Math.min(poolSize, MAX_PICTURE_LIGHTS);
  const aims = useMemo(
    () =>
      tourOrder(room.placements)
        .slice(0, count)
        .map((placement) => {
          const framed = framedSize(placement);
          // Near the ceiling, 1.8 m out from the wall: a typical gallery
          // track position, steep enough not to glare off the varnish.
          const mount = wallToWorld(room, placement, 1.8, room.height - 0.25);
          const target = wallToWorld(room, placement, 0);
          const distance = mount.distanceTo(target);
          const radius = Math.hypot(framed.width, framed.height) / 2;
          return {
            id: placement.id,
            mount,
            target,
            distance,
            // Cover the frame, with a soft edge spilling onto the wall.
            angle: Math.min(0.75, Math.atan(radius / distance) * 1.35),
          };
        }),
    [room, count],
  );

  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <PooledLight key={i} aim={aims[i] ?? null} roomId={room.id} />
      ))}
    </>
  );
}

function PooledLight({
  aim,
  roomId,
}: {
  aim: {
    id: string;
    mount: { x: number; y: number; z: number };
    target: { x: number; y: number; z: number };
    distance: number;
    angle: number;
  } | null;
  roomId: string;
}) {
  const light = useRef<SpotLight>(null);
  const target = useMemo(() => new Object3D(), []);
  const highlighted = useGalleryStore(
    (s) => aim !== null && (s.hoveredId === aim.id || s.focusedId === aim.id),
  );

  // When the light is re-aimed at a new room, start from dark and fade up.
  const aimedAt = useRef<string | null>(null);
  useFrame((_, delta) => {
    const l = light.current;
    if (!l) return;
    if (aimedAt.current !== roomId) {
      aimedAt.current = roomId;
      l.intensity = 0;
    }
    const goal = aim ? (highlighted ? HIGHLIGHT : INTENSITY) : 0;
    l.intensity += (goal - l.intensity) * (1 - Math.exp(-delta * 4));
  });

  const mount = aim?.mount ?? { x: 0, y: -50, z: 0 };
  const aimAt = aim?.target ?? { x: 0, y: -51, z: 0 };
  return (
    <>
      <primitive object={target} position={[aimAt.x, aimAt.y, aimAt.z]} />
      <spotLight
        ref={light}
        position={[mount.x, mount.y, mount.z]}
        target={target}
        angle={aim?.angle ?? 0.3}
        penumbra={0.7}
        intensity={0}
        decay={2}
        distance={0}
        color="#ffe6c4"
        castShadow
        shadow-mapSize={[512, 512]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-near={0.5}
        shadow-camera-far={MathUtils.clamp((aim?.distance ?? 4) + 2, 3, 12)}
      />
    </>
  );
}
