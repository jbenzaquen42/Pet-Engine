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

export type Behavior = "idle" | "walk" | "sit" | "sleep" | "jump" | "fall" | "drag";

export interface PetProfile {
  id: string;
  name: string;
  species: Species;
  breedLabel: string;
  pattern: Pattern;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  eyeColor: string;
  size: number;
  speed: number;
  energy: number;
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
  globalScale: number;
  globalSpeed: number;
}
