/// <reference types="vite/client" />

interface Window {
  petEngine?: {
    minimize: () => Promise<void>;
    close: () => Promise<void>;
    setAlwaysOnTop: (enabled: boolean) => Promise<boolean>;
    setDesktopMode: (enabled: boolean) => Promise<boolean>;
    setClickThrough: (enabled: boolean) => Promise<boolean>;
    onClickThroughChanged: (callback: (enabled: boolean) => void) => () => void;
  };
}
