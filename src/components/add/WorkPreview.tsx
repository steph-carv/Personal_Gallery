"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense, useMemo } from "react";
import { NeutralToneMapping } from "three";
import { Painting } from "@/components/three/art/Painting";
import { framedSize } from "@/components/three/art/placementGeometry";
import type { Artwork, Placement } from "@/lib/gallery/types";

const FRAME = { style: "simple-gilt", width: "standard" } as const;

/**
 * A small 3D preview of a work on a patch of the chosen room's wall, in the
 * frame it will get, with its label and a spotlight: the same Painting
 * component the gallery uses, so what you see is what you'll hang.
 */
export default function WorkPreview(props: {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  widthCm: number;
  heightCm: number;
  wallColor: string;
  lowerWallColor: string;
}) {
  const placement = useMemo<Placement>(() => {
    const artwork: Artwork = {
      id: "preview",
      source: "user",
      sourceId: "preview",
      title: "",
      artist: "",
      artistMeta: {},
      dateText: "",
      medium: "",
      dimensionsText: "",
      // Unknown real size: show it at a typical easel-painting size.
      widthCm: props.widthCm || (props.imageWidth >= props.imageHeight ? 90 : 70),
      heightCm: props.heightCm || (props.imageWidth >= props.imageHeight ? 70 : 90),
      holder: "",
      imageUrl: props.imageUrl,
      imageWidth: props.imageWidth,
      imageHeight: props.imageHeight,
      attribution: "",
      sourceUrl: "",
    };
    const size = framedSize({ artwork, frame: FRAME } as Placement);
    return {
      id: "preview",
      artwork,
      wall: "north",
      x: 0,
      y: Math.max(1.6, 1.05 + size.height / 2),
      frame: FRAME,
      showLabel: false,
    };
  }, [props.imageUrl, props.imageWidth, props.imageHeight, props.widthCm, props.heightCm]);

  // Stand back far enough to see the frame with some wall around it.
  const size = framedSize(placement);
  const distance = Math.max(1.2, Math.max(size.width / 1.2, size.height) * 1.6);

  return (
    <Canvas
      key={props.imageUrl}
      dpr={[1, 1.75]}
      camera={{ position: [0, placement.y, distance], fov: 45, near: 0.05, far: 30 }}
      onCreated={({ gl, camera }) => {
        gl.toneMapping = NeutralToneMapping;
        camera.lookAt(0, placement.y, 0);
      }}
    >
      <color attach="background" args={[props.wallColor]} />
      <ambientLight intensity={0.5} color="#ffe9cf" />
      <hemisphereLight args={["#fff1dc", "#a08a76", 1.2]} />
      <spotLight
        position={[0, placement.y + 2.6, 1.8]}
        angle={0.55}
        penumbra={0.7}
        intensity={30}
        decay={2}
        color="#ffe6c4"
        target-position={[0, placement.y, 0]}
      />
      {/* Wall, lower wall and dado rail */}
      <mesh position={[0, 2.5, 0]}>
        <planeGeometry args={[12, 5]} />
        <meshStandardMaterial color={props.wallColor} roughness={0.92} />
      </mesh>
      <mesh position={[0, 0.45, 0.002]}>
        <planeGeometry args={[12, 0.9]} />
        <meshStandardMaterial color={props.lowerWallColor} roughness={0.92} />
      </mesh>
      <mesh position={[0, 0.9, 0.02]}>
        <boxGeometry args={[12, 0.06, 0.04]} />
        <meshStandardMaterial color="#efe7d4" roughness={0.6} />
      </mesh>
      <Suspense fallback={null}>
        <Painting placement={placement} lit />
      </Suspense>
    </Canvas>
  );
}
