"use client";

import { Environment, Lightformer } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useMemo } from "react";
import { NeutralToneMapping } from "three";
import type { Room as RoomData, WallId } from "@/lib/gallery/types";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";
import { Painting } from "./art/Painting";
import { CameraRig } from "./camera/CameraRig";
import { FloorCursor } from "./camera/FloorCursor";
import type { FloorPlan } from "./camera/navigation";
import { EYE_HEIGHT } from "./camera/poses";
import { Bench, BENCH_FOOTPRINT } from "./room/Bench";
import { Room } from "./room/Room";
import { WALLS, wallTransform } from "./room/wallTransforms";
import { createGiltTextures } from "./textures/proceduralTextures";

/**
 * The whole 3D gallery room: renderer settings, lighting, architecture, the
 * bench, the hung paintings and the walking controls.
 *
 * Scene graph:
 *   Canvas
 *   ├─ Environment (reflections for gilt and varnish, built from Lightformers)
 *   ├─ lights: hemisphere fill + skylight sun (shadows) + a spotlight per painting
 *   ├─ Room (walls, trims, floor, ceiling + skylight)
 *   ├─ Bench
 *   ├─ one <group> per wall, in that wall's local frame
 *   │    └─ Painting × n (canvas, frame, label, spotlight)
 *   ├─ FloorCursor (the ring showing where a click will walk you)
 *   └─ CameraRig (all camera movement, clicks and hovers)
 */
export default function GalleryScene({ room }: { room: RoomData }) {
  const byWall = useMemo(() => {
    const groups: Record<WallId, RoomData["placements"]> = {
      north: [],
      east: [],
      south: [],
      west: [],
    };
    for (const p of room.placements) groups[p.wall].push(p);
    return groups;
  }, [room.placements]);

  // Where you can stand: the room minus the bench.
  const plan = useMemo<FloorPlan>(
    () => ({
      width: room.width,
      depth: room.depth,
      obstacles:
        room.theme.bench === "leather"
          ? [{ x: 0, z: 0, width: BENCH_FOOTPRINT.width, depth: BENCH_FOOTPRINT.depth }]
          : [],
    }),
    [room.width, room.depth, room.theme.bench],
  );
  const reducedMotion = usePrefersReducedMotion();

  return (
    // touch-none: drags on the canvas look around instead of scrolling or zooming the page.
    <div className="absolute inset-0 touch-none select-none">
      <Canvas
        shadows="percentage"
        dpr={[1, 1.75]}
        camera={{ position: [0, EYE_HEIGHT, room.depth / 2 - 1.1], fov: 65, near: 0.05, far: 60 }}
        onCreated={({ gl }) => {
          // Neutral tone mapping keeps the paintings' colours true; the
          // default (ACES) shifts saturated colours.
          gl.toneMapping = NeutralToneMapping;
          gl.toneMappingExposure = 1.0;
        }}
        fallback={<p className="text-cream p-8">Your browser can&apos;t show the 3D gallery.</p>}
      >
        <color attach="background" args={["#0e0c0a"]} />

        <GalleryEnvironment room={room} />
        {/* Fill light standing in for light bouncing around the room: warm from
            above, a lighter brown from the floor so the ceiling isn't black. */}
        <ambientLight intensity={0.35} color="#ffe9cf" />
        <hemisphereLight args={["#fff1dc", "#a08a76", 1.5]} />
        <directionalLight
          position={[1.5, room.height + 6, 1]}
          intensity={0.8}
          color="#fff3e2"
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0003}
          shadow-camera-left={-room.width / 2}
          shadow-camera-right={room.width / 2}
          shadow-camera-top={room.depth / 2}
          shadow-camera-bottom={-room.depth / 2}
          shadow-camera-near={1}
          shadow-camera-far={room.height + 10}
        />

        <Room room={room} />
        {room.theme.bench === "leather" && <Bench />}

        <Suspense fallback={null}>
          <HungWorks room={room} byWall={byWall} />
        </Suspense>

        <FloorCursor />
        <CameraRig room={room} plan={plan} reducedMotion={reducedMotion} />
      </Canvas>
    </div>
  );
}

function HungWorks({
  room,
  byWall,
}: {
  room: RoomData;
  byWall: Record<WallId, RoomData["placements"]>;
}) {
  // One shared set of gilt textures for every frame.
  const gilt = useMemo(() => createGiltTextures(), []);
  useEffect(
    () => () => {
      gilt.roughnessMap.dispose();
      gilt.bumpMap.dispose();
    },
    [gilt],
  );

  return (
    <>
      {WALLS.map((wall) => {
        const t = wallTransform(room, wall);
        return (
          <group key={wall} position={t.position} rotation-y={t.rotationY}>
            {byWall[wall].map((placement) => (
              <Painting key={placement.id} placement={placement} room={room} gilt={gilt} />
            ))}
          </group>
        );
      })}
    </>
  );
}

/**
 * What shiny surfaces (gilt frames, varnish, polished floor) reflect. Rather
 * than downloading an HDR photo, it's rendered once from a few glowing
 * panels: a bright skylight overhead and the warm, dim walls around.
 */
function GalleryEnvironment({ room }: { room: RoomData }) {
  return (
    <Environment resolution={256} frames={1} environmentIntensity={0.8}>
      <color attach="background" args={[room.theme.lowerWallColor]} />
      {/* Skylight */}
      <Lightformer
        form="rect"
        intensity={6}
        color="#fff4e0"
        position={[0, 5, 0]}
        rotation-x={Math.PI / 2}
        scale={[6, 4, 1]}
      />
      {/* Walls: warm, dim panels on each side */}
      {(
        [
          [0, 2, -6, 0],
          [0, 2, 6, Math.PI],
          [-6, 2, 0, Math.PI / 2],
          [6, 2, 0, -Math.PI / 2],
        ] as const
      ).map(([x, y, z, ry], i) => (
        <Lightformer
          key={i}
          form="rect"
          intensity={0.6}
          color={room.theme.wallColor}
          position={[x, y, z]}
          rotation-y={ry}
          scale={[12, 4, 1]}
        />
      ))}
      {/* A few small bright spots, like the picture lights, for sparkle */}
      {[-3, 0, 3].map((x) => (
        <Lightformer
          key={x}
          form="circle"
          intensity={8}
          color="#ffe6c4"
          position={[x, 4.6, 2]}
          scale={0.4}
        />
      ))}
    </Environment>
  );
}
