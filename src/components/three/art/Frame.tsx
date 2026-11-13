"use client";

import { useEffect, useMemo } from "react";
import type { Texture } from "three";
import type { FrameSettings } from "@/lib/gallery/types";
import { sweepProfile, rectanglePath } from "../geometry/sweepProfile";
import { frameProfile } from "../geometry/profiles";

/** How far the frame's inner lip overlaps the edge of the canvas, in metres. */
export const FRAME_OVERLAP = 0.006;

const FINISHES: Record<
  Exclude<FrameSettings["style"], "none">,
  { color: string; metalness: number; roughness: number; carved: boolean }
> = {
  "ornate-gilt": { color: "#d9b25c", metalness: 1, roughness: 0.32, carved: true },
  "simple-gilt": { color: "#d4ac58", metalness: 1, roughness: 0.28, carved: false },
  silver: { color: "#c9c6bf", metalness: 1, roughness: 0.3, carved: false },
  ebony: { color: "#111010", metalness: 0, roughness: 0.35, carved: false },
  "natural-oak": { color: "#9a7046", metalness: 0, roughness: 0.6, carved: false },
  float: { color: "#1a1816", metalness: 0, roughness: 0.5, carved: false },
};

interface FrameProps {
  /** Size of the visible painting (sight size), in metres. */
  width: number;
  height: number;
  style: Exclude<FrameSettings["style"], "none">;
  /** Frame width in metres (see frameWidth()). */
  frameWidth: number;
  gilt: { roughnessMap: Texture; bumpMap: Texture };
}

/**
 * A picture frame made by sweeping the style's moulding profile around the
 * painting's rectangle. The back of the frame sits on z = 0 (the wall).
 */
export function Frame({ width, height, style, frameWidth, gilt }: FrameProps) {
  const finish = FINISHES[style];

  const geometry = useMemo(() => {
    const profile = frameProfile(style, frameWidth);
    const maxZ = Math.max(...profile.map((p) => p.z));
    return sweepProfile(
      rectanglePath(width - FRAME_OVERLAP * 2, height - FRAME_OVERLAP * 2),
      profile,
      {
        closed: true,
        // Darken the low parts of the moulding: recesses catch less light.
        shade: (p) => 0.45 + 0.55 * Math.pow(p.z / maxZ, 0.8),
      },
    );
  }, [width, height, style, frameWidth]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  // UVs are in metres; scale the carving pattern to a few centimetres.
  const maps = useMemo(() => {
    if (finish.metalness < 1) return null;
    const roughnessMap = gilt.roughnessMap.clone();
    roughnessMap.repeat.set(4, 4);
    roughnessMap.needsUpdate = true;
    const bumpMap = finish.carved ? gilt.bumpMap.clone() : null;
    if (bumpMap) {
      bumpMap.repeat.set(1 / 0.08, 1 / 0.07);
      bumpMap.needsUpdate = true;
    }
    return { roughnessMap, bumpMap };
  }, [gilt, finish]);
  useEffect(
    () => () => {
      maps?.roughnessMap.dispose();
      maps?.bumpMap?.dispose();
    },
    [maps],
  );

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial
        color={finish.color}
        metalness={finish.metalness}
        // The roughness map averages ~0.37, so divide it out to keep the finish's value.
        roughness={maps ? finish.roughness / 0.37 : finish.roughness}
        roughnessMap={maps?.roughnessMap ?? null}
        bumpMap={maps?.bumpMap ?? null}
        bumpScale={0.5}
        vertexColors
        envMapIntensity={1.2}
      />
    </mesh>
  );
}
