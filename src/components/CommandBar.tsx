import {
  Activity,
  Bell,
  Cat,
  Crosshair,
  Droplets,
  Eye,
  EyeOff,
  Footprints,
  LogIn,
  Moon,
  MousePointer2,
  RotateCcw,
  Shuffle,
  Sparkles,
  Zap
} from "lucide-react";
import type { ReactNode } from "react";
import type { Behavior, EngineSettings, PetProfile } from "../types";

interface CommandBarProps {
  selectedPet?: PetProfile;
  settings: EngineSettings;
  heldBehavior: Behavior | null;
  onSettingsChange: (patch: Partial<EngineSettings>) => void;
  onSetHeld: (behavior: Behavior | null) => void;
  onAction: (behavior: Behavior) => void;
  onGroupJump: () => void;
  onCall: () => void;
  onReset: () => void;
}

export function CommandBar({
  selectedPet,
  settings,
  heldBehavior,
  onSettingsChange,
  onSetHeld,
  onAction,
  onGroupJump,
  onCall,
  onReset
}: CommandBarProps) {
  const isCharles = selectedPet?.avatar === "charles";
  const isCat = selectedPet?.species === "cat";

  return (
    <footer className="behavior-bar">
      <div className="behavior-group">
        <span className="selected-label">{selectedPet?.name ?? "Companion"}</span>
        <IconButton active={heldBehavior === "walk"} label="Walk" onClick={() => onSetHeld("walk")}>
          <Footprints size={18} />
        </IconButton>
        <IconButton active={heldBehavior === "sit"} label="Sit" onClick={() => onSetHeld("sit")}>
          <MousePointer2 size={18} />
        </IconButton>
        <IconButton active={heldBehavior === "sleep"} label="Nap" onClick={() => onSetHeld("sleep")}>
          <Moon size={18} />
        </IconButton>
        <IconButton active={heldBehavior === null} label="Auto (mix it up)" onClick={() => onSetHeld(null)}>
          <Shuffle size={18} />
        </IconButton>
      </div>

      <div className="behavior-group">
        <IconButton label="Jump" onClick={() => onAction("jump")}>
          <Zap size={18} />
        </IconButton>
        <IconButton label="Call to center" onClick={onCall}>
          <Bell size={18} />
        </IconButton>
        {isCat && (
          <IconButton label="Pounce" onClick={() => onAction("stalk")}>
            <Cat size={18} />
          </IconButton>
        )}
        <IconButton label="Group jump" onClick={onGroupJump}>
          <Sparkles size={18} />
        </IconButton>
        <IconButton label="Reset positions" onClick={onReset}>
          <RotateCcw size={18} />
        </IconButton>
      </div>

      <div className="behavior-group">
        <IconButton active={settings.physics} label="Physics" onClick={() => onSettingsChange({ physics: !settings.physics })}>
          <Activity size={18} />
        </IconButton>
        <IconButton active={settings.showNames} label="Name tags" onClick={() => onSettingsChange({ showNames: !settings.showNames })}>
          {settings.showNames ? <Eye size={18} /> : <EyeOff size={18} />}
        </IconButton>
        <IconButton active={settings.followMode} label="Follow cursor" onClick={() => onSettingsChange({ followMode: !settings.followMode })}>
          <Crosshair size={18} />
        </IconButton>
        {isCharles && (
          <IconButton
            active={settings.fountain.enabled}
            label="Charles fountain"
            onClick={() => onSettingsChange({ fountain: { ...settings.fountain, enabled: !settings.fountain.enabled } })}
          >
            <Droplets size={18} />
          </IconButton>
        )}
        <IconButton
          active={settings.launchAtLogin}
          label="Launch at login"
          onClick={() => onSettingsChange({ launchAtLogin: !settings.launchAtLogin })}
        >
          <LogIn size={18} />
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

interface IconButtonProps {
  active?: boolean;
  label: string;
  onClick?: () => void;
  children: ReactNode;
}

function IconButton({ active = false, label, onClick, children }: IconButtonProps) {
  return (
    <button className={`icon-button ${active ? "active" : ""}`} type="button" onClick={onClick} aria-label={label} title={label}>
      {children}
    </button>
  );
}
