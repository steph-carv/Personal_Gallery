"use client";

import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Object3D, SRGBColorSpace, type SpotLight, type Texture } from "three";
import { useGalleryStore } from "@/lib/gallery/useGalleryStore";
import type { Placement, Room } from "@/lib/gallery/types";
import { frameWidth as computeFrameWidth, REBATE_Z } from "../geometry/profiles";
import { Frame } from "./Frame";
import { paintingSize } from "./paintingSize";
import { LABEL_GAP, LABEL_SIZE, WallLabel } from "./WallLabel";

/** Labels sit at a comfortable reading height, unless the painting hangs lower. */
const LABEL_HEIGHT = 1.42;

interface PaintingProps {
  placement: Placement;
  room: Room;
  gilt: { roughnessMap: Texture; bumpMap: Texture };
}

/** Spotlight brightness, normally and when the painting is hovered or selected. */
const LIGHT_INTENSITY = 45;
const LIGHT_HIGHLIGHT = 70;

/**
 * One hung work: canvas + frame + wall label + its own spotlight.
 *
 * Everything is positioned in the wall's local frame (see wallTransforms.ts),
 * so this component must be rendered inside the wall's <group>.
 *
 * The group is tagged with `userData.placementId`. That's how the camera
 * rig's click and hover tests know a ray hit this painting (or its frame or
 * label) rather than the wall.
 */
export function Painting({ placement, room, gilt }: PaintingProps) {
  const { artwork, frame, x, y } = placement;
  const { width, height } = paintingSize(artwork);
  const fw = frame.style === "none" ? 0 : computeFrameWidth(frame, Math.max(width, height));

  const image = useTexture(artwork.imageUrl, (t) => {
    const texture = t as Texture;
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 8;
  });

  // The canvas sits in the frame's rebate, slightly off the wall.
  const canvasZ = frame.style === "none" ? 0.02 : REBATE_Z * fw;

  const labelX = width / 2 + fw + LABEL_GAP + LABEL_SIZE.width / 2;
  const labelY = Math.min(LABEL_HEIGHT, y - height / 2 + LABEL_SIZE.height / 2);

  const highlighted = useGalleryStore(
    (s) => s.hoveredId === placement.id || s.focusedId === placement.id,
  );

  return (
    <group position={[x, y, 0]} userData={{ placementId: placement.id }}>
      <mesh position-z={canvasZ} receiveShadow>
        <planeGeometry args={[width, height]} />
        {/* A little gloss, like varnish. */}
        <meshStandardMaterial map={image} roughness={0.55} metalness={0} envMapIntensity={0.25} />
      </mesh>

      {frame.style !== "none" && (
        <Frame width={width} height={height} style={frame.style} frameWidth={fw} gilt={gilt} />
      )}

      {placement.showLabel && (
        <group position={[labelX, labelY - y, 0]}>
          <WallLabel artwork={artwork} />
        </group>
      )}

      <PictureLight
        width={width + fw * 2}
        height={height + fw * 2}
        room={room}
        paintingY={y}
        highlighted={highlighted}
      />
    </group>
  );
}

/**
 * A ceiling-mounted spotlight aimed at the painting, sized so the pool of
 * light covers the frame with a soft edge spilling onto the wall.
 */
function PictureLight({
  width,
  height,
  room,
  paintingY,
  highlighted,
}: {
  width: number;
  height: number;
  room: Room;
  paintingY: number;
  highlighted: boolean;
}) {
  // Mounted near the ceiling, 1.8 m out from the wall: a typical gallery
  // track position, steep enough not to glare off the varnish.
  const mount: [number, number, number] = [0, room.height - 0.25 - paintingY, 1.8];
  const distance = Math.hypot(mount[1], mount[2]);
  const radius = Math.hypot(width, height) / 2;
  const angle = Math.min(0.75, Math.atan(radius / distance) * 1.35);

  // The light aims at a target object, which must be in the scene so its
  // world position updates. It sits at the painting's centre.
  const target = useMemo(() => new Object3D(), []);

  // Ease the brightness up and down rather than switching it.
  const light = useRef<SpotLight>(null);
  useFrame((_, delta) => {
    if (!light.current) return;
    const goal = highlighted ? LIGHT_HIGHLIGHT : LIGHT_INTENSITY;
    light.current.intensity += (goal - light.current.intensity) * (1 - Math.exp(-delta * 8));
  });

  return (
    <>
      <primitive object={target} position={[0, 0, 0]} />
      <spotLight
        ref={light}
        position={mount}
        target={target}
        angle={angle}
        penumbra={0.7}
        intensity={LIGHT_INTENSITY}
        decay={2}
        distance={0}
        color="#ffe6c4"
        castShadow
        shadow-mapSize={[512, 512]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-near={0.5}
        shadow-camera-far={distance + 2}
      />
    </>
  );
}
