import {
  Activity,
  AlarmClock,
  Bell,
  Check,
  ChevronRight,
  Circle,
  Clock3,
  Dog,
  Eye,
  EyeOff,
  Footprints,
  Home,
  Keyboard,
  ListTodo,
  Minus,
  Moon,
  MousePointer2,
  NotebookPen,
  PanelRightClose,
  PanelRightOpen,
  Pause,
  Pin,
  Play,
  Plus,
  RotateCcw,
  Settings2,
  Sparkles,
  TimerReset,
  Trash2,
  X,
  Zap
} from "lucide-react";
import type { Dispatch, PointerEvent, ReactNode, SetStateAction } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { initialPets, initialSettings, initialTasks } from "./data";
import { PetAvatar } from "./PetAvatar";
import { uid, useLocalStorageState } from "./storage";
import type { Behavior, EngineSettings, PetProfile, PetRuntime, Species, TaskItem } from "./types";

const BASE_PET_SIZE = 150;
const STORAGE_KEYS = {
  pets: "personal-pet-engine:pets",
  settings: "personal-pet-engine:settings",
  notes: "personal-pet-engine:notes",
  tasks: "personal-pet-engine:tasks",
  stats: "personal-pet-engine:stats"
};

type ToolTab = "notes" | "tasks" | "timer" | "stats";

interface DragState {
  id: string;
  offsetX: number;
  offsetY: number;
}

interface StatsState {
  keys: number;
  activeSeconds: number;
  launches: number;
}

const initialStats: StatsState = {
  keys: 0,
  activeSeconds: 0,
  launches: 1
};

const speciesDefaults: Record<Species, Pick<PetProfile, "pattern" | "breedLabel" | "primaryColor" | "secondaryColor" | "accentColor" | "eyeColor">> = {
  cat: {
    pattern: "patch-cat",
    breedLabel: "patch cat",
    primaryColor: "#fff7ec",
    secondaryColor: "#e19d55",
    accentColor: "#514238",
    eyeColor: "#3f3029"
  },
  dog: {
    pattern: "yorkie",
    breedLabel: "yorkie terrier",
    primaryColor: "#9b6d3b",
    secondaryColor: "#d8b985",
    accentColor: "#393229",
    eyeColor: "#34261f"
  },
  capybara: {
    pattern: "capybara",
    breedLabel: "capybara",
    primaryColor: "#b77a47",
    secondaryColor: "#ffd2b8",
    accentColor: "#704b32",
    eyeColor: "#4c3325"
  },
  elephant: {
    pattern: "elephant",
    breedLabel: "tiny elephant",
    primaryColor: "#9db6c4",
    secondaryColor: "#d9eef2",
    accentColor: "#5f7480",
    eyeColor: "#34424a"
  },
  raccoon: {
    pattern: "raccoon",
    breedLabel: "ringtail buddy",
    primaryColor: "#d9c4a7",
    secondaryColor: "#5a4238",
    accentColor: "#7b5a45",
    eyeColor: "#302722"
  },
  monster: {
    pattern: "blue-monster",
    breedLabel: "tiny horn blob",
    primaryColor: "#5dd4d1",
    secondaryColor: "#f7f0ff",
    accentColor: "#8b63c7",
    eyeColor: "#3d346b"
  },
  object: {
    pattern: "punching-bag",
    breedLabel: "training buddy",
    primaryColor: "#f5c34b",
    secondaryColor: "#2f7caa",
    accentColor: "#4b4035",
    eyeColor: "#2a2520"
  }
};

const speciesOptions: Array<{ value: Species; label: string }> = [
  { value: "cat", label: "Cat" },
  { value: "dog", label: "Dog" },
  { value: "capybara", label: "Capybara" },
  { value: "elephant", label: "Elephant" },
  { value: "raccoon", label: "Raccoon" },
  { value: "monster", label: "Monster" },
  { value: "object", label: "Object" }
];

const patternOptions: Array<{ value: PetProfile["pattern"]; label: string }> = [
  { value: "patch-cat", label: "Patch cat" },
  { value: "keyboard-buddy", label: "Keyboard buddy" },
  { value: "capybara", label: "Capybara" },
  { value: "elephant", label: "Elephant" },
  { value: "raccoon", label: "Raccoon" },
  { value: "blue-monster", label: "Blue monster" },
  { value: "punching-bag", label: "Punching bag" },
  { value: "yorkie", label: "Yorkie" }
];

function App() {
  const [pets, setPets] = useLocalStorageState<PetProfile[]>(STORAGE_KEYS.pets, initialPets);
  const [settings, setSettings] = useLocalStorageState<EngineSettings>(STORAGE_KEYS.settings, initialSettings);
  const [notes, setNotes] = useLocalStorageState(STORAGE_KEYS.notes, "Today feels lighter with company on the desktop.");
  const [tasks, setTasks] = useLocalStorageState<TaskItem[]>(STORAGE_KEYS.tasks, initialTasks);
  const [stats, setStats] = useLocalStorageState<StatsState>(STORAGE_KEYS.stats, initialStats);
  const [selectedPetId, setSelectedPetId] = useState(pets[0]?.id ?? "mochi");
  const [toolTab, setToolTab] = useState<ToolTab>("notes");
  const [newTask, setNewTask] = useState("");
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [runtime, setRuntime] = useState<PetRuntime[]>(() => createInitialRuntime(pets));
  const stageRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const lastFrameRef = useRef<number>(performance.now());

  const selectedPet = pets.find((pet) => pet.id === selectedPetId) ?? pets[0];

  useEffect(() => {
    setStats((current) => ({ ...current, launches: Math.max(1, current.launches) }));
  }, [setStats]);

  useEffect(() => {
    setRuntime((current) => reconcileRuntime(current, pets));
    if (!pets.some((pet) => pet.id === selectedPetId) && pets[0]) {
      setSelectedPetId(pets[0].id);
    }
  }, [pets, selectedPetId]);

  useEffect(() => {
    if (!window.petEngine) {
      return;
    }

    window.petEngine.setAlwaysOnTop(settings.alwaysOnTop).catch(() => undefined);
  }, [settings.alwaysOnTop]);

  useEffect(() => {
    if (!window.petEngine) {
      return;
    }

    window.petEngine.setDesktopMode(settings.desktopMode).catch(() => undefined);
  }, [settings.desktopMode]);

  useEffect(() => {
    const onKeyDown = () => {
      setStats((current) => ({ ...current, keys: current.keys + 1 }));
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setStats]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        setStats((current) => ({ ...current, activeSeconds: current.activeSeconds + 1 }));
      }
    }, 1000);

    return () => window.clearInterval(id);
  }, [setStats]);

  useEffect(() => {
    if (!timerRunning) {
      return;
    }

    const id = window.setInterval(() => {
      setTimerSeconds((current) => {
        if (current <= 1) {
          setTimerRunning(false);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(id);
  }, [timerRunning]);

  useEffect(() => {
    let frame = 0;

    const tick = (now: number) => {
      const delta = Math.min(32, now - lastFrameRef.current);
      lastFrameRef.current = now;

      setRuntime((current) => {
        const rect = stageRef.current?.getBoundingClientRect();
        if (!rect) {
          return current;
        }

        return current.map((petRuntime) => {
          const pet = pets.find((profile) => profile.id === petRuntime.id);
          if (!pet) {
            return petRuntime;
          }

          return advancePet(petRuntime, pet, settings, rect.width, rect.height, delta, now);
        });
      });

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [pets, settings]);

  useEffect(() => {
    const onPointerMove = (event: globalThis.PointerEvent) => {
      const drag = dragRef.current;
      const rect = stageRef.current?.getBoundingClientRect();
      if (!drag || !rect) {
        return;
      }

      const pet = pets.find((profile) => profile.id === drag.id);
      if (!pet) {
        return;
      }

      const size = getPetSize(pet, settings);
      const nextX = clamp(event.clientX - rect.left - drag.offsetX, 8, Math.max(8, rect.width - size - 8));
      const nextY = clamp(event.clientY - rect.top - drag.offsetY, 16, Math.max(16, rect.height - size * 0.8 - 22));

      setRuntime((current) =>
        current.map((petRuntime) =>
          petRuntime.id === drag.id
            ? {
                ...petRuntime,
                x: nextX,
                y: nextY,
                behavior: "drag",
                vy: 0,
                stateStartedAt: performance.now()
              }
            : petRuntime
        )
      );
    };

    const onPointerUp = () => {
      const drag = dragRef.current;
      const rect = stageRef.current?.getBoundingClientRect();
      dragRef.current = null;

      if (!drag || !rect) {
        return;
      }

      const pet = pets.find((profile) => profile.id === drag.id);
      if (!pet) {
        return;
      }

      const ground = getGroundY(pet, settings, rect.height);
      setRuntime((current) =>
        current.map((petRuntime) => {
          if (petRuntime.id !== drag.id) {
            return petRuntime;
          }

          return {
            ...petRuntime,
            behavior: petRuntime.y < ground - 4 && settings.physics ? "fall" : "idle",
            vy: 0,
            y: settings.physics ? petRuntime.y : ground,
            stateStartedAt: performance.now()
          };
        })
      );
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [pets, settings]);

  const completedTasks = tasks.filter((task) => task.done).length;
  const timerProgress = 1 - timerSeconds / (25 * 60);

  const updateSettings = useCallback(
    (patch: Partial<EngineSettings>) => {
      setSettings((current) => ({ ...current, ...patch }));
    },
    [setSettings]
  );

  const updateSelectedPet = useCallback(
    (patch: Partial<PetProfile>) => {
      if (!selectedPet) {
        return;
      }

      setPets((current) => current.map((pet) => (pet.id === selectedPet.id ? { ...pet, ...patch } : pet)));
    },
    [selectedPet, setPets]
  );

  const commandPet = useCallback(
    (behavior: Behavior, target: "selected" | "all" = "selected") => {
      const now = performance.now();
      const targetIds = target === "all" ? pets.map((pet) => pet.id) : [selectedPetId];

      setRuntime((current) =>
        current.map((petRuntime) =>
          targetIds.includes(petRuntime.id)
            ? {
                ...petRuntime,
                behavior,
                stateStartedAt: now,
                vy: behavior === "fall" ? 1 : 0
              }
            : petRuntime
        )
      );
    },
    [pets, selectedPetId]
  );

  const callSelectedPet = useCallback(() => {
    const rect = stageRef.current?.getBoundingClientRect();
    const pet = selectedPet;
    if (!rect || !pet) {
      commandPet("walk");
      return;
    }

    const now = performance.now();
    const size = getPetSize(pet, settings);
    const center = rect.width / 2 - size / 2;

    setRuntime((current) =>
      current.map((petRuntime) =>
        petRuntime.id === pet.id
          ? {
              ...petRuntime,
              x: clamp(center, 8, Math.max(8, rect.width - size - 8)),
              y: getGroundY(pet, settings, rect.height),
              behavior: "idle",
              stateStartedAt: now
            }
          : petRuntime
      )
    );
  }, [commandPet, selectedPet, settings]);

  const resetPets = useCallback(() => {
    setRuntime(createInitialRuntime(pets));
  }, [pets]);

  const onPetPointerDown = useCallback(
    (id: string, event: PointerEvent<HTMLButtonElement>) => {
      const rect = stageRef.current?.getBoundingClientRect();
      const petRuntime = runtime.find((entry) => entry.id === id);
      if (!rect || !petRuntime) {
        return;
      }

      event.currentTarget.setPointerCapture(event.pointerId);
      dragRef.current = {
        id,
        offsetX: event.clientX - rect.left - petRuntime.x,
        offsetY: event.clientY - rect.top - petRuntime.y
      };
      setSelectedPetId(id);
      setRuntime((current) =>
        current.map((entry) =>
          entry.id === id ? { ...entry, behavior: "drag", stateStartedAt: performance.now(), vy: 0 } : entry
        )
      );
    },
    [runtime]
  );

  const addTask = useCallback(() => {
    const text = newTask.trim();
    if (!text) {
      return;
    }

    setTasks((current) => [{ id: uid("task"), text, done: false }, ...current]);
    setNewTask("");
  }, [newTask, setTasks]);

  const removeTask = useCallback(
    (taskId: string) => {
      setTasks((current) => current.filter((task) => task.id !== taskId));
    },
    [setTasks]
  );

  const petRuntimeMap = useMemo(() => new Map(runtime.map((entry) => [entry.id, entry])), [runtime]);

  return (
    <main className={`app-shell ${settings.desktopMode ? "desktop-mode" : ""}`}>
      <TopBar
        alwaysOnTop={settings.alwaysOnTop}
        desktopMode={settings.desktopMode}
        onTogglePin={() => updateSettings({ alwaysOnTop: !settings.alwaysOnTop })}
        onToggleDesktop={() => updateSettings({ desktopMode: !settings.desktopMode })}
      />

      <section className="workspace">
        <PetRail
          pets={pets}
          selectedPetId={selectedPetId}
          onSelect={setSelectedPetId}
          selectedPet={selectedPet}
          onUpdatePet={updateSelectedPet}
        />

        <section className="stage-wrap">
          <div className="stage-header">
            <div>
              <h1>Pet Engine</h1>
              <p>{pets.length} companions running on your desktop</p>
            </div>
            <div className="stage-status">
              <span>
                <Activity size={15} />
                {settings.physics ? "Physics" : "Calm"}
              </span>
              <span>
                <ListTodo size={15} />
                {completedTasks}/{tasks.length || 1}
              </span>
            </div>
          </div>

          <div className="pet-stage" ref={stageRef} aria-label="Desktop pet stage">
            <div className="stage-floor" />
            {pets.map((pet) => {
              const current = petRuntimeMap.get(pet.id);
              if (!current) {
                return null;
              }

              const size = getPetSize(pet, settings);
              const isSelected = pet.id === selectedPetId;

              return (
                <button
                  className={`pet-actor ${isSelected ? "selected" : ""} behavior-${current.behavior}`}
                  key={pet.id}
                  style={{
                    width: size,
                    height: size * 0.84,
                    transform: `translate3d(${current.x}px, ${current.y}px, 0) scaleX(${current.direction})`,
                    ["--pet-phase" as string]: current.phase
                  }}
                  onPointerDown={(event) => onPetPointerDown(pet.id, event)}
                  aria-label={`${pet.name}, ${current.behavior}`}
                >
                  <span className="pet-hitbox">
                    <PetAvatar pet={pet} behavior={current.behavior} />
                  </span>
                  {settings.showNames && (
                    <span className="pet-name" style={{ transform: `scaleX(${current.direction})` }}>
                      {pet.name}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <BehaviorBar
            selectedPet={selectedPet}
            settings={settings}
            onSettingsChange={updateSettings}
            onCommand={commandPet}
            onCall={callSelectedPet}
            onReset={resetPets}
          />
        </section>

        {settings.panelOpen && (
          <ToolDrawer
            activeTab={toolTab}
            setActiveTab={setToolTab}
            notes={notes}
            onNotesChange={setNotes}
            tasks={tasks}
            newTask={newTask}
            setNewTask={setNewTask}
            addTask={addTask}
            removeTask={removeTask}
            setTasks={setTasks}
            timerSeconds={timerSeconds}
            timerRunning={timerRunning}
            timerProgress={timerProgress}
            onTimerToggle={() => setTimerRunning((current) => !current)}
            onTimerReset={() => {
              setTimerRunning(false);
              setTimerSeconds(25 * 60);
            }}
            stats={stats}
          />
        )}

        <button
          className="panel-toggle"
          type="button"
          onClick={() => updateSettings({ panelOpen: !settings.panelOpen })}
          aria-label={settings.panelOpen ? "Hide tools" : "Show tools"}
        >
          {settings.panelOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
        </button>
      </section>
    </main>
  );
}

interface TopBarProps {
  alwaysOnTop: boolean;
  desktopMode: boolean;
  onTogglePin: () => void;
  onToggleDesktop: () => void;
}

function TopBar({ alwaysOnTop, desktopMode, onTogglePin, onToggleDesktop }: TopBarProps) {
  return (
    <header className="top-bar">
      <div className="brand">
        <span className="brand-mark">
          <Sparkles size={18} />
        </span>
        <span>Pet Engine</span>
      </div>
      <div className="top-actions">
        <IconButton active={desktopMode} label="Desktop mode" onClick={onToggleDesktop}>
          <Home size={17} />
        </IconButton>
        <IconButton active={alwaysOnTop} label="Always on top" onClick={onTogglePin}>
          <Pin size={17} />
        </IconButton>
        <IconButton label="Minimize" onClick={() => window.petEngine?.minimize()}>
          <Minus size={17} />
        </IconButton>
        <IconButton label="Close" tone="danger" onClick={() => window.petEngine?.close()}>
          <X size={17} />
        </IconButton>
      </div>
    </header>
  );
}

interface PetRailProps {
  pets: PetProfile[];
  selectedPetId: string;
  selectedPet?: PetProfile;
  onSelect: (id: string) => void;
  onUpdatePet: (patch: Partial<PetProfile>) => void;
}

function PetRail({ pets, selectedPetId, selectedPet, onSelect, onUpdatePet }: PetRailProps) {
  return (
    <aside className="pet-rail">
      <div className="rail-section">
        <div className="section-title">
          <Dog size={16} />
          Pets
        </div>
        <div className="pet-list">
          {pets.map((pet) => (
            <button
              className={`pet-card ${selectedPetId === pet.id ? "active" : ""}`}
              key={pet.id}
              type="button"
              onClick={() => onSelect(pet.id)}
            >
              <span className="pet-thumb">
                <PetAvatar pet={pet} compact />
              </span>
              <span>
                <strong>{pet.name}</strong>
                <small>{pet.breedLabel}</small>
              </span>
              <ChevronRight size={16} />
            </button>
          ))}
        </div>
      </div>

      {selectedPet && (
        <div className="rail-section editor-section">
          <div className="section-title">
            <Settings2 size={16} />
            Profile
          </div>
          <label className="field">
            <span>Name</span>
            <input value={selectedPet.name} onChange={(event) => onUpdatePet({ name: event.target.value })} />
          </label>
          <label className="field">
            <span>Species</span>
            <select
              value={selectedPet.species}
              onChange={(event) => {
                const species = event.target.value as Species;
                onUpdatePet({
                  species,
                  ...speciesDefaults[species]
                });
              }}
            >
              {speciesOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Style</span>
            <select
              value={selectedPet.pattern}
              onChange={(event) => onUpdatePet({ pattern: event.target.value as PetProfile["pattern"] })}
            >
              {patternOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <div className="swatch-row">
            <ColorField label="Main" value={selectedPet.primaryColor} onChange={(primaryColor) => onUpdatePet({ primaryColor })} />
            <ColorField
              label="Patch"
              value={selectedPet.secondaryColor}
              onChange={(secondaryColor) => onUpdatePet({ secondaryColor })}
            />
            <ColorField label="Trim" value={selectedPet.accentColor} onChange={(accentColor) => onUpdatePet({ accentColor })} />
          </div>
          <label className="range-field">
            <span>Size</span>
            <input
              type="range"
              min="0.7"
              max="1.25"
              step="0.01"
              value={selectedPet.size}
              onChange={(event) => onUpdatePet({ size: Number(event.target.value) })}
            />
          </label>
          <label className="range-field">
            <span>Energy</span>
            <input
              type="range"
              min="0.2"
              max="1"
              step="0.01"
              value={selectedPet.energy}
              onChange={(event) => onUpdatePet({ energy: Number(event.target.value) })}
            />
          </label>
        </div>
      )}
    </aside>
  );
}

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function ColorField({ label, value, onChange }: ColorFieldProps) {
  return (
    <label className="color-field">
      <span>{label}</span>
      <input type="color" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

interface BehaviorBarProps {
  selectedPet?: PetProfile;
  settings: EngineSettings;
  onSettingsChange: (patch: Partial<EngineSettings>) => void;
  onCommand: (behavior: Behavior, target?: "selected" | "all") => void;
  onCall: () => void;
  onReset: () => void;
}

function BehaviorBar({ selectedPet, settings, onSettingsChange, onCommand, onCall, onReset }: BehaviorBarProps) {
  return (
    <footer className="behavior-bar">
      <div className="behavior-group">
        <span className="selected-label">{selectedPet?.name ?? "Pet"}</span>
        <IconButton label="Walk" onClick={() => onCommand("walk")}>
          <Footprints size={18} />
        </IconButton>
        <IconButton label="Sit" onClick={() => onCommand("sit")}>
          <MousePointer2 size={18} />
        </IconButton>
        <IconButton label="Nap" onClick={() => onCommand("sleep")}>
          <Moon size={18} />
        </IconButton>
        <IconButton label="Jump" onClick={() => onCommand("jump")}>
          <Zap size={18} />
        </IconButton>
        <IconButton label="Call" onClick={onCall}>
          <Bell size={18} />
        </IconButton>
      </div>

      <div className="behavior-group">
        <IconButton label="Group jump" onClick={() => onCommand("jump", "all")}>
          <Sparkles size={18} />
        </IconButton>
        <IconButton label="Reset positions" onClick={onReset}>
          <RotateCcw size={18} />
        </IconButton>
        <IconButton active={settings.physics} label="Physics" onClick={() => onSettingsChange({ physics: !settings.physics })}>
          <Activity size={18} />
        </IconButton>
        <IconButton active={settings.showNames} label="Name tags" onClick={() => onSettingsChange({ showNames: !settings.showNames })}>
          {settings.showNames ? <Eye size={18} /> : <EyeOff size={18} />}
        </IconButton>
      </div>

      <div className="slider-group">
        <label>
          Scale
          <input
            type="range"
            min="0.75"
            max="1.35"
            step="0.01"
            value={settings.globalScale}
            onChange={(event) => onSettingsChange({ globalScale: Number(event.target.value) })}
          />
        </label>
        <label>
          Pace
          <input
            type="range"
            min="0.5"
            max="1.6"
            step="0.01"
            value={settings.globalSpeed}
            onChange={(event) => onSettingsChange({ globalSpeed: Number(event.target.value) })}
          />
        </label>
      </div>
    </footer>
  );
}

interface ToolDrawerProps {
  activeTab: ToolTab;
  setActiveTab: (tab: ToolTab) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  tasks: TaskItem[];
  newTask: string;
  setNewTask: (value: string) => void;
  addTask: () => void;
  removeTask: (taskId: string) => void;
  setTasks: Dispatch<SetStateAction<TaskItem[]>>;
  timerSeconds: number;
  timerRunning: boolean;
  timerProgress: number;
  onTimerToggle: () => void;
  onTimerReset: () => void;
  stats: StatsState;
}

function ToolDrawer({
  activeTab,
  setActiveTab,
  notes,
  onNotesChange,
  tasks,
  newTask,
  setNewTask,
  addTask,
  removeTask,
  setTasks,
  timerSeconds,
  timerRunning,
  timerProgress,
  onTimerToggle,
  onTimerReset,
  stats
}: ToolDrawerProps) {
  return (
    <aside className="tool-drawer">
      <div className="drawer-head">
        <div>
          <h2>Tools</h2>
          <p>Notes, tasks, focus, counters</p>
        </div>
      </div>
      <div className="tab-row" role="tablist" aria-label="Tool tabs">
        <TabButton active={activeTab === "notes"} label="Notes" onClick={() => setActiveTab("notes")}>
          <NotebookPen size={17} />
        </TabButton>
        <TabButton active={activeTab === "tasks"} label="Tasks" onClick={() => setActiveTab("tasks")}>
          <ListTodo size={17} />
        </TabButton>
        <TabButton active={activeTab === "timer"} label="Timer" onClick={() => setActiveTab("timer")}>
          <AlarmClock size={17} />
        </TabButton>
        <TabButton active={activeTab === "stats"} label="Stats" onClick={() => setActiveTab("stats")}>
          <Keyboard size={17} />
        </TabButton>
      </div>

      <div className="drawer-body">
        {activeTab === "notes" && (
          <section className="tool-pane">
            <textarea value={notes} onChange={(event) => onNotesChange(event.target.value)} spellCheck />
          </section>
        )}

        {activeTab === "tasks" && (
          <section className="tool-pane">
            <form
              className="task-form"
              onSubmit={(event) => {
                event.preventDefault();
                addTask();
              }}
            >
              <input value={newTask} onChange={(event) => setNewTask(event.target.value)} placeholder="New task" />
              <button type="submit" aria-label="Add task">
                <Plus size={17} />
              </button>
            </form>
            <div className="task-list">
              {tasks.map((task) => (
                <div className={`task-row ${task.done ? "done" : ""}`} key={task.id}>
                  <button
                    type="button"
                    className="check-button"
                    onClick={() =>
                      setTasks((current) =>
                        current.map((item) => (item.id === task.id ? { ...item, done: !item.done } : item))
                      )
                    }
                    aria-label={task.done ? "Mark incomplete" : "Mark complete"}
                  >
                    {task.done ? <Check size={15} /> : <Circle size={15} />}
                  </button>
                  <span>{task.text}</span>
                  <button type="button" className="trash-button" onClick={() => removeTask(task.id)} aria-label="Remove task">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === "timer" && (
          <section className="tool-pane timer-pane">
            <div className="timer-ring" style={{ ["--timer-progress" as string]: timerProgress }}>
              <span>{formatTimer(timerSeconds)}</span>
            </div>
            <div className="timer-actions">
              <button type="button" onClick={onTimerToggle}>
                {timerRunning ? <Pause size={17} /> : <Play size={17} />}
                {timerRunning ? "Pause" : "Start"}
              </button>
              <button type="button" onClick={onTimerReset}>
                <TimerReset size={17} />
                Reset
              </button>
            </div>
          </section>
        )}

        {activeTab === "stats" && (
          <section className="tool-pane stats-grid">
            <Metric icon={<Keyboard size={18} />} label="Keys" value={stats.keys.toLocaleString()} />
            <Metric icon={<Clock3 size={18} />} label="Active" value={formatDuration(stats.activeSeconds)} />
            <Metric icon={<ListTodo size={18} />} label="Tasks" value={`${tasks.filter((task) => task.done).length}/${tasks.length}`} />
            <Metric icon={<Sparkles size={18} />} label="Launches" value={String(stats.launches)} />
          </section>
        )}
      </div>
    </aside>
  );
}

function TabButton({ active, label, onClick, children }: IconButtonProps) {
  return (
    <button type="button" className={`tab-button ${active ? "active" : ""}`} onClick={onClick} aria-label={label}>
      {children}
      <span>{label}</span>
    </button>
  );
}

interface IconButtonProps {
  active?: boolean;
  label: string;
  tone?: "default" | "danger";
  onClick?: () => void;
  children: ReactNode;
}

function IconButton({ active = false, label, tone = "default", onClick, children }: IconButtonProps) {
  return (
    <button
      className={`icon-button ${active ? "active" : ""} ${tone === "danger" ? "danger" : ""}`}
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="metric">
      <span>{icon}</span>
      <strong>{value}</strong>
      <small>{label}</small>
    </div>
  );
}

function createInitialRuntime(pets: PetProfile[]): PetRuntime[] {
  const now = performance.now();
  return pets.map((pet, index) => ({
    id: pet.id,
    x: 48 + index * 82,
    y: 350,
    direction: index % 2 === 0 ? 1 : -1,
    behavior: index === 1 ? "walk" : "idle",
    vy: 0,
    phase: Math.random() * Math.PI,
    stateStartedAt: now - index * 650,
    lastInteractionAt: now - index * 650
  }));
}

function reconcileRuntime(current: PetRuntime[], pets: PetProfile[]) {
  const existing = new Map(current.map((entry) => [entry.id, entry]));
  const additions = createInitialRuntime(pets);
  return pets.map((pet, index) => existing.get(pet.id) ?? additions[index]);
}

function advancePet(
  petRuntime: PetRuntime,
  pet: PetProfile,
  settings: EngineSettings,
  width: number,
  height: number,
  delta: number,
  now: number
): PetRuntime {
  const size = getPetSize(pet, settings);
  const maxX = Math.max(8, width - size - 8);
  const ground = getGroundY(pet, settings, height);
  const elapsed = now - petRuntime.stateStartedAt;
  const next = {
    ...petRuntime,
    x: clamp(petRuntime.x, 8, maxX),
    phase: petRuntime.phase + delta * 0.006
  };

  if (next.behavior === "drag") {
    return next;
  }

  if (!settings.physics && next.behavior === "fall") {
    return { ...next, y: ground, behavior: "idle", stateStartedAt: now };
  }

  if (next.behavior === "jump") {
    const progress = Math.min(1, elapsed / 720);
    return {
      ...next,
      y: ground - Math.sin(progress * Math.PI) * (52 + pet.energy * 42),
      behavior: progress >= 1 ? "idle" : "jump",
      stateStartedAt: progress >= 1 ? now : next.stateStartedAt
    };
  }

  if (next.behavior === "fall") {
    const vy = next.vy + 0.84;
    const y = next.y + vy;
    if (y >= ground) {
      return { ...next, y: ground, vy: 0, behavior: "idle", stateStartedAt: now };
    }
    return { ...next, y, vy };
  }

  if (next.behavior === "sleep") {
    return { ...next, y: ground };
  }

  if (next.behavior === "sit") {
    if (elapsed > 4800 + pet.energy * 2200 && Math.random() < 0.012) {
      return { ...next, y: ground, behavior: "idle", stateStartedAt: now };
    }
    return { ...next, y: ground };
  }

  if (next.behavior === "idle") {
    const wakeChance = 0.0035 + pet.energy * 0.004;
    if (elapsed > 1100 && Math.random() < wakeChance) {
      const behavior = Math.random() < 0.18 ? "sit" : "walk";
      return {
        ...next,
        y: ground,
        behavior,
        direction: Math.random() > 0.5 ? 1 : -1,
        stateStartedAt: now
      };
    }
    return { ...next, y: ground };
  }

  const step = (0.42 + pet.speed * 0.78) * settings.globalSpeed * (delta / 16.67);
  let x = next.x + step * next.direction;
  let direction = next.direction;

  if (x <= 8 || x >= maxX) {
    direction = direction === 1 ? -1 : 1;
    x = clamp(x, 8, maxX);
  }

  if (elapsed > 1700 && Math.random() < 0.0045) {
    const roll = Math.random();
    return {
      ...next,
      x,
      y: ground,
      direction,
      behavior: roll < 0.18 ? "sleep" : roll < 0.46 ? "sit" : "idle",
      stateStartedAt: now
    };
  }

  return { ...next, x, y: ground, direction };
}

function getPetSize(pet: PetProfile, settings: EngineSettings) {
  return BASE_PET_SIZE * pet.size * settings.globalScale;
}

function getGroundY(pet: PetProfile, settings: EngineSettings, height: number) {
  return Math.max(72, height - getPetSize(pet, settings) * 0.82 - 28);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatTimer(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  if (minutes < 60) {
    return `${minutes}m ${remaining}s`;
  }
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

export default App;
