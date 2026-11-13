"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  CatmullRomCurve3,
  LineCurve3,
  MathUtils,
  Raycaster,
  Vector2,
  Vector3,
  type Curve,
  type Object3D,
  type PerspectiveCamera,
} from "three";
import { tourOrder } from "@/lib/gallery/tour";
import type { Placement, Room } from "@/lib/gallery/types";
import { useGalleryStore } from "@/lib/gallery/useGalleryStore";
import { floorCursor } from "./floorCursor";
import { clampToWalkable, planPath, resolveCollisions, type FloorPlan } from "./navigation";
import { detailPose, EYE_HEIGHT, headingYaw, tourPose, type CameraPose } from "./poses";

/**
 * The camera rig: the one place that moves the camera.
 *
 * It keeps the camera's pose as position + yaw + pitch, and changes it from:
 * - keyboard walking (WASD / arrows, Shift to hurry), with collisions;
 * - dragging to look around (mouse or touch), or mouse look (pointer lock);
 * - glides: smooth, eased camera moves along a path that avoids the bench,
 *   used for click-to-walk, the painting tour and stepping into the detail view.
 *
 * Clicks and hovers are worked out here too, by casting a ray from the
 * pointer (or from the screen centre in mouse-look mode) into the scene and
 * checking what it hits first: a painting (see userData.placementId in
 * Painting.tsx) or the floor.
 */

/** Comfortable gallery strolling pace in metres per second; Shift is faster. */
const WALK_SPEED = 1.5;
const FAST_SPEED = 2.8;
/** How quickly you reach full speed and stop again (higher is snappier). */
const EASING = 7;
/** Glide speed along the floor, in metres per second. */
const GLIDE_SPEED = 1.6;
/** Mouse-look sensitivity, in radians per pixel of mouse movement. */
const MOUSE_LOOK_SPEED = 0.0022;
/** A press that moves less than this many pixels is a click, not a drag. */
const CLICK_SLOP = 6;
const MAX_PITCH = 1.1;

const MOVE_KEYS = {
  forward: ["KeyW", "ArrowUp"],
  back: ["KeyS", "ArrowDown"],
  left: ["KeyA", "ArrowLeft"],
  right: ["KeyD", "ArrowRight"],
  fast: ["ShiftLeft", "ShiftRight"],
};
const ALL_MOVE_KEYS = new Set([
  ...MOVE_KEYS.forward,
  ...MOVE_KEYS.back,
  ...MOVE_KEYS.left,
  ...MOVE_KEYS.right,
]);

interface Glide {
  /** Horizontal path; y is interpolated separately. */
  path: Curve<Vector3>;
  fromY: number;
  toY: number;
  fromYaw: number;
  yawChange: number;
  fromPitch: number;
  pitchChange: number;
  duration: number;
  elapsed: number;
  /** Fraction of the glide over which to turn (1 = the whole way). */
  turnBy: number;
  onArrive?: () => void;
}

interface CameraRigProps {
  room: Room;
  plan: FloorPlan;
  reducedMotion: boolean;
}

export function CameraRig({ room, plan, reducedMotion }: CameraRigProps) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const store = useGalleryStore;

  const placements = useMemo(() => tourOrder(room.placements), [room.placements]);
  const byId = useMemo(
    () => new Map<string, Placement>(room.placements.map((p) => [p.id, p])),
    [room.placements],
  );

  // The pose. Position lives on the camera itself.
  const yaw = useRef(0);
  const pitch = useRef(Math.atan2(1.9 - EYE_HEIGHT, room.depth));
  const velocity = useRef(new Vector3());
  const glide = useRef<Glide | null>(null);
  /** Where to go back to when the detail view closes. */
  const returnTo = useRef<{ pose: CameraPose; focusedId: string | null } | null>(null);

  const pressed = useRef(new Set<string>());
  const drag = useRef<{
    id: number;
    x: number;
    y: number;
    yaw: number;
    pitch: number;
    moved: boolean;
  } | null>(null);
  const pointer = useRef<{ ndc: Vector2; inside: boolean; mouse: boolean }>({
    ndc: new Vector2(),
    inside: false,
    mouse: false,
  });
  const raycaster = useMemo(() => new Raycaster(), []);
  // The canvas element, for setting the cursor from inside useFrame.
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    canvasRef.current = gl.domElement;
  }, [gl]);

  const lens = useCallback(() => ({ fov: camera.fov, aspect: camera.aspect }), [camera]);
  const currentPose = useCallback(
    (): CameraPose => ({
      position: camera.position.clone(),
      yaw: yaw.current,
      pitch: pitch.current,
    }),
    [camera],
  );

  /* ---------------------------------------------------------------------- */
  /* Moving the camera                                                       */
  /* ---------------------------------------------------------------------- */

  /** Jump straight to a pose (used for reduced motion and deep links). */
  const cutTo = useCallback(
    (pose: CameraPose, onArrive?: () => void) => {
      glide.current = null;
      velocity.current.set(0, 0, 0);
      camera.position.copy(pose.position);
      yaw.current = pose.yaw;
      pitch.current = pose.pitch;
      store.setState((s) => ({ cuts: s.cuts + 1 }));
      onArrive?.();
    },
    [camera, store],
  );

  /** Glide smoothly to a pose, routing round the bench. */
  const glideTo = useCallback(
    (pose: CameraPose, options: { turnBy?: number; onArrive?: () => void } = {}) => {
      if (reducedMotion) return cutTo(pose, options.onArrive);

      const from = { x: camera.position.x, z: camera.position.z };
      const to = { x: pose.position.x, z: pose.position.z };
      const route = planPath(from, to, plan).map((p) => new Vector3(p.x, 0, p.z));
      const path: Curve<Vector3> =
        route.length > 2
          ? new CatmullRomCurve3(route, false, "centripetal")
          : new LineCurve3(route[0], route[route.length - 1]);

      const yawChange =
        MathUtils.euclideanModulo(pose.yaw - yaw.current + Math.PI, Math.PI * 2) - Math.PI;
      const pitchChange = pose.pitch - pitch.current;
      const distance = path.getLength() + Math.abs(pose.position.y - camera.position.y);
      const turn = Math.max(Math.abs(yawChange), Math.abs(pitchChange));
      const duration = MathUtils.clamp(Math.max(distance / GLIDE_SPEED, turn / 1.4), 0.5, 3.2);

      velocity.current.set(0, 0, 0);
      glide.current = {
        path,
        fromY: camera.position.y,
        toY: pose.position.y,
        fromYaw: yaw.current,
        yawChange,
        fromPitch: pitch.current,
        pitchChange,
        duration,
        elapsed: 0,
        turnBy: options.turnBy ?? 1,
        onArrive: options.onArrive,
      };
    },
    [camera, plan, reducedMotion, cutTo],
  );

  const tourTo = useCallback(
    (id: string) => {
      const placement = byId.get(id);
      if (!placement || store.getState().detailId) return;
      store.setState({ focusedId: id, introDismissed: true });
      glideTo(tourPose(room, placement, plan, lens()));
    },
    [byId, store, glideTo, room, plan, lens],
  );

  const tourStep = useCallback(
    (direction: 1 | -1) => {
      const { focusedId } = store.getState();
      const index = placements.findIndex((p) => p.id === focusedId);
      if (index >= 0) {
        const next = placements[(index + direction + placements.length) % placements.length];
        return tourTo(next.id);
      }
      // Not at a painting yet: start with the one nearest to where you stand.
      const here = camera.position;
      const nearest = [...placements].sort(
        (a, b) =>
          tourPose(room, a, plan, lens()).position.distanceTo(here) -
          tourPose(room, b, plan, lens()).position.distanceTo(here),
      )[0];
      if (nearest) tourTo(nearest.id);
    },
    [store, placements, tourTo, camera, room, plan, lens],
  );

  const tourStart = useCallback(() => {
    if (placements[0]) tourTo(placements[0].id);
  }, [placements, tourTo]);

  const walkTo = useCallback(
    (point: Vector3) => {
      const spot = clampToWalkable({ x: point.x, z: point.z }, plan);
      const from = { x: camera.position.x, z: camera.position.z };
      if (Math.hypot(spot.x - from.x, spot.z - from.z) < 0.15) return;
      const route = planPath(from, spot, plan);
      const last = route[route.length - 2];
      floorCursor.destination = new Vector3(spot.x, 0, spot.z);
      store.setState({ focusedId: null, introDismissed: true });
      glideTo(
        {
          position: new Vector3(spot.x, EYE_HEIGHT, spot.z),
          // Face the way you're walking, with the head level.
          yaw: headingYaw(last, spot),
          pitch: 0,
        },
        { turnBy: 0.5, onArrive: () => (floorCursor.destination = null) },
      );
    },
    [camera, plan, store, glideTo],
  );

  const startMouseLook = useCallback(() => {
    store.setState({ introDismissed: true });
    // Must be called from a click handler: browsers only allow pointer lock
    // in response to a user gesture.
    void gl.domElement.requestPointerLock?.();
  }, [gl, store]);

  useEffect(() => {
    store.setState({ camera: { tourTo, tourStep, tourStart, startMouseLook } });
  }, [store, tourTo, tourStep, tourStart, startMouseLook]);

  // Dev-only console helper, e.g. salonDebug.view([0, 1.6, 2], [0, 1.6, -4.5])
  // to stand somewhere and look at a point. Handy for screenshots.
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    (window as unknown as { salonDebug: object }).salonDebug = {
      camera,
      store,
      view: (from: [number, number, number], at: [number, number, number]) => {
        glide.current = null;
        camera.position.set(...from);
        yaw.current = headingYaw({ x: from[0], z: from[2] }, { x: at[0], z: at[2] });
        pitch.current = Math.atan2(at[1] - from[1], Math.hypot(at[0] - from[0], at[2] - from[2]));
      },
    };
  }, [camera, store]);

  /* ---------------------------------------------------------------------- */
  /* The detail view (driven by the URL, via the store)                      */
  /* ---------------------------------------------------------------------- */

  const firstSync = useRef(true);
  useEffect(() => {
    const onDetailChange = (previousId: string | null, id: string | null) => {
      const initial = firstSync.current;
      firstSync.current = false;
      const placement = id ? byId.get(id) : undefined;

      if (placement) {
        if (!previousId) {
          // Remember where to return to. A deep link has nowhere to return
          // to, so use the painting's tour spot.
          returnTo.current = initial
            ? { pose: tourPose(room, placement, plan, lens()), focusedId: placement.id }
            : { pose: currentPose(), focusedId: store.getState().focusedId };
          if (document.pointerLockElement) document.exitPointerLock();
        }
        store.setState({
          focusedId: placement.id,
          hoveredId: null,
          introDismissed: true,
          // Switching between paintings keeps the overlay up.
          detailReady: Boolean(previousId) && !initial,
        });
        // Matches the overlay's `lg` breakpoint, where it goes side by side.
        const sideBySide = window.innerWidth >= 1024 && camera.aspect > 1;
        const pose = detailPose(room, placement, lens(), sideBySide);
        const arrive = () => store.setState({ detailReady: true });
        if (initial) cutTo(pose, arrive);
        else glideTo(pose, { onArrive: arrive });
        return;
      }

      if (previousId) {
        store.setState({ detailReady: false });
        const back = returnTo.current;
        returnTo.current = null;
        if (back) {
          store.setState({ focusedId: back.focusedId });
          glideTo(back.pose);
        }
      }
    };

    const startId = store.getState().detailId;
    if (startId) onDetailChange(null, startId);
    else firstSync.current = false;

    return store.subscribe((state, prev) => {
      if (state.detailId !== prev.detailId) onDetailChange(prev.detailId, state.detailId);
    });
  }, [store, byId, room, plan, lens, currentPose, cutTo, glideTo, camera]);

  /* ---------------------------------------------------------------------- */
  /* Input                                                                   */
  /* ---------------------------------------------------------------------- */

  /** First thing the ray hits: a painting, the floor, or something else. */
  const pick = useCallback(
    (ndc: Vector2): { placementId?: string; floorPoint?: Vector3 } => {
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(scene.children, true);
      const hit = hits.find((h) => h.object.visible && !h.object.userData.noPick);
      if (!hit) return {};
      for (let o: Object3D | null = hit.object; o; o = o.parent) {
        if (o.userData.placementId) return { placementId: o.userData.placementId as string };
      }
      if (hit.object.userData.floor) return { floorPoint: hit.point };
      return {};
    },
    [raycaster, camera, scene],
  );

  const activate = useCallback(
    (ndc: Vector2) => {
      const target = pick(ndc);
      if (target.placementId) store.getState().openDetail(target.placementId);
      else if (target.floorPoint) walkTo(target.floorPoint);
    },
    [pick, store, walkTo],
  );

  useEffect(() => {
    const canvas = gl.domElement;
    const centre = new Vector2(0, 0);
    const locked = () => document.pointerLockElement === canvas;
    const toNdc = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return new Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
    };
    const busy = () => Boolean(store.getState().detailId);

    const onPointerDown = (e: PointerEvent) => {
      if (busy() || e.button !== 0 || drag.current) return;
      store.setState({ introDismissed: true });
      drag.current = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        yaw: yaw.current,
        pitch: pitch.current,
        moved: false,
      };
      if (!locked()) canvas.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      pointer.current.mouse = e.pointerType === "mouse";
      if (locked()) {
        if (busy()) return;
        yaw.current -= e.movementX * MOUSE_LOOK_SPEED;
        pitch.current = MathUtils.clamp(
          pitch.current - e.movementY * MOUSE_LOOK_SPEED,
          -MAX_PITCH,
          MAX_PITCH,
        );
        return;
      }
      pointer.current.ndc.copy(toNdc(e));
      pointer.current.inside = true;

      const d = drag.current;
      if (!d || d.id !== e.pointerId) return;
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      if (!d.moved && Math.hypot(dx, dy) < CLICK_SLOP) return;
      if (!d.moved) {
        d.moved = true;
        glide.current = null; // looking around cancels a glide
        canvas.style.cursor = "grabbing";
      }
      // "Grab the room": dragging right turns you left, like Street View.
      // One screen-height of drag turns you by one field of view.
      const perPixel = MathUtils.degToRad(camera.fov) / canvas.clientHeight;
      yaw.current = d.yaw + dx * perPixel;
      pitch.current = MathUtils.clamp(d.pitch + dy * perPixel, -MAX_PITCH, MAX_PITCH);
    };

    const onPointerUp = (e: PointerEvent) => {
      const d = drag.current;
      if (!d || d.id !== e.pointerId) return;
      drag.current = null;
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
      canvas.style.cursor = "";
      if (!d.moved && !busy()) activate(locked() ? centre : toNdc(e));
    };

    const onPointerCancel = (e: PointerEvent) => {
      if (drag.current?.id === e.pointerId) drag.current = null;
      canvas.style.cursor = "";
    };
    const onPointerLeave = () => {
      if (!locked()) pointer.current.inside = false;
    };
    const onLockChange = () => store.setState({ mouseLook: locked() });

    const isTyping = (e: KeyboardEvent) =>
      e.target instanceof HTMLElement &&
      (e.target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName));
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTyping(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      pressed.current.add(e.code);
      if (ALL_MOVE_KEYS.has(e.code) && !busy()) {
        store.setState({ introDismissed: true });
        e.preventDefault(); // stop arrow keys scrolling the page
      }
    };
    const onKeyUp = (e: KeyboardEvent) => pressed.current.delete(e.code);
    const onBlur = () => {
      pressed.current.clear();
      drag.current = null;
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerCancel);
    canvas.addEventListener("pointerleave", onPointerLeave);
    document.addEventListener("pointerlockchange", onLockChange);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerCancel);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      document.removeEventListener("pointerlockchange", onLockChange);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [gl, camera, store, activate]);

  /* ---------------------------------------------------------------------- */
  /* Every frame                                                             */
  /* ---------------------------------------------------------------------- */

  const forward = useMemo(() => new Vector3(), []);
  const right = useMemo(() => new Vector3(), []);
  const wish = useMemo(() => new Vector3(), []);
  const point = useMemo(() => new Vector3(), []);

  useFrame((_, rawDelta) => {
    // Clamp so a dropped frame (or a background tab) can't teleport you.
    const delta = Math.min(rawDelta, 0.1);
    const state = store.getState();
    const inDetail = Boolean(state.detailId);
    const is = (names: string[]) => names.some((n) => pressed.current.has(n));
    const wantsToMove =
      !inDetail &&
      (is(MOVE_KEYS.forward) || is(MOVE_KEYS.back) || is(MOVE_KEYS.left) || is(MOVE_KEYS.right));

    // 1. Glides, unless you've taken over with the keyboard.
    if (glide.current && wantsToMove) {
      glide.current = null;
      floorCursor.destination = null;
    }
    const g = glide.current;
    if (g) {
      g.elapsed += delta;
      const t = Math.min(1, g.elapsed / g.duration);
      const move = easeInOutCubic(t);
      const turn = easeInOutCubic(Math.min(1, t / g.turnBy));
      g.path.getPointAt(move, point);
      camera.position.set(point.x, MathUtils.lerp(g.fromY, g.toY, move), point.z);
      yaw.current = g.fromYaw + g.yawChange * turn;
      pitch.current = g.fromPitch + g.pitchChange * turn;
      if (t >= 1) {
        glide.current = null;
        g.onArrive?.();
      }
    } else if (!inDetail) {
      // 2. Keyboard walking, in the direction you're facing (ignoring pitch).
      wish.set(0, 0, 0);
      if (wantsToMove) {
        forward.set(-Math.sin(yaw.current), 0, -Math.cos(yaw.current));
        right.set(-forward.z, 0, forward.x);
        if (is(MOVE_KEYS.forward)) wish.add(forward);
        if (is(MOVE_KEYS.back)) wish.sub(forward);
        if (is(MOVE_KEYS.right)) wish.add(right);
        if (is(MOVE_KEYS.left)) wish.sub(right);
        if (wish.lengthSq() > 0)
          wish.normalize().multiplyScalar(is(MOVE_KEYS.fast) ? FAST_SPEED : WALK_SPEED);
      }
      velocity.current.lerp(wish, 1 - Math.exp(-EASING * delta));
      if (velocity.current.lengthSq() > 1e-6) {
        const to = resolveCollisions(
          { x: camera.position.x, z: camera.position.z },
          {
            x: camera.position.x + velocity.current.x * delta,
            z: camera.position.z + velocity.current.z * delta,
          },
          plan,
        );
        // Ease back to eye height if a glide left you elsewhere.
        const y = MathUtils.lerp(camera.position.y, EYE_HEIGHT, 1 - Math.exp(-4 * delta));
        camera.position.set(to.x, y, to.z);
        if (state.focusedId && wantsToMove) store.setState({ focusedId: null });
      }
    }

    camera.rotation.set(pitch.current, yaw.current, 0, "YXZ");

    // 3. Hover: what's under the pointer (or the crosshair in mouse look)?
    const canHover =
      !inDetail &&
      !drag.current?.moved &&
      (state.mouseLook || (pointer.current.inside && pointer.current.mouse));
    let hovered: string | null = null;
    floorCursor.hover = null;
    if (canHover) {
      const target = pick(state.mouseLook ? new Vector2(0, 0) : pointer.current.ndc);
      hovered = target.placementId ?? null;
      if (target.floorPoint) floorCursor.hover = target.floorPoint;
      if (!state.mouseLook && canvasRef.current) {
        canvasRef.current.style.cursor = target.placementId || target.floorPoint ? "pointer" : "";
      }
    }
    if (hovered !== state.hoveredId) store.setState({ hoveredId: hovered });
  });

  return null;
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
