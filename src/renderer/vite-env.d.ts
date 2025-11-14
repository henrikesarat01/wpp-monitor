/// <reference types="vite/client" />

interface Window {
  electron: {
    getAppPath: () => Promise<string>;
    getVersion: () => Promise<string>;
    platform: string;
    onMainLog: (callback: (log: string) => void) => void;
  };
}
