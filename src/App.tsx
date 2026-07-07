import { Activity, Home, ListTodo, Minus, PanelRightClose, PanelRightOpen, Pin, Sparkles, X } from "lucide-react";
import type { PointerEvent, ReactNode } from "react";
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
import { CommandBar } from "./components/CommandBar";
import { CompanionTray } from "./components/CompanionTray";
import { PetStage } from "./components/PetStage";
import { ToolDrawer, type ToolTab } from "./components/ToolDrawer";
import { uid, useLocalStorageState } from "./storage";
import type { Behavior, EngineSettings, PetProfile, PetRuntime, TaskItem } from "./types";

const STORAGE_KEYS = {
  companions: "personal-pet-engine:companions:v2",
  settings: "personal-pet-engine:settings",
  notes: "personal-pet-engine:notes",
  tasks: "personal-pet-engine:tasks",
  stats: "personal-pet-engine:stats"
};


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

function normalizeSettings(value: unknown): EngineSettings {
  if (!value || typeof value !== "object") {
    return initialSettings;
  }

  return {
    ...initialSettings,
    ...(value as Partial<EngineSettings>),
    clickThrough: false
  };
}

function App() {
  const [companionState, setCompanionState] = useLocalStorageState(
    STORAGE_KEYS.companions,
    initialCompanionState,
    normalizeCompanionState
  );
  const companions = companionState.companions;
  const summonedCompanions = useMemo(() => getSummonedCompanions(companions), [companions]);
  const [settings, setSettings] = useLocalStorageState<EngineSettings>(STORAGE_KEYS.settings, initialSettings, normalizeSettings);
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

  const updateSettings = useCallback(
    (patch: Partial<EngineSettings>) => {
      setSettings((current) => ({ ...current, ...patch }));
    },
    [setSettings]
  );

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
    updateSettings({ clickThrough: false });
  }, [updateSettings]);

  useEffect(() => {
    if (!window.petEngine) {
      return;
    }

    window.petEngine.setClickThrough(settings.clickThrough).catch(() => undefined);
  }, [settings.clickThrough]);

  useEffect(() => {
    if (!window.petEngine?.onClickThroughChanged) {
      return;
    }

    return window.petEngine.onClickThroughChanged((enabled) => {
      updateSettings({ clickThrough: enabled });
    });
  }, [updateSettings]);

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
        <CompanionTray
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

          <PetStage
            stageRef={stageRef}
            companions={summonedCompanions}
            runtimeMap={petRuntimeMap}
            selectedPetId={selectedPetId}
            settings={settings}
            onPetPointerDown={onPetPointerDown}
          />

          <CommandBar
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

export default App;
