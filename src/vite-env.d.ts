/// <reference types="vite/client" />

import type { OverlaySnapshot } from "./shared/overlayBridge";

declare global {
  interface Window {
    petEngine?: {
      minimizeToTray: () => Promise<void>;
      close: () => Promise<void>;
      setAlwaysOnTop: (enabled: boolean) => Promise<boolean>;
      pushSnapshot: (snapshot: OverlaySnapshot) => void;
      requestSnapshot: () => void;
      onSnapshot: (callback: (snapshot: unknown) => void) => () => void;
      onSnapshotRequested: (callback: () => void) => () => void;
      setOverlayInteractive: (interactive: boolean) => void;
      onTrayToggleFollow: (callback: (enabled: boolean) => void) => () => void;
    };
  }
}

export {};
