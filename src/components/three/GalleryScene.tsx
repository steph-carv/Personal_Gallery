"use client";

import { Environment, Lightformer, useTexture } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Component, Suspense, useEffect, useMemo, type ReactNode } from "react";
import { NeutralToneMapping, Object3D } from "three";
import type { PlacedRoom } from "@/lib/gallery/layout";
import type { Placement, WallId } from "@/lib/gallery/types";
import { useGalleryStore } from "@/lib/gallery/useGalleryStore";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";
import { Painting } from "./art/Painting";
import { PictureLights } from "./art/PictureLights";
import { CameraRig } from "./camera/CameraRig";
import { FloorCursor } from "./camera/FloorCursor";
import { buildFloorPlan } from "./camera/navigation";
import { EYE_HEIGHT } from "./camera/poses";
import { Bench, BENCH_FOOTPRINT } from "./room/Bench";
import { Room } from "./room/Room";
import { WALLS, wallTransform } from "./room/wallTransforms";

/**
 * The whole 3D gallery: renderer settings, lighting, the rooms, and the
 * camera rig.
 *
 * Only the room you're in and its neighbours are built at a time (you can
 * see into them through the doorways). Walking into the next room builds the
 * one beyond it and drops the one behind, so a 10-room gallery costs about
 * the same as a 3-room one. Paintings two rooms ahead are preloaded so
 * they're ready when you arrive.
 *
 * Scene graph:
 *   Canvas
 *   ├─ Environment (reflections for gilt and varnish, built from Lightformers)
 *   ├─ lights: ambient + hemisphere fill, skylight "sun" over the current room
 *   ├─ PictureLights (a fixed pool of spotlights aimed at the current room)
 *   ├─ per visible room, a <group> at the room's origin:
 *   │    ├─ Room (walls with doorways, trims, floor, ceiling, plaques)
 *   │    ├─ Bench
 *   │    └─ one <group> per wall → Painting × n (canvas, frame, label)
 *   ├─ FloorCursor (the ring showing where a click will walk you)
 *   └─ CameraRig (all camera movement, clicks and hovers)
 */
export default function GalleryScene({ rooms }: { rooms: PlacedRoom[] }) {
  const currentRoomId = useGalleryStore((s) => s.currentRoomId);
  const current = rooms.find((r) => r.id === currentRoomId) ?? rooms[0];
  const visible = rooms.filter((r) => Math.abs(r.index - current.index) <= 1);

  const plan = useMemo(
    () =>
      buildFloorPlan(rooms, (room) =>
        room.theme.bench === "leather"
          ? [
              {
                x: room.origin.x,
                z: room.origin.z,
                width: BENCH_FOOTPRINT.width,
                depth: BENCH_FOOTPRINT.depth,
              },
            ]
          : [],
      ),
    [rooms],
  );
  const lightPool = Math.max(1, ...rooms.map((r) => r.placements.length));
  const reducedMotion = usePrefersReducedMotion();

  // Preload paintings two rooms either side, so they're ready on arrival.
  useEffect(() => {
    for (const room of rooms) {
      if (Math.abs(room.index - current.index) === 2) {
        for (const p of room.placements) useTexture.preload(p.artwork.imageUrl);
      }
    }
  }, [rooms, current.index]);

  return (
    // touch-none: drags on the canvas look around instead of scrolling or zooming the page.
    <div className="absolute inset-0 touch-none select-none">
      <SwitchTo2DOnError>
        <Canvas
          shadows="percentage"
          dpr={[1, 1.75]}
          camera={{
            position: [0, EYE_HEIGHT, rooms[0].depth / 2 - 1.1],
            fov: 65,
            near: 0.05,
            far: 80,
          }}
          onCreated={({ gl }) => {
            // Neutral tone mapping keeps the paintings' colours true; the
            // default (ACES) shifts saturated colours.
            gl.toneMapping = NeutralToneMapping;
            gl.toneMappingExposure = 1.0;
          }}
          // Text for the <canvas> element itself (read out if it can't render).
          fallback={<p>The 3D gallery. Switch to the 2D view to browse the works.</p>}
        >
          <color attach="background" args={["#0e0c0a"]} />

          <GalleryEnvironment />
          {/* Fill light standing in for light bouncing around the room: warm from
            above, a lighter brown from the floor so the ceiling isn't black. */}
          <ambientLight intensity={0.35} color="#ffe9cf" />
          <hemisphereLight args={["#fff1dc", "#a08a76", 1.5]} />
          <SkylightSun room={current} />
          <PictureLights room={current} poolSize={lightPool} />

          {visible.map((room) => (
            <group key={room.id} position={[room.origin.x, 0, room.origin.z]}>
              <Room room={room} />
              {room.theme.bench === "leather" && <Bench />}
              {/* Each room loads its paintings separately, so a room coming
                into view never blanks the others while it loads. */}
              <Suspense fallback={null}>
                <HungWorks room={room} lit={room.id === current.id} />
              </Suspense>
            </group>
          ))}

          <FloorCursor />
          <CameraRig rooms={rooms} plan={plan} reducedMotion={reducedMotion} />
        </Canvas>
      </SwitchTo2DOnError>
    </div>
  );
}

function HungWorks({ room, lit }: { room: PlacedRoom; lit: boolean }) {
  const byWall = useMemo(() => {
    const groups: Record<WallId, Placement[]> = { north: [], east: [], south: [], west: [] };
    for (const p of room.placements) groups[p.wall].push(p);
    return groups;
  }, [room.placements]);

  return (
    <>
      {WALLS.map((wall) => {
        const t = wallTransform(room, wall);
        return (
          <group key={wall} position={t.position} rotation-y={t.rotationY}>
            {byWall[wall].map((placement) => (
              <Painting key={placement.id} placement={placement} lit={lit} />
            ))}
          </group>
        );
      })}
    </>
  );
}

/**
 * Daylight from the skylight, casting the bench's and frames' soft shadows.
 * It follows you from room to room, so one shadow map covers wherever you are.
 */
function SkylightSun({ room }: { room: PlacedRoom }) {
  const target = useMemo(() => new Object3D(), []);
  const { x, z } = room.origin;
  return (
    <>
      <primitive object={target} position={[x, 0, z]} />
      <directionalLight
        position={[x + 1.5, room.height + 6, z + 1]}
        target={target}
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
    </>
  );
}

/**
 * What shiny surfaces (gilt frames, varnish, polished floor) reflect. Rather
 * than downloading an HDR photo, it's rendered once from a few glowing
 * panels: a bright skylight overhead and warm, dim walls around. (Neutral
 * colours, since it isn't redrawn when you change rooms.)
 */
function GalleryEnvironment() {
  return (
    <Environment resolution={256} frames={1} environmentIntensity={0.8}>
      <color attach="background" args={["#2a1d17"]} />
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
          color="#5a3328"
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

/**
 * If the 3D view fails (WebGL can't start, the graphics driver gives up),
 * switch to the 2D view and say why, instead of leaving a blank page.
 * (Devices without WebGL 2 start in 2D anyway; see GalleryExperience.)
 */
class SwitchTo2DOnError extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("3D gallery failed, switching to the 2D view", error);
    useGalleryStore.setState({
      view: "2d",
      notice: "The 3D gallery couldn't start on this device, so here's the 2D view.",
    });
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
