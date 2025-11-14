/**
 * WPP Monitor - Electron Main Process
 */

import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let mainWindow = null;
let server = null;
let serverStartupLogs = [];

// Função helper para log que vai para console E para o renderer
function logToRenderer(message, ...args) {
  const fullMessage = `${message} ${args
    .map((a) => JSON.stringify(a))
    .join(" ")}`;
  console.log(fullMessage);
  serverStartupLogs.push(fullMessage);

  // Se a janela já existe, envia o log
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("main-process-log", fullMessage);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
    icon: path.join(__dirname, "../assets/icon.png"),
    title: "WPP Monitor",
    backgroundColor: "#1e293b",
  });

  // Detectar se é produção (empacotado) ou desenvolvimento
  const isDev = !app.isPackaged;

  if (isDev) {
    // Desenvolvimento: carrega do Vite dev server
    mainWindow.loadURL("http://localhost:5173");
    // Removido: mainWindow.webContents.openDevTools();
  } else {
    // Produção: carrega do dist
    const indexPath = path.join(__dirname, "dist/index.html");
    logToRenderer("[MAIN] Carregando arquivo:", indexPath);
    mainWindow.loadFile(indexPath);
  }

  // Debug: mostrar erros de carregamento
  mainWindow.webContents.on(
    "did-fail-load",
    (event, errorCode, errorDescription) => {
      logToRenderer(
        "[MAIN] ❌ Falha ao carregar:",
        errorCode,
        errorDescription
      );
    }
  );

  mainWindow.webContents.on("did-finish-load", () => {
    logToRenderer("[MAIN] ✅ Página carregada com sucesso!");

    // Enviar logs acumulados para o renderer
    serverStartupLogs.forEach((log) => {
      mainWindow.webContents.send("main-process-log", log);
    });
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  logToRenderer("[MAIN] App ready, iniciando servidor...");
  logToRenderer("[MAIN] __dirname:", __dirname);
  logToRenderer("[MAIN] isPackaged:", app.isPackaged);
  logToRenderer("[MAIN] app.getAppPath():", app.getAppPath());

  // Detectar se é produção (empacotado) ou desenvolvimento
  const isDev = !app.isPackaged;

  // Definir DATA_PATH para o servidor usar um local gravável
  if (!isDev) {
    // Em produção, usar userData do Electron (local gravável)
    const userDataPath = app.getPath("userData");
    process.env.DATA_PATH = userDataPath;

    // Configurar DATABASE_URL para o Prisma
    const dataDir = path.join(userDataPath, "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const dbPath = path.join(dataDir, "database.sqlite").replace(/\\/g, "/");
    process.env.DATABASE_URL = `file:${dbPath}`;

    logToRenderer("[MAIN] DATA_PATH (production):", process.env.DATA_PATH);
    logToRenderer("[MAIN] DATABASE_URL:", process.env.DATABASE_URL);
  } else {
    // Em desenvolvimento, usar cwd
    const dbPath = path
      .join(process.cwd(), "prisma/data/database.sqlite")
      .replace(/\\/g, "/");
    process.env.DATABASE_URL = `file:${dbPath}`;
    logToRenderer("[MAIN] DATA_PATH (dev): process.cwd()");
    logToRenderer("[MAIN] DATABASE_URL:", process.env.DATABASE_URL);
  }

  // Inicia o servidor backend local
  try {
    logToRenderer("[MAIN] Importando módulo do servidor...");

    // Caminho do servidor ajustado para produção e desenvolvimento
    let serverPath;
    if (isDev) {
      // Desenvolvimento: caminho relativo simples
      serverPath = "./src/server/server.js";
    } else {
      // Produção: converter para file:// URL no Windows
      const absolutePath = path.join(__dirname, "src/server/server.js");
      // No Windows, Node.js ESM requer file:// URLs
      serverPath = new URL(`file:///${absolutePath.replace(/\\/g, "/")}`).href;
    }

    logToRenderer("[MAIN] Caminho do servidor:", serverPath);
    const serverModule = await import(serverPath);
    logToRenderer("[MAIN] Módulo importado, iniciando servidor...");
    server = await serverModule.startServer();
    logToRenderer("[MAIN] ✅ Servidor iniciado com sucesso!");
  } catch (err) {
    logToRenderer("[MAIN] ❌ Falha ao iniciar backend:", err.message);
    logToRenderer("[MAIN] Stack:", err.stack);
  }

  logToRenderer("[MAIN] Criando janela...");
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("will-quit", () => {
  // Cleanup ao sair
  if (server) {
    server.close();
  }
});

// IPC Handlers
ipcMain.handle("get-app-version", () => {
  return app.getVersion();
});

ipcMain.handle("minimize-window", () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.handle("maximize-window", () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle("close-window", () => {
  if (mainWindow) {
    mainWindow.close();
  }
});
