"use client";

import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useRef } from "react";
import { SRGBColorSpace, type MeshStandardMaterial, type Texture } from "three";
import { imageSrc } from "@/lib/gallery/imageSrc";
import type { Placement } from "@/lib/gallery/types";
import { ErrorBoundary } from "../../ErrorBoundary";
import { REBATE_Z } from "../geometry/profiles";
import { sharedTextures } from "../textures/proceduralTextures";
import { Frame } from "./Frame";
import { framedSize } from "./placementGeometry";
import { LABEL_GAP, LABEL_SIZE } from "./labelSize";
import { WallLabel } from "./WallLabel";

/** Labels sit at a comfortable reading height, unless the painting hangs lower. */
const LABEL_HEIGHT = 1.42;
/**
 * Paintings in rooms you're not in have no spotlight of their own (see
 * PictureLights.tsx). A gentle glow from the image itself stands in, so they
 * still read through the doorway.
 */
const UNLIT_GLOW = 0.32;

/**
 * One hung work: canvas + frame + wall label. Its spotlight comes from the
 * shared pool in PictureLights.tsx.
 *
 * Positioned in the wall's local frame (see wallTransforms.ts), so it must be
 * rendered inside the wall's <group>. The group is tagged with
 * `userData.placementId`: that's how the camera rig's click and hover tests
 * know a ray hit this painting (or its frame or label) rather than the wall.
 */
export function Painting({ placement, lit }: { placement: Placement; lit: boolean }) {
  const { artwork, frame, x, y } = placement;
  const { painting, frameWidth: fw } = framedSize(placement);
  const { width, height } = painting;

  // The canvas sits in the frame's rebate, slightly off the wall.
  const canvasZ = frame.style === "none" ? 0.02 : REBATE_Z * fw;
  const labelX = width / 2 + fw + LABEL_GAP + LABEL_SIZE.width / 2;
  const labelY = Math.min(LABEL_HEIGHT, y - height / 2 + LABEL_SIZE.height / 2);
  const blank = <BlankCanvas width={width} height={height} z={canvasZ} />;

  return (
    <group position={[x, y, 0]} userData={{ placementId: placement.id }}>
      {/* The frame and label appear straight away; the picture fades in
          when its image has loaded, and stays a blank ground if it can't. */}
      <ErrorBoundary fallback={blank}>
        <Suspense fallback={blank}>
          <PaintedCanvas
            url={artwork.imageUrl}
            width={width}
            height={height}
            z={canvasZ}
            lit={lit}
          />
        </Suspense>
      </ErrorBoundary>

      {frame.style !== "none" && (
        <Frame
          width={width}
          height={height}
          style={frame.style}
          frameWidth={fw}
          gilt={sharedTextures().gilt}
        />
      )}

      {placement.showLabel && (
        <group position={[labelX, labelY - y, 0]}>
          <WallLabel artwork={artwork} />
        </group>
      )}
    </group>
  );
}

function PaintedCanvas({
  url,
  width,
  height,
  z,
  lit,
}: {
  url: string;
  width: number;
  height: number;
  z: number;
  lit: boolean;
}) {
  const image = useTexture(imageSrc(url), (t) => {
    const texture = t as Texture;
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 8;
  });
  // Free the image's GPU memory when this room is no longer shown. The
  // decoded image stays cached, so coming back re-uploads it quickly.
  useEffect(() => () => image.dispose(), [image]);

  const material = useRef<MeshStandardMaterial>(null);
  useFrame((_, delta) => {
    if (!material.current) return;
    const goal = lit ? 0 : UNLIT_GLOW;
    material.current.emissiveIntensity +=
      (goal - material.current.emissiveIntensity) * (1 - Math.exp(-delta * 3));
  });

  return (
    <mesh position-z={z} receiveShadow>
      <planeGeometry args={[width, height]} />
      {/* A little gloss, like varnish. */}
      <meshStandardMaterial
        ref={material}
        map={image}
        emissive="#ffffff"
        emissiveMap={image}
        emissiveIntensity={lit ? 0 : UNLIT_GLOW}
        roughness={0.55}
        metalness={0}
        envMapIntensity={0.25}
      />
    </mesh>
  );
}

/** A dark, primed canvas: shown while the image loads, or if it can't. */
function BlankCanvas({ width, height, z }: { width: number; height: number; z: number }) {
  return (
    <mesh position-z={z} receiveShadow>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial color="#2a2118" roughness={0.9} />
    </mesh>
  );
}
