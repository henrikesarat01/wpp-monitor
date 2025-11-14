/**
 * WPP Monitor - Servidor Completo
 *
 * Servidor Express + Socket.io + WhatsApp (Baileys) + SQLite
 * Tudo em JavaScript puro
 */

import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
// Database simples com Better-SQLite3
import db from "./database.js";
const { accounts, contacts, messages } = db;
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  downloadMediaMessage,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import pino from "pino";
import path from "path";
import fs from "fs";
import { promises as fsPromises } from "fs";
import QRCode from "qrcode";
import { fileURLToPath } from "url";
import { dirname } from "path";

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

// Porta configurável via variável de ambiente
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

// Caminho de dados - em produção usa userData do Electron, em dev usa cwd
const DATA_PATH = process.env.DATA_PATH || process.cwd();

// Pasta para mídia
const MEDIA_PATH = path.join(DATA_PATH, "data", "media");
if (!fs.existsSync(MEDIA_PATH)) {
  fs.mkdirSync(MEDIA_PATH, { recursive: true });
}

console.log("[SERVER] DATA_PATH:", DATA_PATH);
console.log("[SERVER] PORT:", PORT);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(cors());
app.use(express.json());

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
      console.log(`📞 [CONTACT UPDATE] Contato @lid ${lid} não encontrado`);
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
        await db.db
          .prepare(
            `
          UPDATE messages 
          SET contactSenderId = ? 
          WHERE contactSenderId = ?
        `
          )
          .run(realContact.id, lidContact.id);
        console.log(`✅ [CONTACT UPDATE] Mensagens de envio atualizadas`);
      } catch (e) {
        console.error(`❌ [CONTACT UPDATE] Erro ao atualizar sender:`, e);
      }

      // Atualizar mensagens onde o @lid é o receiver
      try {
        await db.db
          .prepare(
            `
          UPDATE messages 
          SET contactReceiverId = ? 
          WHERE contactReceiverId = ?
        `
          )
          .run(realContact.id, lidContact.id);
        console.log(`✅ [CONTACT UPDATE] Mensagens de recebimento atualizadas`);
      } catch (e) {
        console.error(`❌ [CONTACT UPDATE] Erro ao atualizar receiver:`, e);
      }

      // 2. Deletar o contato @lid
      try {
        await contacts.delete({ where: { id: lidContact.id } });
        console.log(`🗑️ [CONTACT UPDATE] Contato @lid ${lid} deletado`);
      } catch (e) {
        console.error(`❌ [CONTACT UPDATE] Erro ao deletar @lid:`, e);
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
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !==
        DisconnectReason.loggedOut;

      if (shouldReconnect) {
        console.log("📱 [WHATSAPP] Reconectando...");
        connectWhatsApp(accountId, instance.number);
      } else {
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
  socket.ev.on(
    "messages.upsert",
    async ({ messages: incomingMessages, type }) => {
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
      if (!Array.isArray(incomingMessages) || incomingMessages.length === 0)
        return;

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
        console.log("📨 [MSG] Processando mensagem:", {
          id: msg.key?.id,
          fromMe: msg.key?.fromMe,
          remoteJid: msg.key?.remoteJid,
          type: type,
          hasMessage: !!msg.message,
        });

        if (!msg.message) {
          console.log("📨 [MSG] Pulando - sem conteúdo de mensagem");
          continue;
        }

        const providerId = msg.key?.id || null;
        const remoteJid = msg.key.remoteJid || "";
        const rawJid = msg.key.remoteJidAlt || remoteJid || "";

        // ✅ FILTRO 1: Ignorar mensagens de grupos
        if (remoteJid.endsWith("@g.us")) {
          console.log("💬 [MSG] ❌ IGNORADO - mensagem de grupo:", remoteJid);
          continue;
        }

        console.log("💬 [WHATSAPP] Nova mensagem");

        // De-dup: se já existir essa mensagem, pule
        if (providerId) {
          const exists = await messages.findFirst({
            where: { providerId },
          });
          if (exists) {
            console.log(
              "💬 [MSG] ⏭️  IGNORADO - mensagem já existe no banco (providerId:",
              providerId,
              ")"
            );
            continue;
          }
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

          // ✅ NOVO COMPORTAMENTO:
          // - Se for PN (@s.whatsapp.net), usamos apenas os dígitos (telefone normalizado)
          // - Se for LID (@lid), mantemos o JID completo como identificador
          //   para não fingir que sabemos o telefone real.
          let contactNumber = rawJid;
          if (rawJid.endsWith("@s.whatsapp.net")) {
            contactNumber = normalizePhoneNumber(rawJid);
          }

          const messageId = msg.key.id;
          const senderLid = msg.key.senderLid; // ← CHAVE: Baileys envia o @lid aqui!

          console.log("💬 [MSG] ========== MENSAGEM RECEBIDA ==========");
          console.log("💬 [MSG] isFromMe:", isFromMe);
          console.log("💬 [MSG] remoteJid:", remoteJid);
          console.log("💬 [MSG] rawJid:", rawJid);
          console.log("💬 [MSG] senderLid:", senderLid);
          console.log("💬 [MSG] messageId:", messageId);
          console.log("💬 [MSG] contactNumber normalizado:", contactNumber);
          console.log("💬 [MSG] ==========================================");

          // Buscar a conta para verificar o número
          const instance = whatsappConnections.get(accountId);
          const accountNumber = normalizePhoneNumber(instance?.number || "");

          // ✅ SOLUÇÃO: Se mensagem recebida tem senderLid, mapear @lid → número real!
          if (senderLid && !isFromMe) {
            console.log(
              "🎯 [BAILEYS] senderLid detectado! Mapeando @lid → número real"
            );
            // mapLidToNumber já chama updateContactsWithLid internamente
            mapLidToNumber(senderLid, contactNumber);
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

            // 1) Tenta usar mapeamento @lid → número real (caso já exista)
            const mappedNumber = getMappedNumber(remoteJid);

            // 2) Tenta usar o mapa de mensagens enviadas (providerId/messageId → número)
            const sentInfo = sentMessagesMap.get(messageId);

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
            } else {
              // Fallback: manter o número normalizado em vez de criar pending
              console.log(
                "💬 [MSG] ⚠️ [ENVIADA] Sem mapeamento @lid e sem sentInfo. Mantendo contactNumber normalizado:",
                contactNumber
              );
              // aqui não alteramos o contactNumber
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
            const tempContact = await contacts.upsert({
              where: { number: tempContactNumber },
              update: { name: msg.pushName || undefined },
              create: {
                number: tempContactNumber,
                name: msg.pushName || "Aguardando resposta...",
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
          const contact = await contacts.upsert({
            where: { number: contactNumber },
            update: { name: msg.pushName || undefined },
            create: {
              number: contactNumber,
              name: msg.pushName || undefined,
            },
          });
          console.log("📨 [CONTACT] Contato criado/atualizado:", contact);

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
          const savedMessage = await messages.create({
            data: {
              content,
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

          // Emitir via Socket.io
          io.emit("new-message", {
            ...savedMessage,
            accountNumber: instance.number,
            contactNumber,
            contactName: msg.pushName,
          });

          console.log("💬 [WHATSAPP] Mensagem salva e emitida");
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

  // Sempre usar @s.whatsapp.net para enviar mensagens individuais
  const jid = `${cleanNumber}@s.whatsapp.net`;
  const { key } = await instance.socket.sendMessage(jid, { text: content });

  // Retornar o providerId (key.id) para de-duplicação
  return { providerId: key?.id };
}

// ============================================
// SOCKET.IO
// ============================================

io.on("connection", (socket) => {
  console.log("✓ Client connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("✗ Client disconnected:", socket.id);
  });
});

// ============================================
// ROTAS API
// ============================================

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

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
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    // ✅ CORREÇÃO 1: Criar conta sem número temporário
    // O número real será obtido após conexão
    const account = await accounts.create({
      data: {
        name,
        number: "pending", // Placeholder até conectar
        status: "qr_required",
      },
    });

    // Conectar usando accountId como sessionId
    await connectWhatsApp(account.id, "pending");

    res.json(account);
  } catch (error) {
    console.error("Error creating account:", error);
    res.status(500).json({ error: "Failed to create account" });
  }
});

// Deletar conta
app.delete("/api/accounts/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar conta para pegar o número
    const account = await accounts.findUnique({ where: { id } });

    if (account) {
      // Desconectar WhatsApp
      await disconnectWhatsApp(id);

      // Deletar sessão física
      const sessionPath = path.join(DATA_PATH, "data/sessions", account.number);
      if (fs.existsSync(sessionPath)) {
        fs.rmSync(sessionPath, { recursive: true, force: true });
      }

      // Deletar mensagens relacionadas (cascade)
      await messages.deleteMany({
        where: { senderId: id },
      });

      // Deletar conta
      await accounts.delete({ where: { id } });
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

    // Extrair IDs únicos de contatos
    const contactIds = new Set();
    messagesList.forEach((msg) => {
      if (msg.contactSenderId) contactIds.add(msg.contactSenderId);
      if (msg.contactReceiverId) contactIds.add(msg.contactReceiverId);
    });

    // Buscar detalhes dos contatos
    const contactsList = await contacts.findMany({
      where: {
        id: { in: Array.from(contactIds) },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(contactsList);
  } catch (error) {
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

    res.json(messagesList);
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

    // Memoriza o último destino real deste accountId
    lastSentTo.set(accountId, normalizedNumber);

    const { providerId } = await sendWhatsAppMessage(
      accountId,
      normalizedNumber,
      content
    );

    // Guardar o número real usado nesse envio para resolver @lid depois
    if (providerId) {
      sentMessagesMap.set(providerId, {
        accountId,
        contactNumber: normalizedNumber,
        timestamp: Date.now(),
      });

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

    const message = await messages.create({
      data: {
        content,
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

export async function startServer() {
  try {
    ensureDirectories();

    console.log("✓ Database connected");
    console.log("✓ Socket.io initialized");

    server.listen(PORT, () => {
      console.log(`Servidor rodando em http://localhost:${PORT}`);
    });

    // Reconectar contas
    const accountsList = await accounts.findMany({
      where: { status: "connected" },
    });

    for (const account of accountsList) {
      console.log(`Reconnecting: ${account.number}`);
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
