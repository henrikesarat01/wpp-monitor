/**
 * WPP Monitor - Preload Script
 *
 * Ponte segura entre o processo principal (Electron) e o renderer (React)
 * Expõe APIs seguras ao contexto do renderer
 */

import { contextBridge, ipcRenderer } from "electron";

// API exposta para o renderer
contextBridge.exposeInMainWorld("electron", {
  // Informações do app
  getAppPath: () => ipcRenderer.invoke("get-app-path"),
  getVersion: () => ipcRenderer.invoke("get-version"),

  // Platform info
  platform: process.platform,

  // Listener para logs do processo principal
  onMainLog: (callback: (log: string) => void) => {
    ipcRenderer.on("main-process-log", (_event, log) => callback(log));
  },
});

// Tipo para TypeScript (criar um arquivo types/electron.d.ts)
export interface ElectronAPI {
  getAppPath: () => Promise<string>;
  getVersion: () => Promise<string>;
  platform: string;
  onMainLog: (callback: (log: string) => void) => void;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}
