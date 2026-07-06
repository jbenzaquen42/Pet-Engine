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
  Sparkles,
  TimerReset,
  Trash2,
  X,
  Zap
} from "lucide-react";
import type { Dispatch, PointerEvent, ReactNode, SetStateAction } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { initialCompanionState, initialSettings, initialTasks } from "./data";
import {
  findSelectedCompanion,
  getSummonedCompanions,
  normalizeCompanionState,
  setCompanionSummoned
} from "./companionState";
import {
  advanceCompanion,
  clamp,
  commandRuntime,
  createInitialRuntime,
  getGroundY,
  getPetSize,
  reconcileRuntime
} from "./behaviorEngine";
import { PetAvatar } from "./PetAvatar";
import { uid, useLocalStorageState } from "./storage";
import type { Behavior, EngineSettings, PetProfile, PetRuntime, TaskItem } from "./types";

const STORAGE_KEYS = {
  companions: "personal-pet-engine:companions:v2",
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

function App() {
  const [companionState, setCompanionState] = useLocalStorageState(
    STORAGE_KEYS.companions,
    initialCompanionState,
    normalizeCompanionState
  );
  const companions = companionState.companions;
  const summonedCompanions = useMemo(() => getSummonedCompanions(companions), [companions]);
  const [settings, setSettings] = useLocalStorageState<EngineSettings>(STORAGE_KEYS.settings, initialSettings);
  const [notes, setNotes] = useLocalStorageState(STORAGE_KEYS.notes, "Today feels lighter with company on the desktop.");
  const [tasks, setTasks] = useLocalStorageState<TaskItem[]>(STORAGE_KEYS.tasks, initialTasks);
  const [stats, setStats] = useLocalStorageState<StatsState>(STORAGE_KEYS.stats, initialStats);
  const [selectedPetId, setSelectedPetId] = useState(() => summonedCompanions[0]?.id ?? "martyn");
  const [toolTab, setToolTab] = useState<ToolTab>("notes");
  const [newTask, setNewTask] = useState("");
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [runtime, setRuntime] = useState<PetRuntime[]>(() => createInitialRuntime(summonedCompanions));
  const stageRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const lastFrameRef = useRef<number>(performance.now());

  const selectedPet = findSelectedCompanion(companions, selectedPetId);

  useEffect(() => {
    setStats((current) => ({ ...current, launches: Math.max(1, current.launches) }));
  }, [setStats]);

  useEffect(() => {
    const rect = stageRef.current?.getBoundingClientRect();
    setRuntime((current) =>
      reconcileRuntime(current, summonedCompanions, {
        width: rect?.width ?? 900,
        height: rect?.height ?? 520
      })
    );

    if (!summonedCompanions.some((pet) => pet.id === selectedPetId) && summonedCompanions[0]) {
      setSelectedPetId(summonedCompanions[0].id);
    }
  }, [summonedCompanions, selectedPetId]);

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
          const pet = summonedCompanions.find((profile) => profile.id === petRuntime.id);
          if (!pet) {
            return petRuntime;
          }

          return advanceCompanion(
            petRuntime,
            pet,
            settings,
            { width: rect.width, height: rect.height },
            delta,
            now
          );
        });
      });

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [summonedCompanions, settings]);

  useEffect(() => {
    const onPointerMove = (event: globalThis.PointerEvent) => {
      const drag = dragRef.current;
      const rect = stageRef.current?.getBoundingClientRect();
      if (!drag || !rect) {
        return;
      }

      const pet = summonedCompanions.find((profile) => profile.id === drag.id);
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

      const pet = summonedCompanions.find((profile) => profile.id === drag.id);
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
  }, [summonedCompanions, settings]);

  const completedTasks = tasks.filter((task) => task.done).length;
  const timerProgress = 1 - timerSeconds / (25 * 60);

  const updateSettings = useCallback(
    (patch: Partial<EngineSettings>) => {
      setSettings((current) => ({ ...current, ...patch }));
    },
    [setSettings]
  );

  const updateCompanions = useCallback(
    (updater: (companions: PetProfile[]) => PetProfile[]) => {
      setCompanionState((current) => ({
        ...current,
        companions: updater(current.companions)
      }));
    },
    [setCompanionState]
  );

  const toggleSummoned = useCallback(
    (id: string, summoned: boolean) => {
      updateCompanions((current) => setCompanionSummoned(current, id, summoned));
      if (summoned) {
        setSelectedPetId(id);
      }
    },
    [updateCompanions]
  );

  const commandPet = useCallback(
    (behavior: Behavior, target: "selected" | "all" = "selected") => {
      const now = performance.now();
      const targetIds = target === "all" ? summonedCompanions.map((pet) => pet.id) : [selectedPetId];

      setRuntime((current) =>
        current.map((petRuntime) => (targetIds.includes(petRuntime.id) ? commandRuntime(petRuntime, behavior, now) : petRuntime))
      );
    },
    [summonedCompanions, selectedPetId]
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
    setRuntime(createInitialRuntime(summonedCompanions));
  }, [summonedCompanions]);

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
          companions={companions}
          selectedPetId={selectedPetId}
          onSelect={setSelectedPetId}
          onToggleSummoned={toggleSummoned}
        />

        <section className="stage-wrap">
          <div className="stage-header">
            <div>
              <h1>Pet Engine</h1>
              <p>{summonedCompanions.length} companions running on your desktop</p>
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
            {summonedCompanions.map((pet) => {
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
  companions: PetProfile[];
  selectedPetId: string;
  onSelect: (id: string) => void;
  onToggleSummoned: (id: string, summoned: boolean) => void;
}

function PetRail({ companions, selectedPetId, onSelect, onToggleSummoned }: PetRailProps) {
  return (
    <aside className="pet-rail">
      <div className="rail-section">
        <div className="section-title">
          <Dog size={16} />
          Pets
        </div>
        <div className="pet-list">
          {companions.map((pet) => (
            <div className={`pet-card ${selectedPetId === pet.id ? "active" : ""}`} key={pet.id}>
              <button
                type="button"
                className="pet-card-select"
                onClick={() => (pet.summoned ? onSelect(pet.id) : undefined)}
                disabled={!pet.summoned}
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
              {!pet.locked && (
                <IconButton
                  active={pet.summoned}
                  label={pet.summoned ? "Hide" : "Summon"}
                  onClick={() => onToggleSummoned(pet.id, !pet.summoned)}
                >
                  {pet.summoned ? <EyeOff size={16} /> : <Eye size={16} />}
                </IconButton>
              )}
            </div>
          ))}
        </div>
      </div>
    </aside>
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
