"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Mesh, MeshBasicMaterial } from "three";
import { floorCursor } from "./floorCursor";

/**
 * A soft ring on the floor showing where a click will take you, and where
 * you're heading while you glide there. Fades in and out.
 */
export function FloorCursor() {
  const ring = useRef<Mesh>(null);

  useFrame((_, delta) => {
    const mesh = ring.current;
    if (!mesh) return;
    const material = mesh.material as MeshBasicMaterial;
    const at = floorCursor.destination ?? floorCursor.hover;
    if (at) mesh.position.set(at.x, 0.006, at.z);
    const goal = at ? (floorCursor.destination ? 0.75 : 0.45) : 0;
    material.opacity += (goal - material.opacity) * (1 - Math.exp(-delta * 12));
    mesh.visible = material.opacity > 0.01;
  });

  return (
    // noPick: the rig's raycasts ignore the ring itself.
    <mesh ref={ring} rotation-x={-Math.PI / 2} userData={{ noPick: true }} visible={false}>
      <ringGeometry args={[0.17, 0.22, 48]} />
      <meshBasicMaterial color="#efe7d4" transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}
