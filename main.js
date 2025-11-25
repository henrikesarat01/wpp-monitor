/**
 * IARA - Inteligência Analítica de Rastreamento Avançado
 * Electron Main Process
 */

import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { generateProfessionalPDF } from "./pdf-generator.js";
import { generateBulkPDF } from "./pdf-generator-bulk.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let mainWindow = null;
let server = null;
let serverStartupLogs = [];

// Tratamento de erros não capturados
process.on("uncaughtException", (error) => {
  console.error("[MAIN] ❌ Uncaught Exception:", error);
  // Não encerrar o app por causa de um erro no log
});

process.on("unhandledRejection", (reason, promise) => {
  console.error(
    "[MAIN] ❌ Unhandled Rejection at:",
    promise,
    "reason:",
    reason
  );
  // Não encerrar o app por causa de um erro no log
});

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
    icon: path.join(__dirname, "build/icon.png"),
    title: "IARA - Inteligência Analítica de Rastreamento Avançado",
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

  // Carregar variáveis de ambiente do .env (tanto em dev quanto em produção)
  if (!isDev) {
    try {
      const envPath = path.join(__dirname, ".env");
      logToRenderer("[MAIN] Carregando .env de:", envPath);

      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, "utf8");
        const envLines = envContent.split("\n");

        for (const line of envLines) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
            const [key, ...valueParts] = trimmed.split("=");
            const value = valueParts.join("=").trim();
            if (key && value) {
              process.env[key.trim()] = value;
            }
          }
        }

        logToRenderer("[MAIN] ✅ Variáveis de ambiente carregadas do .env");
        logToRenderer(
          "[MAIN] GROQ_API_KEY:",
          process.env.GROQ_API_KEY ? "✓ Configurada" : "✗ Não encontrada"
        );
      } else {
        logToRenderer("[MAIN] ⚠️ Arquivo .env não encontrado");
      }
    } catch (error) {
      logToRenderer("[MAIN] ❌ Erro ao carregar .env:", error.message);
    }
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
      // Produção: caminho absoluto dentro do ASAR
      const absolutePath = path.join(__dirname, "src/server/server.js");
      serverPath = absolutePath;
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

app.on("before-quit", async (event) => {
  console.log("[MAIN] 🧹 Iniciando processo de encerramento...");

  // Cleanup do servidor
  if (server) {
    try {
      // Importar a função de cleanup do servidor
      const isDev = !app.isPackaged;
      let serverPath;

      if (isDev) {
        serverPath = "./src/server/server.js";
      } else {
        serverPath = path.join(__dirname, "src/server/server.js");
      }

      const { cleanupServer } = await import(serverPath);

      if (cleanupServer) {
        await cleanupServer();
      }

      // Fechar o servidor HTTP
      if (server.close) {
        server.close(() => {
          console.log("[MAIN] ✓ Servidor HTTP fechado");
        });
      }
    } catch (err) {
      console.error("[MAIN] ❌ Erro durante cleanup:", err);
    }
  }

  console.log("[MAIN] ✓ Cleanup concluído, encerrando app...");
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

ipcMain.handle("save-file", async (event, filename, data) => {
  const { dialog } = await import("electron");
  const PDFDocument = (await import("pdfkit")).default;

  try {
    // Mudar extensão para PDF
    const pdfFilename = filename.replace(/\.txt$/, ".pdf");

    // Abrir diálogo para escolher onde salvar
    const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
      title: "Salvar Exportação",
      defaultPath: path.join(app.getPath("downloads"), pdfFilename),
      filters: [{ name: "Documento PDF", extensions: ["pdf"] }],
    });

    if (canceled || !filePath) {
      return null;
    }

    // Criar PDF com margens personalizadas
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 80, bottom: 60, left: 60, right: 60 },
      bufferPages: true,
      info: {
        Title: "IARA - Relatório de Conversa",
        Author: "IARA - Inteligência Analítica",
        Subject: "Análise de Conversa",
        Keywords: "CRM, Analytics, WhatsApp",
      },
    });

    // Criar stream para salvar
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Parsear dados (vem como objeto JSON agora)
    const exportData = typeof data === "string" ? JSON.parse(data) : data;

    // Verificar se é exportação em massa ou individual
    const isBulkExport =
      exportData.conversations && Array.isArray(exportData.conversations);

    if (isBulkExport) {
      console.log(
        "[MAIN] 📦 Gerando PDF em massa com",
        exportData.totalConversations,
        "conversas"
      );
      await generateBulkPDF(doc, exportData);
    } else {
      console.log("[MAIN] 📄 Gerando PDF individual");
      await generateProfessionalPDF(doc, exportData);
    }

    // Finalizar PDF
    doc.end();

    // Aguardar finalização
    await new Promise((resolve, reject) => {
      stream.on("finish", resolve);
      stream.on("error", reject);
    });

    console.log("[MAIN] ✅ PDF salvo em:", filePath);
    return filePath;
  } catch (error) {
    console.error("[MAIN] ❌ Erro ao salvar PDF:", error);
    throw error;
  }
});
