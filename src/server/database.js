/**
 * Database simples com Better-SQLite3
 * Sem migrations, sem complicação!
 */

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Caminho de dados
const DATA_PATH = process.env.DATA_PATH || process.cwd();
const DB_PATH = path.join(DATA_PATH, "data", "database.db");

console.log("[DATABASE] ============================================");
console.log("[DATABASE] Inicializando banco de dados...");
console.log("[DATABASE] DATA_PATH:", DATA_PATH);
console.log("[DATABASE] DB_PATH:", DB_PATH);
console.log("[DATABASE] process.cwd():", process.cwd());
console.log("[DATABASE] __dirname:", __dirname);
console.log("[DATABASE] Node version:", process.version);
console.log("[DATABASE] Electron:", process.versions.electron || "N/A");

// Garantir que a pasta data existe
const dataDir = path.join(DATA_PATH, "data");
if (!fs.existsSync(dataDir)) {
  console.log("[DATABASE] Criando diretório:", dataDir);
  fs.mkdirSync(dataDir, { recursive: true });
} else {
  console.log("[DATABASE] Diretório já existe:", dataDir);
}

// Abrir/criar banco de dados
console.log("[DATABASE] Abrindo banco de dados...");
let db;
try {
  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL"); // Melhor performance
  console.log("[DATABASE] ✅ Conectado com sucesso!");
  console.log("[DATABASE] ============================================");
} catch (error) {
  console.error("[DATABASE] ❌ ERRO ao conectar:");
  console.error("[DATABASE] Mensagem:", error.message);
  console.error("[DATABASE] Stack:", error.stack);
  console.error("[DATABASE] ============================================");
  throw error;
}

// ============================================
// CRIAR TABELAS (se não existirem)
// ============================================

db.exec(`
  CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    number TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'disconnected',
    dataLogin DATETIME DEFAULT CURRENT_TIMESTAMP,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS contacts (
    id TEXT PRIMARY KEY,
    name TEXT,
    number TEXT UNIQUE NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    direction TEXT NOT NULL,
    type TEXT DEFAULT 'text',
    senderId TEXT NOT NULL,
    receiverId TEXT NOT NULL,
    contactSenderId TEXT,
    contactReceiverId TEXT,
    providerId TEXT UNIQUE,
    mediaUrl TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (senderId) REFERENCES accounts(id),
    FOREIGN KEY (receiverId) REFERENCES accounts(id),
    FOREIGN KEY (contactSenderId) REFERENCES contacts(id),
    FOREIGN KEY (contactReceiverId) REFERENCES contacts(id)
  );

  CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(senderId);
  CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiverId);
  CREATE INDEX IF NOT EXISTS idx_messages_provider ON messages(providerId);
  CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);

  CREATE TABLE IF NOT EXISTS conversation_summaries (
    id TEXT PRIMARY KEY,
    accountId TEXT NOT NULL,
    contactNumber TEXT NOT NULL,
    summary TEXT NOT NULL,
    sentiment TEXT,
    sentimentScore REAL,
    sentimentReason TEXT,
    intent TEXT,
    intentConfidence REAL,
    highlights TEXT,
    conclusion TEXT,
    urgencyLevel TEXT,
    suggestedActions TEXT,
    extractedInfo TEXT,
    conversationLength INTEGER,
    compressionRate REAL,
    provider TEXT,
    lastMessageTimestamp DATETIME NOT NULL,
    messageCount INTEGER,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(accountId, contactNumber, lastMessageTimestamp)
  );

  CREATE INDEX IF NOT EXISTS idx_summaries_account ON conversation_summaries(accountId);
  CREATE INDEX IF NOT EXISTS idx_summaries_contact ON conversation_summaries(contactNumber);
  CREATE INDEX IF NOT EXISTS idx_summaries_timestamp ON conversation_summaries(lastMessageTimestamp);

  CREATE TABLE IF NOT EXISTS lead_info (
    id TEXT PRIMARY KEY,
    accountId TEXT NOT NULL,
    contactNumber TEXT NOT NULL,
    productRequested TEXT,
    budgetValue TEXT,
    stage TEXT DEFAULT 'initial_contact',
    priority TEXT DEFAULT 'medium',
    observations TEXT,
    followUpDate DATETIME,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(accountId, contactNumber)
  );

  CREATE INDEX IF NOT EXISTS idx_lead_account ON lead_info(accountId);
  CREATE INDEX IF NOT EXISTS idx_lead_contact ON lead_info(contactNumber);
  CREATE INDEX IF NOT EXISTS idx_lead_stage ON lead_info(stage);
  CREATE INDEX IF NOT EXISTS idx_lead_priority ON lead_info(priority);
`);

console.log("[DATABASE] Tabelas criadas/verificadas");

// ============================================
// TIMEZONE: Brasil (UTC-3)
// ============================================
// Helper para ajustar queries com timezone do Brasil
const NOW_BR = "datetime('now', '-3 hours')";
const DATE_NOW_BR = "date('now', '-3 hours')";

// ============================================
// MIGRAÇÕES
// ============================================

// Verificar e adicionar coluna mediaUrl na tabela messages
const tableInfo = db.prepare("PRAGMA table_info(messages)").all();
const hasMediaUrl = tableInfo.some((column) => column.name === "mediaUrl");

if (!hasMediaUrl) {
  console.log("[DATABASE] Adicionando coluna mediaUrl à tabela messages...");
  db.exec(`ALTER TABLE messages ADD COLUMN mediaUrl TEXT`);
  console.log("[DATABASE] Coluna mediaUrl adicionada com sucesso!");
} else {
  console.log("[DATABASE] Coluna mediaUrl já existe.");
}

// ============================================
// MIGRAÇÕES - COLUNAS DE IA
// ============================================

// Adicionar colunas de análise de IA se não existirem
const aiColumns = [
  { name: "aiCategory", type: "TEXT" },
  { name: "aiCategoryScore", type: "REAL" },
  { name: "aiUrgency", type: "INTEGER" },
  { name: "aiUrgencyLevel", type: "TEXT" },
  { name: "aiSentiment", type: "TEXT" },
  { name: "aiSentimentScore", type: "REAL" },
  { name: "aiIntent", type: "TEXT" },
  { name: "aiIntentScore", type: "REAL" },
  { name: "aiExtractedValues", type: "TEXT" },
  { name: "aiAnalyzedAt", type: "DATETIME" },
  { name: "aiSummary", type: "TEXT" },
  { name: "aiSummaryLength", type: "INTEGER" },
  { name: "aiOriginalLength", type: "INTEGER" },
  { name: "aiCompressionRate", type: "REAL" },
  { name: "audioTranscription", type: "TEXT" },
  { name: "audioTranscribedAt", type: "DATETIME" },
  { name: "audioTranscriptionProvider", type: "TEXT" },
];

aiColumns.forEach((col) => {
  const hasColumn = tableInfo.some((column) => column.name === col.name);
  if (!hasColumn) {
    console.log(
      `[DATABASE] Adicionando coluna ${col.name} à tabela messages...`
    );
    db.exec(`ALTER TABLE messages ADD COLUMN ${col.name} ${col.type}`);
  }
});

console.log("[DATABASE] Colunas de IA verificadas/adicionadas");

function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ============================================
// ACCOUNTS
// ============================================

export const accounts = {
  findMany: (options = {}) => {
    const where = options.where || {};
    const orderBy = options.orderBy || {};
    const orderField = Object.keys(orderBy)[0] || "createdAt";
    const orderDir = orderBy[orderField] || "desc";

    let query = `SELECT * FROM accounts`;
    const params = [];

    // WHERE
    if (where.status) {
      query += ` WHERE status = ?`;
      params.push(where.status);
    }

    query += ` ORDER BY ${orderField} ${orderDir}`;

    const stmt = db.prepare(query);
    return stmt.all(...params);
  },

  findUnique: ({ where }) => {
    const stmt = db.prepare(`SELECT * FROM accounts WHERE id = ?`);
    return stmt.get(where.id);
  },

  create: ({ data }) => {
    const id = generateUUID();
    const now = new Date();
    now.setHours(now.getHours() - 3); // UTC-3 para Brasil
    const timestamp = now.toISOString().replace("T", " ").substring(0, 19);

    const stmt = db.prepare(`
      INSERT INTO accounts (id, name, number, status, dataLogin, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.name,
      data.number,
      data.status || "disconnected",
      timestamp,
      timestamp,
      timestamp
    );

    return { id, ...data, createdAt: now, updatedAt: now };
  },

  update: ({ where, data }) => {
    const fields = [];
    const values = [];

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) return null;

    fields.push("updatedAt = CURRENT_TIMESTAMP");
    values.push(where.id);

    const stmt = db.prepare(
      `UPDATE accounts SET ${fields.join(", ")} WHERE id = ?`
    );
    stmt.run(...values);

    return accounts.findUnique({ where });
  },

  delete: ({ where }) => {
    const stmt = db.prepare(`DELETE FROM accounts WHERE id = ?`);
    stmt.run(where.id);
    return { id: where.id };
  },
};

// ============================================
// CONTACTS
// ============================================

export const contacts = {
  findMany: (options = {}) => {
    const where = options.where || {};
    const orderBy = options.orderBy || {};
    const orderField = Object.keys(orderBy)[0] || "createdAt";
    const orderDir = orderBy[orderField] || "desc";

    let query = `SELECT * FROM contacts WHERE number NOT LIKE '%broadcast%' AND number NOT LIKE '%status%' AND number NOT LIKE '%newsletter%' AND number NOT LIKE '%@lid%'`;
    const params = [];

    // WHERE com IN
    if (where.id?.in) {
      const placeholders = where.id.in.map(() => "?").join(",");
      query += ` AND id IN (${placeholders})`;
      params.push(...where.id.in);
    }

    query += ` ORDER BY ${orderField} ${orderDir}`;

    const stmt = db.prepare(query);
    return stmt.all(...params);
  },

  findUnique: ({ where }) => {
    const field = Object.keys(where)[0];
    const stmt = db.prepare(`SELECT * FROM contacts WHERE ${field} = ?`);
    return stmt.get(where[field]);
  },

  upsert: ({ where, update, create }) => {
    const existing = contacts.findUnique({ where });

    if (existing) {
      // Update
      const fields = [];
      const values = [];

      Object.entries(update).forEach(([key, value]) => {
        if (value !== undefined) {
          fields.push(`${key} = ?`);
          values.push(value);
        }
      });

      if (fields.length > 0) {
        fields.push("updatedAt = CURRENT_TIMESTAMP");
        values.push(where.number);

        const stmt = db.prepare(
          `UPDATE contacts SET ${fields.join(", ")} WHERE number = ?`
        );
        stmt.run(...values);
      }

      return contacts.findUnique({ where });
    } else {
      // Create
      const id = generateUUID();
      const now = new Date();
      now.setHours(now.getHours() - 3); // UTC-3 para Brasil
      const timestamp = now.toISOString().replace("T", " ").substring(0, 19);

      const stmt = db.prepare(`
        INSERT INTO contacts (id, name, number, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?)
      `);

      stmt.run(id, create.name || null, create.number, timestamp, timestamp);

      return { id, ...create, createdAt: now, updatedAt: now };
    }
  },

  delete: ({ where }) => {
    const field = Object.keys(where)[0];
    const stmt = db.prepare(`DELETE FROM contacts WHERE ${field} = ?`);
    stmt.run(where[field]);
    return { id: where[field] };
  },

  // Buscar contato por @lid ou número real
  getContactByLidOrNumber: (lidId) => {
    // ✅ CORREÇÃO CRÍTICA: O @lid É O PRÓPRIO ID DO CONTATO!
    // Quando o remoteJid vem como "30e14a9f-99ab-463a-8700-7a92ec6495a1@lid",
    // o lidId extraído É o contact.id no banco de dados.
    // Então, primeiro tentamos buscar diretamente pelo ID.

    let stmt = db.prepare(`SELECT * FROM contacts WHERE id = ? LIMIT 1`);
    let contact = stmt.get(lidId);

    if (contact) {
      console.log(
        `[DB] ✅ Contato encontrado pelo @lid (contact.id): ${contact.number} (${contact.name})`
      );
      return contact;
    }

    // Se não encontrou pelo ID, tentar buscar pelo número (caso seja número real)
    stmt = db.prepare(`SELECT * FROM contacts WHERE number = ? LIMIT 1`);
    contact = stmt.get(lidId);

    if (contact) {
      console.log(`[DB] Contato encontrado por número: ${lidId}`);
      return contact;
    }

    // Se não encontrar pelo número, buscar contato que tem um temp_ com esse lidId
    // Isso acontece quando a pessoa já enviou mensagem (tem número real) mas o sistema
    // criou um temp_ quando você tentou responder
    const tempNumber = `temp_${lidId}`;
    stmt = db.prepare(`SELECT * FROM contacts WHERE number = ? LIMIT 1`);
    const tempContact = stmt.get(tempNumber);

    if (tempContact) {
      console.log(`[DB] Contato temp_ encontrado: ${tempNumber}`);

      // Buscar se existe um contato real que compartilha mensagens com este temp_
      // através do senderId/receiverId
      stmt = db.prepare(`
        SELECT DISTINCT c.* 
        FROM contacts c
        INNER JOIN messages m ON (m.contactSenderId = c.id OR m.contactReceiverId = c.id)
        WHERE c.number NOT LIKE 'temp_%'
          AND c.number LIKE '55%'
          AND (
            m.senderId IN (
              SELECT DISTINCT senderId FROM messages m2 
              WHERE m2.contactSenderId = ? OR m2.contactReceiverId = ?
            )
            OR m.receiverId IN (
              SELECT DISTINCT receiverId FROM messages m2
              WHERE m2.contactSenderId = ? OR m2.contactReceiverId = ?
            )
          )
          AND m.direction = 'received'
        ORDER BY m.timestamp DESC
        LIMIT 1
      `);

      contact = stmt.get(
        tempContact.id,
        tempContact.id,
        tempContact.id,
        tempContact.id
      );

      if (contact) {
        console.log(
          `[DB] Contato real encontrado via temp_: ${contact.number} (${contact.name})`
        );
        return contact;
      }
    }

    console.log(`[DB] Nenhum contato encontrado para lidId: ${lidId}`);
    return null;

    console.log(`[DB] Nenhum contato encontrado para @lid: ${lidId}`);
    return null;
  },
};

// ============================================
// MESSAGES
// ============================================

export const messages = {
  findFirst: ({ where }) => {
    let query = `SELECT * FROM messages`;
    const params = [];

    if (where.OR) {
      const orConditions = where.OR.map((cond) => {
        const field = Object.keys(cond)[0];
        params.push(cond[field]);
        return `${field} = ?`;
      });
      query += ` WHERE (${orConditions.join(" OR ")})`;
    } else {
      const conditions = [];
      Object.entries(where).forEach(([key, value]) => {
        if (value !== undefined) {
          conditions.push(`${key} = ?`);
          params.push(value);
        }
      });
      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(" AND ")}`;
      }
    }

    query += ` LIMIT 1`;
    const stmt = db.prepare(query);
    return stmt.get(...params);
  },

  findMany: (options = {}) => {
    const where = options.where || {};
    const orderBy = options.orderBy || {};
    const take = options.take;
    const select = options.select;
    const distinct = options.distinct || [];

    let query = `SELECT `;

    // SELECT
    if (select) {
      const fields = Object.keys(select).filter((k) => select[k]);
      query += fields.join(", ");
    } else {
      query += "*";
    }

    // DISTINCT
    if (distinct.length > 0) {
      query = query.replace("SELECT", `SELECT DISTINCT`);
    }

    query += ` FROM messages`;

    // WHERE
    const conditions = [];
    const params = [];

    if (where.OR) {
      const orConditions = where.OR.map((cond) => {
        const field = Object.keys(cond)[0];
        params.push(cond[field]);
        return `${field} = ?`;
      });
      conditions.push(`(${orConditions.join(" OR ")})`);
    }

    Object.entries(where).forEach(([key, value]) => {
      if (key !== "OR" && value !== undefined) {
        conditions.push(`${key} = ?`);
        params.push(value);
      }
    });

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    // ORDER BY
    const orderField = Object.keys(orderBy)[0] || "timestamp";
    const orderDir = orderBy[orderField] || "desc";
    query += ` ORDER BY ${orderField} ${orderDir}`;

    // LIMIT
    if (take) {
      query += ` LIMIT ${take}`;
    }

    const stmt = db.prepare(query);
    return stmt.all(...params);
  },

  create: ({ data }) => {
    const id = generateUUID();

    // ✅ CORREÇÃO: Aceitar timestamp como INTEGER (Unix ms) ou usar timestamp atual
    let timestamp = data.timestamp;
    if (!timestamp) {
      // Não aplicar UTC-3 aqui pois server.js já envia o timestamp ajustado
      timestamp = Date.now(); // Unix milliseconds
    }
    const stmt = db.prepare(`
      INSERT INTO messages (
        id, content, direction, type, senderId, receiverId,
        contactSenderId, contactReceiverId, providerId, mediaUrl, timestamp, createdAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.content,
      data.direction,
      data.type || "text",
      data.senderId,
      data.receiverId,
      data.contactSenderId || null,
      data.contactReceiverId || null,
      data.providerId || null,
      data.mediaUrl || null,
      timestamp,
      timestamp
    );

    return {
      id,
      ...data,
      timestamp: new Date(timestamp), // Unix ms → Date
      createdAt: new Date(timestamp),
    };
  },

  update: ({ where, data }) => {
    const fields = [];
    const values = [];

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) return null;

    values.push(where.id);

    const stmt = db.prepare(
      `UPDATE messages SET ${fields.join(", ")} WHERE id = ?`
    );
    stmt.run(...values);

    const selectStmt = db.prepare(`SELECT * FROM messages WHERE id = ?`);
    return selectStmt.get(where.id);
  },

  // Atualizar mensagem com análise de IA
  updateAIAnalysis: (messageId, aiData) => {
    console.log(`💾 [DATABASE] updateAIAnalysis chamado:`, {
      messageId: messageId.substring(0, 8),
      category: aiData.category,
      urgency: aiData.urgency,
      sentiment: aiData.sentiment,
    });

    const stmt = db.prepare(`
      UPDATE messages SET
        aiCategory = ?,
        aiCategoryScore = ?,
        aiUrgency = ?,
        aiUrgencyLevel = ?,
        aiSentiment = ?,
        aiSentimentScore = ?,
        aiIntent = ?,
        aiIntentScore = ?,
        aiExtractedValues = ?,
        aiSummary = ?,
        aiSummaryLength = ?,
        aiOriginalLength = ?,
        aiCompressionRate = ?,
        aiAnalyzedAt = ?
      WHERE id = ?
    `);

    // ✅ CORREÇÃO: Salvar aiAnalyzedAt como Unix timestamp (ms) em vez de ISO string
    const result = stmt.run(
      aiData.category || null,
      aiData.categoryScore || null,
      aiData.urgency || null,
      aiData.urgencyLevel || null,
      aiData.sentiment || null,
      aiData.sentimentScore || null,
      aiData.intent || null,
      aiData.intentScore || null,
      aiData.extractedValues ? JSON.stringify(aiData.extractedValues) : null,
      aiData.summary || null,
      aiData.summaryLength || null,
      aiData.originalLength || null,
      aiData.compressionRate || null,
      aiData.analyzedAt || Date.now(),
      messageId
    );

    console.log(`💾 [DATABASE] Rows affected: ${result.changes}`);

    return messages.findFirst({ where: { id: messageId } });
  },

  deleteMany: ({ where }) => {
    let query = `DELETE FROM messages`;
    const params = [];

    if (where.OR) {
      const orConditions = where.OR.map((cond) => {
        const conditions = [];
        Object.entries(cond).forEach(([key, value]) => {
          if (value !== undefined) {
            conditions.push(`${key} = ?`);
            params.push(value);
          }
        });
        return `(${conditions.join(" AND ")})`;
      });
      query += ` WHERE ${orConditions.join(" OR ")}`;
    } else {
      const conditions = [];
      Object.entries(where).forEach(([key, value]) => {
        if (value !== undefined) {
          conditions.push(`${key} = ?`);
          params.push(value);
        }
      });
      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(" AND ")}`;
      }
    }

    const stmt = db.prepare(query);
    const result = stmt.run(...params);
    return { count: result.changes };
  },

  // Agregação para contar mensagens por contato
  countByContact: (accountId) => {
    const stmt = db.prepare(`
      SELECT 
        COALESCE(contactSenderId, contactReceiverId) as contactId,
        COUNT(*) as count
      FROM messages
      WHERE senderId = ? OR receiverId = ?
      GROUP BY contactId
    `);
    return stmt.all(accountId, accountId);
  },

  // Buscar mensagens de uma conversa para gerar resumo
  getConversationMessages: (
    contactNumber,
    limit = 20,
    timeWindowHours = 24
  ) => {
    const timeWindow = new Date(
      Date.now() - timeWindowHours * 60 * 60 * 1000
    ).toISOString();
    const stmt = db.prepare(`
      SELECT 
        m.id,
        m.content as body,
        m.direction,
        m.timestamp,
        c.name as pushName,
        m.aiSummary
      FROM messages m
      LEFT JOIN contacts c ON c.id = m.contactSenderId
      WHERE c.number = ?
        AND m.timestamp >= ?
        AND m.content IS NOT NULL
        AND length(m.content) > 10
      ORDER BY m.timestamp DESC
      LIMIT ?
    `);
    return stmt.all(contactNumber, timeWindow, limit);
  },
};

// ============================================
// DASHBOARD KPIs
// ============================================

// Filtro global para excluir status/broadcast/newsletter/lid
const BROADCAST_FILTER = `
  AND COALESCE(contactSenderId, contactReceiverId) NOT IN (
    SELECT id FROM contacts 
    WHERE number LIKE '%broadcast%' OR number LIKE '%status%' OR number LIKE '%newsletter%' OR number LIKE '%@lid%'
  )
`;

// Helper para gerar filtros de data com timezone do Brasil
const getDateFilter = (period, field = "timestamp") => {
  // ✅ CORREÇÃO: Timestamps agora são INTEGER (Unix ms), não STRING
  // Converter para Unix ms para comparação

  // Se period for um objeto com startDate e endDate, usar range customizado
  if (typeof period === "object" && period.startDate && period.endDate) {
    const startMs = new Date(period.startDate).getTime();
    const endMs = new Date(period.endDate).getTime();
    return `${field} >= ${startMs} AND ${field} <= ${endMs}`;
  }

  // Caso contrário, usar períodos predefinidos
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;

  switch (period) {
    case "today":
      // Início do dia de hoje (00:00:00 UTC-3)
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      return `${field} >= ${todayStart.getTime()}`;
    case "week":
      // Últimos 7 dias
      return `${field} >= ${now - 7 * oneDayMs}`;
    case "month":
      // Últimos 30 dias
      return `${field} >= ${now - 30 * oneDayMs}`;
    default:
      // Padrão: hoje
      const defaultStart = new Date();
      defaultStart.setHours(0, 0, 0, 0);
      return `${field} >= ${defaultStart.getTime()}`;
  }
};

// Helper para filtros de data em colunas DATETIME (STRING) - usado em contacts.createdAt
const getDateFilterString = (period, field = "createdAt") => {
  // Se period for um objeto com startDate e endDate, usar range customizado
  if (typeof period === "object" && period.startDate && period.endDate) {
    const startDate = new Date(period.startDate).toISOString();
    const endDate = new Date(period.endDate).toISOString();
    return `${field} >= '${startDate}' AND ${field} <= '${endDate}'`;
  }

  // Caso contrário, usar períodos predefinidos com funções SQL de data
  switch (period) {
    case "today":
      return `date(${field}) = date('now', 'localtime')`;
    case "week":
      return `date(${field}) >= date('now', 'localtime', '-7 days')`;
    case "month":
      return `date(${field}) >= date('now', 'localtime', '-30 days')`;
    default:
      return `date(${field}) = date('now', 'localtime')`;
  }
};

export const dashboardKPIs = {
  // Mensagens por período (hoje, semana, mês)
  getMessagesByPeriod: (accountId = null, period = "today") => {
    const dateFilter = getDateFilter(period);
    const accountFilter = accountId ? `AND senderId = '${accountId}'` : "";

    const stmt = db.prepare(`
      SELECT 
        SUM(CASE WHEN direction = 'sent' THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN direction = 'received' THEN 1 ELSE 0 END) as received
      FROM messages
      WHERE ${dateFilter} ${accountFilter}
      ${BROADCAST_FILTER}
    `);

    return stmt.get() || { sent: 0, received: 0 };
  },

  // Conversas ativas no período
  getActiveConversations: (accountId = null, period = "today") => {
    const dateFilter = getDateFilter(period, "timestamp");

    const accountFilter = accountId ? `AND senderId = '${accountId}'` : "";

    const stmt = db.prepare(`
      SELECT COUNT(DISTINCT COALESCE(contactSenderId, contactReceiverId)) as count
      FROM messages
      WHERE ${dateFilter} ${accountFilter}
      ${BROADCAST_FILTER}
    `);

    return stmt.get().count || 0;
  },

  // Novos contatos no período
  getNewContacts: (accountId = null, period = "today") => {
    // ✅ CORREÇÃO: Usar getDateFilterString pois contacts.createdAt é DATETIME (STRING)
    const dateFilter = getDateFilterString(period, "createdAt");

    // Se accountId especificado, buscar apenas contatos que tiveram mensagens com essa conta
    let query = `
      SELECT COUNT(*) as count 
      FROM contacts 
      WHERE ${dateFilter}
        AND number NOT LIKE '%broadcast%' 
        AND number NOT LIKE '%status%'
        AND number NOT LIKE '%newsletter%'
    `;

    if (accountId) {
      query = `
        SELECT COUNT(DISTINCT c.id) as count
        FROM contacts c
        INNER JOIN messages m ON (m.contactSenderId = c.id OR m.contactReceiverId = c.id)
        WHERE ${dateFilter.replace("createdAt", "c.createdAt")} 
          AND m.senderId = '${accountId}'
          AND c.number NOT LIKE '%broadcast%'
          AND c.number NOT LIKE '%status%'
          AND c.number NOT LIKE '%newsletter%'
      `;
    }

    const stmt = db.prepare(query);
    return stmt.get().count || 0;
  },

  // Tempo médio de resposta (em minutos)
  getAvgResponseTime: (accountId = null, period = "today") => {
    const dateFilter = getDateFilter(period, "m1.timestamp");

    const accountFilter = accountId
      ? `AND m1.senderId = '${accountId}' AND m2.senderId = '${accountId}'`
      : "";

    // ✅ CORREÇÃO: Timestamps agora são INTEGER (Unix ms)
    // Calcular diferença em minutos: (m2.timestamp - m1.timestamp) / 60000
    const stmt = db.prepare(`
      SELECT AVG(
        (m2.timestamp - m1.timestamp) / 60000.0
      ) as avg_minutes
      FROM messages m1
      INNER JOIN messages m2 
        ON m1.contactReceiverId = m2.contactSenderId
        AND m2.timestamp > m1.timestamp
        AND (m2.timestamp - m1.timestamp) / 60000.0 < 120
      WHERE m1.direction = 'received' 
        AND m2.direction = 'sent'
        AND ${dateFilter}
        ${accountFilter}
    `);

    const result = stmt.get();
    return result?.avg_minutes || 0;
  },

  // Taxa de resposta (percentual)
  getResponseRate: (accountId = null, period = "today") => {
    const dateFilter = getDateFilter(period, "timestamp");

    const accountFilter = accountId ? `AND senderId = '${accountId}'` : "";

    const stmt = db.prepare(`
      SELECT 
        SUM(CASE WHEN direction = 'received' THEN 1 ELSE 0 END) as received,
        SUM(CASE WHEN direction = 'sent' THEN 1 ELSE 0 END) as sent
      FROM messages
      WHERE ${dateFilter} ${accountFilter}
    `);

    const result = stmt.get();
    const received = result?.received || 0;
    const sent = result?.sent || 0;

    if (received === 0) return 0;
    return (sent / received) * 100;
  },

  // Pico de atividade (hora com mais mensagens)
  getPeakHour: (accountId = null, period = "today") => {
    const dateFilter = getDateFilter(period, "timestamp");

    const accountFilter = accountId ? `AND senderId = '${accountId}'` : "";

    // ✅ CORREÇÃO: Extrair hora de Unix timestamp (ms)
    // timestamp/1000 = Unix seconds, usar strftime com 'unixepoch'
    const stmt = db.prepare(`
      SELECT 
        CAST(strftime('%H', timestamp/1000, 'unixepoch', 'localtime') AS INTEGER) as hour,
        COUNT(*) as count
      FROM messages
      WHERE ${dateFilter} ${accountFilter}
      GROUP BY hour
      ORDER BY count DESC
      LIMIT 1
    `);

    const result = stmt.get();
    return result?.hour ?? null;
  },

  // Atividade por hora
  getHourlyActivity: (accountId = null, period = "today") => {
    const dateFilter = getDateFilter(period, "timestamp");

    const accountFilter = accountId ? `AND senderId = '${accountId}'` : "";

    // ✅ CORREÇÃO: Extrair hora de Unix timestamp (ms)
    const stmt = db.prepare(`
      SELECT 
        CAST(strftime('%H', timestamp/1000, 'unixepoch', 'localtime') AS INTEGER) as hour,
        SUM(CASE WHEN direction = 'sent' THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN direction = 'received' THEN 1 ELSE 0 END) as received
      FROM messages
      WHERE ${dateFilter} ${accountFilter}
      GROUP BY hour
      ORDER BY hour
    `);

    return stmt.all();
  },

  // Ranking de vendedores
  getVendorsRanking: (period = "today") => {
    const dateFilter = getDateFilter(period, "m.timestamp");

    const stmt = db.prepare(`
      SELECT 
        a.id as accountId,
        a.name as accountName,
        SUM(CASE WHEN m.direction = 'sent' THEN 1 ELSE 0 END) as messagesSent,
        SUM(CASE WHEN m.direction = 'received' THEN 1 ELSE 0 END) as messagesReceived,
        COUNT(DISTINCT COALESCE(m.contactSenderId, m.contactReceiverId)) as activeConversations
      FROM accounts a
      LEFT JOIN messages m ON m.senderId = a.id
      WHERE ${dateFilter} OR m.id IS NULL
      GROUP BY a.id, a.name
      ORDER BY messagesSent DESC
    `);

    const vendors = stmt.all();

    // Calcular tempo médio de resposta para cada vendedor
    return vendors.map((vendor) => {
      const avgTime = dashboardKPIs.getAvgResponseTime(
        vendor.accountId,
        period
      );
      return {
        ...vendor,
        avgResponseTime: avgTime,
      };
    });
  },

  // Estatísticas de mídia
  getMediaStats: (accountId = null, period = "today") => {
    const dateFilter = getDateFilter(period, "timestamp");

    const accountFilter = accountId ? `AND senderId = '${accountId}'` : "";

    const stmt = db.prepare(`
      SELECT 
        SUM(CASE WHEN type = 'image' THEN 1 ELSE 0 END) as images,
        SUM(CASE WHEN type = 'video' THEN 1 ELSE 0 END) as videos,
        SUM(CASE WHEN type = 'document' THEN 1 ELSE 0 END) as documents,
        SUM(CASE WHEN type = 'audio' THEN 1 ELSE 0 END) as audios
      FROM messages
      WHERE ${dateFilter} ${accountFilter}
      ${BROADCAST_FILTER}
    `);

    return stmt.get() || { images: 0, videos: 0, documents: 0, audios: 0 };
  },

  // Alertas
  getAlerts: (accountId = null) => {
    const alerts = [];

    // Verificar contas desconectadas
    const disconnectedStmt = db.prepare(`
      SELECT id, name, number
      FROM accounts
      WHERE status = 'disconnected'
      ${accountId ? `AND id = '${accountId}'` : ""}
    `);

    const disconnected = disconnectedStmt.all();
    disconnected.forEach((account) => {
      alerts.push({
        type: "disconnected",
        message: `Conta ${account.name} (${account.number}) está desconectada`,
        accountId: account.id,
      });
    });

    // Verificar mensagens não respondidas há mais de 2 horas
    const noResponseStmt = db.prepare(`
      SELECT DISTINCT
        m.contactReceiverId as contactId,
        c.number as contactNumber,
        c.name as contactName,
        m.senderId as accountId,
        a.name as accountName
      FROM messages m
      INNER JOIN contacts c ON m.contactReceiverId = c.id
      INNER JOIN accounts a ON m.senderId = a.id
      WHERE m.direction = 'received'
        AND m.timestamp >= ${Date.now() - 4 * 60 * 60 * 1000}
        AND m.timestamp <= ${Date.now() - 2 * 60 * 60 * 1000}
        AND NOT EXISTS (
          SELECT 1 FROM messages m2
          WHERE m2.contactSenderId = m.contactReceiverId
            AND m2.direction = 'sent'
            AND m2.timestamp > m.timestamp
        )
        ${accountId ? `AND m.senderId = '${accountId}'` : ""}
      LIMIT 10
    `);

    const noResponse = noResponseStmt.all();
    noResponse.forEach((item) => {
      alerts.push({
        type: "no_response",
        message: `Mensagem de ${
          item.contactName || item.contactNumber
        } sem resposta há 2h+`,
        accountId: item.accountId,
        contactNumber: item.contactNumber,
      });
    });

    // Verificar conversas "frias" (sem interação há 3+ dias)
    const coldStmt = db.prepare(`
      SELECT DISTINCT
        COALESCE(m.contactSenderId, m.contactReceiverId) as contactId,
        c.number as contactNumber,
        c.name as contactName,
        MAX(m.timestamp) as lastMessage
      FROM messages m
      INNER JOIN contacts c ON (c.id = m.contactSenderId OR c.id = m.contactReceiverId)
      WHERE m.timestamp <= ${Date.now() - 3 * 24 * 60 * 60 * 1000}
        AND m.timestamp >= ${Date.now() - 7 * 24 * 60 * 60 * 1000}
        ${accountId ? `AND m.senderId = '${accountId}'` : ""}
      GROUP BY contactId, c.number, c.name
      HAVING NOT EXISTS (
        SELECT 1 FROM messages m2
        WHERE (m2.contactSenderId = contactId OR m2.contactReceiverId = contactId)
          AND m2.timestamp > ${Date.now() - 3 * 24 * 60 * 60 * 1000}
      )
      LIMIT 5
    `);

    const cold = coldStmt.all();
    cold.forEach((item) => {
      alerts.push({
        type: "cold_conversation",
        message: `Conversa com ${
          item.contactName || item.contactNumber
        } fria há 3+ dias`,
        contactNumber: item.contactNumber,
      });
    });

    return alerts;
  },

  // ============================================
  // NOVOS KPIs AVANÇADOS
  // ============================================

  // Primeiro contato do dia (hora da primeira mensagem)
  getFirstContactTime: (accountId = null, period = "today") => {
    const dateFilter = getDateFilter(period, "timestamp");

    const accountFilter = accountId ? `AND senderId = '${accountId}'` : "";

    // ✅ CORREÇÃO: Formatar hora de Unix timestamp (ms)
    const stmt = db.prepare(`
      SELECT 
        strftime('%H:%M', MIN(timestamp)/1000, 'unixepoch', 'localtime') as firstContact
      FROM messages
      WHERE ${dateFilter} 
        AND direction = 'sent'
        ${accountFilter}
        ${BROADCAST_FILTER}
    `);

    const result = stmt.get();
    return result?.firstContact || null;
  },

  // Último contato do dia
  getLastContactTime: (accountId = null, period = "today") => {
    const dateFilter = getDateFilter(period, "timestamp");

    const accountFilter = accountId ? `AND senderId = '${accountId}'` : "";

    // ✅ CORREÇÃO: Formatar hora de Unix timestamp (ms)
    const stmt = db.prepare(`
      SELECT 
        strftime('%H:%M', MAX(timestamp)/1000, 'unixepoch', 'localtime') as lastContact
      FROM messages
      WHERE ${dateFilter} 
        AND direction = 'sent'
        ${accountFilter}
        ${BROADCAST_FILTER}
    `);

    const result = stmt.get();
    return result?.lastContact || null;
  },

  // Clientes únicos atendidos
  getUniqueCustomers: (accountId = null, period = "today") => {
    const dateFilter = getDateFilter(period, "timestamp");

    const accountFilter = accountId ? `AND senderId = '${accountId}'` : "";

    const stmt = db.prepare(`
      SELECT COUNT(DISTINCT COALESCE(contactSenderId, contactReceiverId)) as uniqueCustomers
      FROM messages
      WHERE ${dateFilter} ${accountFilter}
      ${BROADCAST_FILTER}
    `);

    const result = stmt.get();
    return result?.uniqueCustomers || 0;
  },

  // Mensagens fora do horário comercial (18h+ ou finais de semana)
  getAfterHoursMessages: (accountId = null, period = "today") => {
    const dateFilter = getDateFilter(period, "timestamp");

    const accountFilter = accountId ? `AND senderId = '${accountId}'` : "";

    // ✅ CORREÇÃO: Usar timestamp/1000 para converter Unix ms → Unix seconds
    const stmt = db.prepare(`
      SELECT 
        COUNT(*) as afterHours,
        (SELECT COUNT(*) FROM messages WHERE ${dateFilter} ${accountFilter}) as total
      FROM messages
      WHERE ${dateFilter} 
        ${accountFilter}
        AND (
          CAST(strftime('%H', timestamp/1000, 'unixepoch', 'localtime') AS INTEGER) >= 18 
          OR CAST(strftime('%w', timestamp/1000, 'unixepoch', 'localtime') AS INTEGER) IN (0, 6)
        )
    `);

    const result = stmt.get();
    return {
      count: result?.afterHours || 0,
      percentage:
        result?.total > 0
          ? ((result.afterHours / result.total) * 100).toFixed(1)
          : 0,
    };
  },

  // Tempo médio de conversa (duração entre primeira e última msg por contato)
  getAvgConversationDuration: (accountId = null, period = "today") => {
    const dateFilter = getDateFilter(period, "timestamp");

    const accountFilter = accountId ? `AND senderId = '${accountId}'` : "";

    // ✅ CORREÇÃO: Calcular duração em minutos usando Unix timestamps (ms)
    const stmt = db.prepare(`
      SELECT 
        AVG(duration_minutes) as avg_duration_minutes
      FROM (
        SELECT 
          (MAX(timestamp) - MIN(timestamp)) / 60000.0 as duration_minutes
        FROM messages
        WHERE ${dateFilter} ${accountFilter}
        GROUP BY COALESCE(contactSenderId, contactReceiverId)
        HAVING COUNT(*) > 1
      )
    `);

    const result = stmt.get();
    return result?.avg_duration_minutes || 0;
  },

  // Melhor vendedor do período
  getTopVendor: (period = "today") => {
    const dateFilter = getDateFilter(period, "m.timestamp");

    const stmt = db.prepare(`
      SELECT 
        a.id,
        a.name,
        COUNT(DISTINCT COALESCE(m.contactSenderId, m.contactReceiverId)) as activeConversations,
        SUM(CASE WHEN m.direction = 'sent' THEN 1 ELSE 0 END) as messagesSent
      FROM accounts a
      LEFT JOIN messages m ON m.senderId = a.id
      WHERE ${dateFilter}
      GROUP BY a.id, a.name
      ORDER BY activeConversations DESC, messagesSent DESC
      LIMIT 1
    `);

    const result = stmt.get();
    return result || null;
  },

  // Crescimento vs período anterior
  getGrowthComparison: (accountId = null, period = "today") => {
    let currentFilter = "";
    let previousFilter = "";

    switch (period) {
      case "today":
        currentFilter = "date(timestamp) = date('now')";
        previousFilter = "date(timestamp) = date('now', '-1 day')";
        break;
      case "week":
        currentFilter = "date(timestamp) >= date('now', '-7 days')";
        previousFilter =
          "date(timestamp) >= date('now', '-14 days') AND date(timestamp) < date('now', '-7 days')";
        break;
      case "month":
        currentFilter = "date(timestamp) >= date('now', '-30 days')";
        previousFilter =
          "date(timestamp) >= date('now', '-60 days') AND date(timestamp) < date('now', '-30 days')";
        break;
      default:
        currentFilter = "date(timestamp) = date('now')";
        previousFilter = "date(timestamp) = date('now', '-1 day')";
    }

    const accountFilter = accountId ? `AND senderId = '${accountId}'` : "";

    const stmt = db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM messages WHERE ${currentFilter} ${accountFilter}) as current,
        (SELECT COUNT(*) FROM messages WHERE ${previousFilter} ${accountFilter}) as previous
    `);

    const result = stmt.get();
    const current = result?.current || 0;
    const previous = result?.previous || 0;

    if (previous === 0) return { growth: 0, trend: "stable" };

    const growth = ((current - previous) / previous) * 100;
    const trend = growth > 0 ? "up" : growth < 0 ? "down" : "stable";

    return { growth: growth.toFixed(1), trend, current, previous };
  },

  // Performance vs média da equipe
  getPerformanceVsTeam: (accountId, period = "today") => {
    if (!accountId) return null;

    const dateFilter = getDateFilter(period, "timestamp");

    // Mensagens do vendedor
    const vendorStmt = db.prepare(`
      SELECT COUNT(*) as messages
      FROM messages
      WHERE ${dateFilter} AND senderId = ?
    `);
    const vendorMessages = vendorStmt.get(accountId)?.messages || 0;

    // Média da equipe
    const teamAvgStmt = db.prepare(`
      SELECT AVG(msg_count) as team_avg
      FROM (
        SELECT COUNT(*) as msg_count
        FROM messages
        WHERE ${dateFilter}
        GROUP BY senderId
      )
    `);
    const teamAvg = teamAvgStmt.get()?.team_avg || 0;

    const percentage =
      teamAvg > 0 ? ((vendorMessages / teamAvg) * 100).toFixed(0) : 100;
    const status = vendorMessages >= teamAvg ? "above" : "below";

    return { vendorMessages, teamAvg: Math.round(teamAvg), percentage, status };
  },

  // Tempo máximo sem atender
  getMaxResponseGap: (accountId = null, period = "today") => {
    const dateFilter = getDateFilter(period, "m1.timestamp");

    const accountFilter = accountId ? `AND m1.senderId = '${accountId}'` : "";

    const stmt = db.prepare(`
      WITH conversation_pairs AS (
        SELECT 
          m1.timestamp as received_time,
          MIN(m2.timestamp) as sent_time,
          (julianday(MIN(m2.timestamp)) - julianday(m1.timestamp)) * 24 * 60 as gap_minutes
        FROM messages m1
        LEFT JOIN messages m2 ON 
          m2.direction = 'sent'
          AND m2.timestamp > m1.timestamp
          AND COALESCE(m1.contactSenderId, m1.contactReceiverId) = COALESCE(m2.contactSenderId, m2.contactReceiverId)
          ${accountId ? `AND m2.senderId = '${accountId}'` : ""}
        WHERE m1.direction = 'received'
          AND ${dateFilter}
          ${accountFilter}
        GROUP BY m1.id
      )
      SELECT MAX(gap_minutes) as max_gap
      FROM conversation_pairs
      WHERE gap_minutes IS NOT NULL
    `);

    const result = stmt.get();
    return result?.max_gap || 0;
  },

  // ============================================
  // KPIs DE IA - CLASSIFICAÇÃO INTELIGENTE
  // ============================================

  // Distribuição por tipo de atendimento
  getMessageDistributionByCategory: (accountId = null, period = "today") => {
    const dateFilter = getDateFilter(period);
    const accountFilter = accountId ? `AND senderId = '${accountId}'` : "";

    const stmt = db.prepare(`
      SELECT 
        aiCategory as category,
        COUNT(*) as count,
        ROUND(AVG(aiCategoryScore) * 100, 1) as avgConfidence
      FROM messages
      WHERE ${dateFilter} ${accountFilter}
        AND aiCategory IS NOT NULL
        ${BROADCAST_FILTER}
      GROUP BY aiCategory
      ORDER BY count DESC
    `);

    const results = stmt.all();
    const total = results.reduce((sum, r) => sum + r.count, 0);

    return results.map((r) => ({
      category: r.category,
      count: r.count,
      percentage: total > 0 ? ((r.count / total) * 100).toFixed(1) : 0,
      avgConfidence: r.avgConfidence,
    }));
  },

  // Taxa de conversão por categoria (com base em resposta)
  getConversionByCategory: (accountId = null, period = "today") => {
    const dateFilter = getDateFilter(period);
    const accountFilter = accountId ? `AND m1.senderId = '${accountId}'` : "";

    const stmt = db.prepare(`
      SELECT 
        m1.aiCategory as category,
        COUNT(DISTINCT COALESCE(m1.contactSenderId, m1.contactReceiverId)) as total,
        COUNT(DISTINCT CASE 
          WHEN EXISTS (
            SELECT 1 FROM messages m2 
            WHERE m2.direction = 'sent' 
            AND COALESCE(m2.contactSenderId, m2.contactReceiverId) = COALESCE(m1.contactSenderId, m1.contactReceiverId)
            AND m2.timestamp > m1.timestamp
          ) THEN COALESCE(m1.contactSenderId, m1.contactReceiverId)
        END) as responded
      FROM messages m1
      WHERE ${dateFilter} ${accountFilter}
        AND m1.direction = 'received'
        AND m1.aiCategory IS NOT NULL
        ${BROADCAST_FILTER}
      GROUP BY m1.aiCategory
    `);

    const results = stmt.all();

    return results.map((r) => ({
      category: r.category,
      total: r.total,
      responded: r.responded,
      conversionRate:
        r.total > 0 ? ((r.responded / r.total) * 100).toFixed(1) : 0,
    }));
  },

  // Tempo médio por tipo de atendimento
  getAvgTimeByCategory: (accountId = null, period = "today") => {
    const dateFilter = getDateFilter(period, "m1.timestamp");
    const accountFilter = accountId ? `AND m1.senderId = '${accountId}'` : "";

    const stmt = db.prepare(`
      SELECT 
        m1.aiCategory as category,
        AVG((julianday(m2.timestamp) - julianday(m1.timestamp)) * 24 * 60) as avgMinutes,
        COUNT(*) as conversations
      FROM messages m1
      INNER JOIN messages m2 ON 
        m2.direction = 'sent'
        AND m2.timestamp > m1.timestamp
        AND COALESCE(m2.contactSenderId, m2.contactReceiverId) = COALESCE(m1.contactSenderId, m1.contactReceiverId)
      WHERE m1.direction = 'received'
        AND ${dateFilter}
        ${accountFilter}
        AND m1.aiCategory IS NOT NULL
      GROUP BY m1.aiCategory
      ORDER BY avgMinutes DESC
    `);

    const results = stmt.all();

    return results.map((r) => ({
      category: r.category,
      avgMinutes: r.avgMinutes ? r.avgMinutes.toFixed(1) : 0,
      conversations: r.conversations,
    }));
  },

  // ============================================
  // KPIs DE IA - DETECÇÃO DE URGÊNCIA
  // ============================================

  // Mensagens urgentes não respondidas
  getUrgentMessagesNotResponded: (accountId = null) => {
    const accountFilter = accountId ? `AND m1.senderId = '${accountId}'` : "";

    const stmt = db.prepare(`
      SELECT 
        m1.id,
        m1.content,
        m1.timestamp,
        m1.aiUrgency,
        m1.aiUrgencyLevel,
        COALESCE(m1.contactSenderId, m1.contactReceiverId) as contactId,
        c.name as contactName,
        c.number as contactNumber,
        (julianday('now') - julianday(m1.timestamp)) * 24 * 60 as waitingMinutes
      FROM messages m1
      LEFT JOIN contacts c ON c.id = COALESCE(m1.contactSenderId, m1.contactReceiverId)
      WHERE m1.direction = 'received'
        AND m1.aiUrgency >= 7
        ${accountFilter}
        AND NOT EXISTS (
          SELECT 1 FROM messages m2 
          WHERE m2.direction = 'sent'
          AND COALESCE(m2.contactSenderId, m2.contactReceiverId) = COALESCE(m1.contactSenderId, m1.contactReceiverId)
          AND m2.timestamp > m1.timestamp
        )
        ${BROADCAST_FILTER}
      ORDER BY m1.aiUrgency DESC, m1.timestamp ASC
      LIMIT 50
    `);

    return stmt.all();
  },

  // Score médio de prioridade
  getAveragePriorityScore: (accountId = null, period = "today") => {
    const dateFilter = getDateFilter(period);
    const accountFilter = accountId ? `AND senderId = '${accountId}'` : "";

    const stmt = db.prepare(`
      SELECT 
        AVG(aiUrgency) as avgUrgency,
        COUNT(CASE WHEN aiUrgency >= 8 THEN 1 END) as critical,
        COUNT(CASE WHEN aiUrgency >= 6 AND aiUrgency < 8 THEN 1 END) as high,
        COUNT(CASE WHEN aiUrgency >= 4 AND aiUrgency < 6 THEN 1 END) as medium,
        COUNT(CASE WHEN aiUrgency < 4 THEN 1 END) as low
      FROM messages
      WHERE ${dateFilter} ${accountFilter}
        AND direction = 'received'
        AND aiUrgency IS NOT NULL
        ${BROADCAST_FILTER}
    `);

    const result = stmt.get();

    return {
      avgUrgency: result?.avgUrgency ? result.avgUrgency.toFixed(1) : 0,
      distribution: {
        critical: result?.critical || 0,
        high: result?.high || 0,
        medium: result?.medium || 0,
        low: result?.low || 0,
      },
    };
  },

  // SLA de resposta urgente
  getUrgentResponseSLA: (
    accountId = null,
    period = "today",
    targetMinutes = 15
  ) => {
    const dateFilter = getDateFilter(period, "m1.timestamp");
    const accountFilter = accountId ? `AND m1.senderId = '${accountId}'` : "";

    const stmt = db.prepare(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE 
          WHEN (julianday(m2.timestamp) - julianday(m1.timestamp)) * 24 * 60 <= ${targetMinutes}
          THEN 1 
        END) as onTime,
        AVG((julianday(m2.timestamp) - julianday(m1.timestamp)) * 24 * 60) as avgResponseTime
      FROM messages m1
      LEFT JOIN messages m2 ON 
        m2.direction = 'sent'
        AND m2.timestamp > m1.timestamp
        AND COALESCE(m2.contactSenderId, m2.contactReceiverId) = COALESCE(m1.contactSenderId, m1.contactReceiverId)
        AND m2.id = (
          SELECT id FROM messages m3
          WHERE m3.direction = 'sent'
            AND COALESCE(m3.contactSenderId, m3.contactReceiverId) = COALESCE(m1.contactSenderId, m1.contactReceiverId)
            AND m3.timestamp > m1.timestamp
          ORDER BY m3.timestamp ASC
          LIMIT 1
        )
      WHERE m1.direction = 'received'
        AND ${dateFilter}
        ${accountFilter}
        AND m1.aiUrgency >= 7
    `);

    const result = stmt.get();
    const total = result?.total || 0;
    const onTime = result?.onTime || 0;

    return {
      total,
      onTime,
      missed: total - onTime,
      slaRate: total > 0 ? ((onTime / total) * 100).toFixed(1) : 0,
      avgResponseTime: result?.avgResponseTime
        ? result.avgResponseTime.toFixed(1)
        : 0,
      targetMinutes,
    };
  },

  // ============================================
  // KPIs DE IA - ANÁLISE DE INTENÇÃO
  // ============================================

  // Distribuição de intenções
  getIntentDistribution: (accountId = null, period = "today") => {
    const dateFilter = getDateFilter(period);
    const accountFilter = accountId ? `AND senderId = '${accountId}'` : "";

    const stmt = db.prepare(`
      SELECT 
        aiIntent as intent,
        COUNT(*) as count,
        ROUND(AVG(aiIntentScore) * 100, 1) as avgConfidence
      FROM messages
      WHERE ${dateFilter} ${accountFilter}
        AND direction = 'received'
        AND aiIntent IS NOT NULL
        ${BROADCAST_FILTER}
      GROUP BY aiIntent
      ORDER BY count DESC
    `);

    const results = stmt.all();
    const total = results.reduce((sum, r) => sum + r.count, 0);

    return results.map((r) => ({
      intent: r.intent,
      count: r.count,
      percentage: total > 0 ? ((r.count / total) * 100).toFixed(1) : 0,
      avgConfidence: r.avgConfidence,
    }));
  },

  // Taxa de conversão por intenção
  getConversionByIntent: (accountId = null, period = "today") => {
    const dateFilter = getDateFilter(period);
    const accountFilter = accountId ? `AND m1.senderId = '${accountId}'` : "";

    const stmt = db.prepare(`
      SELECT 
        m1.aiIntent as intent,
        COUNT(DISTINCT COALESCE(m1.contactSenderId, m1.contactReceiverId)) as total,
        COUNT(DISTINCT CASE 
          WHEN EXISTS (
            SELECT 1 FROM messages m2 
            WHERE m2.direction = 'sent' 
            AND COALESCE(m2.contactSenderId, m2.contactReceiverId) = COALESCE(m1.contactSenderId, m1.contactReceiverId)
            AND m2.timestamp > m1.timestamp
            AND datetime(m2.timestamp) <= datetime(m1.timestamp, '+24 hours')
          ) THEN COALESCE(m1.contactSenderId, m1.contactReceiverId)
        END) as converted
      FROM messages m1
      WHERE ${dateFilter} ${accountFilter}
        AND m1.direction = 'received'
        AND m1.aiIntent IS NOT NULL
        ${BROADCAST_FILTER}
      GROUP BY m1.aiIntent
    `);

    const results = stmt.all();

    return results.map((r) => ({
      intent: r.intent,
      total: r.total,
      converted: r.converted,
      conversionRate:
        r.total > 0 ? ((r.converted / r.total) * 100).toFixed(1) : 0,
    }));
  },

  // Jornada do cliente (transições de intenção)
  getCustomerJourney: (accountId = null, period = "week") => {
    const dateFilter = getDateFilter(period);
    const accountFilter = accountId ? `AND senderId = '${accountId}'` : "";

    const stmt = db.prepare(`
      WITH intent_sequence AS (
        SELECT 
          COALESCE(contactSenderId, contactReceiverId) as contactId,
          aiIntent,
          timestamp,
          ROW_NUMBER() OVER (PARTITION BY COALESCE(contactSenderId, contactReceiverId) ORDER BY timestamp) as step
        FROM messages
        WHERE ${dateFilter} ${accountFilter}
          AND direction = 'received'
          AND aiIntent IS NOT NULL
          ${BROADCAST_FILTER}
      ),
      transitions AS (
        SELECT 
          s1.aiIntent as from_intent,
          s2.aiIntent as to_intent,
          COUNT(*) as count
        FROM intent_sequence s1
        INNER JOIN intent_sequence s2 ON 
          s1.contactId = s2.contactId
          AND s2.step = s1.step + 1
        GROUP BY s1.aiIntent, s2.aiIntent
      )
      SELECT * FROM transitions
      ORDER BY count DESC
      LIMIT 20
    `);

    return stmt.all();
  },

  // ============================================
  // KPIs DE IA - EXTRAÇÃO DE INFORMAÇÕES
  // ============================================

  // Produtos mencionados (extração de valores)
  getMostMentionedProducts: (accountId = null, period = "today") => {
    const dateFilter = getDateFilter(period);
    const accountFilter = accountId ? `AND senderId = '${accountId}'` : "";

    const stmt = db.prepare(`
      SELECT 
        content,
        aiExtractedValues,
        COUNT(*) as mentions
      FROM messages
      WHERE ${dateFilter} ${accountFilter}
        AND aiExtractedValues IS NOT NULL
        AND aiExtractedValues != '{}'
        ${BROADCAST_FILTER}
      GROUP BY content
      ORDER BY mentions DESC
      LIMIT 10
    `);

    return stmt.all();
  },

  // Valores monetários mencionados
  getMonetaryValues: (accountId = null, period = "today") => {
    const dateFilter = getDateFilter(period);
    const accountFilter = accountId ? `AND senderId = '${accountId}'` : "";

    const stmt = db.prepare(`
      SELECT 
        id,
        content,
        aiExtractedValues,
        timestamp
      FROM messages
      WHERE ${dateFilter} ${accountFilter}
        AND aiExtractedValues LIKE '%hasMoneyMention":true%'
        ${BROADCAST_FILTER}
      ORDER BY timestamp DESC
    `);

    const results = stmt.all();

    // Processar valores extraídos
    const values = [];
    results.forEach((r) => {
      try {
        const extracted = JSON.parse(r.aiExtractedValues);
        if (extracted.values && extracted.values.length > 0) {
          extracted.values.forEach((value) => {
            values.push({
              messageId: r.id,
              content: r.content.substring(0, 100),
              value: value,
              timestamp: r.timestamp,
            });
          });
        }
      } catch (e) {
        // Ignorar erros de parse
      }
    });

    const totalValues = values.map((v) => v.value);

    return {
      count: values.length,
      values: values.slice(0, 20), // Top 20
      avgTicket:
        totalValues.length > 0
          ? (
              totalValues.reduce((a, b) => a + b, 0) / totalValues.length
            ).toFixed(2)
          : 0,
      maxValue:
        totalValues.length > 0 ? Math.max(...totalValues).toFixed(2) : 0,
      minValue:
        totalValues.length > 0 ? Math.min(...totalValues).toFixed(2) : 0,
    };
  },

  // Sentimento geral
  getSentimentOverview: (accountId = null, period = "today") => {
    const dateFilter = getDateFilter(period);
    const accountFilter = accountId ? `AND senderId = '${accountId}'` : "";

    const stmt = db.prepare(`
      SELECT 
        aiSentiment as sentiment,
        COUNT(*) as count,
        ROUND(AVG(aiSentimentScore) * 100, 1) as avgConfidence
      FROM messages
      WHERE ${dateFilter} ${accountFilter}
        AND direction = 'received'
        AND aiSentiment IS NOT NULL
        ${BROADCAST_FILTER}
      GROUP BY aiSentiment
    `);

    const results = stmt.all();
    const total = results.reduce((sum, r) => sum + r.count, 0);

    return results.map((r) => ({
      sentiment: r.sentiment,
      count: r.count,
      percentage: total > 0 ? ((r.count / total) * 100).toFixed(1) : 0,
      avgConfidence: r.avgConfidence,
    }));
  },

  // Estatísticas de análise de IA
  getAIAnalysisStats: (accountId = null, period = "today") => {
    const dateFilter = getDateFilter(period);
    const accountFilter = accountId ? `AND senderId = '${accountId}'` : "";

    const stmt = db.prepare(`
      SELECT 
        COUNT(*) as totalMessages,
        COUNT(CASE WHEN aiAnalyzedAt IS NOT NULL THEN 1 END) as analyzedMessages,
        COUNT(CASE WHEN aiCategory IS NOT NULL THEN 1 END) as withCategory,
        COUNT(CASE WHEN aiUrgency IS NOT NULL THEN 1 END) as withUrgency,
        COUNT(CASE WHEN aiIntent IS NOT NULL THEN 1 END) as withIntent,
        COUNT(CASE WHEN aiSentiment IS NOT NULL THEN 1 END) as withSentiment
      FROM messages
      WHERE ${dateFilter} ${accountFilter}
        AND direction = 'received'
        ${BROADCAST_FILTER}
    `);

    const result = stmt.get();
    const total = result?.totalMessages || 0;

    return {
      totalMessages: total,
      analyzedMessages: result?.analyzedMessages || 0,
      analysisRate:
        total > 0 ? ((result.analyzedMessages / total) * 100).toFixed(1) : 0,
      coverage: {
        category: result?.withCategory || 0,
        urgency: result?.withUrgency || 0,
        intent: result?.withIntent || 0,
        sentiment: result?.withSentiment || 0,
      },
    };
  },

  // KPIs de Resumos (Summarization)
  getSummaryStats: () => {
    try {
      const result = db
        .prepare(
          `
        SELECT 
          COUNT(*) as totalSummaries,
          AVG(aiCompressionRate) as avgCompressionRate,
          AVG(aiOriginalLength) as avgOriginalLength,
          AVG(aiSummaryLength) as avgSummaryLength,
          SUM(CASE 
            WHEN aiOriginalLength > 0 THEN 
              CAST(aiOriginalLength AS REAL) * 0.25 / 60
            ELSE 0 
          END) as totalOriginalReadingTimeMinutes,
          SUM(CASE 
            WHEN aiSummaryLength > 0 THEN 
              CAST(aiSummaryLength AS REAL) * 0.25 / 60
            ELSE 0 
          END) as totalSummaryReadingTimeMinutes
        FROM messages 
        WHERE aiSummary IS NOT NULL
      `
        )
        .get();

      const timeSavedMinutes =
        (result?.totalOriginalReadingTimeMinutes || 0) -
        (result?.totalSummaryReadingTimeMinutes || 0);

      return {
        total: result?.totalSummaries || 0,
        avgCompressionRate: result?.avgCompressionRate || 0,
        avgOriginalLength: Math.round(result?.avgOriginalLength || 0),
        avgSummaryLength: Math.round(result?.avgSummaryLength || 0),
        timeSavedMinutes: Math.round(timeSavedMinutes * 100) / 100,
        timeSavedHours: Math.round((timeSavedMinutes / 60) * 100) / 100,
      };
    } catch (error) {
      console.error("[Database] Erro ao obter estatísticas de resumo:", error);
      return {
        total: 0,
        avgCompressionRate: 0,
        avgOriginalLength: 0,
        avgSummaryLength: 0,
        timeSavedMinutes: 0,
        timeSavedHours: 0,
      };
    }
  },

  // Obter resumos de conversas recentes
  getRecentSummaries: (limit = 10) => {
    try {
      const results = db
        .prepare(
          `
        SELECT 
          m.id,
          c.number as remoteJid,
          c.name as pushName,
          m.content as body,
          m.aiSummary,
          m.aiOriginalLength,
          m.aiSummaryLength,
          m.aiCompressionRate,
          m.timestamp
        FROM messages m
        LEFT JOIN contacts c ON c.id = m.contactSenderId
        WHERE m.aiSummary IS NOT NULL
        ORDER BY m.timestamp DESC
        LIMIT ?
      `
        )
        .all(limit);

      return results.map((row) => ({
        id: row.id,
        contact: row.pushName || row.remoteJid,
        remoteJid: row.remoteJid,
        originalText: row.body,
        summary: row.aiSummary,
        originalLength: row.aiOriginalLength,
        summaryLength: row.aiSummaryLength,
        compressionRate: row.aiCompressionRate,
        timeSavedSeconds: Math.round(
          (row.aiOriginalLength - row.aiSummaryLength) * 0.25
        ),
        timestamp: row.timestamp,
      }));
    } catch (error) {
      console.error("[Database] Erro ao obter resumos recentes:", error);
      return [];
    }
  },

  // Estatísticas de economia de tempo por contato
  getSummaryStatsByContact: () => {
    try {
      const results = db
        .prepare(
          `
        SELECT 
          c.number as remoteJid,
          c.name as pushName,
          COUNT(*) as summaryCount,
          AVG(m.aiCompressionRate) as avgCompressionRate,
          SUM(CASE 
            WHEN m.aiOriginalLength > 0 THEN 
              CAST(m.aiOriginalLength - m.aiSummaryLength AS REAL) * 0.25 / 60
            ELSE 0 
          END) as timeSavedMinutes
        FROM messages m
        LEFT JOIN contacts c ON c.id = m.contactSenderId
        WHERE m.aiSummary IS NOT NULL
        GROUP BY c.number
        ORDER BY timeSavedMinutes DESC
        LIMIT 10
      `
        )
        .all();

      return results.map((row) => ({
        contact: row.pushName || row.remoteJid,
        remoteJid: row.remoteJid,
        summaryCount: row.summaryCount,
        avgCompressionRate: Math.round(row.avgCompressionRate * 100) / 100,
        timeSavedMinutes: Math.round(row.timeSavedMinutes * 100) / 100,
      }));
    } catch (error) {
      console.error(
        "[Database] Erro ao obter estatísticas por contato:",
        error
      );
      return [];
    }
  },
};

// ============================================
// EXPORT DB (para queries customizadas)
// ============================================

export { db };
export default { accounts, contacts, messages, dashboardKPIs, db };
