export type Species = "cat" | "dog" | "capybara" | "elephant" | "raccoon" | "monster" | "object";

export type Pattern =
  | "patch-cat"
  | "calico"
  | "keyboard-buddy"
  | "capybara"
  | "snack-capybara"
  | "elephant"
  | "raccoon"
  | "blue-monster"
  | "punching-bag"
  | "tabby"
  | "tuxedo"
  | "yorkie";

export type AuthoredAvatar = "martyn" | "charles";
export type AvatarId = Pattern | AuthoredAvatar;
export type CompanionKind = "custom" | "catalog";
export type Behavior = "idle" | "walk" | "sit" | "sleep" | "stretch" | "watch" | "jump" | "fall" | "drag";

export interface PersonalityWeights {
  idleWeight: number;
  walkWeight: number;
  sitWeight: number;
  sleepWeight: number;
  stretchWeight: number;
  watchWeight: number;
  jumpWeight: number;
  wanderBias: number;
}

export interface PetProfile {
  id: string;
  name: string;
  species: Species;
  kind: CompanionKind;
  locked: boolean;
  summoned: boolean;
  avatar: AvatarId;
  pattern: Pattern;
  breedLabel: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  eyeColor: string;
  size: number;
  speed: number;
  energy: number;
  personality: PersonalityWeights;
}

export interface PetRuntime {
  id: string;
  x: number;
  y: number;
  direction: 1 | -1;
  behavior: Behavior;
  vy: number;
  phase: number;
  stateStartedAt: number;
  targetX?: number;
  lastInteractionAt: number;
}

export interface CompanionState {
  schemaVersion: number;
  companions: PetProfile[];
}

export interface TaskItem {
  id: string;
  text: string;
  done: boolean;
}

export interface EngineSettings {
  alwaysOnTop: boolean;
  desktopMode: boolean;
  panelOpen: boolean;
  showNames: boolean;
  physics: boolean;
  clickThrough: boolean;
  globalScale: number;
  globalSpeed: number;
}
