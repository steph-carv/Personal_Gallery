"use client";

import { PointerLockControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useRef } from "react";
import { Vector3 } from "three";
import type { PointerLockControls as PointerLockControlsImpl } from "three-stdlib";
import { useGalleryStore } from "@/lib/gallery/useGalleryStore";

/** Eye height in metres. */
export const EYE_HEIGHT = 1.62;
/** Comfortable gallery strolling pace, in metres per second. Shift walks faster. */
const WALK_SPEED = 1.5;
const FAST_SPEED = 2.8;
/** How quickly you reach full speed and stop again (higher = snappier). */
const EASING = 7;
/** How close you can get to a wall or the bench, in metres. */
const BODY_RADIUS = 0.35;

export interface Obstacle {
  /** Axis-aligned box on the floor: centre and size in metres. */
  x: number;
  z: number;
  width: number;
  depth: number;
}

interface WalkControlsProps {
  /** Interior size of the room, centred on the origin. */
  roomWidth: number;
  roomDepth: number;
  obstacles: Obstacle[];
}

const KEYS = {
  forward: ["KeyW", "ArrowUp"],
  back: ["KeyS", "ArrowDown"],
  left: ["KeyA", "ArrowLeft"],
  right: ["KeyD", "ArrowRight"],
  fast: ["ShiftLeft", "ShiftRight"],
};

/**
 * Desktop first-person movement: mouse to look (pointer lock), WASD or arrow
 * keys to walk. Movement eases in and out rather than starting and stopping
 * dead, and you can't walk through the walls or the bench.
 */
export function WalkControls({ roomWidth, roomDepth, obstacles }: WalkControlsProps) {
  const camera = useThree((s) => s.camera);
  const controls = useRef<PointerLockControlsImpl>(null);
  const pressed = useRef(new Set<string>());
  const velocity = useRef(new Vector3());
  const walking = useGalleryStore((s) => s.walking);
  const setWalking = useGalleryStore((s) => s.setWalking);
  const registerStartWalking = useGalleryStore((s) => s.registerStartWalking);

  useEffect(() => {
    registerStartWalking(() => controls.current?.lock());
  }, [registerStartWalking]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => pressed.current.add(e.code);
    const up = (e: KeyboardEvent) => pressed.current.delete(e.code);
    const clear = () => pressed.current.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
    };
  }, []);

  // Reused every frame to avoid creating garbage.
  const forward = useRef(new Vector3());
  const right = useRef(new Vector3());
  const wish = useRef(new Vector3());

  useFrame((_, rawDelta) => {
    // Clamp so a dropped frame (or a backgrounded tab) can't teleport you.
    const delta = Math.min(rawDelta, 0.1);
    const is = (names: string[]) => names.some((n) => pressed.current.has(n));

    wish.current.set(0, 0, 0);
    if (walking) {
      // Walk along the floor in the direction you're looking, ignoring pitch.
      camera.getWorldDirection(forward.current);
      forward.current.y = 0;
      forward.current.normalize();
      right.current.crossVectors(forward.current, camera.up).normalize();

      if (is(KEYS.forward)) wish.current.add(forward.current);
      if (is(KEYS.back)) wish.current.sub(forward.current);
      if (is(KEYS.right)) wish.current.add(right.current);
      if (is(KEYS.left)) wish.current.sub(right.current);
      if (wish.current.lengthSq() > 0) {
        wish.current.normalize().multiplyScalar(is(KEYS.fast) ? FAST_SPEED : WALK_SPEED);
      }
    }

    // Ease velocity towards the wished-for velocity (frame-rate independent).
    velocity.current.lerp(wish.current, 1 - Math.exp(-EASING * delta));
    if (velocity.current.lengthSq() < 1e-6) return;

    const from = camera.position;
    const to = resolveCollisions(
      from.x,
      from.z,
      from.x + velocity.current.x * delta,
      from.z + velocity.current.z * delta,
      roomWidth,
      roomDepth,
      obstacles,
    );
    camera.position.set(to.x, EYE_HEIGHT, to.z);
  });

  const onLock = useCallback(() => setWalking(true), [setWalking]);
  const onUnlock = useCallback(() => setWalking(false), [setWalking]);

  // `selector`: clicking the 3D view (the element with this id) also starts walking.
  return (
    <PointerLockControls
      ref={controls}
      selector="#gallery-scene"
      onLock={onLock}
      onUnlock={onUnlock}
    />
  );
}

/**
 * Keep the walker inside the room and out of obstacles. Each axis is tried
 * separately, so walking diagonally into a wall slides along it instead of
 * stopping dead.
 */
function resolveCollisions(
  fromX: number,
  fromZ: number,
  toX: number,
  toZ: number,
  roomWidth: number,
  roomDepth: number,
  obstacles: Obstacle[],
) {
  const maxX = roomWidth / 2 - BODY_RADIUS;
  const maxZ = roomDepth / 2 - BODY_RADIUS;
  const clampX = (x: number) => Math.max(-maxX, Math.min(maxX, x));
  const clampZ = (z: number) => Math.max(-maxZ, Math.min(maxZ, z));

  const blocked = (x: number, z: number) =>
    obstacles.some(
      (o) =>
        Math.abs(x - o.x) < o.width / 2 + BODY_RADIUS &&
        Math.abs(z - o.z) < o.depth / 2 + BODY_RADIUS,
    );

  let x = clampX(toX);
  let z = fromZ;
  if (blocked(x, z)) x = fromX;
  z = clampZ(toZ);
  if (blocked(x, z)) z = fromZ;
  return { x, z };
}
