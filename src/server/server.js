/**
 * IARA - Servidor Completo
 *
 * Servidor Express + Socket.io + WhatsApp (Baileys) + SQLite
 * Tudo em JavaScript puro
 */

// Carregar variáveis de ambiente do .env
import "dotenv/config";

// Redirecionar logs para stdout/stderr explicitamente
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.log = (...args) => {
  const message = args
    .map((arg) =>
      typeof arg === "object" ? JSON.stringify(arg, null, 2) : arg
    )
    .join(" ");
  process.stdout.write(message + "\n");
  originalConsoleLog(...args);
};

console.error = (...args) => {
  const message = args
    .map((arg) =>
      typeof arg === "object" ? JSON.stringify(arg, null, 2) : arg
    )
    .join(" ");
  process.stderr.write(message + "\n");
  originalConsoleError(...args);
};

console.warn = (...args) => {
  const message = args
    .map((arg) =>
      typeof arg === "object" ? JSON.stringify(arg, null, 2) : arg
    )
    .join(" ");
  process.stdout.write(message + "\n");
  originalConsoleWarn(...args);
};

import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Criar arquivo de log em tempo real APÓS importações
// Usar DATA_PATH se disponível (produção Electron), senão usar cwd
const dataPath = process.env.DATA_PATH || process.cwd();
const logDir = path.join(dataPath, "data");
const logFilePath = path.join(logDir, "server-debug.log");

let logStream = null;

try {
  // Garantir que o diretório existe
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  console.log("🚀 [SERVER] Criando arquivo de log em:", logFilePath);
  logStream = fs.createWriteStream(logFilePath, { flags: "a" });

  // Interceptar console.log para também escrever no arquivo
  const originalLog = originalConsoleLog;
  console.log = (...args) => {
    const timestamp = new Date().toISOString();
    const message = args
      .map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a)))
      .join(" ");
    const logLine = `[${timestamp}] ${message}\n`;

    try {
      if (logStream && logStream.writable) {
        logStream.write(logLine);
      }
    } catch (err) {
      // Ignorar erros de escrita
    }

    originalLog(...args);
  };

  console.log("✅ [SERVER] Sistema de log configurado com sucesso!");
  console.log("✅ [SERVER] Você pode acompanhar com: tail -f", logFilePath);
} catch (err) {
  console.error("❌ [SERVER] Erro ao criar arquivo de log:", err);
  // Se falhar, continuar sem arquivo de log
  logStream = null;
}

// Database simples com Better-SQLite3
import db from "./database.js";
const { accounts, contacts, messages, dashboardKPIs } = db;

// AI Service - Análise inteligente de mensagens
import aiService from "./ai-service.js";
import deepseekService from "./deepseek-service.js";
import transcriptionService from "./transcription-service.js";

// DEBUG: Verificar se dashboardKPIs foi importado
console.log("🔍 [SERVER] Módulo carregado!");
console.log("🔍 [SERVER] dashboardKPIs type:", typeof dashboardKPIs);
console.log(
  "🔍 [SERVER] dashboardKPIs keys:",
  dashboardKPIs ? Object.keys(dashboardKPIs).length : 0
);
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  downloadMediaMessage,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import pino from "pino";
import { promises as fsPromises } from "fs";
import QRCode from "qrcode";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

// Função para baixar e salvar mídia
async function downloadAndSaveMedia(msg, messageType) {
  try {
    const buffer = await downloadMediaMessage(msg, "buffer", {});
    const extension = getExtensionFromMessageType(messageType, msg);
    const filename = `${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}.${extension}`;
    const filepath = path.join(MEDIA_PATH, filename);
    fs.writeFileSync(filepath, buffer);
    return `/media/${filename}`; // Path relativo para o front-end
  } catch (error) {
    console.error("Erro ao baixar mídia:", error);
    return null;
  }
}

// Função para obter extensão baseada no tipo
function getExtensionFromMessageType(type, msg = null) {
  if (type === "document" && msg?.message?.documentMessage) {
    const docMsg = msg.message.documentMessage;
    // Tentar obter extensão do filename ou mimetype
    if (docMsg.fileName) {
      const ext = docMsg.fileName.split(".").pop()?.toLowerCase();
      if (ext) return ext;
    }
    if (docMsg.mimetype) {
      const mimeToExt = {
        "application/pdf": "pdf",
        "application/msword": "doc",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
          "docx",
        "application/vnd.ms-excel": "xls",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
          "xlsx",
        "application/vnd.ms-powerpoint": "ppt",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation":
          "pptx",
        "text/plain": "txt",
        "application/zip": "zip",
        "application/x-rar-compressed": "rar",
      };
      return mimeToExt[docMsg.mimetype] || "bin";
    }
  }

  switch (type) {
    case "image":
      return "jpg";
    case "audio":
      return "mp3";
    case "video":
      return "mp4";
    case "document":
      return "pdf";
    default:
      return "bin";
  }
}

// ============================================
// CONFIGURAÇÃO INICIAL
// ============================================

// Porta configurável via variável de ambiente (padrão alterado para 8523)
const PORT = process.env.PORT ? Number(process.env.PORT) : 8523;

// Caminho de dados - em produção usa userData do Electron, em dev usa cwd
const DATA_PATH = process.env.DATA_PATH || process.cwd();

// Pasta para mídia
const MEDIA_PATH = path.join(DATA_PATH, "data", "media");
if (!fs.existsSync(MEDIA_PATH)) {
  fs.mkdirSync(MEDIA_PATH, { recursive: true });
}

console.log("[SERVER] DATA_PATH:", DATA_PATH);
console.log("[SERVER] PORT:", PORT);

console.log("🚀 [SERVER] Criando app Express...");
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

console.log("✅ [SERVER] Express e Socket.io criados");

// Middleware
app.use(cors());
app.use(express.json());

console.log("✅ [SERVER] Middleware configurado");

// Servir arquivos de mídia
app.use("/media", express.static(MEDIA_PATH));

// Armazenamento de conexões WhatsApp
const whatsappConnections = new Map();

// ============================================
// RASTREAMENTO INTELIGENTE DE MENSAGENS
// ============================================

// Rastreia último peer real por conta (para resolver @lid)
const lastPeerByAccount = new Map(); // accountId -> { number, ts }

// Rastreia mensagens pendentes para reconciliação
const pendingByAccount = new Map(); // accountId -> Map<messageId, dbId>

// Rastreia falhas de decriptação por JID
const macFailures = new Map(); // jid -> count

// Mapeia @lid para números reais descobertos
const lidToNumberMap = new Map(); // @lid -> realNumber

// ============================================
// ANÁLISE DE IA DE MENSAGENS
// ============================================

let aiInitialized = false;
let aiInitializing = false;

/**
 * Inicializa o serviço de IA (uma vez)
 */
async function initializeAI() {
  if (aiInitialized) return true;
  if (aiInitializing) {
    console.log("⏳ [AI] Aguardando inicialização...");
    // Aguardar até 30s
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 500));
      if (aiInitialized) return true;
    }
    return false;
  }

  aiInitializing = true;
  try {
    console.log("🤖 [AI] Inicializando modelos de IA...");
    await aiService.initialize();
    aiInitialized = true;
    console.log("✅ [AI] Modelos carregados com sucesso!");
    return true;
  } catch (error) {
    console.error("❌ [AI] Erro ao inicializar:", error);
    aiInitializing = false;
    return false;
  }
}

/**
 * Gera resumo automático de uma conversa
 */
async function generateConversationSummary(remoteJid, currentMessageId) {
  try {
    // Buscar mensagens recentes da conversa (últimas 24h)
    const conversationMessages = messages.getConversationMessages(
      remoteJid,
      20,
      24
    );

    // Verificar se já existe resumo recente (menos de 1 hora)
    const recentSummary = conversationMessages.find(
      (msg) =>
        msg.aiSummary &&
        new Date(msg.timestamp).getTime() > Date.now() - 60 * 60 * 1000
    );

    if (recentSummary) {
      console.log(
        `📝 [AI] Resumo recente já existe para ${remoteJid.substring(0, 15)}`
      );
      return;
    }

    // Verificar se tem mensagens suficientes para resumir (mínimo 5)
    if (conversationMessages.length < 5) {
      return;
    }

    // Concatenar mensagens em texto único
    const conversationText = conversationMessages
      .reverse() // Ordem cronológica
      .map((msg) => {
        const prefix = msg.direction === "received" ? "Cliente" : "Atendente";
        return `${prefix}: ${msg.body}`;
      })
      .join("\n");

    // Verificar tamanho mínimo (300 palavras ≈ 1500 caracteres)
    if (conversationText.length < 1500) {
      return;
    }

    console.log(
      `📝 [AI] Gerando resumo para conversa com ${remoteJid.substring(
        0,
        15
      )}...`
    );
    console.log(
      `📊 [AI] ${conversationMessages.length} mensagens, ${conversationText.length} caracteres`
    );

    const startTime = Date.now();

    // Gerar resumo
    const summaryResult = await aiService.summarizeConversation(
      conversationText,
      100
    );
    const summaryTime = Date.now() - startTime;

    console.log(`✅ [AI] Resumo gerado em ${summaryTime}ms:`);
    console.log(`   Original: ${summaryResult.originalLength} palavras`);
    console.log(`   Resumo: ${summaryResult.summaryLength} palavras`);
    console.log(
      `   Compressão: ${(summaryResult.compressionRate * 100).toFixed(0)}%`
    );
    console.log(`   Tempo economizado: ${summaryResult.timeSaved.toFixed(1)}s`);

    // Salvar resumo na mensagem atual
    await messages.updateAIAnalysis(currentMessageId, {
      summary: summaryResult.summary,
      summaryLength: summaryResult.summaryLength,
      originalLength: summaryResult.originalLength,
      compressionRate: summaryResult.compressionRate,
    });

    // Emitir evento de resumo via Socket.io
    io.emit("conversation-summarized", {
      remoteJid,
      messageId: currentMessageId,
      summary: summaryResult.summary,
      stats: {
        originalLength: summaryResult.originalLength,
        summaryLength: summaryResult.summaryLength,
        compressionRate: summaryResult.compressionRate,
        timeSaved: summaryResult.timeSaved,
      },
    });
  } catch (error) {
    console.error(
      `❌ [AI] Erro ao gerar resumo para ${remoteJid}:`,
      error.message
    );
  }
}

/**
 * Analisa uma mensagem com IA e salva resultados
 */
async function analyzeMessageWithAI(messageId, content, direction, remoteJid) {
  // Apenas analisar mensagens recebidas (do cliente)
  if (direction !== "received") return;

  // Ignorar mensagens muito curtas
  if (!content || content.length < 5) return;

  try {
    console.log(`🔍 [AI] Analisando mensagem ${messageId.substring(0, 8)}...`);
    const startTime = Date.now();

    let analysis;
    let provider = "local";

    // Tentar usar DeepSeek primeiro
    try {
      console.log("🤖 [AI] Tentando análise com DeepSeek...");
      const deepseekResult = await deepseekService.analyzeSingleMessage(
        content
      );

      // Converter formato DeepSeek para formato esperado
      analysis = {
        classification: {
          category: deepseekResult.category,
          score: deepseekResult.categoryScore,
        },
        urgency: {
          priority: deepseekResult.urgency,
          level:
            deepseekResult.urgency >= 8
              ? "high"
              : deepseekResult.urgency >= 5
              ? "medium"
              : "low",
        },
        sentiment: {
          sentiment: deepseekResult.sentiment,
          score: deepseekResult.sentimentScore,
        },
        intent: {
          intent: deepseekResult.intent,
          score: deepseekResult.intentScore,
        },
        extraction: {
          values: [],
          emails: [],
          phones: [],
        },
      };
      provider = "deepseek";
      console.log("✅ [AI] Análise DeepSeek concluída");
    } catch (deepseekError) {
      console.log(
        `⚠️ [AI] DeepSeek falhou, usando IA local: ${deepseekError.message}`
      );

      // Fallback para IA local
      if (!aiInitialized) {
        const ready = await initializeAI();
        if (!ready) {
          console.log("⚠️ [AI] Modelos não disponíveis ainda, pulando análise");
          return;
        }
      }

      analysis = await aiService.analyzeMessage(content);
    }

    const analysisTime = Date.now() - startTime;

    // Salvar resultados no banco
    await messages.updateAIAnalysis(messageId, {
      category: analysis.classification.category,
      categoryScore: analysis.classification.score,
      urgency: analysis.urgency.priority,
      urgencyLevel: analysis.urgency.level,
      sentiment: analysis.sentiment.sentiment,
      sentimentScore: analysis.sentiment.score,
      intent: analysis.intent.intent,
      intentScore: analysis.intent.score,
      extractedValues: analysis.extraction,
      analyzedAt: new Date().toISOString(),
    });

    console.log(
      `✅ [AI] Análise concluída em ${analysisTime}ms (${provider}):`,
      {
        category: analysis.classification.category,
        urgency: `${analysis.urgency.priority}/10`,
        sentiment: analysis.sentiment.sentiment,
        intent: analysis.intent.intent,
      }
    );

    // Emitir evento de análise via Socket.io
    io.emit("message-analyzed", {
      messageId,
      analysis: {
        category: analysis.classification.category,
        urgency: analysis.urgency.priority,
        urgencyLevel: analysis.urgency.level,
        sentiment: analysis.sentiment.sentiment,
        intent: analysis.intent.intent,
      },
    });

    // Gerar resumo automático após análise (se conversa for longa)
    // Executar de forma assíncrona para não bloquear
    if (remoteJid) {
      setImmediate(() => {
        generateConversationSummary(remoteJid, messageId).catch((err) => {
          console.error(
            "❌ [AI] Erro ao gerar resumo automático:",
            err.message
          );
        });
      });
    }
  } catch (error) {
    console.error(
      `❌ [AI] Erro ao analisar mensagem ${messageId}:`,
      error.message
    );
  }
}

// ============================================
// FUNÇÕES AUXILIARES PARA RASTREAMENTO
// ============================================

/**
 * Registra último peer real por conta (janela de 60s)
 */
function updateLastPeer(accountId, contactNumber) {
  lastPeerByAccount.set(accountId, {
    number: contactNumber,
    ts: Date.now(),
  });
}

/**
 * Obtém último peer se estiver dentro da janela de 60s
 */
function getLastPeer(accountId) {
  const candidate = lastPeerByAccount.get(accountId);
  const fresh = candidate && Date.now() - candidate.ts < 60_000; // 60s
  return fresh ? candidate.number : null;
}

/**
 * Mapeia @lid para número real quando descoberto
 */
function mapLidToNumber(lid, realNumber) {
  if (lid.includes("@lid") && realNumber && !realNumber.includes("@lid")) {
    const previousMapping = lidToNumberMap.get(lid);
    lidToNumberMap.set(lid, realNumber);
    console.log(`🗺️ [LID MAPPING] ${lid} -> ${realNumber}`);

    // Se é um novo mapeamento ou mudança, atualizar contatos existentes
    if (!previousMapping || previousMapping !== realNumber) {
      updateContactsWithLid(lid, realNumber);
    }
  }
}

/**
 * Atualiza contatos que usam @lid para usar o número real
 */
async function updateContactsWithLid(lid, realNumber) {
  try {
    console.log(
      `🔄 [CONTACT UPDATE] Iniciando unificação: ${lid} -> ${realNumber}`
    );

    // Buscar o contato @lid - tentar com @lid completo e normalizado
    let lidContact = await contacts.findUnique({
      where: { number: lid },
    });

    if (!lidContact) {
      // Tentar com número normalizado (sem @lid)
      const normalizedLid = normalizePhoneNumber(lid);
      lidContact = await contacts.findUnique({
        where: { number: normalizedLid },
      });
      console.log(
        `📞 [CONTACT UPDATE] Tentando buscar com número normalizado: ${normalizedLid}`
      );
    }

    if (!lidContact) {
      // ✅ CORREÇÃO CRÍTICA: Tentar buscar como temp_
      const lidId = normalizePhoneNumber(lid);
      const tempNumber = `temp_${lidId}`;
      lidContact = await contacts.findUnique({
        where: { number: tempNumber },
      });
      console.log(`📞 [CONTACT UPDATE] Tentando buscar temp_: ${tempNumber}`);
    }

    if (!lidContact) {
      console.log(
        `📞 [CONTACT UPDATE] Contato @lid ${lid} não encontrado (tentou: ${lid}, ${normalizePhoneNumber(
          lid
        )}, temp_${normalizePhoneNumber(lid)})`
      );
      return;
    }

    console.log(
      `✅ [CONTACT UPDATE] Contato @lid encontrado: ${lidContact.number} (ID: ${lidContact.id})`
    );

    // Verificar se já existe um contato com o número real
    const realContact = await contacts.findUnique({
      where: { number: realNumber },
    });

    if (realContact) {
      // Se ambos existem, precisamos unificar
      console.log(
        `🔗 [CONTACT UPDATE] Ambos contatos existem. Unificando ${lid} (ID: ${lidContact.id}) com ${realNumber} (ID: ${realContact.id})`
      );

      // 1. Atualizar todas as mensagens que referenciam o contato @lid para o contato real
      const updateResults = [];

      // Atualizar mensagens onde o @lid é o sender
      try {
        const senderResult = await db.db
          .prepare(
            `
          UPDATE messages 
          SET contactSenderId = ? 
          WHERE contactSenderId = ?
        `
          )
          .run(realContact.id, lidContact.id);
        console.log(
          `✅ [CONTACT UPDATE] ${senderResult.changes} mensagens de envio atualizadas`
        );
      } catch (e) {
        console.error(`❌ [CONTACT UPDATE] Erro ao atualizar sender:`, e);
      }

      // Atualizar mensagens onde o @lid é o receiver
      try {
        const receiverResult = await db.db
          .prepare(
            `
          UPDATE messages 
          SET contactReceiverId = ? 
          WHERE contactReceiverId = ?
        `
          )
          .run(realContact.id, lidContact.id);
        console.log(
          `✅ [CONTACT UPDATE] ${receiverResult.changes} mensagens de recebimento atualizadas`
        );
      } catch (e) {
        console.error(`❌ [CONTACT UPDATE] Erro ao atualizar receiver:`, e);
      }

      // Verificar se ainda há mensagens referenciando o contato @lid
      const remainingMessages = db.db
        .prepare(
          `
        SELECT COUNT(*) as count 
        FROM messages 
        WHERE contactSenderId = ? OR contactReceiverId = ?
      `
        )
        .get(lidContact.id, lidContact.id);

      if (remainingMessages.count > 0) {
        console.warn(
          `⚠️  [CONTACT UPDATE] Ainda existem ${remainingMessages.count} mensagens referenciando o contato @lid ${lid}`
        );
        console.warn(
          `⚠️  [CONTACT UPDATE] Não é possível deletar o contato. Mantendo-o no banco.`
        );
      } else {
        // 2. Deletar o contato @lid apenas se não houver mensagens
        try {
          await contacts.delete({ where: { id: lidContact.id } });
          console.log(
            `🗑️ [CONTACT UPDATE] Contato @lid ${lid} deletado com sucesso`
          );
        } catch (e) {
          console.error(`❌ [CONTACT UPDATE] Erro ao deletar @lid:`, e);
          console.error(
            `❌ [CONTACT UPDATE] Detalhes:`,
            JSON.stringify(e, null, 2)
          );
        }
      }

      // 3. Atualizar nome se o contato @lid tinha nome e o real não
      if (lidContact.name && !realContact.name) {
        try {
          await contacts.update({
            where: { id: realContact.id },
            data: { name: lidContact.name },
          });
          console.log(
            `📝 [CONTACT UPDATE] Nome atualizado: ${lidContact.name}`
          );
        } catch (e) {
          console.error(`❌ [CONTACT UPDATE] Erro ao atualizar nome:`, e);
        }
      }

      // 4. Notificar front-end
      io.emit("contact-unified", {
        oldContactId: lidContact.id,
        newContactId: realContact.id,
        oldNumber: lid,
        newNumber: realNumber,
        contactName: realContact.name || lidContact.name,
      });

      console.log(`✅ [CONTACT UPDATE] Unificação concluída com sucesso!`);
    } else {
      // Se o contato real não existe, apenas renomear o @lid
      console.log(
        `📞 [CONTACT UPDATE] Contato real não existe. Renomeando ${lid} para ${realNumber}`
      );

      try {
        await contacts.update({
          where: { id: lidContact.id },
          data: { number: realNumber },
        });

        // Notificar front-end
        io.emit("contact-updated", {
          oldNumber: lid,
          newNumber: realNumber,
          contactName: lidContact.name,
        });

        console.log(`✅ [CONTACT UPDATE] Contato renomeado com sucesso!`);
      } catch (e) {
        console.error(`❌ [CONTACT UPDATE] Erro ao renomear:`, e);
      }
    }
  } catch (error) {
    console.error(
      "❌ [CONTACT UPDATE] Erro geral ao atualizar contato:",
      error
    );
  }
}

/**
 * Obtém número real mapeado de um @lid
 */
function getMappedNumber(lid) {
  return lidToNumberMap.get(lid);
}

/**
 * Registra mensagem pendente para reconciliação posterior
 */
function registerPendingMessage(accountId, messageId, dbId) {
  if (!pendingByAccount.has(accountId)) {
    pendingByAccount.set(accountId, new Map());
  }
  pendingByAccount.get(accountId).set(messageId, dbId);
  console.log(
    `⏳ [PENDING] Registrada mensagem ${messageId} para reconciliação`
  );
}

/**
 * Reconcilia mensagens pendentes quando número real aparecer
 */
async function reconcilePendingMessages(accountId, contactNumber, contactId) {
  const pendings = pendingByAccount.get(accountId);
  if (!pendings || pendings.size === 0) return;

  let reconciledCount = 0;
  for (const [pendingMsgId, dbId] of pendings.entries()) {
    try {
      messages.update({
        where: { id: dbId },
        data: { contactReceiverId: contactId },
      });

      io.emit("message-updated", {
        id: dbId,
        contactNumber,
        accountId,
      });

      pendings.delete(pendingMsgId);
      reconciledCount++;
    } catch (e) {
      console.error(
        `❌ [PENDING] Erro ao reconciliar ${pendingMsgId}:`,
        e.message
      );
    }
  }

  if (reconciledCount > 0) {
    console.log(
      `✅ [PENDING] ${reconciledCount} mensagem(ns) reconciliada(s) para ${contactNumber}`
    );
  }
}

/**
 * Registra falha de decriptação e retorna contagem
 */
function noteMacFailure(jid) {
  const n = (macFailures.get(jid) || 0) + 1;
  macFailures.set(jid, n);
  return n;
}

/**
 * Reseta sessão Signal para JID problemático
 */
async function resetSessionForJid(sock, jid) {
  try {
    if (sock.authState?.keys?.set) {
      await sock.authState.keys.set({ session: { [jid]: null } });
      console.log(`🔑 [SIGNAL] Sessão resetada para ${jid}`);
      macFailures.delete(jid);
    }
  } catch (e) {
    console.error(`❌ [SIGNAL] Erro ao resetar sessão:`, e.message);
  }
}

// Cache de mensagens recentes para detectar duplicatas
const recentMessagesCache = new Map(); // messageId -> { contactNumber, timestamp }

// Buffer de mensagens com @lid aguardando a notificação com número real
const lidMessagesBuffer = new Map(); // messageId -> { msg, accountId, timeout }

// Memoriza o último destinatário por conta (para resolver @lid)
const lastSentTo = new Map(); // accountId -> normalizedNumber

// Mapa de mensagens enviadas (providerId/messageId → número real)
const sentMessagesMap = new Map(); // messageId -> { accountId, contactNumber, timestamp }

// Contador de sincronização de histórico
const syncStats = new Map(); // accountId -> { totalMessages: 0, uniqueChats: Set(), startTime: null }

// ============================================
// TRATAMENTO DE ERROS GLOBAIS
// ============================================

// ✅ CORREÇÃO 4: Capturar rejeições não tratadas
process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ [UNHANDLED REJECTION]", reason);
  console.error("Promise:", promise);
});

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

/**
 * ✅ CORREÇÃO 2: Obter authState criando pasta antes
 * Garante que a pasta existe antes do useMultiFileAuthState
 */
async function getAuthState(sessionId) {
  const sessionDir = path.join(DATA_PATH, "data", "sessions", sessionId);
  await fsPromises.mkdir(sessionDir, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  return { state, saveCreds, sessionDir };
}

function normalizePhoneNumber(jid) {
  const s = String(jid || "");

  // 1) pega só a parte antes do @ (se vier um JID)
  const beforeAt = s.split("@")[0];

  // 2) remove sufixo de device (:1, :2, ...)
  const noDevice = beforeAt.split(":")[0];

  // 3) remove tudo que NÃO é dígito (+, espaços, parênteses, hífens, etc.)
  const digits = noDevice.replace(/\D/g, "");

  return digits;
}

function ensureDirectories() {
  const dirs = [
    path.join(DATA_PATH, "data"),
    path.join(DATA_PATH, "data/sessions"),
    path.join(DATA_PATH, "data/logs"),
  ];

  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log("[SERVER] Created directory:", dir);
    }
  });
}

// ============================================
// WHATSAPP / BAILEYS
// ============================================

async function connectWhatsApp(accountId, number) {
  console.log("📱 [WHATSAPP] Conectando:", number);

  // ✅ CORREÇÃO 1: Usar accountId como identificador estável (nunca temp_*)
  const stableSessionId = accountId;

  // ✅ CORREÇÃO 2: Usar getAuthState que cria pasta antes
  const { state, saveCreds, sessionDir } = await getAuthState(stableSessionId);
  const { version } = await fetchLatestBaileysVersion();

  const socket = makeWASocket({
    version,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
    },
    generateHighQualityLinkPreview: true,
    // ❌ REMOVIDO: syncFullHistory trava a conexão esperando histórico infinito
    // O Baileys já sincroniza mensagens recentes automaticamente
    getMessage: async (key) => {
      // Retornar mensagem do banco se existir (para citações)
      if (key?.id) {
        const msg = await messages.findFirst({
          where: { providerId: key.id },
        });
        return msg?.content ? { conversation: msg.content } : undefined;
      }
      return undefined;
    },
  });

  const instanceObj = {
    socket,
    accountId,
    number,
    status: "connecting",
    sessionDir, // guardar para possível limpeza
  };

  whatsappConnections.set(accountId, instanceObj);

  // 🔍 DEBUG: Listar TODOS os eventos emitidos pelo socket
  const originalEmit = socket.ev.emit.bind(socket.ev);
  socket.ev.emit = function (event, ...args) {
    console.log(`🔔 [BAILEYS-EVENT] Evento emitido: "${event}"`);
    return originalEmit(event, ...args);
  };

  // ✅ CORREÇÃO 3: Escutar creds.update
  socket.ev.on("creds.update", saveCreds);

  // Event: Atualização de conexão
  socket.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;
    const instance = whatsappConnections.get(accountId);

    // QR Code
    if (qr) {
      console.log("📱 [WHATSAPP] QR Code gerado");
      const qrCodeDataURL = await QRCode.toDataURL(qr);
      instance.status = "qr_required";

      io.emit("qr-code", { accountId, qrCode: qrCodeDataURL });

      await accounts.update({
        where: { id: accountId },
        data: { status: "qr_required" },
      });
    }

    // Conectado
    if (connection === "open") {
      console.log("📱 [WHATSAPP] Conectado:", number);
      console.log(
        "✅ [WHATSAPP] Pronto para receber mensagens (sincronização automática ativa)"
      );

      // 🔍 DEBUG: Verificar se socket está vivo
      console.log(`🔍 [DEBUG] Socket está vivo? ${socket ? "SIM" : "NÃO"}`);
      console.log(`🔍 [DEBUG] Socket.ev existe? ${socket.ev ? "SIM" : "NÃO"}`);
      console.log(`🔍 [DEBUG] User ID: ${socket.user?.id}`);

      // Inicializar contador de sincronização
      syncStats.set(accountId, {
        totalMessages: 0,
        uniqueChats: new Set(),
        startTime: Date.now(),
      });

      instance.status = "connected";

      const actualNumber = socket.user?.id?.split(":")[0] || number; // Atualizar número real no banco
      await accounts.update({
        where: { id: accountId },
        data: {
          number: actualNumber,
          status: "connected",
        },
      });

      instance.number = actualNumber;

      io.emit("connection-status", { accountId, status: "connected" });
    }

    // Desconectado
    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log("📱 [WHATSAPP] Conexão fechada. Motivo:", statusCode);
      console.log("📱 [WHATSAPP] shouldReconnect:", shouldReconnect);

      // ⚠️ 401 = Sessão expirada, precisa reescanear QR
      if (statusCode === 401) {
        console.log(
          "🔄 [WHATSAPP] Sessão expirada (401), limpando e gerando novo QR..."
        );

        whatsappConnections.delete(accountId);

        // Limpar sessão antiga
        const sessionPath = path.join(
          process.cwd(),
          "data",
          "sessions",
          accountId
        );
        if (fs.existsSync(sessionPath)) {
          fs.rmSync(sessionPath, { recursive: true, force: true });
          console.log("🗑️ [WHATSAPP] Sessão antiga removida:", sessionPath);
        }

        // Marcar como qr_required e reconectar
        await accounts.update({
          where: { id: accountId },
          data: { status: "qr_required" },
        });

        io.emit("connection-status", { accountId, status: "qr_required" });

        // Reconectar para gerar novo QR
        setTimeout(() => {
          console.log("🔄 [WHATSAPP] Reconectando para gerar novo QR...");
          connectWhatsApp(accountId, instance.number);
        }, 2000);

        return;
      }

      if (shouldReconnect) {
        console.log("📱 [WHATSAPP] Reconectando...");
        connectWhatsApp(accountId, instance.number);
      } else {
        // ⚠️ Só marca como disconnected se for logout real
        console.log(
          "📱 [WHATSAPP] Logout detectado, marcando como disconnected"
        );
        whatsappConnections.delete(accountId);
        instance.status = "disconnected";

        await accounts.update({
          where: { id: accountId },
          data: { status: "disconnected" },
        });

        io.emit("connection-status", { accountId, status: "disconnected" });
      }
    }
  });

  // Event: Novas mensagens
  console.log(
    `🎧 [WHATSAPP] Registrando listener messages.upsert para conta ${accountId}`
  );
  socket.ev.on(
    "messages.upsert",
    async ({ messages: incomingMessages, type }) => {
      // 🔥 Logs aparecem direto no terminal
      console.log(
        "🔔 [MESSAGES.UPSERT] ========================================"
      );
      console.log("🔔 [MESSAGES.UPSERT] Event disparado!");
      console.log("🔔 [MESSAGES.UPSERT] Type:", type);
      console.log(
        "🔔 [MESSAGES.UPSERT] Total de mensagens:",
        incomingMessages?.length
      );
      console.log("🔔 [MESSAGES.UPSERT] AccountId:", accountId);
      console.log(
        "🔔 [MESSAGES.UPSERT] Mensagens brutas:",
        JSON.stringify(incomingMessages, null, 2)
      );

      // ✅ Processar mensagens em tempo real (notify)
      // ✅ Processar mensagens enviadas por mim (fromMe)
      // ✅ Processar histórico ao reconectar (append, history)
      const hasFromMe =
        Array.isArray(incomingMessages) &&
        incomingMessages.some((m) => m?.key?.fromMe);
      const isHistory = type === "append" || type === "history";

      console.log(
        "📨 [MESSAGES.UPSERT] Type:",
        type,
        "HasFromMe:",
        hasFromMe,
        "IsHistory:",
        isHistory,
        "Messages:",
        incomingMessages?.length
      );

      // ✅ CORREÇÃO: Permitir TODAS as mensagens não vazias para garantir que mensagens enviadas sejam processadas
      if (!Array.isArray(incomingMessages) || incomingMessages.length === 0) {
        console.log("⚠️ [MESSAGES.UPSERT] Nenhuma mensagem para processar");
        return;
      }

      // ✅ OTIMIZAÇÃO: Buscar timestamp da última mensagem salva para ignorar histórico antigo
      let lastMessageTimestamp = 0;
      if (isHistory) {
        try {
          const lastMsg = await messages.findFirst({
            orderBy: { timestamp: "desc" },
            select: { timestamp: true },
          });
          if (lastMsg?.timestamp) {
            lastMessageTimestamp = lastMsg.timestamp;
            console.log(
              `⏰ [SYNC] Última mensagem no banco: ${new Date(
                lastMessageTimestamp * 1000
              ).toLocaleString("pt-BR")}`
            );
          }
        } catch (err) {
          console.error("⚠️ [SYNC] Erro ao buscar última mensagem:", err);
        }
      }

      if (isHistory) {
        console.log(
          `💬 [WHATSAPP] 📥 Sincronizando ${incomingMessages.length} mensagem(ns) do histórico (${type})`
        );

        // Atualizar estatísticas
        const stats = syncStats.get(accountId);
        if (stats) {
          stats.totalMessages += incomingMessages.length;

          // Contar chats únicos
          incomingMessages.forEach((msg) => {
            const chatId = msg.key?.remoteJid;
            if (chatId) {
              stats.uniqueChats.add(chatId);
            }
          });

          const elapsed = ((Date.now() - stats.startTime) / 1000).toFixed(1);
          console.log(
            `📊 [SYNC] Total: ${stats.totalMessages} mensagens | ${stats.uniqueChats.size} conversas | Tempo: ${elapsed}s`
          );
        }
      } else {
        console.log(
          `💬 [WHATSAPP] ✉️ Recebendo ${incomingMessages.length} mensagem(ns) em tempo real (${type})`
        );
      }

      for (const msg of incomingMessages) {
        console.log("📨 [MSG] ============================================");
        console.log("📨 [MSG] Processando mensagem:", {
          id: msg.key?.id,
          fromMe: msg.key?.fromMe,
          remoteJid: msg.key?.remoteJid,
          type: type,
          hasMessage: !!msg.message,
          pushName: msg.pushName,
          messageTimestamp: msg.messageTimestamp,
        });
        console.log(
          "📨 [MSG] msg.key completo:",
          JSON.stringify(msg.key, null, 2)
        );
        console.log(
          "📨 [MSG] msg.message type:",
          Object.keys(msg.message || {})[0]
        );

        if (!msg.message) {
          console.log("⚠️ [MSG] Pulando - sem conteúdo de mensagem");
          continue;
        }

        const providerId = msg.key?.id || null;
        const remoteJid = msg.key.remoteJid || "";
        const rawJid = msg.key.remoteJidAlt || remoteJid || "";

        console.log("🔍 [MSG] Verificando filtros...");
        console.log("🔍 [MSG] remoteJid:", remoteJid);
        console.log("🔍 [MSG] rawJid:", rawJid);
        console.log("🔍 [MSG] providerId:", providerId);

        // ✅ FILTRO 1: Ignorar mensagens de grupos (verificar AMBOS)
        if (remoteJid.endsWith("@g.us") || rawJid.endsWith("@g.us")) {
          console.log(
            "❌ [FILTRO 1] IGNORADO - mensagem de grupo:",
            remoteJid,
            rawJid
          );
          continue;
        }
        console.log("✅ [FILTRO 1] Passou - não é grupo");

        // ✅ FILTRO 2: Ignorar status/broadcast do WhatsApp
        if (
          remoteJid.includes("status@broadcast") ||
          remoteJid.includes("broadcast")
        ) {
          console.log("❌ [FILTRO 2] IGNORADO - status/broadcast:", remoteJid);
          continue;
        }
        console.log("✅ [FILTRO 2] Passou - não é broadcast");

        // ✅ FILTRO 3: Ignorar newsletters do WhatsApp
        if (remoteJid.includes("@newsletter")) {
          console.log("❌ [FILTRO 3] IGNORADO - newsletter:", remoteJid);
          continue;
        }
        console.log("✅ [FILTRO 3] Passou - não é newsletter");

        // ✅ FILTRO 4: Ignorar mensagens antigas do histórico (otimização)
        if (isHistory && lastMessageTimestamp > 0) {
          const msgTimestamp = msg.messageTimestamp || 0;
          if (msgTimestamp <= lastMessageTimestamp) {
            console.log(
              `❌ [FILTRO 4] IGNORADO - mensagem antiga do histórico (timestamp: ${msgTimestamp} <= ${lastMessageTimestamp})`
            );
            continue;
          }
          console.log(
            `✅ [FILTRO 4] Passou - mensagem nova (timestamp: ${msgTimestamp} > ${lastMessageTimestamp})`
          );
        }

        console.log("💬 [WHATSAPP] Nova mensagem");

        // De-dup: se já existir essa mensagem, pule
        if (providerId) {
          console.log(
            "🔍 [DEDUP] Verificando se mensagem já existe:",
            providerId
          );
          const exists = await messages.findFirst({
            where: { providerId },
          });
          if (exists) {
            console.log(
              "❌ [DEDUP] IGNORADO - mensagem já existe no banco (providerId:",
              providerId,
              ")"
            );
            continue;
          }
          console.log("✅ [DEDUP] Mensagem nova - continuando processamento");
        }

        // Extrair conteúdo
        let content = "[Mídia não suportada]";
        let messageType = "text";
        let mediaUrl = null;

        try {
          // Ordem de prioridade para extrair texto
          if (msg.message.conversation) {
            content = msg.message.conversation;
          } else if (msg.message.extendedTextMessage?.text) {
            content = msg.message.extendedTextMessage.text;
          } else if (
            msg.message.messageContextInfo?.quotedMessage?.conversation
          ) {
            // Mensagem citando outra
            content = msg.message.messageContextInfo.quotedMessage.conversation;
          } else if (msg.message.ephemeralMessage?.message?.conversation) {
            // Mensagem temporária
            content = msg.message.ephemeralMessage.message.conversation;
          } else if (
            msg.message.ephemeralMessage?.message?.extendedTextMessage?.text
          ) {
            content =
              msg.message.ephemeralMessage.message.extendedTextMessage.text;
          } else if (msg.message.viewOnceMessage?.message?.conversation) {
            // Visualização única
            content = msg.message.viewOnceMessage.message.conversation;
          } else if (msg.message.imageMessage) {
            mediaUrl = await downloadAndSaveMedia(msg, "image");
            content = msg.message.imageMessage.caption || "";
            messageType = "image";
          } else if (msg.message.videoMessage) {
            mediaUrl = await downloadAndSaveMedia(msg, "video");
            content = msg.message.videoMessage.caption || "";
            messageType = "video";
          } else if (msg.message.audioMessage) {
            mediaUrl = await downloadAndSaveMedia(msg, "audio");
            content = "[Áudio]";
            messageType = "audio";
          } else if (msg.message.documentMessage) {
            mediaUrl = await downloadAndSaveMedia(msg, "document");
            content = msg.message.documentMessage.caption || "[Documento]";
            messageType = "document";
          } else if (msg.message.stickerMessage) {
            content = "[Figurinha]";
            messageType = "sticker";
          }

          const isFromMe = msg.key.fromMe || false;

          console.log("🎯 [MSG] ===== IDENTIFICAÇÃO DA MENSAGEM =====");
          console.log("🎯 [MSG] isFromMe:", isFromMe);
          console.log(
            "🎯 [MSG] Direção:",
            isFromMe ? "ENVIADA (você → contato)" : "RECEBIDA (contato → você)"
          );
          console.log("🎯 [MSG] content:", content);

          // Capturar timestamp da mensagem (Baileys envia em segundos Unix UTC)
          // Converter para milissegundos - NÃO ajustar timezone aqui (salvar em UTC)
          const messageTimestampUnix = msg.messageTimestamp
            ? Number(msg.messageTimestamp) * 1000 // Unix ms (UTC)
            : Date.now(); // Unix ms (UTC)

          const messageTimestamp = new Date(messageTimestampUnix); // Para logs legíveis

          const messageId = msg.key.id;
          const senderLid = msg.key.senderLid; // ← CHAVE: Baileys envia o @lid aqui!
          const senderPn = msg.key.senderPn; // ← NÚMERO REAL do remetente!

          console.log("🔍 [LID DEBUG] senderLid:", senderLid);
          console.log("🔍 [LID DEBUG] senderPn:", senderPn);
          console.log("🔍 [LID DEBUG] remoteJid:", remoteJid);
          console.log("🔍 [LID DEBUG] isFromMe:", isFromMe);

          // ✅ PRIORIDADE: Sempre usar senderPn quando disponível (número real)
          let contactNumber = rawJid;
          if (senderPn) {
            console.log(
              "🎯 [MSG] senderPn encontrado - usando como contactNumber:",
              senderPn
            );
            contactNumber = normalizePhoneNumber(senderPn);

            // ✅ CRÍTICO: Salvar mapeamento @lid → número real para mensagens futuras
            if (remoteJid.includes("@lid")) {
              console.log(
                "🗺️ [LID-MAPPING] Salvando mapeamento:",
                remoteJid,
                "→",
                contactNumber
              );
              mapLidToNumber(remoteJid, contactNumber);

              // ✅ IMPORTANTE: Atualizar contato temp_ existente se houver
              const lidId = remoteJid.split("@")[0];
              const tempContactNumber = `temp_${lidId}`;
              try {
                const tempContact = await contacts.findFirst({
                  where: { number: tempContactNumber },
                });
                if (tempContact) {
                  console.log(
                    "🔄 [TEMP-UPDATE] Contato temp_ encontrado - mesclando com número real:",
                    tempContactNumber,
                    "→",
                    contactNumber
                  );
                  // Buscar ou criar contato com número real
                  let realContact = await contacts.findFirst({
                    where: { number: contactNumber },
                  });
                  if (!realContact) {
                    // Atualizar o temp_ para o número real
                    await contacts.update({
                      where: { id: tempContact.id },
                      data: { number: contactNumber },
                    });
                    console.log(
                      "✅ [TEMP-UPDATE] Contato temp_ atualizado para número real"
                    );
                  } else {
                    // Mesclar: transferir mensagens do temp_ para o real
                    await messages.updateMany({
                      where: { contactSenderId: tempContact.id },
                      data: { contactSenderId: realContact.id },
                    });
                    await messages.updateMany({
                      where: { contactReceiverId: tempContact.id },
                      data: { contactReceiverId: realContact.id },
                    });
                    // Deletar temp_
                    await contacts.delete({
                      where: { id: tempContact.id },
                    });
                    console.log(
                      "✅ [TEMP-UPDATE] Mensagens mescladas e temp_ deletado"
                    );
                  }
                }
              } catch (err) {
                console.error("⚠️ [TEMP-UPDATE] Erro ao atualizar temp_:", err);
              }
            }
          } else if (rawJid.endsWith("@s.whatsapp.net")) {
            contactNumber = normalizePhoneNumber(rawJid);
          } else {
            console.log(
              "⚠️ [MSG] Formato desconhecido - mantendo rawJid:",
              rawJid
            );
          }
          const participant = msg.key.participant; // Participante em grupos

          console.log("💬 [MSG] ========== MENSAGEM RECEBIDA ==========");
          console.log("💬 [MSG] isFromMe:", isFromMe);
          console.log("💬 [MSG] remoteJid:", remoteJid);
          console.log("💬 [MSG] rawJid:", rawJid);
          console.log("💬 [MSG] senderLid:", senderLid);
          console.log("💬 [MSG] senderPn:", senderPn);
          console.log("💬 [MSG] participant:", participant);
          console.log("💬 [MSG] messageId:", messageId);
          console.log("💬 [MSG] contactNumber normalizado:", contactNumber);
          console.log(
            "💬 [MSG] msg.key COMPLETO:",
            JSON.stringify(msg.key, null, 2)
          );
          console.log(
            "💬 [MSG] msg.message.messageContextInfo:",
            JSON.stringify(msg.message?.messageContextInfo, null, 2)
          );
          console.log("💬 [MSG] msg.pushName:", msg.pushName);
          console.log("💬 [MSG] msg.verifiedBizName:", msg.verifiedBizName);
          console.log("💬 [MSG] ==========================================");

          // Buscar a conta para verificar o número
          const instance = whatsappConnections.get(accountId);
          const accountNumber = normalizePhoneNumber(instance?.number || "");

          // ✅ CORREÇÃO CRÍTICA: Para mensagens RECEBIDAS com @lid no remoteJid
          // O WhatsApp às vezes usa @lid para representar a conversa, mas envia
          // o número real do remetente em msg.key.senderPn
          if (remoteJid.includes("@lid") && !isFromMe) {
            console.log("💬 [MSG] ⚠️  remoteJid com @lid em mensagem RECEBIDA");

            if (senderPn) {
              console.log("✅ [MSG] senderPn encontrado:", senderPn);
              console.log("✅ [MSG] Usando senderPn como número do contato");
              contactNumber = normalizePhoneNumber(senderPn);
              console.log("✅ [MSG] contactNumber atualizado:", contactNumber);
            } else {
              console.log(
                "⚠️ [MSG] senderPn não encontrado - usando @lid temporariamente"
              );
              console.log(
                "⚠️ [MSG] Será atualizado quando cliente responder novamente"
              );
              // NÃO ignorar a mensagem - criar contato com @lid e aguardar auto-merge
              // O contactNumber já está como @lid do normalizePhoneNumber acima
            }
          }

          // ✅ SOLUÇÃO: Se mensagem recebida tem senderLid, apenas mapear internamente
          // MAS NÃO SOBRESCREVER o contactNumber que já foi normalizado do remoteJid!
          if (senderLid && !isFromMe && remoteJid.includes("@s.whatsapp.net")) {
            console.log(
              "🎯 [BAILEYS] senderLid detectado para mapeamento interno:",
              senderLid
            );
            console.log(
              "🎯 [BAILEYS] Mapeando senderLid → número real (remoteJid):",
              contactNumber
            );
            // Mapear o @lid do remetente para o número real (que já está em contactNumber)
            mapLidToNumber(senderLid, contactNumber);
            // NÃO alterar contactNumber aqui! Ele já está correto do remoteJid
          }

          // Ignorar se o contactNumber é o mesmo da conta (você mesmo)
          if (contactNumber === accountNumber) {
            console.log(
              "💬 [MSG] ❌ IGNORADO - contactNumber === accountNumber"
            );
            continue;
          }

          // Se o remoteJid contém @lid em mensagem enviada
          if (remoteJid.includes("@lid") && isFromMe) {
            console.log(
              "💬 [MSG] ⚠️  @lid detectado em mensagem ENVIADA - buscando mapeamento..."
            );
            console.log("🔍 [DEBUG] messageId usado para busca:", messageId);
            console.log(
              "🔍 [DEBUG] sentMessagesMap.size:",
              sentMessagesMap.size
            );
            console.log(
              "🔍 [DEBUG] sentMessagesMap keys:",
              Array.from(sentMessagesMap.keys())
            );

            // 1) Tenta usar mapeamento @lid → número real (caso já exista)
            const mappedNumber = getMappedNumber(remoteJid);
            console.log("🔍 [DEBUG] mappedNumber:", mappedNumber);

            // 2) Tenta usar o mapa de mensagens enviadas (providerId/messageId → número)
            const sentInfo = sentMessagesMap.get(messageId);
            console.log("🔍 [DEBUG] sentInfo:", sentInfo);

            if (mappedNumber) {
              contactNumber = mappedNumber;
              console.log(
                "💬 [MSG] ✅ [ENVIADA] Usando mapeamento @lid existente:",
                contactNumber
              );
            } else if (sentInfo && sentInfo.accountId === accountId) {
              contactNumber = sentInfo.contactNumber;
              console.log(
                "💬 [MSG] ✅ [ENVIADA] Resolvendo @lid via sentMessagesMap:",
                contactNumber
              );
              // Mapear para futuras mensagens
              mapLidToNumber(remoteJid, contactNumber);
            } else {
              // ⚠️ FALLBACK: Buscar em mensagens RECEBIDAS deste contato para encontrar o número real
              // Quando você envia para um @lid, o WhatsApp já recebeu mensagens dele antes.
              // Vamos buscar no banco o número real associado a esse @lid.
              console.log(
                "💬 [MSG] ⚠️  @lid sem mapeamento em cache - buscando no banco...",
                remoteJid
              );

              const lidId = remoteJid.split("@")[0];

              // Buscar contato que tem este @lid salvo (bug antigo) ou número real
              const existingContact = contacts.getContactByLidOrNumber(lidId);

              if (existingContact) {
                contactNumber = existingContact.number;
                console.log(
                  "💬 [MSG] ✅ [ENVIADA] Número real encontrado no banco:",
                  contactNumber,
                  "para @lid:",
                  lidId
                );
                // Mapear para futuras mensagens
                mapLidToNumber(remoteJid, contactNumber);
              } else {
                // ✅ ESTRATÉGIA FINAL: Buscar por mensagem recebida recentemente (últimos 5 minutos)
                // Isso captura quando você responde rápido a uma mensagem recebida
                console.log(
                  "💬 [MSG] 🔍 Buscando por mensagem recebida recentemente..."
                );

                const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
                const recentReceivedStmt = db.prepare(`
                  SELECT DISTINCT c.number, c.name, m.timestamp
                  FROM messages m
                  JOIN contacts c ON c.id = m.contactSenderId
                  WHERE m.direction = 'received'
                    AND m.accountId = ?
                    AND m.timestamp >= ?
                    AND c.number NOT LIKE 'temp_%'
                  ORDER BY m.timestamp DESC
                  LIMIT 1
                `);

                const recentContact = recentReceivedStmt.get(
                  accountId,
                  fiveMinutesAgo
                );

                if (recentContact) {
                  contactNumber = recentContact.number;
                  console.log(
                    "💬 [MSG] ✅ [ENVIADA] Provável resposta para:",
                    contactNumber,
                    `(${recentContact.name || "Sem nome"})`,
                    "- mensagem recebida há",
                    Math.round((Date.now() - recentContact.timestamp) / 1000),
                    "segundos"
                  );
                  // Mapear para futuras mensagens
                  mapLidToNumber(remoteJid, contactNumber);
                } else {
                  // Se ainda não encontrou, criar contato com @lid temporário
                  // e aguardar resposta do contato para atualizar com número real
                  console.log(
                    "💬 [MSG] ⚠️  @lid completamente novo - criando contato temporário"
                  );
                  contactNumber = `temp_${lidId}`;
                  console.log(
                    "💬 [MSG] 📝 Contato temporário criado:",
                    contactNumber,
                    "- será atualizado ao receber resposta"
                  );
                }
              }
            }
          }

          // Se for mensagem enviada com número real e existe no buffer @lid, processar e limpar buffer
          if (isFromMe && lidMessagesBuffer.has(messageId)) {
            console.log(
              "💬 [MSG] ✅ Número real chegou! Limpando buffer @lid..."
            );
            const buffered = lidMessagesBuffer.get(messageId);
            clearTimeout(buffered.timeout);
            lidMessagesBuffer.delete(messageId);
          }

          // Verificar se é uma mensagem duplicada
          if (recentMessagesCache.has(messageId)) {
            console.log("💬 [MSG] ❌ IGNORADO - mensagem duplicada");
            continue;
          }

          console.log("💬 [MSG] ✅ PROCESSANDO mensagem...");

          // Adicionar ao cache
          recentMessagesCache.set(messageId, {
            contactNumber,
            timestamp: Date.now(),
          });

          // Limpar cache antigo (manter apenas últimos 100 mensagens)
          if (recentMessagesCache.size > 100) {
            const oldestKey = recentMessagesCache.keys().next().value;
            recentMessagesCache.delete(oldestKey);
          }

          // Não criar contato se for provisório (pending:)
          if (contactNumber.startsWith("pending:")) {
            console.log(
              "💬 [MSG] ⚠️  Contato provisório - salvando mensagem e criando contato temporário"
            );

            // ✅ Criar contato temporário para que apareça no front-end
            const tempContactNumber = contactNumber; // Usar pending: como identificador

            // Se a mensagem é ENVIADA (isFromMe), não usar msg.pushName pois é o nome do remetente (você)
            // Se a mensagem é RECEBIDA, usar msg.pushName pois é o nome de quem enviou (o contato)
            const tempContactName = isFromMe
              ? "Aguardando resposta..."
              : msg.pushName || "Aguardando resposta...";

            const tempContact = await contacts.upsert({
              where: { number: tempContactNumber },
              update: {
                name: isFromMe ? undefined : msg.pushName || undefined,
              },
              create: {
                number: tempContactNumber,
                name: tempContactName,
              },
            });

            console.log(
              "📨 [TEMP CONTACT] Contato temporário criado:",
              tempContact
            );

            // Registrar para reconciliação posterior
            const savedMessage = await messages.create({
              data: {
                content,
                timestamp: messageTimestampUnix,
                direction: isFromMe ? "sent" : "received",
                type: messageType,
                senderId: accountId,
                receiverId: accountId,
                contactSenderId: isFromMe ? undefined : tempContact.id,
                contactReceiverId: isFromMe ? tempContact.id : undefined,
                providerId,
                mediaUrl,
              },
            });

            registerPendingMessage(accountId, messageId, savedMessage.id);

            // ❌ DESABILITADO: Análise automática (só manual via botão)
            // analyzeMessageWithAI(
            //   savedMessage.id,
            //   content,
            //   savedMessage.direction,
            //   key.remoteJid
            // ).catch((err) => {
            //   console.error("❌ [AI] Erro na análise:", err.message);
            // });

            // Emitir via Socket.io com número temporário
            io.emit("new-message", {
              ...savedMessage,
              accountNumber: instance.number,
              contactNumber: tempContactNumber,
              contactName: tempContact.name,
            });

            console.log(
              "💬 [WHATSAPP] Mensagem provisória salva e emitida (aguardando resposta)"
            );
            continue;
          }

          // Criar/atualizar contato
          console.log(
            "📨 [CONTACT] Criando/atualizando contato para:",
            contactNumber
          );

          // Se a mensagem é ENVIADA (isFromMe), não usar msg.pushName pois é o nome do remetente (você)
          // Se a mensagem é RECEBIDA, usar msg.pushName pois é o nome de quem enviou (o contato)
          console.log("🔍 [CONTACT] isFromMe:", isFromMe);
          console.log("🔍 [CONTACT] msg.pushName:", msg.pushName);
          console.log("🔍 [CONTACT] msg.verifiedBizName:", msg.verifiedBizName);

          const contactName = isFromMe ? undefined : msg.pushName || undefined;

          console.log("🔍 [CONTACT] contactName calculado:", contactName);
          console.log(
            "🔍 [CONTACT] Vai usar contactName no upsert:",
            contactName === undefined
              ? "NÃO (undefined)"
              : `SIM: "${contactName}"`
          );

          const contact = await contacts.upsert({
            where: { number: contactNumber },
            update: { name: contactName },
            create: {
              number: contactNumber,
              name: contactName,
            },
          });
          console.log("📨 [CONTACT] Contato criado/atualizado:", contact);
          console.log("📨 [CONTACT] Nome final no banco:", contact.name);

          // ✅ SEMPRE notificar o front-end sobre novo contato enviado
          // Isso garante que a UI seja atualizada imediatamente
          if (isFromMe) {
            console.log(
              "📤 [FRONT-END] Notificando front-end sobre novo contato"
            );
            console.log("📤 [FRONT-END] isFromMe:", isFromMe);
            console.log("📤 [FRONT-END] contact.name no banco:", contact.name);
            console.log("📤 [FRONT-END] contact.number:", contact.number);
            console.log("📤 [FRONT-END] Dados sendo enviados:", {
              contact: {
                id: contact.id,
                number: contact.number,
                name: contact.name,
              },
              accountId,
            });

            io.emit("contact-created", {
              contact: {
                id: contact.id,
                number: contact.number,
                name: contact.name,
              },
              accountId,
            });

            console.log(
              "📤 [FRONT-END] ✅ Evento 'contact-created' emitido via Socket.io"
            );
            console.log(
              "📤 [FRONT-END] Socket.io clients conectados:",
              io.engine.clientsCount
            );
          }

          // ✅ AJUSTE 1: Atualizar último peer real (para resolver @lid futuras)
          updateLastPeer(accountId, contactNumber);

          // ✅ AJUSTE: Quando receber mensagem com número real, verificar se há mensagens pendentes com @lid
          if (
            !isFromMe &&
            !contactNumber.includes("@lid") &&
            !contactNumber.includes("pending:")
          ) {
            // Esta é uma mensagem RECEBIDA com número real
            // Verificar se há mensagens pendentes (enviadas com @lid) que agora podem ser reconciliadas

            console.log(
              `🔍 [RECONCILE] Verificando mensagens pendentes para reconciliar com ${contactNumber}`
            );

            // Buscar o último @lid usado em mensagens enviadas (nos últimos 2 minutos)
            const recentLids = [];
            for (const [
              cachedMsgId,
              cacheEntry,
            ] of recentMessagesCache.entries()) {
              if (
                cacheEntry.contactNumber &&
                cacheEntry.contactNumber.includes("@lid") &&
                Date.now() - cacheEntry.timestamp < 120000
              ) {
                // 2 minutos
                recentLids.push({
                  lid: cacheEntry.contactNumber,
                  msgId: cachedMsgId,
                  age: Date.now() - cacheEntry.timestamp,
                });
              }
            }

            if (recentLids.length > 0) {
              // Pegar o @lid mais recente (provavelmente é do contato que está respondendo)
              recentLids.sort((a, b) => a.age - b.age);
              const mostRecentLid = recentLids[0].lid;

              console.log(
                `🎯 [RECONCILE] Mapeando ${mostRecentLid} para ${contactNumber} baseado em resposta recente`
              );
              await mapLidToNumber(mostRecentLid, contactNumber);
            }

            // Também verificar o remoteJid original
            const originalRemoteJid = msg.key.remoteJid;
            if (
              originalRemoteJid.includes("@lid") &&
              originalRemoteJid !== contactNumber
            ) {
              console.log(
                `🔗 [RECONCILE] Mapeando remoteJid ${originalRemoteJid} para ${contactNumber}`
              );
              await mapLidToNumber(originalRemoteJid, contactNumber);
            }
          }

          // ✅ AJUSTE 2: Reconciliar mensagens pendentes
          await reconcilePendingMessages(accountId, contactNumber, contact.id);

          // Salvar mensagem
          console.log("💾 [DB] ===== SALVANDO MENSAGEM NO BANCO =====");
          console.log("💾 [DB] Direção:", isFromMe ? "sent" : "received");
          console.log("💾 [DB] Content:", content);
          console.log("💾 [DB] ContactNumber:", contactNumber);
          console.log("💾 [DB] Contact ID:", contact.id);
          console.log("💾 [DB] Contact Name:", contact.name);

          const savedMessage = await messages.create({
            data: {
              content,
              timestamp: messageTimestampUnix,
              direction: isFromMe ? "sent" : "received",
              type: messageType,
              senderId: accountId,
              receiverId: accountId,
              contactSenderId: isFromMe ? undefined : contact.id,
              contactReceiverId: isFromMe ? contact.id : undefined,
              providerId,
              mediaUrl,
            },
          });

          console.log("💾 [DB] ✅ MENSAGEM SALVA COM SUCESSO!");
          console.log("💾 [DB] Mensagem salva:", {
            id: savedMessage.id,
            direction: savedMessage.direction,
            contactSenderId: savedMessage.contactSenderId,
            contactReceiverId: savedMessage.contactReceiverId,
            contactNumber,
          });

          // Transcrever áudio automaticamente (async, não bloqueia)
          if (
            messageType === "audio" &&
            mediaUrl &&
            transcriptionService.available
          ) {
            console.log(
              `🎤 [AUTO-TRANSCRIBE] Iniciando transcrição automática para mensagem ${savedMessage.id}`
            );

            // Processar transcrição em background
            (async () => {
              try {
                const mediaPath = mediaUrl.startsWith("/")
                  ? mediaUrl.substring(1)
                  : mediaUrl;
                const audioPath = path.join(DATA_PATH, "data", mediaPath);
                if (fs.existsSync(audioPath)) {
                  console.log(
                    `🎤 [AUTO-TRANSCRIBE] Transcrevendo: ${audioPath}`
                  );

                  const transcription =
                    await transcriptionService.transcribeAudio(audioPath, "pt");

                  // Salvar transcrição no banco
                  db.db
                    .prepare(
                      `UPDATE messages 
                       SET audioTranscription = ?,
                           audioTranscribedAt = datetime('now'),
                           audioTranscriptionProvider = ?
                       WHERE id = ?`
                    )
                    .run(
                      transcription.text,
                      transcription.provider,
                      savedMessage.id
                    );

                  console.log(
                    `✅ [AUTO-TRANSCRIBE] Áudio transcrito com sucesso!`
                  );
                  console.log(
                    `📝 [AUTO-TRANSCRIBE] Texto: "${transcription.text.substring(
                      0,
                      100
                    )}..."`
                  );

                  // Emitir atualização via Socket.io
                  io.emit("audio-transcribed", {
                    messageId: savedMessage.id,
                    transcription: transcription.text,
                    provider: transcription.provider,
                  });

                  console.log(
                    `📡 [AUTO-TRANSCRIBE] Transcrição emitida para frontend`
                  );
                } else {
                  console.warn(
                    `⚠️ [AUTO-TRANSCRIBE] Arquivo de áudio não encontrado: ${audioPath}`
                  );
                }
              } catch (error) {
                console.error(
                  `❌ [AUTO-TRANSCRIBE] Erro ao transcrever áudio:`,
                  error.message
                );
              }
            })();
          }

          // ❌ DESABILITADO: Análise automática (só manual via botão)
          // analyzeMessageWithAI(
          //   savedMessage.id,
          //   content,
          //   savedMessage.direction,
          //   msg.key.remoteJid
          // ).catch((err) => {
          //   console.error("❌ [AI] Erro na análise:", err.message);
          // });

          // Emitir via Socket.io
          console.log(
            "📡 [SOCKET] ===== EMITINDO MENSAGEM PARA FRONTEND ====="
          );
          console.log("📡 [SOCKET] Direção:", savedMessage.direction);
          console.log("📡 [SOCKET] AccountNumber:", instance.number);
          console.log("📡 [SOCKET] ContactNumber:", contactNumber);
          console.log("📡 [SOCKET] ContactName:", msg.pushName);
          console.log("📡 [SOCKET] Content:", content);

          io.emit("new-message", {
            ...savedMessage,
            accountNumber: instance.number,
            contactNumber,
            contactName: msg.pushName,
          });

          console.log("📡 [SOCKET] ✅ MENSAGEM EMITIDA COM SUCESSO!");
          console.log("💬 [WHATSAPP] Mensagem salva e emitida");

          if (!isFromMe) {
            console.log(
              "🔔 [RECEBIDA] ===== MENSAGEM RECEBIDA PROCESSADA ====="
            );
            console.log("🔔 [RECEBIDA] De:", msg.pushName || contactNumber);
            console.log("🔔 [RECEBIDA] Número:", contactNumber);
            console.log("🔔 [RECEBIDA] Conteúdo:", content);
            console.log(
              "🔔 [RECEBIDA] ========================================"
            );
          }
        } catch (error) {
          // ✅ AJUSTE 3: Tratar erros de decriptação (Bad MAC)
          if (String(error).includes("Bad MAC")) {
            const failCount = noteMacFailure(remoteJid);
            console.error(
              `❌ [SIGNAL] Bad MAC (${failCount}/3) para ${remoteJid}:`,
              error.message
            );

            if (failCount >= 3) {
              console.log("� [SIGNAL] Resetando sessão após 3 falhas...");
              await resetSessionForJid(socket, remoteJid);
            }
          } else {
            console.error("💬 [WHATSAPP] Erro:", error.message);
          }
        }
      }

      // Log final da sincronização
      if (isHistory && incomingMessages.length > 0) {
        const stats = syncStats.get(accountId);
        if (stats) {
          const elapsed = ((Date.now() - stats.startTime) / 1000).toFixed(1);
          console.log(
            `✅ [SYNC BATCH] Lote processado: ${incomingMessages.length} mensagens em ${elapsed}s`
          );
        }
      }
    }
  );

  return instanceObj;
}

async function disconnectWhatsApp(accountId) {
  const instance = whatsappConnections.get(accountId);
  if (instance?.socket) {
    await instance.socket.logout();
    whatsappConnections.delete(accountId);
  }
}

async function sendWhatsAppMessage(accountId, contactNumber, content) {
  const instance = whatsappConnections.get(accountId);
  if (!instance?.socket) {
    throw new Error("Conta não conectada");
  }

  // Normalizar o número removendo qualquer sufixo do WhatsApp
  const cleanNumber = normalizePhoneNumber(contactNumber);

  console.log("📤 [SEND] Enviando mensagem para:", cleanNumber);

  // Sempre usar @s.whatsapp.net para enviar mensagens individuais
  const jid = `${cleanNumber}@s.whatsapp.net`;
  const { key } = await instance.socket.sendMessage(jid, { text: content });

  console.log("📤 [SEND] Mensagem enviada! providerId:", key?.id);
  console.log("📤 [SEND] key.remoteJid retornado:", key?.remoteJid);

  // Retornar o providerId (key.id) para de-duplicação
  return { providerId: key?.id };
}

// ============================================
// SOCKET.IO
// ============================================

io.on("connection", async (socket) => {
  console.log("✓ Client connected:", socket.id);

  // Enviar estatísticas de transcrição imediatamente ao conectar
  if (transcriptionService.available) {
    try {
      const totalAudios = db.db
        .prepare(
          `SELECT COUNT(*) as count FROM messages WHERE type = 'audio' AND mediaUrl IS NOT NULL`
        )
        .get().count;

      const transcribedAudios = db.db
        .prepare(
          `SELECT COUNT(*) as count FROM messages WHERE type = 'audio' AND mediaUrl IS NOT NULL AND audioTranscription IS NOT NULL AND audioTranscription != ''`
        )
        .get().count;

      const pendingAudios = totalAudios - transcribedAudios;
      const percentComplete =
        totalAudios > 0
          ? ((transcribedAudios / totalAudios) * 100).toFixed(1)
          : 0;

      const cyclesNeeded = Math.ceil(pendingAudios / 10);
      const minutesNeeded = cyclesNeeded * 5;
      const hoursNeeded = (minutesNeeded / 60).toFixed(1);

      socket.emit("transcription-stats", {
        totalAudios,
        transcribedAudios,
        pendingAudios,
        percentComplete: parseFloat(percentComplete),
        hoursNeeded: parseFloat(hoursNeeded),
        minutesNeeded,
        cyclesNeeded,
      });

      console.log(
        `📊 [SOCKET] Estatísticas de transcrição enviadas para ${socket.id}`
      );
    } catch (error) {
      console.error("❌ [SOCKET] Erro ao enviar estatísticas:", error);
    }
  }

  socket.on("disconnect", () => {
    console.log("✗ Client disconnected:", socket.id);
  });
});

// ============================================
// ROTAS API
// ============================================

console.log("📡 [SERVER] Iniciando registro de rotas API...");

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

console.log("✅ [SERVER] Rota /api/health registrada");

// Listar contas
app.get("/api/accounts", async (req, res) => {
  try {
    const accountsList = await accounts.findMany({
      orderBy: { dataLogin: "desc" },
    });
    res.json(accountsList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Criar conta
app.post("/api/accounts", async (req, res) => {
  try {
    const { name, number } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    // ✅ Verificar se já existe uma conta com esse número
    if (number && number !== "pending") {
      const existingAccount = await accounts.findFirst({
        where: { number },
      });

      if (existingAccount) {
        console.log(
          "♻️ [API] Conta com número",
          number,
          "já existe. Reutilizando ID:",
          existingAccount.id
        );
        // Atualizar status para reconectar
        await accounts.update({
          where: { id: existingAccount.id },
          data: { status: "qr_required", name },
        });
        // Reconectar
        await connectWhatsApp(existingAccount.id, number);
        return res.json(existingAccount);
      }
    }

    // ✅ Criar nova conta
    const account = await accounts.create({
      data: {
        name,
        number: number || "pending", // Placeholder até conectar
        status: "qr_required",
      },
    });

    console.log("✅ [API] Nova conta criada:", account.id);

    // Conectar usando accountId como sessionId
    await connectWhatsApp(account.id, account.number);

    res.json(account);
  } catch (error) {
    console.error("Error creating account:", error);
    res.status(500).json({ error: "Failed to create account" });
  }
});

// Reconectar conta (sem apagar dados)
app.post("/api/accounts/:id/reconnect", async (req, res) => {
  try {
    const { id } = req.params;

    console.log("🔄 [API] Solicitação de reconexão para conta:", id);

    // Buscar conta
    const account = await accounts.findUnique({ where: { id } });

    if (!account) {
      return res.status(404).json({ error: "Conta não encontrada" });
    }

    console.log("🔄 [API] Desconectando conta atual...");
    // Desconectar a instância atual
    await disconnectWhatsApp(id);

    // Aguardar 2 segundos para garantir que desconectou
    await new Promise((resolve) => setTimeout(resolve, 2000));

    console.log("🔄 [API] Reconectando com a sessão existente...");
    // Reconectar usando a sessão existente
    await connectWhatsApp(id, account.number);

    res.json({ success: true, message: "Reconexão iniciada" });
  } catch (error) {
    console.error("❌ [API] Erro ao reconectar:", error);
    res.status(500).json({ error: error.message });
  }
});

// Deletar conta
app.delete("/api/accounts/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar conta para pegar o número
    const account = await accounts.findUnique({ where: { id } });

    if (account) {
      console.log("🗑️ [API] Deletando conta:", id, "- Número:", account.number);
      
      // Desconectar WhatsApp
      await disconnectWhatsApp(id);

      // Deletar sessão física (para forçar novo QR Code)
      const sessionPath = path.join(DATA_PATH, "data/sessions", id);
      if (fs.existsSync(sessionPath)) {
        fs.rmSync(sessionPath, { recursive: true, force: true });
        console.log("🗑️ [API] Sessão removida:", sessionPath);
      }

      // ✅ NÃO deletar mensagens - manter histórico no banco
      // As mensagens ficarão órfãs mas serão revinculadas se reconectar com mesmo número

      // Deletar conta
      await accounts.delete({ where: { id } });
      
      console.log("✅ [API] Conta deletada. Mensagens preservadas no banco.");
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Listar contatos
app.get("/api/contacts", async (req, res) => {
  try {
    const contactsList = await contacts.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(contactsList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ NOVO: Buscar contatos de uma conta específica
app.get("/api/contacts/:accountId", async (req, res) => {
  try {
    const { accountId } = req.params;

    console.log(
      "📞 [API] GET /api/contacts/:accountId - accountId:",
      accountId
    );

    // Buscar contatos que tiveram mensagens com essa conta
    const messagesList = await messages.findMany({
      where: {
        OR: [{ senderId: accountId }, { receiverId: accountId }],
      },
      select: {
        contactSenderId: true,
        contactReceiverId: true,
      },
      distinct: ["contactSenderId", "contactReceiverId"],
    });

    console.log("📞 [API] Mensagens encontradas:", messagesList.length);

    // Extrair IDs únicos de contatos
    const contactIds = new Set();
    messagesList.forEach((msg) => {
      if (msg.contactSenderId) contactIds.add(msg.contactSenderId);
      if (msg.contactReceiverId) contactIds.add(msg.contactReceiverId);
    });

    console.log("📞 [API] IDs únicos de contatos:", Array.from(contactIds));

    // Buscar detalhes dos contatos ordenados pela última mensagem
    let contactsList = [];

    if (contactIds.size > 0) {
      const ids = Array.from(contactIds);
      const placeholders = ids.map(() => "?").join(",");

      // Buscar contatos com informações da última mensagem
      // ✅ CORREÇÃO: Usar subconsulta para evitar duplicatas do LEFT JOIN
      const query = `
        SELECT DISTINCT c.id, c.number, c.name, c.createdAt, c.updatedAt,
               (SELECT m.timestamp 
                FROM messages m 
                WHERE (m.contactSenderId = c.id OR m.contactReceiverId = c.id)
                ORDER BY m.timestamp DESC 
                LIMIT 1) as lastMessageTime,
               (SELECT m.direction 
                FROM messages m 
                WHERE (m.contactSenderId = c.id OR m.contactReceiverId = c.id)
                ORDER BY m.timestamp DESC 
                LIMIT 1) as lastMessageDirection
        FROM contacts c
        WHERE c.id IN (${placeholders})
        ORDER BY lastMessageTime DESC
      `;

      console.log("📞 [API] Query SQL:", query);
      console.log("📞 [API] IDs para buscar:", ids);

      contactsList = db.db.prepare(query).all(...ids);
    }

    // ✅ CORREÇÃO: Remover duplicatas (caso a query retorne o mesmo contato múltiplas vezes)
    const uniqueContacts = Array.from(
      new Map(contactsList.map((c) => [c.id, c])).values()
    );

    if (uniqueContacts.length !== contactsList.length) {
      console.warn(
        `⚠️ [API] Duplicatas de contatos detectadas! Total: ${contactsList.length}, Únicos: ${uniqueContacts.length}`
      );
    }

    console.log("📞 [API] Contatos únicos:", uniqueContacts.length);
    console.log(
      "📞 [API] Contatos:",
      uniqueContacts.map((c) => ({ id: c.id, number: c.number, name: c.name }))
    );

    res.json(uniqueContacts);
  } catch (error) {
    console.error("📞 [API] Erro:", error);
    res.status(500).json({ error: error.message });
  }
});

// Buscar mensagens
app.get("/api/messages/:accountId/:contactNumber", async (req, res) => {
  try {
    const { accountId } = req.params;
    const contactNumberParam = req.params.contactNumber;

    const normalized = normalizePhoneNumber(contactNumberParam);

    const contact = await contacts.findUnique({
      where: { number: normalized },
    });

    if (!contact) {
      return res.json([]);
    }

    const messagesList = await messages.findMany({
      where: {
        senderId: accountId,
        OR: [
          { contactSenderId: contact.id },
          { contactReceiverId: contact.id },
        ],
      },
      orderBy: { timestamp: "asc" },
    });

    // ✅ CORREÇÃO: Remover duplicatas (caso a query retorne a mesma mensagem múltiplas vezes)
    const uniqueMessages = Array.from(
      new Map(messagesList.map((msg) => [msg.id, msg])).values()
    );

    if (uniqueMessages.length !== messagesList.length) {
      console.warn(
        `⚠️ [API] Duplicatas detectadas na query! Total: ${messagesList.length}, Únicos: ${uniqueMessages.length}`
      );
      console.warn(
        `⚠️ [API] Contact: ${contact.number}, Account: ${accountId}`
      );
    }

    res.json(uniqueMessages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Deletar mensagens de uma conversa
app.delete("/api/messages/:accountId/:contactNumber", async (req, res) => {
  try {
    const { accountId } = req.params;
    const contactNumberParam = req.params.contactNumber;

    console.log("DELETE /api/messages - Request:", {
      accountId,
      contactNumberParam,
    });

    let contact;

    // Se é pending:, buscar diretamente sem normalizar
    if (contactNumberParam.startsWith("pending:")) {
      console.log(
        "🗑️ Contato pendente detectado, buscando diretamente:",
        contactNumberParam
      );
      contact = await contacts.findUnique({
        where: { number: contactNumberParam },
      });
    } else {
      const normalized = normalizePhoneNumber(contactNumberParam);
      console.log("Número normalizado:", normalized);

      // Tentar encontrar o contato primeiro com o número normalizado
      contact = await contacts.findUnique({
        where: { number: normalized },
      });

      // Se não encontrou e o contactNumberParam contém @lid, tentar com o @lid completo
      if (!contact && contactNumberParam.includes("@lid")) {
        console.log(
          "Tentando encontrar contato com @lid completo:",
          contactNumberParam
        );
        contact = await contacts.findUnique({
          where: { number: contactNumberParam },
        });
      }

      // Se ainda não encontrou, tentar encontrar por mapeamento @lid
      if (!contact && contactNumberParam.includes("@lid")) {
        const mappedNumber = getMappedNumber(contactNumberParam);
        if (mappedNumber) {
          console.log(
            "Tentando encontrar contato com número mapeado:",
            mappedNumber
          );
          contact = await contacts.findUnique({
            where: { number: mappedNumber },
          });
        }
      }
    }

    console.log("Contato encontrado:", contact);

    if (!contact) {
      console.log("Contato não encontrado, retornando deleted: 0");
      return res.json({ success: true, deleted: 0 });
    }

    // Deletar todas as mensagens relacionadas ao contato
    console.log("Deletando mensagens com condições:", {
      accountId,
      contactId: contact.id,
    });

    const result = await messages.deleteMany({
      where: {
        OR: [
          {
            senderId: accountId,
            contactSenderId: contact.id,
          },
          {
            senderId: accountId,
            contactReceiverId: contact.id,
          },
          {
            receiverId: accountId,
            contactSenderId: contact.id,
          },
          {
            receiverId: accountId,
            contactReceiverId: contact.id,
          },
        ],
      },
    });

    console.log("Resultado da deleção:", result);

    // Verificar se o contato tem mensagens com outras contas
    const otherMessages = await messages.findFirst({
      where: {
        OR: [
          { contactSenderId: contact.id },
          { contactReceiverId: contact.id },
        ],
      },
    });

    console.log("Outras mensagens encontradas:", !!otherMessages);

    // Se não tem mais mensagens com nenhuma conta, deletar o contato
    if (!otherMessages) {
      console.log("Deletando contato:", contact.id);
      await contacts.delete({
        where: { id: contact.id },
      });
    }

    const response = {
      success: true,
      deleted: result.count,
      contactDeleted: !otherMessages,
    };

    console.log("Resposta da API:", response);
    res.json(response);
  } catch (error) {
    console.error("Erro na rota DELETE /api/messages:", error);
    res.status(500).json({ error: error.message });
  }
});

// Enviar mensagem
app.post("/api/messages", async (req, res) => {
  try {
    const { accountId, contactNumber, content } = req.body;

    if (!accountId || !contactNumber || !content) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Normalizar o número antes de tudo
    const normalizedNumber = normalizePhoneNumber(contactNumber);

    console.log("📨 [API] POST /api/messages");
    console.log("📨 [API] accountId:", accountId);
    console.log("📨 [API] contactNumber original:", contactNumber);
    console.log("📨 [API] normalizedNumber:", normalizedNumber);

    // Memoriza o último destino real deste accountId
    lastSentTo.set(accountId, normalizedNumber);

    const { providerId } = await sendWhatsAppMessage(
      accountId,
      normalizedNumber,
      content
    );

    console.log("📨 [API] providerId retornado:", providerId);

    // Guardar o número real usado nesse envio para resolver @lid depois
    if (providerId) {
      sentMessagesMap.set(providerId, {
        accountId,
        contactNumber: normalizedNumber,
        timestamp: Date.now(),
      });

      console.log(
        "📨 [API] ✅ Salvo no sentMessagesMap:",
        providerId,
        "→",
        normalizedNumber
      );
      console.log("📨 [API] sentMessagesMap.size:", sentMessagesMap.size);

      // (opcional) evitar crescer infinitamente
      if (sentMessagesMap.size > 500) {
        const oldestKey = sentMessagesMap.keys().next().value;
        sentMessagesMap.delete(oldestKey);
      }
    }

    // Checar se já existe (de-duplicação)
    if (providerId) {
      const exists = await messages.findFirst({ where: { providerId } });
      if (exists) {
        // Já salvo (provavelmente pelo upsert do socket), só emita pro front e retorne
        const instance = whatsappConnections.get(accountId);
        const contact = await contacts.findUnique({
          where: { number: normalizedNumber },
        });

        io.emit("new-message", {
          ...exists,
          accountNumber: instance?.number ? String(instance.number) : undefined,
          contactNumber: normalizedNumber,
          contactName: contact?.name,
        });

        return res.json(exists);
      }
    }

    // Criar ou buscar o contato com o número normalizado
    const contact = await contacts.upsert({
      where: { number: normalizedNumber },
      update: {},
      create: {
        number: normalizedNumber,
      },
    });

    // ✅ Notificar front-end sobre novo contato (especialmente importante para @lid)
    if (normalizedNumber.includes("@lid")) {
      console.log("📤 [API] Notificando front-end sobre novo contato @lid");
      io.emit("contact-created", {
        contact: {
          id: contact.id,
          number: contact.number,
          name: contact.name,
        },
        accountId,
      });
    }

    const message = await messages.create({
      data: {
        content,
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000)
          .toISOString()
          .replace("T", " ")
          .substring(0, 19),
        direction: "sent",
        type: "text",
        senderId: accountId,
        receiverId: accountId,
        contactReceiverId: contact.id,
        providerId: providerId || null,
      },
    });

    // Emite em tempo real para o front
    const instance = whatsappConnections.get(accountId);
    io.emit("new-message", {
      ...message,
      accountNumber: instance?.number ? String(instance.number) : undefined,
      contactNumber: normalizedNumber,
      contactName: contact?.name,
    });

    res.json(message);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Estatísticas
app.get("/api/stats", async (req, res) => {
  try {
    const totalAccounts = db.db
      .prepare("SELECT COUNT(*) as count FROM accounts")
      .get().count;
    const activeAccounts = db.db
      .prepare(
        "SELECT COUNT(*) as count FROM accounts WHERE status = 'connected'"
      )
      .get().count;
    const totalMessages = db.db
      .prepare("SELECT COUNT(*) as count FROM messages")
      .get().count;
    const totalContacts = db.db
      .prepare("SELECT COUNT(*) as count FROM contacts")
      .get().count;

    res.json({
      totalAccounts,
      activeAccounts,
      totalMessages,
      totalContacts,
      messagesPerHour: [],
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

console.log("✅ [SERVER] Rota /api/stats registrada");
console.log("🔍 [SERVER] Próximo: registrar endpoints de dashboard...");

// Endpoint para transcrever áudio sob demanda
app.post("/api/transcribe-audio/:messageId", async (req, res) => {
  try {
    const { messageId } = req.params;

    console.log(
      `🎤 [TRANSCRIBE-API] Solicitação de transcrição para mensagem ${messageId}`
    );

    // Buscar mensagem
    const message = await messages.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      return res.status(404).json({ error: "Mensagem não encontrada" });
    }

    if (message.type !== "audio") {
      return res.status(400).json({ error: "Mensagem não é um áudio" });
    }

    if (!message.mediaUrl) {
      return res.status(400).json({ error: "Áudio não possui mídia" });
    }

    if (!transcriptionService.available) {
      return res.status(503).json({
        error: "Serviço de transcrição não disponível",
        message: "Configure GROQ_API_KEY no .env para habilitar transcrições",
      });
    }

    // Se já tem transcrição, retornar
    if (message.audioTranscription) {
      console.log(`🎤 [TRANSCRIBE-API] Áudio já transcrito`);
      return res.json({
        messageId: message.id,
        transcription: message.audioTranscription,
        provider: message.audioTranscriptionProvider,
        cached: true,
      });
    }

    // Transcrever
    const mediaPath = message.mediaUrl.startsWith("/")
      ? message.mediaUrl.substring(1)
      : message.mediaUrl;
    const audioPath = path.join(DATA_PATH, "data", mediaPath);

    if (!fs.existsSync(audioPath)) {
      return res.status(404).json({ error: "Arquivo de áudio não encontrado" });
    }

    console.log(`🎤 [TRANSCRIBE-API] Transcrevendo: ${audioPath}`);

    const transcription = await transcriptionService.transcribeAudio(
      audioPath,
      "pt"
    );

    // Salvar no banco
    db.db
      .prepare(
        `UPDATE messages 
         SET audioTranscription = ?,
             audioTranscribedAt = datetime('now'),
             audioTranscriptionProvider = ?
         WHERE id = ?`
      )
      .run(transcription.text, transcription.provider, messageId);

    console.log(`✅ [TRANSCRIBE-API] Áudio transcrito com sucesso!`);

    // Emitir via Socket.io
    io.emit("audio-transcribed", {
      messageId,
      transcription: transcription.text,
      provider: transcription.provider,
    });

    res.json({
      messageId,
      transcription: transcription.text,
      provider: transcription.provider,
      cached: false,
    });
  } catch (error) {
    console.error(`❌ [TRANSCRIBE-API] Erro:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

console.log("✅ [SERVER] Rota /api/transcribe-audio/:messageId registrada");

// Endpoint para transcrever áudios antigos em lote
app.post("/api/transcribe-old-audios", async (req, res) => {
  try {
    if (!transcriptionService.available) {
      return res.status(503).json({
        error: "Serviço de transcrição não disponível. Configure GROQ_API_KEY",
      });
    }

    console.log("🎤 [BATCH-TRANSCRIBE] Iniciando transcrição em lote...");

    // Buscar todos os áudios sem transcrição
    const untranscribedAudios = db.db
      .prepare(
        `
      SELECT id, mediaUrl, timestamp
      FROM messages
      WHERE type = 'audio' 
        AND mediaUrl IS NOT NULL
        AND (audioTranscription IS NULL OR audioTranscription = '')
      ORDER BY timestamp DESC
      LIMIT 100
    `
      )
      .all();

    console.log(
      `🎤 [BATCH-TRANSCRIBE] Encontrados ${untranscribedAudios.length} áudios para transcrever`
    );

    if (untranscribedAudios.length === 0) {
      return res.json({
        message: "Nenhum áudio pendente para transcrever",
        transcribed: 0,
        errors: 0,
        total: 0,
      });
    }

    const results = {
      transcribed: 0,
      errors: 0,
      total: untranscribedAudios.length,
      details: [],
    };

    // Processar cada áudio
    for (const audio of untranscribedAudios) {
      try {
        const mediaPath = audio.mediaUrl.startsWith("/")
          ? audio.mediaUrl.substring(1)
          : audio.mediaUrl;
        const audioPath = path.join(DATA_PATH, "data", mediaPath);

        if (!fs.existsSync(audioPath)) {
          console.warn(
            `⚠️ [BATCH-TRANSCRIBE] Arquivo não encontrado: ${audioPath}`
          );
          results.errors++;
          results.details.push({
            id: audio.id,
            success: false,
            error: "Arquivo não encontrado",
          });
          continue;
        }

        console.log(
          `🎤 [BATCH-TRANSCRIBE] [${results.transcribed + 1}/${
            untranscribedAudios.length
          }] Transcrevendo: ${audio.id.substring(0, 8)}...`
        );

        const transcription = await transcriptionService.transcribeAudio(
          audioPath,
          "pt"
        );

        // Salvar no banco
        db.db
          .prepare(
            `UPDATE messages 
             SET audioTranscription = ?,
                 audioTranscribedAt = datetime('now'),
                 audioTranscriptionProvider = ?
             WHERE id = ?`
          )
          .run(transcription.text, transcription.provider, audio.id);

        results.transcribed++;
        results.details.push({
          id: audio.id,
          success: true,
          text: transcription.text.substring(0, 100) + "...",
        });

        console.log(
          `✅ [BATCH-TRANSCRIBE] [${results.transcribed}/${untranscribedAudios.length}] Transcrito com sucesso`
        );

        // Emitir via Socket.io
        io.emit("audio-transcribed", {
          messageId: audio.id,
          transcription: transcription.text,
          provider: transcription.provider,
        });

        // Delay de 500ms entre requisições para respeitar rate limit
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.error(
          `❌ [BATCH-TRANSCRIBE] Erro ao transcrever ${audio.id}:`,
          error.message
        );
        results.errors++;
        results.details.push({
          id: audio.id,
          success: false,
          error: error.message,
        });
      }
    }

    console.log(
      `🎤 [BATCH-TRANSCRIBE] ========================================`
    );
    console.log(
      `✅ [BATCH-TRANSCRIBE] Processo concluído: ${results.transcribed} sucessos, ${results.errors} erros`
    );
    console.log(
      `🎤 [BATCH-TRANSCRIBE] ========================================`
    );

    res.json(results);
  } catch (error) {
    console.error(`❌ [BATCH-TRANSCRIBE] Erro geral:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

console.log("✅ [SERVER] Rota /api/transcribe-old-audios registrada");

// Teste simples
app.get("/api/test-dashboard", (req, res) => {
  res.json({ message: "Endpoint de teste funcionando!" });
});

console.log("✅ [SERVER] Rota /api/test-dashboard registrada");

// Dashboard KPIs
console.log("📊 [SERVER] Registrando endpoint /api/dashboard-kpis");
console.log("📊 [SERVER] dashboardKPIs disponível:", typeof dashboardKPIs);
app.get("/api/dashboard-kpis", async (req, res) => {
  console.log("🎯 [DASHBOARD] Endpoint chamado!");
  try {
    const accountId = req.query.accountId || null;
    const period = req.query.period || "today";
    const startDate = req.query.startDate || null;
    const endDate = req.query.endDate || null;

    console.log("🎯 [DASHBOARD] Params:", {
      accountId,
      period,
      startDate,
      endDate,
    });

    // Se tiver datas customizadas, usar elas ao invés do período
    const useCustomDate = startDate && endDate;
    const periodToUse = useCustomDate ? { startDate, endDate } : period;

    console.log(
      "🎯 [DASHBOARD] Usando período:",
      useCustomDate ? "customizado" : period
    );

    // KPIs de hoje
    const messagesByPeriod = dashboardKPIs.getMessagesByPeriod(
      accountId,
      periodToUse
    );
    console.log("🎯 [DASHBOARD] messagesByPeriod:", messagesByPeriod);
    const activeConversations = dashboardKPIs.getActiveConversations(
      accountId,
      periodToUse
    );
    const newContacts = dashboardKPIs.getNewContacts(accountId, periodToUse);

    // Performance
    const avgResponseTime = dashboardKPIs.getAvgResponseTime(
      accountId,
      periodToUse
    );
    const responseRate = dashboardKPIs.getResponseRate(accountId, periodToUse);
    const peakHour = dashboardKPIs.getPeakHour(accountId, periodToUse);

    // Atividade por hora
    const hourlyActivity = dashboardKPIs.getHourlyActivity(
      accountId,
      periodToUse
    );

    // Ranking de vendedores (apenas se não for filtro de conta específica)
    const vendors = accountId
      ? []
      : dashboardKPIs.getVendorsRanking(periodToUse);

    // Estatísticas de mídia
    const mediaStats = dashboardKPIs.getMediaStats(accountId, periodToUse);

    // Alertas
    const alerts = dashboardKPIs.getAlerts(accountId);

    // Novos KPIs avançados
    const firstContactTime = dashboardKPIs.getFirstContactTime(
      accountId,
      periodToUse
    );
    const lastContactTime = dashboardKPIs.getLastContactTime(
      accountId,
      periodToUse
    );
    const uniqueCustomers = dashboardKPIs.getUniqueCustomers(
      accountId,
      periodToUse
    );
    const afterHoursMessages = dashboardKPIs.getAfterHoursMessages(
      accountId,
      periodToUse
    );
    const avgConversationDuration = dashboardKPIs.getAvgConversationDuration(
      accountId,
      periodToUse
    );
    const topVendor = accountId
      ? null
      : dashboardKPIs.getTopVendor(periodToUse);
    const growth = dashboardKPIs.getGrowthComparison(accountId, periodToUse);
    const performanceVsTeam = accountId
      ? dashboardKPIs.getPerformanceVsTeam(accountId, periodToUse)
      : null;
    const maxResponseGap = dashboardKPIs.getMaxResponseGap(
      accountId,
      periodToUse
    );

    res.json({
      today: {
        messagesSent: messagesByPeriod.sent || 0,
        messagesReceived: messagesByPeriod.received || 0,
        activeConversations,
        newContacts,
      },
      performance: {
        avgResponseTime,
        responseRate,
        peakHour,
        firstContactTime,
        lastContactTime,
        maxResponseGap,
      },
      coverage: {
        uniqueCustomers,
        afterHoursMessages,
        avgConversationDuration,
      },
      insights: {
        topVendor,
        growth,
        performanceVsTeam,
      },
      vendors,
      hourlyActivity,
      alerts,
      mediaStats,
    });
  } catch (error) {
    console.error("Erro ao buscar KPIs do dashboard:", error);
    res.status(500).json({ error: error.message });
  }
});

console.log("✅ [SERVER] Rota /api/dashboard-kpis registrada COM SUCESSO!");
console.log("🎉 [SERVER] TODOS os endpoints do dashboard foram registrados!");

// ============================================
// ENDPOINTS DE IA
// ============================================

console.log("🤖 [SERVER] Registrando endpoints de IA...");

// KPIs de IA
app.get("/api/ai-kpis", async (req, res) => {
  try {
    const { accountId, period = "today", startDate, endDate } = req.query;

    console.log("🤖 [AI KPIs] Request recebido:", {
      accountId,
      period,
      startDate,
      endDate,
    });

    // Determinar período
    const periodFilter = startDate && endDate ? { startDate, endDate } : period;

    // 1. Distribuição por categoria
    const categoryDistribution = dashboardKPIs.getMessageDistributionByCategory(
      accountId || null,
      periodFilter
    );
    console.log("🤖 [AI KPIs] categoryDistribution:", categoryDistribution);

    // 2. Taxa de conversão por categoria
    const categoryConversion = dashboardKPIs.getConversionByCategory(
      accountId || null,
      periodFilter
    );
    console.log("🤖 [AI KPIs] categoryConversion:", categoryConversion);

    // 3. Tempo médio por categoria
    const categoryAvgTime = dashboardKPIs.getAvgTimeByCategory(
      accountId || null,
      periodFilter
    );
    console.log("🤖 [AI KPIs] categoryAvgTime:", categoryAvgTime);

    // 4. Mensagens urgentes não respondidas
    const urgentNotResponded = dashboardKPIs.getUrgentMessagesNotResponded(
      accountId || null
    );
    console.log("🤖 [AI KPIs] urgentNotResponded:", urgentNotResponded);

    // 5. Score de prioridade
    const priorityScore = dashboardKPIs.getAveragePriorityScore(
      accountId || null,
      periodFilter
    );
    console.log("🤖 [AI KPIs] priorityScore:", priorityScore);

    // 6. SLA de urgência
    const urgentSLA = dashboardKPIs.getUrgentResponseSLA(
      accountId || null,
      periodFilter,
      15 // 15 minutos como meta
    );
    console.log("🤖 [AI KPIs] urgentSLA:", urgentSLA);

    // 7. Distribuição de intenções
    const intentDistribution = dashboardKPIs.getIntentDistribution(
      accountId || null,
      periodFilter
    );
    console.log("🤖 [AI KPIs] intentDistribution:", intentDistribution);

    // 8. Conversão por intenção
    const intentConversion = dashboardKPIs.getConversionByIntent(
      accountId || null,
      periodFilter
    );
    console.log("🤖 [AI KPIs] intentConversion:", intentConversion);

    // 9. Jornada do cliente
    const customerJourney = dashboardKPIs.getCustomerJourney(
      accountId || null,
      periodFilter === "today" ? "week" : periodFilter
    );
    console.log("🤖 [AI KPIs] customerJourney:", customerJourney);

    // 10. Valores monetários
    const monetaryValues = dashboardKPIs.getMonetaryValues(
      accountId || null,
      periodFilter
    );
    console.log("🤖 [AI KPIs] monetaryValues:", monetaryValues);

    // 11. Sentimento geral
    const sentimentOverview = dashboardKPIs.getSentimentOverview(
      accountId || null,
      periodFilter
    );
    console.log("🤖 [AI KPIs] sentimentOverview:", sentimentOverview);

    // 12. Estatísticas de resumos
    const summaryStats = dashboardKPIs.getSummaryStats();
    console.log("🤖 [AI KPIs] summaryStats:", summaryStats);

    // 13. Resumos recentes
    const recentSummaries = dashboardKPIs.getRecentSummaries(5);
    console.log("🤖 [AI KPIs] recentSummaries:", recentSummaries);

    // 14. Economia de tempo por contato
    const summaryByContact = dashboardKPIs.getSummaryStatsByContact();
    console.log("🤖 [AI KPIs] summaryByContact:", summaryByContact);

    // 12. Stats de análise
    const aiStats = dashboardKPIs.getAIAnalysisStats(
      accountId || null,
      periodFilter
    );
    console.log("🤖 [AI KPIs] aiStats:", aiStats);

    const response = {
      // Classificação Inteligente
      classification: {
        distribution: categoryDistribution,
        conversion: categoryConversion,
        avgTime: categoryAvgTime,
      },

      // Detecção de Urgência
      urgency: {
        notResponded: urgentNotResponded,
        priorityScore,
        sla: urgentSLA,
      },

      // Análise de Intenção
      intent: {
        distribution: intentDistribution,
        conversion: intentConversion,
        journey: customerJourney,
      },

      // Extração de Informações
      extraction: {
        monetaryValues,
        sentiment: sentimentOverview,
      },

      // Resumos de Conversas
      summaries: {
        stats: summaryStats,
        recent: recentSummaries,
        byContact: summaryByContact,
      },

      // Estatísticas Gerais
      stats: aiStats,
    };

    console.log("✅ [AI KPIs] Resposta gerada com sucesso");
    res.json(response);
  } catch (error) {
    console.error("❌ [AI KPIs] Erro:", error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para forçar análise de mensagens antigas
app.post("/api/ai-analyze-messages", async (req, res) => {
  try {
    const { limit = 100, onlyNew = true } = req.body;

    console.log(
      `🤖 [AI] Iniciando análise de mensagens (limit: ${limit}, onlyNew: ${onlyNew})`
    );

    // Inicializar IA
    const ready = await initializeAI();
    if (!ready) {
      return res.status(503).json({ error: "AI models not ready" });
    }

    // Buscar mensagens para analisar
    const whereClause = onlyNew ? "m.aiAnalyzedAt IS NULL" : "1=1";
    const messagesToAnalyze = db.db
      .prepare(
        `
      SELECT m.id, m.content, m.direction, c.number as remoteJid 
      FROM messages m
      LEFT JOIN contacts c ON c.id = m.contactSenderId
      WHERE ${whereClause}
        AND m.direction = 'received'
        AND length(m.content) >= 5
      ORDER BY m.timestamp DESC
      LIMIT ?
    `
      )
      .all(limit);

    console.log(`🤖 [AI] ${messagesToAnalyze.length} mensagens para analisar`);

    let analyzed = 0;
    let errors = 0;

    // Analisar em lote (5 por vez para não sobrecarregar)
    for (let i = 0; i < messagesToAnalyze.length; i += 5) {
      const batch = messagesToAnalyze.slice(i, i + 5);

      // ❌ DESABILITADO: Análise automática em lote (só manual via botão)
      // await Promise.all(
      //   batch.map(async (msg) => {
      //     try {
      //       await analyzeMessageWithAI(
      //         msg.id,
      //         msg.content,
      //         msg.direction,
      //         msg.remoteJid
      //       );
      //       analyzed++;
      //     } catch (error) {
      //       console.error(`❌ [AI] Erro ao analisar ${msg.id}:`, error.message);
      //       errors++;
      //     }
      //   })
      // );

      // Log de progresso
      if ((i + 5) % 20 === 0) {
        console.log(
          `📊 [AI] Progresso: ${Math.min(i + 5, messagesToAnalyze.length)}/${
            messagesToAnalyze.length
          }`
        );
      }
    }

    console.log(
      `✅ [AI] Análise completa: ${analyzed} analisadas, ${errors} erros`
    );

    res.json({
      success: true,
      analyzed,
      errors,
      total: messagesToAnalyze.length,
    });
  } catch (error) {
    console.error("❌ [AI] Erro ao analisar mensagens:", error);
    res.status(500).json({ error: error.message });
  }
});

// Status da IA
app.get("/api/ai-status", (req, res) => {
  res.json({
    initialized: aiInitialized,
    initializing: aiInitializing,
    ready: aiInitialized && !aiInitializing,
  });
});

// Gerar resumo de conversa com filtro de data
app.post("/api/conversation-summary", async (req, res) => {
  try {
    const { accountId, contactNumber, startDate, endDate } = req.body;

    console.log("🤖 [SUMMARY] Request recebido:", {
      accountId,
      contactNumber,
      startDate,
      endDate,
    });

    if (!accountId || !contactNumber) {
      return res
        .status(400)
        .json({ error: "accountId e contactNumber são obrigatórios" });
    }

    // Inicializar IA se necessário
    if (!aiInitialized) {
      const ready = await initializeAI();
      if (!ready) {
        return res.status(503).json({
          error: "IA não disponível. Modelos ainda carregando...",
        });
      }
    }

    // Buscar mensagens do período
    let query = `
      SELECT m.id, m.content, m.direction, m.timestamp, m.type, m.mediaUrl, 
             m.audioTranscription, m.audioTranscribedAt, m.audioTranscriptionProvider,
             c.name as contactName
      FROM messages m
      LEFT JOIN contacts c ON c.id = CASE 
        WHEN m.direction = 'received' THEN m.contactSenderId 
        ELSE m.contactReceiverId 
      END
      WHERE (m.senderId = ? OR m.receiverId = ?)
    `;

    const params = [accountId, accountId];

    // Adicionar filtro de contato
    query += ` AND EXISTS (
      SELECT 1 FROM contacts c2 
      WHERE c2.number = ? 
      AND (c2.id = m.contactSenderId OR c2.id = m.contactReceiverId)
    )`;
    params.push(contactNumber);

    // Adicionar filtros de data
    if (startDate) {
      query += " AND m.timestamp >= ?";
      params.push(startDate);
    }
    if (endDate) {
      query += " AND m.timestamp <= ?";
      params.push(endDate);
    }

    query += `
      AND (
        (m.content IS NOT NULL AND length(m.content) > 0)
        OR (m.type = 'audio' AND m.mediaUrl IS NOT NULL)
      )
      ORDER BY m.timestamp ASC
      LIMIT 200
    `;

    console.log("🤖 [SUMMARY] Executando query...");
    const conversationMessages = db.db.prepare(query).all(...params);

    console.log(
      `🤖 [SUMMARY] ${conversationMessages.length} mensagens encontradas`
    );

    if (conversationMessages.length === 0) {
      return res.json({
        summary: "Nenhuma mensagem encontrada no período selecionado.",
        messageCount: 0,
        period: { startDate, endDate },
      });
    }

    // VERIFICAR SE JÁ EXISTE RESUMO ATUALIZADO
    const lastMessage = conversationMessages[conversationMessages.length - 1];
    const lastMessageTimestamp = lastMessage.timestamp;

    const existingSummary = db.db
      .prepare(
        `
      SELECT * FROM conversation_summaries 
      WHERE accountId = ? 
        AND contactNumber = ?
        AND lastMessageTimestamp = ?
      ORDER BY createdAt DESC 
      LIMIT 1
    `
      )
      .get(accountId, contactNumber, lastMessageTimestamp);

    if (existingSummary) {
      console.log(
        "ℹ️ [SUMMARY] Resumo já existe e está atualizado (sem novas mensagens)"
      );
      return res.json({
        cached: true,
        noNewMessages: true,
        summary: existingSummary.summary,
        messageCount: conversationMessages.length,
        period: { startDate, endDate },
        sentiment: existingSummary.sentiment,
        sentimentScore: existingSummary.sentimentScore,
        sentimentReason: existingSummary.sentimentReason,
        intent: existingSummary.intent,
        intentConfidence: existingSummary.intentConfidence,
        highlights: existingSummary.highlights
          ? JSON.parse(existingSummary.highlights)
          : [],
        conclusion: existingSummary.conclusion,
        urgencyLevel: existingSummary.urgencyLevel,
        suggestedActions: existingSummary.suggestedActions
          ? JSON.parse(existingSummary.suggestedActions)
          : [],
        extractedInfo: existingSummary.extractedInfo
          ? JSON.parse(existingSummary.extractedInfo)
          : { values: [], emails: [], phones: [] },
        conversationLength: existingSummary.conversationLength,
        compressionRate: existingSummary.compressionRate,
        provider: existingSummary.provider || "unknown",
      });
    }

    console.log(
      "🔄 [SUMMARY] Novas mensagens detectadas, gerando novo resumo..."
    );

    // TRANSCREVER ÁUDIOS ANTES DE GERAR RESUMO
    const audioMessages = conversationMessages.filter(
      (m) => m.type === "audio" && m.mediaUrl && !m.audioTranscription
    );

    if (audioMessages.length > 0 && transcriptionService.available) {
      console.log(`🎤 [SUMMARY] ========================================`);
      console.log(
        `🎤 [SUMMARY] Encontradas ${audioMessages.length} mensagens de áudio para transcrever`
      );
      console.log(
        `🎤 [SUMMARY] Aguardando transcrições antes de gerar resumo...`
      );
      console.log(`🎤 [SUMMARY] ========================================`);

      for (const audioMsg of audioMessages) {
        try {
          // Corrigir caminho: mediaUrl vem como "/media/..." mas precisa de "data/media/..."
          const mediaUrl = audioMsg.mediaUrl.startsWith("/")
            ? audioMsg.mediaUrl.substring(1)
            : audioMsg.mediaUrl;
          const audioPath = path.join(DATA_PATH, "data", mediaUrl);

          if (fs.existsSync(audioPath)) {
            console.log(
              `🎤 [SUMMARY] [${audioMessages.indexOf(audioMsg) + 1}/${
                audioMessages.length
              }] Transcrevendo áudio ${audioMsg.id.substring(0, 8)}...`
            );

            const transcription = await transcriptionService.transcribeAudio(
              audioPath,
              "pt"
            );

            // Salvar transcrição no banco
            db.db
              .prepare(
                `
              UPDATE messages 
              SET audioTranscription = ?,
                  audioTranscribedAt = datetime('now'),
                  audioTranscriptionProvider = ?
              WHERE id = ?
            `
              )
              .run(transcription.text, transcription.provider, audioMsg.id);

            // Atualizar no array de mensagens
            audioMsg.content = transcription.text;
            audioMsg.audioTranscription = transcription.text;

            console.log(
              `✅ [SUMMARY] [${audioMessages.indexOf(audioMsg) + 1}/${
                audioMessages.length
              }] Áudio transcrito com sucesso!`
            );
            console.log(
              `📝 [SUMMARY] Texto: "${transcription.text.substring(0, 100)}..."`
            );
          } else {
            console.warn(
              `⚠️ [SUMMARY] Arquivo de áudio não encontrado: ${audioPath}`
            );
          }
        } catch (error) {
          console.error(
            `❌ [SUMMARY] Erro ao transcrever áudio ${audioMsg.id}:`,
            error.message
          );
          // Continua mesmo com erro
        }
      }

      console.log(`🎤 [SUMMARY] ========================================`);
      console.log(
        `✅ [SUMMARY] Todas as ${audioMessages.length} transcrições concluídas!`
      );
      console.log(`🎤 [SUMMARY] ========================================`);
    } else if (audioMessages.length > 0) {
      console.log(
        `⚠️ [SUMMARY] ${audioMessages.length} áudios encontrados, mas serviço de transcrição não disponível`
      );
      console.log(
        "💡 [SUMMARY] Configure GROQ_API_KEY no .env para habilitar transcrições"
      );
    }

    // Preparar texto da conversa para resumo (limitar tamanho)
    // Agora inclui transcrições de áudio
    console.log(`📝 [SUMMARY] Preparando texto da conversa...`);

    // Contar áudios com e sem transcrição
    const audioCount = conversationMessages.filter(
      (m) => m.type === "audio"
    ).length;
    const transcribedCount = conversationMessages.filter(
      (m) => m.type === "audio" && m.audioTranscription
    ).length;
    console.log(
      `🎤 [SUMMARY] Áudios: ${audioCount} total, ${transcribedCount} transcritos`
    );

    const conversationText = conversationMessages
      .slice(0, 150) // Aumentado de 100 para 150 mensagens
      .map((msg) => {
        const speaker = msg.direction === "received" ? "Cliente" : "Empresa";
        let content = msg.content;

        // Se for áudio e tiver transcrição, usar a transcrição
        if (msg.type === "audio" && msg.audioTranscription) {
          content = `[Áudio transcrito] ${msg.audioTranscription}`;
          console.log(
            `✅ [SUMMARY] Usando transcrição de áudio: "${msg.audioTranscription.substring(
              0,
              50
            )}..."`
          );
        } else if (msg.type === "audio") {
          content = "[Mensagem de áudio - transcrição não disponível]";
          console.warn(`⚠️ [SUMMARY] Áudio sem transcrição (ID: ${msg.id})`);
        }

        content = content.substring(0, 800); // Aumentado de 500 para 800 caracteres
        return `${speaker}: ${content}`;
      })
      .join("\n");

    console.log(
      `🤖 [SUMMARY] Gerando resumo de ${conversationText.length} caracteres...`
    );
    console.log(
      `📄 [SUMMARY] Preview do texto: "${conversationText.substring(
        0,
        300
      )}..."`
    );

    // NOVA LÓGICA: Tentar DeepSeek primeiro, fallback para IA local
    let summaryResult;
    let usedProvider = "local";

    // Preparar contexto
    const contactInfo = await db.db
      .prepare("SELECT name FROM contacts WHERE number = ?")
      .get(contactNumber);

    const context = {
      contactName: contactInfo?.name || contactNumber,
      period:
        startDate || endDate
          ? `${
              startDate
                ? new Date(startDate).toLocaleDateString("pt-BR")
                : "início"
            } até ${
              endDate ? new Date(endDate).toLocaleDateString("pt-BR") : "agora"
            }`
          : "Conversa completa",
    };

    try {
      // TENTATIVA 1: DeepSeek API
      console.log("🤖 [SUMMARY] Tentando análise com DeepSeek...");
      const deepseekResult = await deepseekService.generateConversationSummary(
        conversationMessages,
        context
      );

      usedProvider = "deepseek";
      summaryResult = deepseekResult;
      console.log("✅ [SUMMARY] Resumo gerado com DeepSeek com sucesso!");
    } catch (deepseekError) {
      // FALLBACK: IA Local
      console.warn(
        "⚠️ [SUMMARY] DeepSeek falhou, usando IA local:",
        deepseekError.message
      );

      const textToSummarize = conversationText.substring(0, 10000);

      // Análise com IA local (estruturada)
      const clientMessages = conversationMessages.filter(
        (m) => m.direction === "received"
      );
      const companyMessages = conversationMessages.filter(
        (m) => m.direction === "sent"
      );

      const allContent = conversationMessages.map((m) => m.content).join(" ");

      // Contar interações
      const totalInteractions = conversationMessages.length;
      const clientInteractions = clientMessages.length;
      const companyInteractions = companyMessages.length;

      let structuredSummary = `💬 Conversa com ${totalInteractions} mensagens (${clientInteractions} do cliente, ${companyInteractions} da empresa)\n\n`;

      // Primeira mensagem
      if (conversationMessages.length > 0) {
        const firstMsg = conversationMessages[0];
        const speaker =
          firstMsg.direction === "received" ? "Cliente" : "Empresa";
        structuredSummary += `📌 Início: ${speaker} iniciou perguntando: "${firstMsg.content.substring(
          0,
          150
        )}${firstMsg.content.length > 150 ? "..." : ""}"\n\n`;
      }

      // Palavras-chave
      const keywords = [];
      if (
        allContent.toLowerCase().includes("preço") ||
        allContent.toLowerCase().includes("valor") ||
        allContent.toLowerCase().includes("quanto")
      )
        keywords.push("💰 Negociação de preço");
      if (
        allContent.toLowerCase().includes("entrega") ||
        allContent.toLowerCase().includes("entregar")
      )
        keywords.push("🚚 Discussão sobre entrega");
      if (
        allContent.toLowerCase().includes("produto") ||
        allContent.toLowerCase().includes("peça")
      )
        keywords.push("📦 Consulta de produto");
      if (
        allContent.toLowerCase().includes("problema") ||
        allContent.toLowerCase().includes("defeito")
      )
        keywords.push("⚠️ Problema relatado");
      if (
        allContent.toLowerCase().includes("dúvida") ||
        allContent.includes("?")
      )
        keywords.push("❓ Dúvidas");

      if (keywords.length > 0) {
        structuredSummary += `🏷️ Tópicos: ${keywords.join(", ")}\n\n`;
      }

      // Sentimento
      const sentimentAnalysis = await aiService.analyzeConversationSentiment(
        conversationMessages.map((m) => ({
          content: m.content,
          direction: m.direction,
        }))
      );

      // Extração
      const extraction = await aiService.extractInformation(textToSummarize);

      const hasExtractedInfo =
        (extraction?.emails?.length || 0) > 0 ||
        (extraction?.phones?.length || 0) > 0 ||
        (extraction?.values?.length || 0) > 0;

      if (hasExtractedInfo) {
        structuredSummary += `📋 Informações Importantes:\n`;
        if ((extraction?.values?.length || 0) > 0) {
          const formattedValues = extraction.values.map(
            (v) => `R$ ${v.toFixed(2)}`
          );
          structuredSummary += `   💵 Valores: ${formattedValues.join(", ")}\n`;
        }
        if ((extraction?.phones?.length || 0) > 0) {
          structuredSummary += `   📞 Telefones: ${extraction.phones.join(
            ", "
          )}\n`;
        }
        if ((extraction?.emails?.length || 0) > 0) {
          structuredSummary += `   📧 Emails: ${extraction.emails.join(
            ", "
          )}\n`;
        }
        structuredSummary += `\n`;
      }

      // Última mensagem
      if (conversationMessages.length > 1) {
        const lastMsg = conversationMessages[conversationMessages.length - 1];
        const speaker =
          lastMsg.direction === "received" ? "Cliente" : "Empresa";
        structuredSummary += `🔚 Última mensagem: ${speaker} disse: "${lastMsg.content.substring(
          0,
          150
        )}${lastMsg.content.length > 150 ? "..." : ""}"`;
      }

      usedProvider = "local";
      summaryResult = {
        summary: structuredSummary,
        sentiment: sentimentAnalysis?.sentiment || "neutral",
        sentimentReason: "Análise baseada em palavras-chave",
        intent: keywords.length > 0 ? keywords[0].split(" ")[1] : "Conversa",
        intentConfidence: 0.6,
        highlights: keywords,
        conclusion: "Resumo gerado pela IA local",
        urgencyLevel: "medium",
        suggestedActions: [],
        extractedInfo: extraction || { emails: [], phones: [], values: [] },
      };

      console.log("✅ [SUMMARY] Resumo gerado com IA local");
    }

    // Calcular taxa de compressão
    const compressionRate = (
      (1 - summaryResult.summary.length / conversationText.length) *
      100
    ).toFixed(1);

    const finalSentimentScore =
      summaryResult.sentiment === "positive"
        ? 0.8
        : summaryResult.sentiment === "negative"
        ? 0.2
        : 0.5;

    // SALVAR RESUMO NO BANCO PARA CACHE
    try {
      const summaryId = `summary-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      db.db
        .prepare(
          `
        INSERT OR REPLACE INTO conversation_summaries (
          id, accountId, contactNumber, summary, sentiment, sentimentScore,
          sentimentReason, intent, intentConfidence, highlights, conclusion,
          urgencyLevel, suggestedActions, extractedInfo, conversationLength,
          compressionRate, provider, lastMessageTimestamp, messageCount, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `
        )
        .run(
          summaryId,
          accountId,
          contactNumber,
          summaryResult.summary,
          summaryResult.sentiment,
          finalSentimentScore,
          summaryResult.sentimentReason || "",
          summaryResult.intent || "Não identificado",
          summaryResult.intentConfidence || 0,
          JSON.stringify(summaryResult.highlights || []),
          summaryResult.conclusion || "",
          summaryResult.urgencyLevel || "low",
          JSON.stringify(summaryResult.suggestedActions || []),
          JSON.stringify(summaryResult.extractedInfo || {}),
          conversationText.length,
          parseFloat(compressionRate),
          usedProvider,
          lastMessageTimestamp,
          conversationMessages.length
        );

      console.log("💾 [SUMMARY] Resumo salvo no cache");
    } catch (cacheError) {
      console.warn(
        "⚠️ [SUMMARY] Erro ao salvar cache (não crítico):",
        cacheError.message
      );
    }

    // Resposta unificada
    res.json({
      cached: false,
      noNewMessages: false,
      summary: summaryResult.summary,
      messageCount: conversationMessages.length,
      period: { startDate, endDate },
      sentiment: summaryResult.sentiment,
      sentimentScore: finalSentimentScore,
      sentimentReason: summaryResult.sentimentReason || "",
      intent: summaryResult.intent || "Não identificado",
      intentConfidence: summaryResult.intentConfidence || 0,
      highlights: summaryResult.highlights || [],
      conclusion: summaryResult.conclusion || "",
      urgencyLevel: summaryResult.urgencyLevel || "low",
      suggestedActions: summaryResult.suggestedActions || [],
      extractedInfo: summaryResult.extractedInfo || {
        emails: [],
        phones: [],
        values: [],
      },
      conversationLength: conversationText.length,
      compressionRate: parseFloat(compressionRate),
      provider: usedProvider,
    });
  } catch (error) {
    console.error("❌ [SUMMARY] Erro:", error);
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

console.log("✅ [SERVER] Endpoints de IA registrados!");

// ============================================
// CONVERSATION KPIs ENDPOINT
// ============================================
app.get("/api/conversation-kpis", async (req, res) => {
  try {
    const { accountId, contactNumber } = req.query;

    if (!accountId || !contactNumber) {
      return res.status(400).json({ error: "Missing parameters" });
    }

    console.log(`🤖 [KPIs] Calculando KPIs para ${contactNumber}...`);

    // Buscar todas as mensagens da conversa
    const messages = db.db
      .prepare(
        `
      SELECT 
        m.*,
        m.timestamp,
        m.content,
        m.direction,
        m.aiSentiment,
        m.aiSentimentScore,
        m.aiCategory,
        m.aiCategoryScore,
        m.aiUrgency,
        m.aiUrgencyLevel
      FROM messages m
      JOIN contacts c ON (c.id = m.contactSenderId OR c.id = m.contactReceiverId)
      WHERE (m.senderId = ? OR m.receiverId = ?)
        AND c.number = ?
        AND m.content IS NOT NULL
        AND length(m.content) > 0
      ORDER BY m.timestamp DESC
      LIMIT 200
    `
      )
      .all(accountId, accountId, contactNumber);

    // VERIFICAR SE JÁ TEM ANÁLISE DEEPSEEK ATUALIZADA
    let deepseekAnalysis = null;
    let usedCache = false;
    const forceAnalysis = req.query.force === "true"; // Parâmetro para forçar nova análise

    if (messages.length > 0 && !forceAnalysis) {
      const lastMessage = messages[0]; // Mais recente (ORDER BY timestamp DESC)
      const lastMessageTimestamp = lastMessage.timestamp;

      // Verificar se última mensagem já foi analisada com DeepSeek
      const cachedAnalysis = lastMessage.aiAnalyzedAt;

      if (
        cachedAnalysis &&
        lastMessage.aiCategory &&
        lastMessage.aiSentiment &&
        lastMessage.aiIntent
      ) {
        console.log("ℹ️ [KPIs] Análise já existe (sem novas mensagens)");
        usedCache = true;
        // Continua normalmente usando os dados já salvos no banco
      }
    }

    if (forceAnalysis) {
      console.log("🔄 [KPIs] Forçando nova análise (force=true)");
    }

    // Tentar análise com DeepSeek apenas se não tiver cache OU forçar
    if (messages.length > 0 && (!usedCache || forceAnalysis)) {
      try {
        console.log("🤖 [KPIs] Tentando análise com DeepSeek...");
        deepseekAnalysis = await deepseekService.analyzeConversationForKPIs(
          messages
        );
        console.log("✅ [KPIs] Análise DeepSeek concluída com sucesso");
        console.log(
          `📊 [KPIs DEBUG] DeepSeek retornou:`,
          JSON.stringify(deepseekAnalysis, null, 2)
        );
      } catch (error) {
        console.log(
          `⚠️ [KPIs] DeepSeek falhou, usando IA local: ${error.message}`
        );
        deepseekAnalysis = null;
      }
    }

    if (messages.length === 0) {
      return res.json({
        sentiment: {
          label: "Sem dados",
          score: 0,
          emoji: "😐",
          color: "gray",
        },
        responseTime: {
          avg: 0,
          last: 0,
          fastest: 0,
          slowest: 0,
          status: "normal",
        },
        status: {
          hasUnresponded: false,
          lastMessageDirection: "sent",
          waitingMinutes: 0,
        },
        category: { name: "Sem categoria", confidence: 0, icon: "📋" },
        urgency: { level: "Baixa", score: 0, color: "blue" },
        extraction: {
          values: [],
          totalValue: 0,
          hasNegotiation: false,
          emails: [],
          phones: [],
        },
        engagement: {
          responseRate: 0,
          avgClientLength: 0,
          avgCompanyLength: 0,
          clientEngagement: "low",
        },
        timing: {
          firstMessageTime: new Date().toISOString(),
          lastMessageTime: new Date().toISOString(),
          conversationDuration: 0,
          mostActiveHour: 0,
          mostActiveDay: "Nenhum",
        },
        intent: {
          primary: "Não detectado",
          confidence: 0,
          secondary: null,
        },
        stats: {
          totalMessages: 0,
          clientMessages: 0,
          companyMessages: 0,
          avgMessageLength: 0,
          mediaMessages: 0,
          longestMessage: 0,
        },
      });
    }

    // 1. SENTIMENTO GERAL
    let overallSentiment = "neutral";
    let sentimentScore = 0.5;

    // Usar DeepSeek se disponível, senão usar IA local
    if (deepseekAnalysis) {
      overallSentiment = deepseekAnalysis.sentiment;
      sentimentScore = deepseekAnalysis.sentimentScore;
      console.log(
        `📊 [KPIs] Sentimento (DeepSeek): ${overallSentiment} (${(
          sentimentScore * 100
        ).toFixed(0)}%)`
      );
    } else {
      // Fallback para análise local
      const sentiments = messages
        .filter((m) => m.aiSentiment)
        .map((m) => ({
          sentiment: m.aiSentiment,
          score: m.aiSentimentScore || 0.5,
        }));

      if (sentiments.length > 0) {
        const positiveCount = sentiments.filter(
          (s) => s.sentiment === "positive"
        ).length;
        const negativeCount = sentiments.filter(
          (s) => s.sentiment === "negative"
        ).length;
        const neutralCount = sentiments.filter(
          (s) => s.sentiment === "neutral"
        ).length;

        const total = sentiments.length;
        const positiveRatio = positiveCount / total;
        const negativeRatio = negativeCount / total;

        if (positiveRatio > 0.5) {
          overallSentiment = "positive";
          sentimentScore = 0.7 + positiveRatio * 0.3;
        } else if (negativeRatio > 0.5) {
          overallSentiment = "negative";
          sentimentScore = 0.7 + negativeRatio * 0.3;
        } else {
          overallSentiment = "neutral";
          sentimentScore = 0.5;
        }
      }
      console.log(
        `📊 [KPIs] Sentimento (Local): ${overallSentiment} (${(
          sentimentScore * 100
        ).toFixed(0)}%)`
      );
    }

    const sentimentMap = {
      positive: { label: "Positivo", emoji: "😊", color: "green" },
      negative: { label: "Negativo", emoji: "😠", color: "red" },
      neutral: { label: "Neutro", emoji: "😐", color: "gray" },
    };

    // 2. TEMPO DE RESPOSTA
    const sentMessages = messages.filter((m) => m.direction === "sent");
    const receivedMessages = messages.filter((m) => m.direction === "received");

    let avgResponseTime = 0;
    let lastResponseTime = 0;
    let responseTimes = [];

    for (let i = 0; i < receivedMessages.length; i++) {
      const clientMsg = receivedMessages[i];
      const nextCompanyMsg = sentMessages.find(
        (m) => new Date(m.timestamp) > new Date(clientMsg.timestamp)
      );

      if (nextCompanyMsg) {
        const diff =
          (new Date(nextCompanyMsg.timestamp) - new Date(clientMsg.timestamp)) /
          (1000 * 60);
        responseTimes.push(diff);
      }
    }

    if (responseTimes.length > 0) {
      avgResponseTime =
        responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      lastResponseTime = responseTimes[0] || 0;
    }

    const responseStatus =
      avgResponseTime < 5 ? "fast" : avgResponseTime < 30 ? "normal" : "slow";

    // 3. STATUS DA CONVERSA
    const lastMessage = messages[0];
    const hasUnresponded = lastMessage.direction === "received";
    const waitingMinutes = hasUnresponded
      ? (Date.now() - new Date(lastMessage.timestamp)) / (1000 * 60)
      : 0;

    // 4. CATEGORIA MAIS FREQUENTE
    let topCategory = "Geral";
    let topCategoryConfidence = 0;

    if (deepseekAnalysis) {
      topCategory = deepseekAnalysis.category;
      topCategoryConfidence = deepseekAnalysis.categoryConfidence;
      console.log(
        `📊 [KPIs] Categoria (DeepSeek): ${topCategory} (${(
          topCategoryConfidence * 100
        ).toFixed(0)}%)`
      );
    } else {
      // Fallback para análise local
      const categories = messages
        .filter((m) => m.aiCategory)
        .map((m) => ({
          category: m.aiCategory,
          confidence: m.aiCategoryScore || 0,
        }));

      if (categories.length > 0) {
        const categoryCount = {};
        categories.forEach((c) => {
          if (!categoryCount[c.category]) {
            categoryCount[c.category] = {
              count: 0,
              totalConfidence: 0,
            };
          }
          categoryCount[c.category].count++;
          categoryCount[c.category].totalConfidence += c.confidence;
        });

        let maxCount = 0;
        Object.entries(categoryCount).forEach(([cat, data]) => {
          if (data.count > maxCount) {
            maxCount = data.count;
            topCategory = cat;
            topCategoryConfidence = data.totalConfidence / data.count;
          }
        });
      }
      console.log(`📊 [KPIs] Categoria (Local): ${topCategory}`);
    }

    const categoryIcons = {
      vendas: "💰",
      suporte: "🛠️",
      reclamação: "⚠️",
      dúvida: "❓",
      negociação: "🤝",
      geral: "📋",
      consulta_preco: "💵",
      negociacao: "🤝",
      venda_fechada: "✅",
      orcamento: "📊",
      agendamento: "📅",
      pos_venda: "📦",
    };

    // 5. URGÊNCIA MÁXIMA
    let maxUrgency = 0;
    let urgencyLevel = "Baixa";

    if (deepseekAnalysis) {
      maxUrgency = deepseekAnalysis.urgency;
      urgencyLevel =
        deepseekAnalysis.urgencyLevel === "critical"
          ? "Crítica"
          : deepseekAnalysis.urgencyLevel === "high"
          ? "Alta"
          : deepseekAnalysis.urgencyLevel === "medium"
          ? "Média"
          : "Baixa";
      console.log(`📊 [KPIs] Urgência (DeepSeek): ${urgencyLevel}`);
    } else {
      // Fallback para análise local
      const urgencies = messages
        .filter((m) => m.aiUrgency !== null && m.aiUrgency !== undefined)
        .map((m) => ({
          score: m.aiUrgency,
          level: m.aiUrgencyLevel || "low",
        }));

      if (urgencies.length > 0) {
        maxUrgency = Math.max(...urgencies.map((u) => u.score));
        if (maxUrgency >= 0.8) urgencyLevel = "Crítica";
        else if (maxUrgency >= 0.6) urgencyLevel = "Alta";
        else if (maxUrgency >= 0.4) urgencyLevel = "Média";
        else urgencyLevel = "Baixa";
      }
      console.log(`📊 [KPIs] Urgência (Local): ${urgencyLevel}`);
    }

    const urgencyColors = {
      Crítica: "red",
      Alta: "yellow",
      Média: "yellow",
      Baixa: "blue",
    };

    // 6. EXTRAÇÃO DE VALORES E INFORMAÇÕES
    let allValues = [];
    let allEmails = [];
    let allPhones = [];
    let totalValue = 0;
    let hasNegotiation = false;

    // Usar dados do DeepSeek se disponível (muito mais preciso)
    if (deepseekAnalysis && deepseekAnalysis.extractedValues) {
      allValues = deepseekAnalysis.extractedValues;
      totalValue = allValues.reduce((sum, val) => sum + val, 0);
      hasNegotiation = deepseekAnalysis.hasNegotiation;

      console.log(
        `💰 [KPIs] Valores extraídos pelo DeepSeek: ${allValues.length}`
      );
      if (allValues.length > 0) {
        console.log(`💰 [KPIs] Valores: R$ ${allValues.join(", R$ ")}`);
      }
      if (
        deepseekAnalysis.extractedProducts &&
        deepseekAnalysis.extractedProducts.length > 0
      ) {
        console.log(
          `📦 [KPIs] Produtos: ${deepseekAnalysis.extractedProducts.join(", ")}`
        );
      }
      if (
        deepseekAnalysis.extractedConditions &&
        deepseekAnalysis.extractedConditions.length > 0
      ) {
        console.log(
          `📋 [KPIs] Condições: ${deepseekAnalysis.extractedConditions.join(
            ", "
          )}`
        );
      }
    } else {
      // Fallback para IA local (menos preciso)
      console.log(
        "⚠️ [KPIs] Usando extração local (menos preciso que DeepSeek)"
      );
      const extractionPromises = messages.map((m) =>
        aiService.extractInformation(m.content)
      );
      const extractions = await Promise.all(extractionPromises);

      allValues = extractions
        .filter((e) => e && e.values && e.values.length > 0)
        .flatMap((e) => e.values);

      allEmails = extractions
        .filter((e) => e && e.emails && e.emails.length > 0)
        .flatMap((e) => e.emails);

      allPhones = extractions
        .filter((e) => e && e.phones && e.phones.length > 0)
        .flatMap((e) => e.phones);

      totalValue = allValues.reduce((sum, val) => sum + val, 0);
      hasNegotiation = allValues.length > 1;
    }

    // Remover duplicatas
    const uniqueEmails = [...new Set(allEmails)];
    const uniquePhones = [...new Set(allPhones)];

    // DEFINIR CONTADORES DE MENSAGENS PRIMEIRO
    const clientMessagesCount = messages.filter(
      (m) => m.direction === "received"
    ).length;
    const companyMessagesCount = messages.filter(
      (m) => m.direction === "sent"
    ).length;

    // 7. TAXA DE ENGAJAMENTO
    let responseRate = 0;
    if (clientMessagesCount > 0) {
      const respondedClientMessages =
        clientMessagesCount - (hasUnresponded ? 1 : 0);
      responseRate = (respondedClientMessages / clientMessagesCount) * 100;
    }

    const avgClientLength =
      clientMessagesCount > 0
        ? messages
            .filter((m) => m.direction === "received")
            .reduce((sum, m) => sum + m.content.length, 0) / clientMessagesCount
        : 0;

    const avgCompanyLength =
      companyMessagesCount > 0
        ? messages
            .filter((m) => m.direction === "sent")
            .reduce((sum, m) => sum + m.content.length, 0) /
          companyMessagesCount
        : 0;

    const clientEngagement =
      responseRate > 80 ? "high" : responseRate > 50 ? "medium" : "low";

    // 8. ANÁLISE DE TEMPO
    const firstMessage = messages[messages.length - 1];
    const conversationDuration =
      (new Date(lastMessage.timestamp) - new Date(firstMessage.timestamp)) /
      (1000 * 60 * 60); // horas

    // Encontrar horário mais ativo
    const hourCounts = {};
    messages.forEach((m) => {
      const hour = new Date(m.timestamp).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const mostActiveHour = Object.entries(hourCounts).reduce(
      (max, [hour, count]) => (count > max.count ? { hour, count } : max),
      { hour: 0, count: 0 }
    ).hour;

    // Dia da semana mais ativo
    const dayCounts = {};
    const dayNames = [
      "Domingo",
      "Segunda",
      "Terça",
      "Quarta",
      "Quinta",
      "Sexta",
      "Sábado",
    ];
    messages.forEach((m) => {
      const day = new Date(m.timestamp).getDay();
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    });

    const mostActiveDayNum = Object.entries(dayCounts).reduce(
      (max, [day, count]) => (count > max.count ? { day, count } : max),
      { day: 0, count: 0 }
    ).day;

    // 9. INTENÇÃO PRINCIPAL
    let primaryIntent = null;
    let intentConfidence = 0;

    if (deepseekAnalysis) {
      primaryIntent = deepseekAnalysis.intent;
      intentConfidence = deepseekAnalysis.intentConfidence;
      console.log(
        `📊 [KPIs] Intenção (DeepSeek): ${primaryIntent} (${(
          intentConfidence * 100
        ).toFixed(0)}%)`
      );
    } else {
      // Fallback para análise local
      const intents = messages
        .filter((m) => m.aiIntent)
        .map((m) => ({
          intent: m.aiIntent,
          score: m.aiIntentScore || 0,
        }));

      if (intents.length > 0) {
        const intentCount = {};
        intents.forEach((i) => {
          if (!intentCount[i.intent]) {
            intentCount[i.intent] = { count: 0, totalScore: 0 };
          }
          intentCount[i.intent].count++;
          intentCount[i.intent].totalScore += i.score;
        });

        const topIntent = Object.entries(intentCount).reduce(
          (max, [intent, data]) =>
            data.count > max.count ? { intent, ...data } : max,
          { intent: null, count: 0, totalScore: 0 }
        );

        primaryIntent = topIntent.intent;
        intentConfidence = topIntent.totalScore / topIntent.count;
      }
      console.log(
        `📊 [KPIs] Intenção (Local): ${primaryIntent || "Não detectada"}`
      );
    }

    const intentMap = {
      comprar: "Compra",
      reclamar: "Reclamação",
      perguntar: "Dúvida",
      cancelar: "Cancelamento",
      negociar: "Negociação",
      conversar: "Conversa",
    };

    // 10. ESTATÍSTICAS ADICIONAIS
    const mediaMessages = messages.filter((m) => m.mediaUrl).length;
    const messageLengths = messages.map((m) => m.content.length);
    const longestMessage = Math.max(...messageLengths);

    // Calcular tempos de resposta adicionais
    const fastestResponse =
      responseTimes.length > 0 ? Math.min(...responseTimes) : 0;
    const slowestResponse =
      responseTimes.length > 0 ? Math.max(...responseTimes) : 0;

    // 11. ESTATÍSTICAS GERAIS (totalLength e avgMessageLength)
    const totalLength = messages.reduce((sum, m) => sum + m.content.length, 0);
    const avgMessageLength = totalLength / messages.length;

    const kpis = {
      sentiment: {
        label: sentimentMap[overallSentiment].label,
        score: sentimentScore,
        emoji: sentimentMap[overallSentiment].emoji,
        color: sentimentMap[overallSentiment].color,
      },
      responseTime: {
        avg: avgResponseTime,
        last: lastResponseTime,
        fastest: fastestResponse,
        slowest: slowestResponse,
        status: responseStatus,
      },
      status: {
        hasUnresponded,
        lastMessageDirection: lastMessage.direction,
        waitingMinutes,
      },
      category: {
        name: topCategory,
        confidence: topCategoryConfidence,
        icon: categoryIcons[topCategory] || "📋",
      },
      urgency: {
        level: urgencyLevel,
        score: maxUrgency,
        color: urgencyColors[urgencyLevel],
      },
      extraction: {
        values: allValues,
        totalValue,
        hasNegotiation,
        emails: uniqueEmails,
        phones: uniquePhones,
      },
      engagement: {
        responseRate,
        avgClientLength,
        avgCompanyLength,
        clientEngagement,
      },
      timing: {
        firstMessageTime: firstMessage.timestamp,
        lastMessageTime: lastMessage.timestamp,
        conversationDuration,
        mostActiveHour: parseInt(mostActiveHour),
        mostActiveDay: dayNames[mostActiveDayNum],
      },
      intent: {
        primary: intentMap[primaryIntent] || primaryIntent || "Não detectado",
        confidence: intentConfidence,
        secondary: null,
      },
      stats: {
        totalMessages: messages.length,
        clientMessages: clientMessagesCount,
        companyMessages: companyMessagesCount,
        avgMessageLength,
        mediaMessages,
        longestMessage,
      },
      provider: deepseekAnalysis ? "deepseek" : "local",
    };

    console.log(
      `✅ [KPIs] KPIs calculados com sucesso (Provider: ${
        deepseekAnalysis ? "DeepSeek" : "Local"
      })`
    );
    res.json(kpis);
  } catch (error) {
    console.error("❌ [KPIs] Erro:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// LEAD INFO ENDPOINTS - EXTRAÇÃO AUTOMÁTICA
// ============================================

// Função auxiliar: Extrair informações das mensagens
function extractLeadInfoFromMessages(messages) {
  // Extrair produtos mencionados com contexto
  const products = [];
  const productPatterns = [
    // Padrões específicos de produtos
    /(?:produto|item|mercadoria|artigo)[\s:]+([a-záàâãéèêíïóôõöúçñ\s\d]+?)(?:\.|,|!|\?|$)/gi,
    /(?:quero|gostaria|preciso de?|me vende|vende)[\s:]+([a-záàâãéèêíïóôõöúçñ\s\d]+?)(?:\.|,|!|\?|por|no valor|R\$|$)/gi,
    /(?:quanto (?:custa|é|fica|sai))[\s:]+(?:o|a|os|as)?[\s]*([a-záàâãéèêíïóôõöúçñ\s\d]+?)(?:\.|,|!|\?|$)/gi,
    /(?:interessado em|interesse em|quero comprar|vou comprar)[\s:]+([a-záàâãéèêíïóôõöúçñ\s\d]+?)(?:\.|,|!|\?|$)/gi,
  ];

  const uniqueProducts = new Set();

  messages.forEach((msg) => {
    if (msg.content && msg.direction === "received") {
      productPatterns.forEach((pattern) => {
        const matches = [...msg.content.matchAll(pattern)];
        matches.forEach((match) => {
          if (match[1]) {
            const product = match[1].trim();
            if (product.length > 3 && product.length < 100) {
              uniqueProducts.add(product);
            }
          }
        });
      });

      const keywords = [
        "plano",
        "serviço",
        "produto",
        "pacote",
        "kit",
        "combo",
        "modelo",
      ];
      keywords.forEach((kw) => {
        const regex = new RegExp(
          `${kw}\\s+([a-záàâãéèêíïóôõöúçñ\\s\\d]{3,50})`,
          "gi"
        );
        const matches = [...msg.content.matchAll(regex)];
        matches.forEach((match) => {
          if (match[1]) {
            const product = `${kw} ${match[1].trim()}`;
            if (product.length < 100) {
              uniqueProducts.add(product);
            }
          }
        });
      });
    }
  });

  products.push(...Array.from(uniqueProducts).slice(0, 10));

  // Extrair valores com contexto
  const values = [];
  let totalValue = 0;

  const valuePatterns = [
    /R\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/g,
    /(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)\s*reais?/gi,
    /valor\s*(?:de|:)?\s*R?\$?\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/gi,
    /preço\s*(?:de|:)?\s*R?\$?\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/gi,
    /(?:custa|fica|sai|está|esta|é)\s+(\d{3,6})(?!\d)/gi, // "esta 5400", "custa 1500"
    /(\d{3,6})\s*(?:reais?|pila)/gi, // "5400 reais", "1500 pila"
  ];

  messages.forEach((msg) => {
    if (msg.content) {
      valuePatterns.forEach((pattern) => {
        const matches = [...msg.content.matchAll(pattern)];
        matches.forEach((match) => {
          const valueStr = match[0];
          const numStr = match[1].replace(/\./g, "").replace(",", ".");
          const num = parseFloat(numStr);

          if (!isNaN(num) && num > 0 && num < 1000000) {
            values.push(valueStr);
            totalValue += num;
          }
        });
      });
    }
  });

  // Calcular sentimento médio
  const sentiments = messages.filter(
    (m) => m.aiSentiment && m.direction === "received"
  );
  let sentiment = "neutro";
  let sentimentScore = 0.5;

  if (sentiments.length > 0) {
    const avgScore =
      sentiments.reduce((sum, m) => sum + (m.aiSentimentScore || 0.5), 0) /
      sentiments.length;
    sentimentScore = avgScore;

    const sentimentCounts = {};
    sentiments.forEach((m) => {
      sentimentCounts[m.aiSentiment] =
        (sentimentCounts[m.aiSentiment] || 0) + 1;
    });

    sentiment =
      Object.entries(sentimentCounts).reduce((max, [sent, count]) =>
        count > (sentimentCounts[max] || 0) ? sent : max
      ) || "neutro";
  }

  // Detectar intenção principal
  const intents = messages.filter(
    (m) => m.aiIntent && m.direction === "received"
  );
  let intent = "não detectado";

  if (intents.length > 0) {
    const intentCounts = {};
    intents.forEach((m) => {
      intentCounts[m.aiIntent] = (intentCounts[m.aiIntent] || 0) + 1;
    });

    intent =
      Object.entries(intentCounts).reduce((max, [int, count]) =>
        count > (intentCounts[max] || 0) ? int : max
      ) || "não detectado";
  }

  // Detectar urgência
  const urgencies = messages.filter(
    (m) => m.aiUrgency !== null && m.direction === "received"
  );
  let urgency = "Baixa";

  if (urgencies.length > 0) {
    const maxUrgency = Math.max(...urgencies.map((m) => m.aiUrgency));
    if (maxUrgency >= 0.8) urgency = "Crítica";
    else if (maxUrgency >= 0.6) urgency = "Alta";
    else if (maxUrgency >= 0.4) urgency = "Média";
  }

  // Detectar estágio
  const stage = detectStage(messages);

  // Extrair pontos-chave
  const keyPoints = messages
    .filter(
      (m) => m.direction === "received" && m.content && m.content.length > 20
    )
    .slice(0, 5)
    .map(
      (m) => m.content.substring(0, 100) + (m.content.length > 100 ? "..." : "")
    );

  return {
    products: products.slice(0, 5),
    values: values.slice(0, 10),
    totalValue: Math.round(totalValue * 100) / 100,
    stage,
    priority: urgency.toLowerCase(),
    keyPoints,
    sentiment,
    sentimentScore,
    intent,
    urgency,
    lastUpdate: new Date().toISOString(),
    messageCount: messages.length,
  };
}

// GET: Extrair informações automaticamente das mensagens (com cache e DeepSeek)
app.get("/api/lead-info/extract", async (req, res) => {
  try {
    const { accountId, contactNumber } = req.query;

    if (!accountId || !contactNumber) {
      return res.status(400).json({ error: "Missing parameters" });
    }

    console.log(
      `📋 [LEAD-EXTRACT-GET] Extraindo info para ${contactNumber}...`
    );
    console.log(`📋 [LEAD-EXTRACT-GET] Account ID: ${accountId}`);

    // Buscar contato pelo número
    const contact = db.db
      .prepare("SELECT id, name FROM contacts WHERE number = ?")
      .get(contactNumber);

    if (!contact) {
      console.warn(
        `⚠️ [LEAD-EXTRACT-GET] Contato ${contactNumber} não encontrado`
      );
      return res.json({
        info: extractLeadInfoFromMessages([]),
      });
    }

    console.log(
      `👤 [LEAD-EXTRACT-GET] Contato encontrado: ID=${contact.id}, Nome=${contact.name}`
    );

    // Buscar mensagens da conversa COM transcrições de áudio
    const messages = db.db
      .prepare(
        `
        SELECT m.*, m.audioTranscription, c.name as contactName
        FROM messages m
        LEFT JOIN contacts c ON c.id = CASE 
          WHEN m.direction = 'received' THEN m.contactSenderId 
          ELSE m.contactReceiverId 
        END
        WHERE (m.contactSenderId = ? OR m.contactReceiverId = ?)
        ORDER BY m.timestamp ASC
        LIMIT 200
      `
      )
      .all(contact.id, contact.id);

    console.log(
      `📨 [LEAD-EXTRACT-GET] Total de mensagens encontradas: ${messages.length}`
    );

    // Contar mensagens com áudio
    const audioMessages = messages.filter((m) => m.audioTranscription);
    console.log(
      `🎙️ [LEAD-EXTRACT-GET] Mensagens com transcrição de áudio: ${audioMessages.length}`
    );

    // Contar mensagens de texto
    const textMessages = messages.filter(
      (m) => m.content && !m.audioTranscription
    );
    console.log(
      `💬 [LEAD-EXTRACT-GET] Mensagens de texto: ${textMessages.length}`
    );

    // Log DETALHADO de TODAS as mensagens
    if (messages.length > 0) {
      console.log(`📝 [LEAD-EXTRACT-GET] ESTRUTURA DE TODAS AS MENSAGENS:`);
      messages.forEach((m, i) => {
        console.log(`\n  === Msg ${i + 1} ===`);
        console.log(`  ID: ${m.id}`);
        console.log(`  Type: ${m.type}`);
        console.log(`  Direction: ${m.direction}`);
        console.log(`  Has content: ${!!m.content}`);
        console.log(`  Has audioTranscription: ${!!m.audioTranscription}`);
        if (m.content) {
          console.log(`  Content: ${m.content.substring(0, 80)}...`);
        }
        if (m.audioTranscription) {
          console.log(
            `  Transcription: ${m.audioTranscription.substring(0, 120)}...`
          );
        }
      });
    }

    if (messages.length === 0) {
      console.warn(
        `⚠️ [LEAD-EXTRACT-GET] Nenhuma mensagem encontrada para ${contactNumber}`
      );
      return res.json({
        info: extractLeadInfoFromMessages([]),
      });
    }

    // Verificar cache primeiro
    const lastMessage = messages[messages.length - 1];
    const lastMessageTimestamp = lastMessage.timestamp;

    const cachedInfo = db.db
      .prepare(
        `
        SELECT * FROM lead_info_cache 
        WHERE contactNumber = ? 
          AND lastMessageTimestamp = ?
        ORDER BY createdAt DESC 
        LIMIT 1
      `
      )
      .get(contactNumber, lastMessageTimestamp);

    if (cachedInfo) {
      console.log("✅ [LEAD-EXTRACT-GET] Cache válido encontrado");
      console.log(
        `💾 [LEAD-EXTRACT-GET] Provider do cache: ${cachedInfo.provider}`
      );
      console.log(
        `📅 [LEAD-EXTRACT-GET] Extraído em: ${cachedInfo.extractedAt}`
      );
      console.log(
        `📦 [LEAD-EXTRACT-GET] Produtos no cache: ${cachedInfo.products}`
      );
      console.log(
        `💰 [LEAD-EXTRACT-GET] Valores no cache: ${cachedInfo.extractedValues}`
      );
      console.log(`🎯 [LEAD-EXTRACT-GET] Necessidade: ${cachedInfo.mainNeed}`);

      const cachedKeyPoints = [];
      if (cachedInfo.mainNeed) cachedKeyPoints.push(cachedInfo.mainNeed);
      const cachedObjections = JSON.parse(cachedInfo.objections || "[]");
      if (cachedObjections.length > 0) {
        cachedKeyPoints.push(`Objeções: ${cachedObjections.join(", ")}`);
      }
      const cachedNextSteps = JSON.parse(cachedInfo.nextSteps || "[]");
      if (cachedNextSteps.length > 0) {
        cachedKeyPoints.push(...cachedNextSteps);
      }
      if (cachedInfo.notes) cachedKeyPoints.push(cachedInfo.notes);

      return res.json({
        info: {
          products: JSON.parse(cachedInfo.products || "[]"),
          values: JSON.parse(cachedInfo.extractedValues || "[]"),
          totalValue: cachedInfo.totalValue || 0,
          interestLevel: cachedInfo.interestLevel,
          urgencyLevel: cachedInfo.urgencyLevel,
          stage: cachedInfo.stage,
          mainNeed: cachedInfo.mainNeed,
          budget: cachedInfo.budget,
          deadline: cachedInfo.deadline,
          objections: cachedObjections,
          isDecisionMaker: cachedInfo.isDecisionMaker === 1,
          checkingCompetitors: cachedInfo.checkingCompetitors === 1,
          nextSteps: cachedNextSteps,
          notes: cachedInfo.notes,
          sentiment: cachedInfo.sentiment,
          conversionProbability: cachedInfo.conversionProbability,
          priority: cachedInfo.interestLevel || "médio",
          urgency:
            cachedInfo.urgencyLevel === "alta"
              ? "Alta"
              : cachedInfo.urgencyLevel === "média"
              ? "Média"
              : cachedInfo.urgencyLevel === "baixa"
              ? "Baixa"
              : "Média",
          keyPoints: cachedKeyPoints,
          sentimentScore: cachedInfo.conversionProbability || 0.5,
          intent: cachedInfo.stage || "não detectado",
          provider: cachedInfo.provider,
          extractedAt: cachedInfo.extractedAt,
          messageCount: messages.length,
          lastUpdate: cachedInfo.extractedAt,
          cached: true,
        },
      });
    }

    // Se não tem cache, gerar com DeepSeek
    console.log("🔄 [LEAD-EXTRACT-GET] Nenhum cache válido encontrado");
    console.log("🤖 [LEAD-EXTRACT-GET] Gerando nova análise com DeepSeek...");
    console.log(
      `📊 [LEAD-EXTRACT-GET] Enviando ${messages.length} mensagens para análise`
    );

    let leadInfo;
    let usedProvider = "local";

    try {
      console.log(
        "⏳ [LEAD-EXTRACT-GET] Chamando deepseekService.extractLeadInfo()..."
      );
      leadInfo = await deepseekService.extractLeadInfo(messages, {
        contactName: contact.name || contactNumber,
      });
      usedProvider = "deepseek";
      console.log("✅ [LEAD-EXTRACT-GET] Análise com DeepSeek concluída!");
      console.log(
        `📦 [LEAD-EXTRACT-GET] Produtos extraídos: ${JSON.stringify(
          leadInfo.products
        )}`
      );
      console.log(
        `💰 [LEAD-EXTRACT-GET] Valores extraídos: ${JSON.stringify(
          leadInfo.values
        )}`
      );
      console.log(
        `🎯 [LEAD-EXTRACT-GET] Necessidade principal: ${leadInfo.mainNeed}`
      );
      console.log(
        `⚠️ [LEAD-EXTRACT-GET] Objeções: ${JSON.stringify(leadInfo.objections)}`
      );
      console.log(
        `📋 [LEAD-EXTRACT-GET] Próximos passos: ${JSON.stringify(
          leadInfo.nextSteps
        )}`
      );
    } catch (deepseekError) {
      console.error(
        "❌ [LEAD-EXTRACT-GET] DeepSeek falhou:",
        deepseekError.message
      );
      console.error("❌ [LEAD-EXTRACT-GET] Stack:", deepseekError.stack);
      console.warn(
        "⚠️ [LEAD-EXTRACT-GET] Usando extração local como fallback..."
      );
      const localInfo = extractLeadInfoFromMessages(messages);
      console.log(
        `📊 [LEAD-EXTRACT-GET] Extração local - Produtos: ${
          localInfo.products?.length || 0
        }`
      );
      console.log(
        `💰 [LEAD-EXTRACT-GET] Extração local - Valores: ${
          localInfo.values?.length || 0
        }`
      );

      leadInfo = {
        products: localInfo.products || [],
        values: localInfo.values || [],
        totalValue: localInfo.totalValue || 0,
        interestLevel: localInfo.priority || "médio",
        urgencyLevel: localInfo.urgency?.toLowerCase() || "média",
        stage: localInfo.stage || "contato_inicial",
        mainNeed: localInfo.keyPoints?.join(". ") || "",
        budget: "não mencionado",
        deadline: "não mencionado",
        objections: [],
        isDecisionMaker: true,
        checkingCompetitors: false,
        nextSteps: [],
        notes: "",
        sentiment: localInfo.sentiment || "neutro",
        conversionProbability: 0.5,
      };
      usedProvider = "local";
    }

    // Salvar no cache
    try {
      db.db
        .prepare(
          `
        INSERT INTO lead_info_cache (
          contactNumber, lastMessageTimestamp, products, extractedValues, totalValue,
          interestLevel, urgencyLevel, stage, mainNeed, budget, deadline,
          objections, isDecisionMaker, checkingCompetitors, nextSteps,
          notes, sentiment, conversionProbability, provider, extractedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
        )
        .run(
          contactNumber,
          lastMessageTimestamp,
          JSON.stringify(leadInfo.products || []),
          JSON.stringify(leadInfo.values || []),
          leadInfo.totalValue || 0,
          leadInfo.interestLevel || "baixo",
          leadInfo.urgencyLevel || "baixa",
          leadInfo.stage || "contato_inicial",
          leadInfo.mainNeed || "",
          leadInfo.budget || "",
          leadInfo.deadline || "",
          JSON.stringify(leadInfo.objections || []),
          leadInfo.isDecisionMaker ? 1 : 0,
          leadInfo.checkingCompetitors ? 1 : 0,
          JSON.stringify(leadInfo.nextSteps || []),
          leadInfo.notes || "",
          leadInfo.sentiment || "neutro",
          leadInfo.conversionProbability || 0,
          usedProvider,
          new Date().toISOString()
        );
      console.log("💾 [LEAD-EXTRACT-GET] Informações salvas no cache");
    } catch (cacheError) {
      console.warn(
        "⚠️ [LEAD-EXTRACT-GET] Erro ao salvar cache:",
        cacheError.message
      );
    }

    const keyPoints = [];
    if (leadInfo.mainNeed) keyPoints.push(leadInfo.mainNeed);
    if (leadInfo.objections && leadInfo.objections.length > 0) {
      keyPoints.push(`Objeções: ${leadInfo.objections.join(", ")}`);
    }
    if (leadInfo.nextSteps && leadInfo.nextSteps.length > 0) {
      keyPoints.push(...leadInfo.nextSteps);
    }
    if (leadInfo.notes) keyPoints.push(leadInfo.notes);

    console.log(
      `✅ [LEAD-EXTRACT-GET] Informações extraídas (${usedProvider})`
    );
    res.json({
      info: {
        products: leadInfo.products || [],
        values: leadInfo.values || [],
        totalValue: leadInfo.totalValue || 0,
        interestLevel: leadInfo.interestLevel || "médio",
        urgencyLevel: leadInfo.urgencyLevel || "média",
        stage: leadInfo.stage || "contato_inicial",
        mainNeed: leadInfo.mainNeed || "",
        budget: leadInfo.budget || "não mencionado",
        deadline: leadInfo.deadline || "não mencionado",
        objections: leadInfo.objections || [],
        isDecisionMaker: leadInfo.isDecisionMaker !== false,
        checkingCompetitors: leadInfo.checkingCompetitors || false,
        nextSteps: leadInfo.nextSteps || [],
        notes: leadInfo.notes || "",
        sentiment: leadInfo.sentiment || "neutro",
        conversionProbability: leadInfo.conversionProbability || 0.5,
        priority: leadInfo.interestLevel || "médio",
        urgency:
          leadInfo.urgencyLevel === "alta"
            ? "Alta"
            : leadInfo.urgencyLevel === "média"
            ? "Média"
            : leadInfo.urgencyLevel === "baixa"
            ? "Baixa"
            : "Média",
        keyPoints: keyPoints,
        sentimentScore: leadInfo.conversionProbability || 0.5,
        intent: leadInfo.stage || "não detectado",
        messageCount: messages.length,
        provider: usedProvider,
        cached: false,
        extractedAt: new Date().toISOString(),
        lastUpdate: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("❌ [LEAD-EXTRACT-GET] Erro:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST: Atualizar extração forçada com DeepSeek + Cache
app.post("/api/lead-info/extract", async (req, res) => {
  try {
    const { accountId, contactNumber } = req.body;

    if (!accountId || !contactNumber) {
      return res.status(400).json({ error: "Missing parameters" });
    }

    console.log(
      `📋 [LEAD-EXTRACT] Extraindo info para ${contactNumber}... (POST)`
    );

    // Criar tabela de cache se não existir
    try {
      db.db.exec(`
        CREATE TABLE IF NOT EXISTS lead_info_cache (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          contactNumber TEXT NOT NULL,
          lastMessageTimestamp TEXT NOT NULL,
          products TEXT,
          extractedValues TEXT,
          totalValue REAL,
          interestLevel TEXT,
          urgencyLevel TEXT,
          stage TEXT,
          mainNeed TEXT,
          budget TEXT,
          deadline TEXT,
          objections TEXT,
          isDecisionMaker INTEGER,
          checkingCompetitors INTEGER,
          nextSteps TEXT,
          notes TEXT,
          sentiment TEXT,
          conversionProbability REAL,
          provider TEXT,
          extractedAt TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } catch (tableError) {
      console.error(
        "⚠️ [LEAD-EXTRACT] Erro ao criar tabela:",
        tableError.message
      );
    }

    // Buscar contato pelo número
    const contact = db.db
      .prepare("SELECT id, name FROM contacts WHERE number = ?")
      .get(contactNumber);

    if (!contact) {
      return res.json({
        info: extractLeadInfoFromMessages([]),
      });
    }

    // Buscar mensagens da conversa com transcrições de áudio
    const messages = db.db
      .prepare(
        `
        SELECT m.*, m.audioTranscription, c.name as contactName
        FROM messages m
        LEFT JOIN contacts c ON c.id = CASE 
          WHEN m.direction = 'received' THEN m.contactSenderId 
          ELSE m.contactReceiverId 
        END
        WHERE (m.contactSenderId = ? OR m.contactReceiverId = ?)
        ORDER BY m.timestamp ASC
        LIMIT 200
      `
      )
      .all(contact.id, contact.id);

    if (messages.length === 0) {
      return res.json({
        info: {
          products: [],
          values: [],
          totalValue: 0,
          stage: "contato_inicial",
          interestLevel: "baixo",
          urgencyLevel: "baixa",
          mainNeed: "",
          sentiment: "neutro",
          conversionProbability: 0.5,
          lastUpdate: new Date().toISOString(),
          messageCount: 0,
          provider: "none",
        },
      });
    }

    // Verificar se há cache válido (mesma última mensagem)
    const lastMessage = messages[messages.length - 1];
    const lastMessageTimestamp = lastMessage.timestamp;

    const cachedInfo = db.db
      .prepare(
        `
        SELECT * FROM lead_info_cache 
        WHERE contactNumber = ? 
          AND lastMessageTimestamp = ?
        ORDER BY createdAt DESC 
        LIMIT 1
      `
      )
      .get(contactNumber, lastMessageTimestamp);

    if (cachedInfo) {
      console.log(
        "✅ [LEAD-EXTRACT] Cache válido encontrado (sem novas mensagens)"
      );

      // Reconstruir keyPoints do cache
      const cachedKeyPoints = [];
      if (cachedInfo.mainNeed) cachedKeyPoints.push(cachedInfo.mainNeed);
      const cachedObjections = JSON.parse(cachedInfo.objections || "[]");
      if (cachedObjections.length > 0) {
        cachedKeyPoints.push(`Objeções: ${cachedObjections.join(", ")}`);
      }
      const cachedNextSteps = JSON.parse(cachedInfo.nextSteps || "[]");
      if (cachedNextSteps.length > 0) {
        cachedKeyPoints.push(...cachedNextSteps);
      }
      if (cachedInfo.notes) cachedKeyPoints.push(cachedInfo.notes);

      return res.json({
        info: {
          // Campos novos
          products: JSON.parse(cachedInfo.products || "[]"),
          values: JSON.parse(cachedInfo.extractedValues || "[]"),
          totalValue: cachedInfo.totalValue || 0,
          interestLevel: cachedInfo.interestLevel,
          urgencyLevel: cachedInfo.urgencyLevel,
          stage: cachedInfo.stage,
          mainNeed: cachedInfo.mainNeed,
          budget: cachedInfo.budget,
          deadline: cachedInfo.deadline,
          objections: cachedObjections,
          isDecisionMaker: cachedInfo.isDecisionMaker === 1,
          checkingCompetitors: cachedInfo.checkingCompetitors === 1,
          nextSteps: cachedNextSteps,
          notes: cachedInfo.notes,
          sentiment: cachedInfo.sentiment,
          conversionProbability: cachedInfo.conversionProbability,

          // Campos antigos (compatibilidade)
          priority: cachedInfo.interestLevel || "médio",
          urgency:
            cachedInfo.urgencyLevel === "alta"
              ? "Alta"
              : cachedInfo.urgencyLevel === "média"
              ? "Média"
              : cachedInfo.urgencyLevel === "baixa"
              ? "Baixa"
              : "Média",
          keyPoints: cachedKeyPoints,
          sentimentScore: cachedInfo.conversionProbability || 0.5,
          intent: cachedInfo.stage || "não detectado",

          // Metadados
          provider: cachedInfo.provider,
          extractedAt: cachedInfo.extractedAt,
          messageCount: messages.length,
          lastUpdate: cachedInfo.extractedAt,
          cached: true,
        },
      });
    }

    console.log(
      "🔄 [LEAD-EXTRACT] Novas mensagens detectadas, gerando nova análise..."
    );

    // Tentar usar DeepSeek primeiro
    let leadInfo;
    let usedProvider = "local";

    try {
      console.log("🤖 [LEAD-EXTRACT] Tentando análise com DeepSeek...");
      leadInfo = await deepseekService.extractLeadInfo(messages, {
        contactName: contact.name || contactNumber,
      });
      usedProvider = "deepseek";
      console.log("✅ [LEAD-EXTRACT] Análise com DeepSeek concluída!");
    } catch (deepseekError) {
      console.warn(
        "⚠️ [LEAD-EXTRACT] DeepSeek falhou, usando extração local:",
        deepseekError.message
      );
      // Fallback: usar extração local
      const localInfo = extractLeadInfoFromMessages(messages);
      leadInfo = {
        products: localInfo.products || [],
        values: localInfo.values || [],
        totalValue: localInfo.totalValue || 0,
        interestLevel: localInfo.priority || "médio",
        urgencyLevel: localInfo.urgency?.toLowerCase() || "média",
        stage: localInfo.stage || "contato_inicial",
        mainNeed: localInfo.keyPoints?.join(". ") || "",
        budget: "não mencionado",
        deadline: "não mencionado",
        objections: [],
        isDecisionMaker: true,
        checkingCompetitors: false,
        nextSteps: [],
        notes: "",
        sentiment: localInfo.sentiment || "neutro",
        conversionProbability: 0.5,
        provider: "local",
      };
      usedProvider = "local";
    }

    // Salvar no cache
    try {
      db.db
        .prepare(
          `
        INSERT INTO lead_info_cache (
          contactNumber, lastMessageTimestamp, products, extractedValues, totalValue,
          interestLevel, urgencyLevel, stage, mainNeed, budget, deadline,
          objections, isDecisionMaker, checkingCompetitors, nextSteps,
          notes, sentiment, conversionProbability, provider, extractedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
        )
        .run(
          contactNumber,
          lastMessageTimestamp,
          JSON.stringify(leadInfo.products),
          JSON.stringify(leadInfo.values),
          leadInfo.totalValue,
          leadInfo.interestLevel,
          leadInfo.urgencyLevel,
          leadInfo.stage,
          leadInfo.mainNeed,
          leadInfo.budget,
          leadInfo.deadline,
          JSON.stringify(leadInfo.objections),
          leadInfo.isDecisionMaker ? 1 : 0,
          leadInfo.checkingCompetitors ? 1 : 0,
          JSON.stringify(leadInfo.nextSteps),
          leadInfo.notes,
          leadInfo.sentiment,
          leadInfo.conversionProbability,
          usedProvider,
          new Date().toISOString()
        );

      console.log("💾 [LEAD-EXTRACT] Informações salvas no cache");
    } catch (cacheError) {
      console.warn(
        "⚠️ [LEAD-EXTRACT] Erro ao salvar cache:",
        cacheError.message
      );
    }

    console.log(
      `✅ [LEAD-EXTRACT] Informações extraídas com sucesso (${usedProvider})`
    );

    // Criar keyPoints a partir dos dados do DeepSeek para compatibilidade com frontend
    const keyPoints = [];
    if (leadInfo.mainNeed) keyPoints.push(leadInfo.mainNeed);
    if (leadInfo.objections && leadInfo.objections.length > 0) {
      keyPoints.push(`Objeções: ${leadInfo.objections.join(", ")}`);
    }
    if (leadInfo.nextSteps && leadInfo.nextSteps.length > 0) {
      keyPoints.push(...leadInfo.nextSteps);
    }
    if (leadInfo.notes) keyPoints.push(leadInfo.notes);

    const responseData = {
      info: {
        // Campos novos (DeepSeek)
        products: leadInfo.products || [],
        values: leadInfo.values || [],
        totalValue: leadInfo.totalValue || 0,
        interestLevel: leadInfo.interestLevel || "médio",
        urgencyLevel: leadInfo.urgencyLevel || "média",
        stage: leadInfo.stage || "contato_inicial",
        mainNeed: leadInfo.mainNeed || "",
        budget: leadInfo.budget || "não mencionado",
        deadline: leadInfo.deadline || "não mencionado",
        objections: leadInfo.objections || [],
        isDecisionMaker: leadInfo.isDecisionMaker !== false,
        checkingCompetitors: leadInfo.checkingCompetitors || false,
        nextSteps: leadInfo.nextSteps || [],
        notes: leadInfo.notes || "",
        sentiment: leadInfo.sentiment || "neutro",
        conversionProbability: leadInfo.conversionProbability || 0.5,

        // Campos antigos (compatibilidade com frontend)
        priority: leadInfo.interestLevel || "médio", // alias
        urgency:
          leadInfo.urgencyLevel === "alta"
            ? "Alta"
            : leadInfo.urgencyLevel === "média"
            ? "Média"
            : leadInfo.urgencyLevel === "baixa"
            ? "Baixa"
            : "Média",
        keyPoints: keyPoints,
        sentimentScore: leadInfo.conversionProbability || 0.5,
        intent: leadInfo.stage || "não detectado",

        // Metadados
        messageCount: messages.length,
        provider: usedProvider,
        cached: false,
        extractedAt: leadInfo.extractedAt || new Date().toISOString(),
        lastUpdate: new Date().toISOString(),
      },
    };

    console.log(
      `📤 [LEAD-EXTRACT] Enviando resposta:`,
      JSON.stringify(responseData, null, 2)
    );
    res.json(responseData);
  } catch (error) {
    console.error("❌ [LEAD-EXTRACT] Erro (POST):", error);
    res.status(500).json({ error: error.message });
  }
});

// API: Limpar cache de Info Leads
app.post("/api/lead-info/clear-cache", async (req, res) => {
  try {
    const { contactNumber } = req.body;

    if (!contactNumber) {
      return res.status(400).json({ error: "contactNumber é obrigatório" });
    }

    console.log(`🗑️  [LEAD-CACHE] Limpando cache para: ${contactNumber}`);

    const result = db.db
      .prepare("DELETE FROM lead_info_cache WHERE contactNumber = ?")
      .run(contactNumber);

    console.log(
      `✅ [LEAD-CACHE] Cache limpo! Registros removidos: ${result.changes}`
    );

    res.json({
      success: true,
      deleted: result.changes,
      message: `Cache limpo para ${contactNumber}`,
    });
  } catch (error) {
    console.error("❌ [LEAD-CACHE] Erro ao limpar cache:", error);
    res.status(500).json({ error: error.message });
  }
});

// Nova API: Exportar tudo (Resumo + Info Lead + Análise)
app.post("/api/export-conversation", async (req, res) => {
  try {
    const { accountId, contactNumber, startDate, endDate } = req.body;

    console.log("📦 [EXPORT] Iniciando exportação completa:", {
      accountId,
      contactNumber,
      startDate,
      endDate,
    });

    if (!accountId || !contactNumber) {
      return res
        .status(400)
        .json({ error: "accountId e contactNumber são obrigatórios" });
    }

    // Buscar contato
    const contact = db.db
      .prepare("SELECT id, name FROM contacts WHERE number = ?")
      .get(contactNumber);

    if (!contact) {
      return res.status(404).json({ error: "Contato não encontrado" });
    }

    // Buscar mensagens
    let query = `
      SELECT m.id, m.content, m.direction, m.timestamp, m.type, m.mediaUrl, 
             m.audioTranscription, m.audioTranscribedAt, m.audioTranscriptionProvider,
             c.name as contactName
      FROM messages m
      LEFT JOIN contacts c ON c.id = CASE 
        WHEN m.direction = 'received' THEN m.contactSenderId 
        ELSE m.contactReceiverId 
      END
      WHERE (m.senderId = ? OR m.receiverId = ?)
    `;

    const params = [accountId, accountId];

    query += ` AND EXISTS (
      SELECT 1 FROM contacts c2 
      WHERE c2.number = ? 
      AND (c2.id = m.contactSenderId OR c2.id = m.contactReceiverId)
    )`;
    params.push(contactNumber);

    if (startDate) {
      query += " AND m.timestamp >= ?";
      params.push(startDate);
    }
    if (endDate) {
      query += " AND m.timestamp <= ?";
      params.push(endDate);
    }

    query += `
      AND (
        (m.content IS NOT NULL AND length(m.content) > 0)
        OR (m.type = 'audio' AND m.mediaUrl IS NOT NULL)
      )
      ORDER BY m.timestamp ASC
      LIMIT 200
    `;

    const messages = db.db.prepare(query).all(...params);
    console.log(`📦 [EXPORT] ${messages.length} mensagens encontradas`);

    if (messages.length === 0) {
      return res.json({
        summary: null,
        leadInfo: null,
        analysis: null,
        error: "Nenhuma mensagem encontrada no período",
      });
    }

    const lastMessageTimestamp = messages[messages.length - 1].timestamp;
    const result = {
      summary: null,
      leadInfo: null,
      analysis: null,
    };

    // 1. BUSCAR/GERAR RESUMO
    console.log("📦 [EXPORT] 1/3 - Verificando resumo...");
    let existingSummary = db.db
      .prepare(
        `SELECT * FROM conversation_summaries 
         WHERE accountId = ? AND contactNumber = ? AND lastMessageTimestamp = ?
         ORDER BY createdAt DESC LIMIT 1`
      )
      .get(accountId, contactNumber, lastMessageTimestamp);

    if (existingSummary) {
      console.log("✅ [EXPORT] Resumo encontrado em cache");
      result.summary = {
        summary: existingSummary.summary,
        sentiment: existingSummary.sentiment,
        sentimentScore: existingSummary.sentimentScore,
        sentimentReason: existingSummary.sentimentReason,
        keyTopics: existingSummary.keyTopics
          ? JSON.parse(existingSummary.keyTopics)
          : [],
        messageCount: messages.length,
        cached: true,
      };
    } else {
      console.log("🔄 [EXPORT] Gerando novo resumo...");
      try {
        // Inicializar IA se necessário
        if (!aiInitialized) {
          await initializeAI();
        }

        const context = {
          contactName: contact.name || contactNumber,
          period:
            startDate || endDate
              ? `${
                  startDate
                    ? new Date(startDate).toLocaleDateString("pt-BR")
                    : "início"
                } até ${
                  endDate
                    ? new Date(endDate).toLocaleDateString("pt-BR")
                    : "agora"
                }`
              : "Conversa completa",
        };

        let summaryResult;
        let usedProvider = "local";

        try {
          summaryResult = await deepseekService.generateConversationSummary(
            messages,
            context
          );
          usedProvider = "deepseek";
        } catch (deepseekError) {
          console.warn(
            "⚠️ [EXPORT] DeepSeek falhou, usando IA local:",
            deepseekError.message
          );
          const conversationText = messages
            .slice(0, 150)
            .map((msg) => {
              const speaker =
                msg.direction === "received" ? "Cliente" : "Empresa";
              let content = msg.content;
              if (msg.type === "audio" && msg.audioTranscription) {
                content = `[Áudio transcrito] ${msg.audioTranscription}`;
              } else if (msg.type === "audio") {
                content = "[Mensagem de áudio - transcrição não disponível]";
              }
              content = content.substring(0, 800);
              return `${speaker}: ${content}`;
            })
            .join("\n");

          const [summary, sentiment] = await Promise.all([
            aiService.summarizeConversation(conversationText),
            aiService.analyzeSentiment(conversationText),
          ]);

          const keyTopicsExtraction = await aiService.extractKeyTopics(
            conversationText
          );
          summaryResult = {
            summary,
            sentiment: sentiment.sentiment,
            sentimentScore: sentiment.score,
            sentimentReason: sentiment.reason || "",
            keyTopics: keyTopicsExtraction || [],
            provider: "local",
          };
        }

        // Salvar resumo no banco
        db.db
          .prepare(
            `INSERT INTO conversation_summaries 
             (accountId, contactNumber, summary, sentiment, sentimentScore, 
              sentimentReason, keyTopics, messageCount, lastMessageTimestamp, provider)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            accountId,
            contactNumber,
            summaryResult.summary,
            summaryResult.sentiment,
            summaryResult.sentimentScore,
            summaryResult.sentimentReason,
            JSON.stringify(summaryResult.keyTopics),
            messages.length,
            lastMessageTimestamp,
            usedProvider
          );

        result.summary = {
          summary: summaryResult.summary,
          sentiment: summaryResult.sentiment,
          sentimentScore: summaryResult.sentimentScore,
          sentimentReason: summaryResult.sentimentReason,
          keyTopics: summaryResult.keyTopics,
          messageCount: messages.length,
          cached: false,
        };

        console.log("✅ [EXPORT] Resumo gerado com sucesso");
      } catch (summaryError) {
        console.error("❌ [EXPORT] Erro ao gerar resumo:", summaryError);
        result.summary = { error: summaryError.message };
      }
    }

    // 2. BUSCAR/GERAR INFO LEAD
    console.log("📦 [EXPORT] 2/3 - Verificando info lead...");
    let cachedLeadInfo = db.db
      .prepare(
        `SELECT * FROM lead_info_cache 
         WHERE contactNumber = ? AND lastMessageTimestamp = ?
         ORDER BY createdAt DESC LIMIT 1`
      )
      .get(contactNumber, lastMessageTimestamp);

    if (cachedLeadInfo) {
      console.log("✅ [EXPORT] Info lead encontrada em cache");
      result.leadInfo = {
        products: JSON.parse(cachedLeadInfo.products || "[]"),
        values: JSON.parse(cachedLeadInfo.extractedValues || "[]"),
        totalValue: cachedLeadInfo.totalValue,
        interestLevel: cachedLeadInfo.interestLevel,
        urgencyLevel: cachedLeadInfo.urgencyLevel,
        stage: cachedLeadInfo.stage,
        mainNeed: cachedLeadInfo.mainNeed,
        budget: cachedLeadInfo.budget,
        deadline: cachedLeadInfo.deadline,
        objections: JSON.parse(cachedLeadInfo.objections || "[]"),
        isDecisionMaker: cachedLeadInfo.isDecisionMaker === 1,
        checkingCompetitors: cachedLeadInfo.checkingCompetitors === 1,
        nextSteps: JSON.parse(cachedLeadInfo.nextSteps || "[]"),
        notes: cachedLeadInfo.notes,
        sentiment: cachedLeadInfo.sentiment,
        conversionProbability: cachedLeadInfo.conversionProbability,
        cached: true,
      };
    } else {
      console.log("🔄 [EXPORT] Gerando nova info lead...");
      try {
        let leadInfo;
        let usedProvider = "local";

        try {
          leadInfo = await deepseekService.extractLeadInfo(messages, {
            contactName: contact.name || contactNumber,
          });
          usedProvider = "deepseek";
        } catch (deepseekError) {
          console.warn(
            "⚠️ [EXPORT] DeepSeek falhou para lead info, usando extração local"
          );
          const localInfo = extractLeadInfoFromMessages(messages);
          leadInfo = {
            products: localInfo.products || [],
            values: localInfo.values || [],
            totalValue: localInfo.totalValue || 0,
            interestLevel: localInfo.priority || "médio",
            urgencyLevel: localInfo.urgency?.toLowerCase() || "média",
            stage: localInfo.stage || "contato_inicial",
            mainNeed: localInfo.keyPoints?.join(". ") || "",
            budget: "não mencionado",
            deadline: "não mencionado",
            objections: [],
            isDecisionMaker: true,
            checkingCompetitors: false,
            nextSteps: [],
            notes: "",
            sentiment: localInfo.sentiment || "neutro",
            conversionProbability: 0.5,
          };
        }

        // Salvar no cache
        db.db
          .prepare(
            `INSERT INTO lead_info_cache (
              contactNumber, lastMessageTimestamp, products, extractedValues, totalValue,
              interestLevel, urgencyLevel, stage, mainNeed, budget, deadline,
              objections, isDecisionMaker, checkingCompetitors, nextSteps,
              notes, sentiment, conversionProbability, provider, extractedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            contactNumber,
            lastMessageTimestamp,
            JSON.stringify(leadInfo.products),
            JSON.stringify(leadInfo.values),
            leadInfo.totalValue,
            leadInfo.interestLevel,
            leadInfo.urgencyLevel,
            leadInfo.stage,
            leadInfo.mainNeed,
            leadInfo.budget,
            leadInfo.deadline,
            JSON.stringify(leadInfo.objections),
            leadInfo.isDecisionMaker ? 1 : 0,
            leadInfo.checkingCompetitors ? 1 : 0,
            JSON.stringify(leadInfo.nextSteps),
            leadInfo.notes,
            leadInfo.sentiment,
            leadInfo.conversionProbability,
            usedProvider,
            new Date().toISOString()
          );

        result.leadInfo = { ...leadInfo, cached: false };
        console.log("✅ [EXPORT] Info lead gerada com sucesso");
      } catch (leadError) {
        console.error("❌ [EXPORT] Erro ao gerar info lead:", leadError);
        result.leadInfo = { error: leadError.message };
      }
    }

    // 3. GERAR ANÁLISE (KPIs - sempre calculado em tempo real)
    console.log("📦 [EXPORT] 3/3 - Calculando análise/KPIs...");
    try {
      const totalMessages = messages.length;
      const receivedMessages = messages.filter(
        (m) => m.direction === "received"
      ).length;
      const sentMessages = totalMessages - receivedMessages;

      const responseTime = [];
      for (let i = 1; i < messages.length; i++) {
        if (
          messages[i - 1].direction === "received" &&
          messages[i].direction === "sent"
        ) {
          const diff =
            new Date(messages[i].timestamp).getTime() -
            new Date(messages[i - 1].timestamp).getTime();
          responseTime.push(diff);
        }
      }

      const avgResponseTime =
        responseTime.length > 0
          ? responseTime.reduce((a, b) => a + b, 0) / responseTime.length
          : 0;

      const firstMessage = messages[0];
      const lastMessage = messages[messages.length - 1];
      const conversationDuration =
        new Date(lastMessage.timestamp).getTime() -
        new Date(firstMessage.timestamp).getTime();

      result.analysis = {
        totalMessages,
        receivedMessages,
        sentMessages,
        avgResponseTime: Math.round(avgResponseTime / 1000 / 60), // minutos
        conversationDuration: Math.round(conversationDuration / 1000 / 60 / 60), // horas
        engagementRate:
          totalMessages > 0
            ? ((receivedMessages / totalMessages) * 100).toFixed(1)
            : 0,
        firstMessageDate: firstMessage.timestamp,
        lastMessageDate: lastMessage.timestamp,
      };

      console.log("✅ [EXPORT] Análise calculada com sucesso");
    } catch (analysisError) {
      console.error("❌ [EXPORT] Erro ao calcular análise:", analysisError);
      result.analysis = { error: analysisError.message };
    }

    console.log("✅ [EXPORT] Exportação completa finalizada!");
    res.json(result);
  } catch (error) {
    console.error("❌ [EXPORT] Erro geral:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// EXPORTAÇÃO EM MASSA
// ============================================
app.post("/api/export-bulk", async (req, res) => {
  try {
    const { accountId, startDate, endDate } = req.body;

    console.log("📦 [BULK-EXPORT] Iniciando exportação em massa:", {
      accountId,
      startDate,
      endDate,
    });

    if (!accountId) {
      return res.status(400).json({ error: "accountId é obrigatório" });
    }

    // Buscar todas as conversas no período
    let query = `
      SELECT DISTINCT c.id, c.number, c.name, MAX(m.timestamp) as lastMessageTime
      FROM contacts c
      INNER JOIN messages m ON (m.contactSenderId = c.id OR m.contactReceiverId = c.id)
      WHERE (m.senderId = ? OR m.receiverId = ?)
    `;
    const params = [accountId, accountId];

    if (startDate && endDate) {
      query += ` AND m.timestamp BETWEEN ? AND ?`;
      params.push(startDate, endDate);
    }

    query += ` GROUP BY c.id ORDER BY lastMessageTime DESC`;

    const conversations = db.db.prepare(query).all(...params);

    console.log(
      `📦 [BULK-EXPORT] Encontradas ${conversations.length} conversas`
    );

    if (conversations.length === 0) {
      return res.json({ conversations: [] });
    }

    // Processar cada conversa
    const results = [];

    for (const conversation of conversations) {
      console.log(`📦 [BULK-EXPORT] Processando: ${conversation.number}`);

      try {
        // Buscar mensagens da conversa
        const messages = db.db
          .prepare(
            `SELECT * FROM messages 
             WHERE (senderId = ? OR receiverId = ?)
             AND (contactSenderId = ? OR contactReceiverId = ?)
             ${startDate && endDate ? "AND timestamp BETWEEN ? AND ?" : ""}
             ORDER BY timestamp ASC`
          )
          .all(
            accountId,
            accountId,
            conversation.id,
            conversation.id,
            ...(startDate && endDate ? [startDate, endDate] : [])
          );

        if (messages.length === 0) {
          console.log(
            `⚠️ [BULK-EXPORT] Sem mensagens para ${conversation.number}`
          );
          continue;
        }

        const lastMessageTimestamp = messages[messages.length - 1].timestamp;

        // 1. BUSCAR/GERAR RESUMO
        let summary = null;
        const existingSummary = db.db
          .prepare(
            `SELECT * FROM conversation_summaries 
             WHERE accountId = ? AND contactNumber = ? AND lastMessageTimestamp = ?
             ORDER BY createdAt DESC LIMIT 1`
          )
          .get(accountId, conversation.number, lastMessageTimestamp);

        if (existingSummary) {
          summary = {
            summary: existingSummary.summary,
            sentiment: existingSummary.sentiment,
            sentimentScore: existingSummary.sentimentScore,
            sentimentReason: existingSummary.sentimentReason,
            keyTopics: JSON.parse(existingSummary.keyTopics || "[]"),
            messageCount: existingSummary.messageCount,
            cached: true,
          };
        } else {
          // Gerar resumo
          const conversationText = messages
            .map(
              (m) =>
                `${m.direction === "sent" ? "Você" : "Cliente"}: ${m.content}`
            )
            .join("\n");

          const summaryResult = await generateConversationSummary(
            conversationText
          );

          if (summaryResult) {
            // Salvar no cache
            db.db
              .prepare(
                `INSERT INTO conversation_summaries 
                (accountId, contactNumber, summary, sentiment, sentimentScore, 
                 sentimentReason, keyTopics, messageCount, lastMessageTimestamp, provider)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
              )
              .run(
                accountId,
                conversation.number,
                summaryResult.summary,
                summaryResult.sentiment,
                summaryResult.sentimentScore,
                summaryResult.sentimentReason,
                JSON.stringify(summaryResult.keyTopics),
                messages.length,
                lastMessageTimestamp,
                "deepseek"
              );

            summary = {
              summary: summaryResult.summary,
              sentiment: summaryResult.sentiment,
              sentimentScore: summaryResult.sentimentScore,
              sentimentReason: summaryResult.sentimentReason,
              keyTopics: summaryResult.keyTopics,
              messageCount: messages.length,
              cached: false,
            };
          }
        }

        // 2. BUSCAR/GERAR INFO LEAD
        let leadInfo = null;
        const cachedLeadInfo = db.db
          .prepare(
            `SELECT * FROM lead_info_cache 
             WHERE contactNumber = ? AND lastMessageTimestamp = ?
             ORDER BY createdAt DESC LIMIT 1`
          )
          .get(conversation.number, lastMessageTimestamp);

        if (cachedLeadInfo) {
          leadInfo = {
            products: JSON.parse(cachedLeadInfo.products || "[]"),
            values: JSON.parse(cachedLeadInfo.extractedValues || "[]"),
            totalValue: cachedLeadInfo.totalValue,
            interestLevel: cachedLeadInfo.interestLevel,
            urgencyLevel: cachedLeadInfo.urgencyLevel,
            stage: cachedLeadInfo.stage,
            mainNeed: cachedLeadInfo.mainNeed,
            budget: cachedLeadInfo.budget,
            deadline: cachedLeadInfo.deadline,
            objections: JSON.parse(cachedLeadInfo.objections || "[]"),
            isDecisionMaker: cachedLeadInfo.isDecisionMaker === 1,
            checkingCompetitors: cachedLeadInfo.checkingCompetitors === 1,
            nextSteps: JSON.parse(cachedLeadInfo.nextSteps || "[]"),
            notes: cachedLeadInfo.notes,
            sentiment: cachedLeadInfo.sentiment,
            conversionProbability: cachedLeadInfo.conversionProbability,
            cached: true,
          };
        } else {
          // Gerar info lead
          const leadInfoResult = await extractLeadInfoFromMessages(messages);

          if (leadInfoResult) {
            try {
              // Salvar no cache
              db.db
                .prepare(
                  `INSERT INTO lead_info_cache (
                    contactNumber, lastMessageTimestamp, products, extractedValues, totalValue,
                    interestLevel, urgencyLevel, stage, mainNeed, budget, deadline,
                    objections, isDecisionMaker, checkingCompetitors, nextSteps,
                    notes, sentiment, conversionProbability, provider, extractedAt
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
                )
                .run(
                  conversation.number,
                  lastMessageTimestamp,
                  JSON.stringify(leadInfoResult.products || []),
                  JSON.stringify(leadInfoResult.values || []),
                  leadInfoResult.totalValue || 0,
                  leadInfoResult.interestLevel || "baixo",
                  leadInfoResult.urgencyLevel || "baixa",
                  leadInfoResult.stage || "contato_inicial",
                  leadInfoResult.mainNeed || "",
                  leadInfoResult.budget || "",
                  leadInfoResult.deadline || "",
                  JSON.stringify(leadInfoResult.objections || []),
                  leadInfoResult.isDecisionMaker ? 1 : 0,
                  leadInfoResult.checkingCompetitors ? 1 : 0,
                  JSON.stringify(leadInfoResult.nextSteps || []),
                  leadInfoResult.notes || "",
                  leadInfoResult.sentiment || "neutro",
                  leadInfoResult.conversionProbability || 0,
                  "deepseek",
                  new Date().toISOString()
                );
            } catch (cacheError) {
              console.warn(
                `⚠️ [BULK-EXPORT] Erro ao salvar cache de lead info para ${conversation.number}:`,
                cacheError.message
              );
            }

            leadInfo = { ...leadInfoResult, cached: false };
          }
        }

        // 3. CALCULAR ANÁLISE
        const totalMessages = messages.length;
        const receivedMessages = messages.filter(
          (m) => m.direction === "received"
        ).length;
        const sentMessages = totalMessages - receivedMessages;

        const responseTime = [];
        for (let i = 1; i < messages.length; i++) {
          if (
            messages[i - 1].direction === "received" &&
            messages[i].direction === "sent"
          ) {
            const diff =
              new Date(messages[i].timestamp).getTime() -
              new Date(messages[i - 1].timestamp).getTime();
            responseTime.push(diff);
          }
        }

        const avgResponseTime =
          responseTime.length > 0
            ? responseTime.reduce((a, b) => a + b, 0) / responseTime.length
            : 0;

        const firstMessage = messages[0];
        const lastMessage = messages[messages.length - 1];
        const conversationDuration =
          new Date(lastMessage.timestamp).getTime() -
          new Date(firstMessage.timestamp).getTime();

        const analysis = {
          totalMessages,
          receivedMessages,
          sentMessages,
          avgResponseTime: Math.round(avgResponseTime / 1000 / 60),
          conversationDuration: Math.round(
            conversationDuration / 1000 / 60 / 60
          ),
          engagementRate:
            totalMessages > 0
              ? ((receivedMessages / totalMessages) * 100).toFixed(1)
              : 0,
          firstMessageDate: firstMessage.timestamp,
          lastMessageDate: lastMessage.timestamp,
        };

        // Garantir valores padrão para leadInfo
        const safeLeadInfo = leadInfo || {
          products: [],
          values: [],
          totalValue: 0,
          interestLevel: "baixo",
          urgencyLevel: "baixa",
          stage: "contato_inicial",
          mainNeed: "",
          budget: "",
          deadline: "",
          objections: [],
          isDecisionMaker: false,
          checkingCompetitors: false,
          nextSteps: [],
          notes: "",
          sentiment: "neutro",
          conversionProbability: 0,
        };

        results.push({
          contactName: conversation.name || conversation.number,
          contactNumber: conversation.number,
          summary: summary || {
            summary: "Conversa sem resumo disponível",
            sentiment: "neutro",
            sentimentScore: 0,
            sentimentReason: "",
            keyTopics: [],
            messageCount: messages.length,
          },
          leadInfo: safeLeadInfo,
          analysis,
        });

        console.log(`✅ [BULK-EXPORT] Processado: ${conversation.number}`);
      } catch (convError) {
        console.error(
          `❌ [BULK-EXPORT] Erro ao processar ${conversation.number}:`,
          convError
        );
      }
    }

    console.log(
      `✅ [BULK-EXPORT] Exportação em massa concluída: ${results.length} conversas`
    );
    res.json({ conversations: results });
  } catch (error) {
    console.error("❌ [BULK-EXPORT] Erro geral:", error);
    res.status(500).json({ error: error.message });
  }
});

// Função auxiliar: Detectar estágio da conversa
function detectStage(messages) {
  const allContent = messages
    .map((m) => m.content?.toLowerCase() || "")
    .join(" ");

  // Palavras-chave por estágio
  const stageKeywords = {
    closed_won: [
      "fechado",
      "comprado",
      "confirmado",
      "contratado",
      "pedido feito",
    ],
    closed_lost: [
      "não tenho interesse",
      "desisti",
      "cancelar",
      "não quero mais",
      "muito caro",
    ],
    negotiation: [
      "negociar",
      "desconto",
      "proposta",
      "orçamento",
      "quanto fica",
      "valor final",
    ],
    proposal_sent: ["enviei proposta", "segue proposta", "proposta anexa"],
    interested: [
      "interessado",
      "gostaria",
      "quero saber mais",
      "me interessou",
      "tenho interesse",
    ],
  };

  // Verificar cada estágio (do mais avançado para o menos)
  for (const [stage, keywords] of Object.entries(stageKeywords)) {
    if (keywords.some((kw) => allContent.includes(kw))) {
      return stage;
    }
  }

  return "initial_contact";
}

// ============================================
// OUTROS ENDPOINTS
// ============================================

// Logs
app.get("/api/logs", async (req, res) => {
  try {
    const logsPath = path.join(DATA_PATH, "data/logs/app.log");

    if (fs.existsSync(logsPath)) {
      const logs = fs.readFileSync(logsPath, "utf-8");
      res.json({ logs });
    } else {
      res.json({ logs: "" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/logs", async (req, res) => {
  try {
    const logsPath = path.join(DATA_PATH, "data/logs/app.log");

    if (fs.existsSync(logsPath)) {
      fs.writeFileSync(logsPath, "");
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Limpar contatos duplicados (utilitário)
app.post("/api/contacts/cleanup", async (req, res) => {
  try {
    const allContacts = await contacts.findMany({});
    const contactMap = new Map();
    const toDelete = [];

    // Agrupar contatos por número normalizado
    for (const contact of allContacts) {
      const normalized = normalizePhoneNumber(contact.number);

      if (contactMap.has(normalized)) {
        // Duplicado encontrado
        toDelete.push(contact.id);
      } else {
        contactMap.set(normalized, contact);
      }
    }

    // Deletar duplicados
    if (toDelete.length > 0) {
      for (const id of toDelete) {
        await contacts.delete({ where: { id } });
      }
    }

    // Atualizar números dos contatos restantes para normalizados
    for (const [normalized, contact] of contactMap) {
      if (contact.number !== normalized) {
        await contacts.update({
          where: { id: contact.id },
          data: { number: normalized },
        });
      }
    }

    res.json({
      success: true,
      duplicatesRemoved: toDelete.length,
      contactsNormalized: contactMap.size,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// INICIALIZAÇÃO
// ============================================

/**
 * Escreve log de erro de startup em arquivo para diagnóstico
 */
function writeStartupErrorLog(error) {
  try {
    const timestamp = Date.now();
    const errorLogPath = path.join(
      DATA_PATH,
      "data/logs",
      `startup-error-${timestamp}.log`
    );
    const errorContent = `
=== STARTUP ERROR LOG ===
Timestamp: ${new Date().toISOString()}
Error: ${error.message}
Stack: ${error.stack}
DATA_PATH: ${DATA_PATH}
PORT: ${PORT}
========================
`;

    // Garantir que o diretório existe
    const logsDir = path.join(DATA_PATH, "data/logs");
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    fs.writeFileSync(errorLogPath, errorContent);
    console.log("[SERVER] Error log written to:", errorLogPath);
  } catch (logError) {
    console.error("[SERVER] Failed to write error log:", logError);
  }
}

// Função de cleanup ao encerrar o servidor
export function cleanupServer() {
  console.log("🧹 [SERVER] Iniciando cleanup...");

  // Fechar logStream
  if (logStream && logStream.writable) {
    try {
      logStream.end();
      console.log("✓ Log stream fechado");
    } catch (err) {
      console.error("❌ Erro ao fechar log stream:", err);
    }
  }

  // Desconectar todas as contas WhatsApp
  for (const [accountId, sock] of whatsappConnections) {
    try {
      sock.end();
      console.log(`✓ WhatsApp desconectado: ${accountId}`);
    } catch (err) {
      console.error(`❌ Erro ao desconectar ${accountId}:`, err);
    }
  }

  whatsappConnections.clear();
  console.log("✓ Cleanup concluído");
}

/**
 * Serviço de transcrição automática em background
 * Processa áudios não transcritos respeitando limites do Groq (144 req/min)
 */
let autoTranscriptionRunning = false;

async function processUntranscribedAudios() {
  if (!transcriptionService.available) {
    console.log("⚠️ [AUTO-TRANSCRIBE] Serviço de transcrição não disponível");
    return;
  }

  if (autoTranscriptionRunning) {
    console.log(
      "⏳ [AUTO-TRANSCRIBE] Processamento já em andamento, aguardando..."
    );
    return;
  }

  try {
    autoTranscriptionRunning = true;

    // Buscar até 10 áudios por vez (seguro para rate limit)
    const untranscribedAudios = db.db
      .prepare(
        `
      SELECT id, mediaUrl, timestamp
      FROM messages
      WHERE type = 'audio' 
        AND mediaUrl IS NOT NULL
        AND (audioTranscription IS NULL OR audioTranscription = '')
      ORDER BY timestamp DESC
      LIMIT 10
    `
      )
      .all();

    if (untranscribedAudios.length === 0) {
      console.log("✅ [AUTO-TRANSCRIBE] Nenhum áudio pendente para processar");
      return;
    }

    console.log("\n📋 ═══════════════════════════════════════════════════════");
    console.log(`📋 PROCESSANDO ${untranscribedAudios.length} ÁUDIOS`);
    console.log("📋 ═══════════════════════════════════════════════════════");

    // Emitir início do processamento
    io.emit("transcription-progress", {
      status: "started",
      total: untranscribedAudios.length,
      message: `Iniciando processamento de ${untranscribedAudios.length} áudios...`,
    });

    let transcribed = 0;
    let errors = 0;
    let skipped = 0;
    const startTime = Date.now();

    for (let i = 0; i < untranscribedAudios.length; i++) {
      const audio = untranscribedAudios[i];
      const progress = `[${i + 1}/${untranscribedAudios.length}]`;
      try {
        const mediaPath = audio.mediaUrl.startsWith("/")
          ? audio.mediaUrl.substring(1)
          : audio.mediaUrl;
        const audioPath = path.join(DATA_PATH, "data", mediaPath);

        if (!fs.existsSync(audioPath)) {
          console.warn(
            `⚠️  ${progress} Arquivo não encontrado: ${audio.id.substring(
              0,
              8
            )} - IGNORADO`
          );
          skipped++;
          continue;
        }

        console.log(
          `🎤 ${progress} Transcrevendo ${audio.id.substring(0, 8)}...`
        );

        const transcription = await transcriptionService.transcribeAudio(
          audioPath,
          "pt"
        );

        // Salvar no banco
        db.db
          .prepare(
            `UPDATE messages 
             SET audioTranscription = ?,
                 audioTranscribedAt = datetime('now'),
                 audioTranscriptionProvider = ?
             WHERE id = ?`
          )
          .run(transcription.text, transcription.provider, audio.id);

        transcribed++;

        // Emitir via Socket.io
        io.emit("audio-transcribed", {
          messageId: audio.id,
          transcription: transcription.text,
          provider: transcription.provider,
        });

        const preview =
          transcription.text.length > 50
            ? transcription.text.substring(0, 50) + "..."
            : transcription.text;

        console.log(`✅ ${progress} Sucesso! "${preview}"`);

        // Emitir progresso
        io.emit("transcription-progress", {
          status: "processing",
          current: i + 1,
          total: untranscribedAudios.length,
          transcribed,
          errors,
          skipped,
          preview,
        });

        // Delay de 500ms entre requisições (120/min = seguro para limite de 144/min)
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.error(
          `❌ ${progress} Erro em ${audio.id.substring(0, 8)}: ${error.message}`
        );
        errors++;
      }
    }

    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);
    const totalPending = db.db
      .prepare(
        `SELECT COUNT(*) as count FROM messages WHERE type = 'audio' AND mediaUrl IS NOT NULL AND (audioTranscription IS NULL OR audioTranscription = '')`
      )
      .get().count;

    console.log("\n📊 ═══════════════════════════════════════════════════════");
    console.log("📊 RESULTADO DO PROCESSAMENTO");
    console.log("📊 ═══════════════════════════════════════════════════════");
    console.log(`✅ Transcritos com sucesso:     ${transcribed}`);
    console.log(`❌ Erros:                        ${errors}`);
    console.log(`⚠️  Ignorados (arquivo ausente): ${skipped}`);
    console.log(`⏱️  Tempo total:                 ${elapsedTime}s`);
    console.log(`⏳ Áudios ainda pendentes:       ${totalPending}`);
    console.log("📊 ═══════════════════════════════════════════════════════\n");

    // Emitir resultado final
    io.emit("transcription-progress", {
      status: "completed",
      transcribed,
      errors,
      skipped,
      elapsedTime: parseFloat(elapsedTime),
      totalPending,
    });

    if (totalPending > 0) {
      const cyclesNeeded = Math.ceil(totalPending / 10);
      const minutesNeeded = cyclesNeeded * 5;
      console.log(`📅 Próxima verificação em 5 minutos`);
      console.log(
        `⏱️  Tempo estimado restante: ~${minutesNeeded} minutos (${cyclesNeeded} ciclos)\n`
      );
    } else {
      console.log(`🎉 Todos os áudios foram transcritos!\n`);
    }
  } catch (error) {
    console.error(`❌ [AUTO-TRANSCRIBE] Erro geral:`, error.message);
  } finally {
    autoTranscriptionRunning = false;
  }
}

async function showTranscriptionStats() {
  try {
    // Estatísticas detalhadas
    const totalAudios = db.db
      .prepare(
        `SELECT COUNT(*) as count FROM messages WHERE type = 'audio' AND mediaUrl IS NOT NULL`
      )
      .get().count;

    const transcribedAudios = db.db
      .prepare(
        `SELECT COUNT(*) as count FROM messages WHERE type = 'audio' AND mediaUrl IS NOT NULL AND audioTranscription IS NOT NULL AND audioTranscription != ''`
      )
      .get().count;

    const pendingAudios = totalAudios - transcribedAudios;
    const percentComplete =
      totalAudios > 0
        ? ((transcribedAudios / totalAudios) * 100).toFixed(1)
        : 0;

    // Calcular tempo estimado (10 áudios a cada 5 min)
    const cyclesNeeded = Math.ceil(pendingAudios / 10);
    const minutesNeeded = cyclesNeeded * 5;
    const hoursNeeded = (minutesNeeded / 60).toFixed(1);

    console.log(
      "\n🎤 ════════════════════════════════════════════════════════"
    );
    console.log("🎤 ESTATÍSTICAS DE TRANSCRIÇÃO DE ÁUDIOS");
    console.log("🎤 ════════════════════════════════════════════════════════");
    console.log(`🎤 Total de áudios no banco:        ${totalAudios}`);
    console.log(`✅ Áudios já transcritos:           ${transcribedAudios}`);
    console.log(`⏳ Áudios pendentes:                ${pendingAudios}`);
    console.log(`📊 Progresso:                       ${percentComplete}%`);

    if (pendingAudios > 0) {
      console.log(
        `⏱️  Tempo estimado para conclusão:  ~${hoursNeeded}h (${minutesNeeded} min)`
      );
      console.log(
        `🔄 Ciclos necessários:              ${cyclesNeeded} (10 áudios/ciclo)`
      );
    } else {
      console.log(`🎉 Todos os áudios já foram transcritos!`);
    }

    console.log(
      "🎤 ════════════════════════════════════════════════════════\n"
    );

    // Emitir estatísticas via Socket.io para o frontend
    io.emit("transcription-stats", {
      totalAudios,
      transcribedAudios,
      pendingAudios,
      percentComplete: parseFloat(percentComplete),
      hoursNeeded: pendingAudios > 0 ? parseFloat(hoursNeeded) : 0,
      minutesNeeded,
      cyclesNeeded,
    });

    return { totalAudios, transcribedAudios, pendingAudios };
  } catch (error) {
    console.error("❌ [AUTO-TRANSCRIBE] Erro ao buscar estatísticas:", error);
    return { totalAudios: 0, transcribedAudios: 0, pendingAudios: 0 };
  }
}

function startAutoTranscriptionService() {
  if (!transcriptionService.available) {
    console.log("\n⚠️ ═══════════════════════════════════════════════════════");
    console.log("⚠️ SERVIÇO DE TRANSCRIÇÃO DESABILITADO");
    console.log("⚠️ ═══════════════════════════════════════════════════════");
    console.log("⚠️ GROQ_API_KEY não configurada");
    console.log("⚠️ Configure a chave para ativar a transcrição automática");
    console.log("⚠️ ═══════════════════════════════════════════════════════\n");
    return;
  }

  console.log("\n🎤 ════════════════════════════════════════════════════════");
  console.log("🎤 SERVIÇO DE TRANSCRIÇÃO AUTOMÁTICA INICIADO");
  console.log("🎤 ════════════════════════════════════════════════════════");
  console.log("🎤 Provider:                Groq (Whisper Large v3 Turbo)");
  console.log("🎤 Verificação:             A cada 5 minutos");
  console.log("🎤 Limite por ciclo:        10 áudios");
  console.log("🎤 Rate limit:              120 req/min (limite: 144/min)");
  console.log("🎤 Delay entre áudios:      500ms");
  console.log("🎤 ════════════════════════════════════════════════════════\n");

  // Mostrar estatísticas e processar imediatamente
  setTimeout(async () => {
    console.log("🎤 [AUTO-TRANSCRIBE] Iniciando primeira verificação...\n");
    const stats = await showTranscriptionStats();

    if (stats.pendingAudios > 0) {
      console.log("🎤 [AUTO-TRANSCRIBE] Iniciando processamento...\n");
      await processUntranscribedAudios();
    } else {
      console.log(
        "✅ [AUTO-TRANSCRIBE] Nenhum áudio pendente para transcrever\n"
      );
    }
  }, 5000); // Aguardar 5s para o servidor estar completamente pronto

  // Verificação periódica a cada 5 minutos
  setInterval(async () => {
    console.log("\n🔄 [AUTO-TRANSCRIBE] Verificação periódica iniciada...");
    const stats = await showTranscriptionStats();

    if (stats.pendingAudios > 0) {
      await processUntranscribedAudios();
    }
  }, 5 * 60 * 1000); // 5 minutos
}

export async function startServer() {
  try {
    ensureDirectories();

    console.log("✓ Database connected");
    console.log("✓ Socket.io initialized");

    // Tentativa resiliente de bind: se a porta configurada estiver em uso,
    // tentar portas subsequentes (até um limite) antes de falhar.
    async function tryListen(startPort, maxAttempts = 10) {
      for (let i = 0; i < maxAttempts; i++) {
        const portToTry = startPort + i;
        try {
          await new Promise((resolve, reject) => {
            const onError = (err) => {
              server.removeListener("listening", onListening);
              reject(err);
            };

            const onListening = () => {
              server.removeListener("error", onError);
              resolve();
            };

            server.once("error", onError);
            server.once("listening", onListening);
            server.listen(portToTry);
          });

          console.log(`Servidor rodando em http://localhost:${portToTry}`);
          return portToTry;
        } catch (err) {
          if (err && err.code === "EADDRINUSE") {
            console.warn(
              `[SERVER] Porta ${portToTry} em uso. Tentando próxima porta...`
            );
            // continuar loop para tentar próxima porta
            continue;
          }
          // erro diferente, rethrow
          throw err;
        }
      }
      throw new Error(
        `Não foi possível escutar em nenhuma porta a partir de ${startPort}`
      );
    }

    const actualPort = await tryListen(PORT, 20);

    // Iniciar serviço de transcrição automática em background
    startAutoTranscriptionService();

    // Reconectar contas
    const accountsList = await accounts.findMany();

    // Filtrar apenas connected e qr_required
    const accountsToReconnect = accountsList.filter(
      (acc) => acc.status === "connected" || acc.status === "qr_required"
    );

    console.log(
      `📱 [WHATSAPP] Encontradas ${accountsToReconnect.length} contas para reconectar`
    );

    for (const account of accountsToReconnect) {
      console.log(
        `Reconnecting: ${account.number} (status: ${account.status})`
      );
      try {
        await connectWhatsApp(account.id, account.number);
      } catch (e) {
        console.error("Reconnect failed for", account.number, e);
      }
    }

    return server;
  } catch (error) {
    console.error("✗ Failed to start server:", error);
    writeStartupErrorLog(error);
    throw error;
  }
}

// Iniciar servidor se executado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer().catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
  });
}
