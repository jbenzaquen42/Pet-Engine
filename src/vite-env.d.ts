/// <reference types="vite/client" />

import type { OverlaySnapshot } from "./shared/overlayBridge";
import type { Behavior, PopoutTab } from "./types";

export interface OverlayCommand {
  behavior: Behavior;
  target: "selected" | "all";
  id?: string;
  hold?: boolean;
}

declare global {
  interface Window {
    petEngine?: {
      minimizeToTray: () => Promise<void>;
      close: () => Promise<void>;
      setAlwaysOnTop: (enabled: boolean) => Promise<boolean>;
      setLaunchAtLogin: (enabled: boolean) => Promise<boolean>;
      pushSnapshot: (snapshot: OverlaySnapshot) => void;
      requestSnapshot: () => void;
      onSnapshot: (callback: (snapshot: unknown) => void) => () => void;
      onSnapshotRequested: (callback: () => void) => () => void;
      setOverlayInteractive: (interactive: boolean) => void;
      setFollow: (active: boolean) => void;
      onCursor: (callback: (point: { x: number; y: number } | null) => void) => () => void;
      pushCommand: (command: OverlayCommand) => void;
      onCommand: (callback: (command: OverlayCommand) => void) => () => void;
      onTrayToggleFollow: (callback: (enabled: boolean) => void) => () => void;
      openPopout?: (tab: PopoutTab) => void;
    };
  }
}

export {};
