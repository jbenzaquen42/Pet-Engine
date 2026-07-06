import { Activity, Bell, Eye, EyeOff, Footprints, Home, Moon, MousePointer2, RotateCcw, ShieldCheck, Zap } from "lucide-react";
import type { ReactNode } from "react";
import type { Behavior, EngineSettings, PetProfile } from "../types";

interface CommandBarProps {
  selectedPet?: PetProfile;
  settings: EngineSettings;
  onSettingsChange: (patch: Partial<EngineSettings>) => void;
  onCommand: (behavior: Behavior, target?: "selected" | "all") => void;
  onCall: () => void;
  onReset: () => void;
}

export function CommandBar({ selectedPet, settings, onSettingsChange, onCommand, onCall, onReset }: CommandBarProps) {
  return (
    <footer className="behavior-bar">
      <div className="behavior-group">
        <span className="selected-label">{selectedPet?.name ?? "Companion"}</span>
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
        <IconButton label="Reset positions" onClick={onReset}>
          <RotateCcw size={18} />
        </IconButton>
        <IconButton active={settings.physics} label="Physics" onClick={() => onSettingsChange({ physics: !settings.physics })}>
          <Activity size={18} />
        </IconButton>
        <IconButton active={settings.showNames} label="Name tags" onClick={() => onSettingsChange({ showNames: !settings.showNames })}>
          {settings.showNames ? <Eye size={18} /> : <EyeOff size={18} />}
        </IconButton>
        <IconButton active={settings.desktopMode} label="Desktop mode" onClick={() => onSettingsChange({ desktopMode: !settings.desktopMode })}>
          <Home size={18} />
        </IconButton>
        <IconButton active={settings.clickThrough} label="Click-through" onClick={() => onSettingsChange({ clickThrough: !settings.clickThrough })}>
          <ShieldCheck size={18} />
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
