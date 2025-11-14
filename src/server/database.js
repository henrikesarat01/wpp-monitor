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

// Garantir que a pasta data existe
const dataDir = path.join(DATA_PATH, "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Abrir/criar banco de dados
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL"); // Melhor performance

console.log("[DATABASE] Conectado:", DB_PATH);

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
`);

console.log("[DATABASE] Tabelas criadas/verificadas");

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
    const stmt = db.prepare(`
      INSERT INTO accounts (id, name, number, status, dataLogin)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    stmt.run(id, data.name, data.number, data.status || "disconnected");

    return { id, ...data, createdAt: new Date(), updatedAt: new Date() };
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

    let query = `SELECT * FROM contacts`;
    const params = [];

    // WHERE com IN
    if (where.id?.in) {
      const placeholders = where.id.in.map(() => "?").join(",");
      query += ` WHERE id IN (${placeholders})`;
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
      const stmt = db.prepare(`
        INSERT INTO contacts (id, name, number)
        VALUES (?, ?, ?)
      `);

      stmt.run(id, create.name || null, create.number);

      return { id, ...create, createdAt: new Date(), updatedAt: new Date() };
    }
  },

  delete: ({ where }) => {
    const field = Object.keys(where)[0];
    const stmt = db.prepare(`DELETE FROM contacts WHERE ${field} = ?`);
    stmt.run(where[field]);
    return { id: where[field] };
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
    const stmt = db.prepare(`
      INSERT INTO messages (
        id, content, direction, type, senderId, receiverId,
        contactSenderId, contactReceiverId, providerId, mediaUrl
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      data.mediaUrl || null
    );

    return {
      id,
      ...data,
      timestamp: new Date(),
      createdAt: new Date(),
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
};

// ============================================
// EXPORT DB (para queries customizadas)
// ============================================

export { db };
export default { accounts, contacts, messages, db };
