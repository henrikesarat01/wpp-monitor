/// <reference types="vite/client" />

interface Window {
  electron: {
    getAppPath: () => Promise<string>;
    getVersion: () => Promise<string>;
    platform: string;
    saveFile: (filename: string, content: string) => Promise<string | null>;
    onMainLog: (callback: (log: string) => void) => void;
  };
}
