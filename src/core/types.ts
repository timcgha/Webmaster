export type Difficulty = "Easy" | "Normal" | "Hard";
export type SaveKind = "manual" | "checkpoint";
export type SlotId = 1 | 2 | 3;

export interface Vec3Data {
  x: number;
  y: number;
  z: number;
}

export interface RunSavePayload {
  schemaVersion: 1;
  skyline?: import("./skyline").SkylineSave;
  climb?: import("./traversal").ClimbSave;
  course?: import("./course").CourseSave;
  slot: SlotId;
  difficulty: Difficulty;
  health: number;
  maxHealth: number;
  position: Vec3Data;
  checkpoint: Vec3Data;
  progress: number;
  progressLabel: string;
  costumeId: "skyline-teal";
  completion: boolean;
  updatedAt: number;
}

export interface GameSettings {
  cameraSensitivity: number;
  invertY: boolean;
  adaptiveQuality: boolean;
}

export const DEFAULT_SETTINGS: GameSettings = {
  cameraSensitivity: 1,
  invertY: false,
  adaptiveQuality: true,
};

export interface SemanticActions {
  moveX: number;
  moveY: number;
  lookX: number;
  lookY: number;
  run: boolean;
  swingHeld?: boolean;
  climbHeld?: boolean;
  pullHeld?: boolean;
  jumpPressed: boolean;
  recenterPressed: boolean;
  pausePressed: boolean;
  confirmPressed: boolean;
  backPressed: boolean;
  menuX: -1 | 0 | 1;
  menuY: -1 | 0 | 1;
  source: "keyboard-mouse" | "gamepad" | "mixed";
}

export interface MotionState {
  position: Vec3Data;
  velocity: Vec3Data;
  grounded: boolean;
  facingYaw: number;
}

export interface MotionInput {
  moveX: number;
  moveY: number;
  run: boolean;
  jumpPressed: boolean;
  cameraForward: Vec3Data;
}

export interface MotionEnvironment {
  floorHeightAt(x: number, z: number): number | null;
  blocks(x: number, z: number, radius: number): boolean;
}
