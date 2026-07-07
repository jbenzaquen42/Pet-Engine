import { ListTodo, Minus, PanelRightClose, PanelRightOpen, Pin, Sparkles, X } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { initialCompanionState, initialSettings, initialTasks } from "./data";
import {
  findSelectedCompanion,
  getSummonedCompanions,
  normalizeCompanionState,
  updateCompanionsByIds,
  setCompanionSummoned
} from "./companionState";
import { CommandBar } from "./components/CommandBar";
import { CompanionEditor } from "./components/CompanionEditor";
import { CompanionTray } from "./components/CompanionTray";
import { ToolDrawer, type ToolTab } from "./components/ToolDrawer";
import { uid, useLocalStorageState } from "./storage";
import type { EngineSettings, PetProfile, TaskItem } from "./types";
import type { OverlaySnapshot } from "./shared/overlayBridge";

const STORAGE_KEYS = {
  companions: "personal-pet-engine:companions:v2",
  settings: "personal-pet-engine:settings",
  notes: "personal-pet-engine:notes",
  tasks: "personal-pet-engine:tasks",
  stats: "personal-pet-engine:stats",
  firstRun: "personal-pet-engine:first-run-seen"
};


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
  const [focusedPetId, setFocusedPetId] = useState(() => summonedCompanions[0]?.id ?? "martyn");
  const [selectedPetIds, setSelectedPetIds] = useState<string[]>(() => [summonedCompanions[0]?.id ?? "martyn"]);
  const [toolTab, setToolTab] = useState<ToolTab>("notes");
  const [newTask, setNewTask] = useState("");
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [firstRunSeen, setFirstRunSeen] = useLocalStorageState<boolean>(STORAGE_KEYS.firstRun, false);
  const showFirstRun = !firstRunSeen;

  const selectedPet = findSelectedCompanion(companions, focusedPetId);

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
    if (!summonedCompanions.some((pet) => pet.id === focusedPetId) && summonedCompanions[0]) {
      setFocusedPetId(summonedCompanions[0].id);
    }
  }, [focusedPetId, summonedCompanions]);

  useEffect(() => {
    if (!window.petEngine) {
      return;
    }

    window.petEngine.setAlwaysOnTop(settings.alwaysOnTop).catch(() => undefined);
  }, [settings.alwaysOnTop]);

  // Start/stop the main-process cursor pump when follow mode changes.
  useEffect(() => {
    window.petEngine?.setFollow(settings.followMode);
  }, [settings.followMode]);

  // Register/unregister the OS launch-at-login item.
  useEffect(() => {
    window.petEngine?.setLaunchAtLogin(settings.launchAtLogin).catch(() => undefined);
  }, [settings.launchAtLogin]);

  // Mirror the tray "Follow mode" checkbox into settings.
  useEffect(() => {
    if (!window.petEngine?.onTrayToggleFollow) {
      return;
    }
    return window.petEngine.onTrayToggleFollow((enabled) => {
      updateSettings({ followMode: enabled });
    });
  }, [updateSettings]);

  const pushSnapshot = useCallback(() => {
    const snapshot: OverlaySnapshot = { companions: summonedCompanions, settings };
    window.petEngine?.pushSnapshot(snapshot);
  }, [summonedCompanions, settings]);

  useEffect(() => {
    pushSnapshot();
  }, [pushSnapshot]);

  useEffect(() => {
    if (!window.petEngine?.onSnapshotRequested) {
      return;
    }
    return window.petEngine.onSnapshotRequested(() => pushSnapshot());
  }, [pushSnapshot]);

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
        setFocusedPetId(id);
        setSelectedPetIds([id]);
      }
    },
    [updateCompanions]
  );

  const updateSelectedCompanions = useCallback(
    (patch: Partial<PetProfile>) => {
      setCompanionState((current) => ({
        ...current,
        companions: updateCompanionsByIds(current.companions, selectedPetIds, patch)
      }));
    },
    [selectedPetIds, setCompanionState]
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

  return (
    <main className="app-shell">
      <TopBar
        alwaysOnTop={settings.alwaysOnTop}
        summonedCount={summonedCompanions.length}
        onTogglePin={() => updateSettings({ alwaysOnTop: !settings.alwaysOnTop })}
      />

      {showFirstRun && (
        <div className="first-run" role="status">
          <Sparkles size={16} />
          <p>Your companions live on the desktop now. Press <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>P</kbd> anytime to bring this panel back.</p>
          <button type="button" aria-label="Dismiss" onClick={() => setFirstRunSeen(true)}>
            <X size={15} />
          </button>
        </div>
      )}

      <section className="workspace">
        <CompanionTray
          companions={companions}
          focusedPetId={focusedPetId}
          selectedPetIds={selectedPetIds}
          onFocus={setFocusedPetId}
          onSelectionChange={setSelectedPetIds}
          onToggleSummoned={toggleSummoned}
        />

        <CompanionEditor
          companions={companions}
          selectedPetIds={selectedPetIds}
          onUpdateSelected={updateSelectedCompanions}
        />

        <CommandBar
          selectedPet={selectedPet}
          settings={settings}
          onSettingsChange={updateSettings}
          onCommand={(behavior, target = "selected") =>
            window.petEngine?.pushCommand({
              behavior,
              target,
              id: target === "selected" ? focusedPetId : undefined
            })
          }
          onCall={() => window.petEngine?.pushCommand({ behavior: "walk", target: "selected", id: focusedPetId })}
          onReset={() => window.petEngine?.pushCommand({ behavior: "idle", target: "all" })}
        />

        <div className="tools-region">
          <button
            className="tools-toggle"
            type="button"
            onClick={() => updateSettings({ panelOpen: !settings.panelOpen })}
            aria-label={settings.panelOpen ? "Hide tools" : "Show tools"}
          >
            {settings.panelOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
            <span>{settings.panelOpen ? "Hide tools" : "Show tools"}</span>
            <small>
              <ListTodo size={13} /> {completedTasks}/{tasks.length || 1}
            </small>
          </button>

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
        </div>

      </section>
    </main>
  );
}

interface TopBarProps {
  alwaysOnTop: boolean;
  summonedCount: number;
  onTogglePin: () => void;
}

function TopBar({ alwaysOnTop, summonedCount, onTogglePin }: TopBarProps) {
  return (
    <header className="top-bar">
      <div className="brand">
        <span className="brand-mark">
          <Sparkles size={18} />
        </span>
        <span>Pet Engine</span>
        <small className="brand-count">{summonedCount} on desktop</small>
      </div>
      <div className="top-actions">
        <IconButton active={alwaysOnTop} label="Always on top" onClick={onTogglePin}>
          <Pin size={17} />
        </IconButton>
        <IconButton label="Minimize to tray" onClick={() => window.petEngine?.minimizeToTray()}>
          <Minus size={17} />
        </IconButton>
        <IconButton label="Close to tray" tone="danger" onClick={() => window.petEngine?.close()}>
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
