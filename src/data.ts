import type { EngineSettings, PetProfile, TaskItem } from "./types";

export const initialPets: PetProfile[] = [
  {
    id: "bag",
    name: "Bag",
    species: "object",
    breedLabel: "training buddy",
    pattern: "punching-bag",
    primaryColor: "#f5c34b",
    secondaryColor: "#2f7caa",
    accentColor: "#4b4035",
    eyeColor: "#2a2520",
    size: 0.78,
    speed: 0.28,
    energy: 0.38
  },
  {
    id: "patch",
    name: "Patch",
    species: "cat",
    breedLabel: "patch cat",
    pattern: "patch-cat",
    primaryColor: "#fff7ec",
    secondaryColor: "#e19d55",
    accentColor: "#514238",
    eyeColor: "#3f3029",
    size: 0.82,
    speed: 0.68,
    energy: 0.54
  },
  {
    id: "keys",
    name: "Keys",
    species: "cat",
    breedLabel: "keyboard buddy",
    pattern: "keyboard-buddy",
    primaryColor: "#d4894d",
    secondaryColor: "#f2a75c",
    accentColor: "#7b4d34",
    eyeColor: "#4d3325",
    size: 1.05,
    speed: 0.56,
    energy: 0.66
  },
  {
    id: "nibbles",
    name: "Capy",
    species: "capybara",
    breedLabel: "capybara",
    pattern: "capybara",
    primaryColor: "#b77a47",
    secondaryColor: "#ffd2b8",
    accentColor: "#704b32",
    eyeColor: "#4c3325",
    size: 0.96,
    speed: 0.45,
    energy: 0.48
  },
  {
    id: "peanut",
    name: "Peanut",
    species: "elephant",
    breedLabel: "tiny elephant",
    pattern: "elephant",
    primaryColor: "#9db6c4",
    secondaryColor: "#d9eef2",
    accentColor: "#5f7480",
    eyeColor: "#34424a",
    size: 0.98,
    speed: 0.38,
    energy: 0.44
  },
  {
    id: "sprout",
    name: "Sprout",
    species: "monster",
    breedLabel: "tiny horn blob",
    pattern: "blue-monster",
    primaryColor: "#5dd4d1",
    secondaryColor: "#f7f0ff",
    accentColor: "#8b63c7",
    eyeColor: "#3d346b",
    size: 0.82,
    speed: 0.92,
    energy: 0.92
  },
  {
    id: "bandit",
    name: "Bandit",
    species: "raccoon",
    breedLabel: "ringtail buddy",
    pattern: "raccoon",
    primaryColor: "#d9c4a7",
    secondaryColor: "#5a4238",
    accentColor: "#7b5a45",
    eyeColor: "#302722",
    size: 0.92,
    speed: 0.72,
    energy: 0.62
  }
];

export const initialSettings: EngineSettings = {
  alwaysOnTop: true,
  desktopMode: false,
  panelOpen: true,
  showNames: true,
  physics: true,
  globalScale: 1,
  globalSpeed: 1
};

export const initialTasks: TaskItem[] = [
  { id: "task-water", text: "Refresh water bowls", done: false },
  { id: "task-break", text: "Take a stretch break", done: false },
  { id: "task-focus", text: "Finish one focus block", done: true }
];
