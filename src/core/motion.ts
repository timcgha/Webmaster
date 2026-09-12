import type { MotionEnvironment, MotionInput, MotionState, Vec3Data } from "./types";

export const FIXED_STEP = 1 / 60;
export const MAX_FRAME_DELTA = 0.1;
export const MAX_STEPS_PER_FRAME = 6;

const GRAVITY = -22;
const JUMP_SPEED = 8.2;
const WALK_SPEED = 5;
const RUN_SPEED = 8;
const ACCELERATION = 24;
const DECELERATION = 30;
const HERO_RADIUS = 0.48;

function approach(current: number, target: number, amount: number): number {
  if (current < target) return Math.min(current + amount, target);
  return Math.max(current - amount, target);
}

function normalize2(x: number, z: number): { x: number; z: number; length: number } {
  const length = Math.hypot(x, z);
  if (length < 0.0001) return { x: 0, z: 0, length: 0 };
  return { x: x / length, z: z / length, length };
}

export function stepMotion(
  state: MotionState,
  input: MotionInput,
  environment: MotionEnvironment,
  delta = FIXED_STEP,
): MotionState {
  const forward = normalize2(input.cameraForward.x, input.cameraForward.z);
  const right = { x: forward.z, z: -forward.x };
  const desired = normalize2(
    right.x * input.moveX + forward.x * input.moveY,
    right.z * input.moveX + forward.z * input.moveY,
  );
  const speed = input.run ? RUN_SPEED : WALK_SPEED;
  const accel = desired.length > 0 ? ACCELERATION : DECELERATION;

  const velocity = { ...state.velocity };
  velocity.x = approach(velocity.x, desired.x * speed, accel * delta);
  velocity.z = approach(velocity.z, desired.z * speed, accel * delta);

  if (input.jumpPressed && state.grounded) {
    velocity.y = JUMP_SPEED;
  }
  velocity.y += GRAVITY * delta;

  const position = { ...state.position };
  const nextX = position.x + velocity.x * delta;
  if (!environment.blocks(nextX, position.z, HERO_RADIUS)) {
    position.x = nextX;
  } else {
    velocity.x = 0;
  }

  const nextZ = position.z + velocity.z * delta;
  if (!environment.blocks(position.x, nextZ, HERO_RADIUS)) {
    position.z = nextZ;
  } else {
    velocity.z = 0;
  }

  position.y += velocity.y * delta;
  const floor = environment.floorHeightAt(position.x, position.z);
  let grounded = false;
  if (floor !== null && position.y <= floor && velocity.y <= 0) {
    position.y = floor;
    velocity.y = 0;
    grounded = true;
  }

  let facingYaw = state.facingYaw;
  if (desired.length > 0.05) facingYaw = Math.atan2(desired.x, desired.z);

  return { position, velocity, grounded, facingYaw };
}

export function runFixedFrames(
  initial: MotionState,
  input: Omit<MotionInput, "jumpPressed"> & { jumpAtStart?: boolean },
  environment: MotionEnvironment,
  frameDeltas: number[],
): MotionState {
  let state: MotionState = structuredClone(initial);
  let accumulator = 0;
  let jumpPending = input.jumpAtStart ?? false;
  for (const frameDelta of frameDeltas) {
    accumulator += Math.min(Math.max(frameDelta, 0), MAX_FRAME_DELTA);
    let steps = 0;
    while (accumulator >= FIXED_STEP && steps < MAX_STEPS_PER_FRAME) {
      state = stepMotion(state, { ...input, jumpPressed: jumpPending }, environment);
      jumpPending = false;
      accumulator -= FIXED_STEP;
      steps += 1;
    }
    if (steps === MAX_STEPS_PER_FRAME) accumulator = 0;
  }
  return state;
}

export function copyVec3(value: Vec3Data): Vec3Data {
  return { x: value.x, y: value.y, z: value.z };
}
