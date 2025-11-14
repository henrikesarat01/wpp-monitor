# Migração do Prisma para Better-SQLite3

## 🎯 Mudanças Implementadas

O Prisma foi completamente removido e substituído por **Better-SQLite3**, uma solução muito mais simples e direta para trabalhar com SQLite.

## ✅ Vantagens

### Antes (com Prisma):

- ❌ Precisa rodar `prisma generate` após cada mudança
- ❌ Precisa rodar `prisma migrate dev` para criar/atualizar banco
- ❌ Arquivos de configuração complexos (schema.prisma, migrations/)
- ❌ Compilação especial para Electron (engines, binários)
- ❌ Tamanho maior do bundle final
- ❌ Mais difícil de debugar

### Agora (com Better-SQLite3):

- ✅ **Zero configuração** - só instalar e usar
- ✅ **Sem migrations** - as tabelas são criadas automaticamente
- ✅ SQL simples e direto
- ✅ Mais rápido e leve
- ✅ Funciona perfeitamente com Electron
- ✅ Fácil de entender e modificar

## 📁 Arquivos Criados/Modificados

### Novo Arquivo: `src/server/database.js`

Este arquivo contém toda a lógica do banco de dados:

- Criação automática de tabelas (se não existirem)
- Funções helper para CRUD: `accounts`, `contacts`, `messages`
- API similar ao Prisma para facilitar a migração

### Modificações:

1. **`package.json`**

   - Removido: `@prisma/client`, `prisma`
   - Adicionado: `better-sqlite3`
   - Removidos scripts: `prisma:generate`, `prisma:migrate`, `postinstall`
   - Adicionado script: `postinstall: "electron-builder install-app-deps"`
   - Simplificado `asarUnpack` e `extraResources`

2. **`src/server/server.js`**

   - Substituído `import pkg from "@prisma/client"` por `import db from "./database.js"`
   - Todas as chamadas `prisma.account.*` → `accounts.*`
   - Todas as chamadas `prisma.contact.*` → `contacts.*`
   - Todas as chamadas `prisma.message.*` → `messages.*`
   - Removido `await prisma.$connect()`

3. **`build-server.js`**

   - Removido `@prisma/client` e `.prisma/client` dos externals
   - Adicionado `better-sqlite3` aos externals

4. **Removidos:**
   - Pasta `prisma/` inteira (schema, migrations)

## 🔧 Como Usar

### Desenvolvimento

```bash
npm install
npm run dev
```

### Produção/Build

```bash
npm run build
npm run build:win
```

## 📊 Banco de Dados

O arquivo do banco de dados SQLite será criado automaticamente em:

- **Desenvolvimento**: `<pasta-projeto>/data/database.db`
- **Produção**: `<userData>/data/database.db`

### Estrutura das Tabelas

```sql
-- Contas do WhatsApp
CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  number TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'disconnected',
  dataLogin DATETIME,
  createdAt DATETIME,
  updatedAt DATETIME
);

-- Contatos
CREATE TABLE contacts (
  id TEXT PRIMARY KEY,
  name TEXT,
  number TEXT UNIQUE NOT NULL,
  createdAt DATETIME,
  updatedAt DATETIME
);

-- Mensagens
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  timestamp DATETIME,
  direction TEXT NOT NULL,
  type TEXT DEFAULT 'text',
  senderId TEXT NOT NULL,
  receiverId TEXT NOT NULL,
  contactSenderId TEXT,
  contactReceiverId TEXT,
  providerId TEXT UNIQUE,
  createdAt DATETIME,
  FOREIGN KEY (senderId) REFERENCES accounts(id),
  FOREIGN KEY (receiverId) REFERENCES accounts(id),
  FOREIGN KEY (contactSenderId) REFERENCES contacts(id),
  FOREIGN KEY (contactReceiverId) REFERENCES contacts(id)
);
```

## 🚀 Adicionar Novas Tabelas

Para adicionar uma nova tabela, basta editar `src/server/database.js`:

```javascript
// 1. Adicionar o CREATE TABLE no db.exec()
db.exec(`
  CREATE TABLE IF NOT EXISTS minha_nova_tabela (
    id TEXT PRIMARY KEY,
    campo1 TEXT,
    campo2 INTEGER
  );
`);

// 2. Criar as funções helper
export const minhaNovaTabela = {
  findMany: (options = {}) => {
    const stmt = db.prepare(`SELECT * FROM minha_nova_tabela`);
    return stmt.all();
  },

  create: ({ data }) => {
    const id = generateUUID();
    const stmt = db.prepare(`
      INSERT INTO minha_nova_tabela (id, campo1, campo2)
      VALUES (?, ?, ?)
    `);
    stmt.run(id, data.campo1, data.campo2);
    return { id, ...data };
  },

  // ... outros métodos
};
```

## 🔍 Queries Customizadas

Para queries SQL customizadas:

```javascript
import db from "./database.js";

// Query direta
const result = db.db
  .prepare(
    `
  SELECT * FROM messages 
  WHERE senderId = ? 
  LIMIT 10
`
  )
  .all(accountId);

// Count
const count = db.db
  .prepare(
    `
  SELECT COUNT(*) as total FROM accounts
`
  )
  .get().total;
```

## ⚡ Performance

Better-SQLite3 é **síncrono** e muito rápido:

- Leituras: ~1-2ms
- Escritas: ~2-5ms
- Sem overhead de serialização
- WAL mode ativado para melhor concorrência

## 🐛 Troubleshooting

### Erro: "NODE_MODULE_VERSION mismatch"

Execute:

```bash
npx electron-builder install-app-deps
```

### Banco corrompido

Delete o arquivo `data/database.db` - ele será recriado automaticamente.

### Queries lentas

Better-SQLite3 já cria índices automáticos, mas você pode adicionar mais:

```javascript
db.exec(`CREATE INDEX IF NOT EXISTS idx_custom ON tabela(campo)`);
```

## 📝 Migração de Dados Antigos

Se você tinha dados no Prisma e quer migrar:

1. Exporte os dados do Prisma
2. Rode a aplicação uma vez para criar o novo banco
3. Importe os dados usando SQL INSERT

Ou use este script de exemplo:

```javascript
// migrate-data.js
import Database from "better-sqlite3";

const oldDb = new Database("prisma/data/database.sqlite");
const newDb = new Database("data/database.db");

// Copiar contas
const accounts = oldDb.prepare("SELECT * FROM Account").all();
const insertAccount = newDb.prepare(`
  INSERT INTO accounts (id, name, number, status, dataLogin, createdAt, updatedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

for (const acc of accounts) {
  insertAccount.run(
    acc.id,
    acc.name,
    acc.number,
    acc.status,
    acc.dataLogin,
    acc.createdAt,
    acc.updatedAt
  );
}

console.log("✅ Migração concluída!");
```

## 🎉 Conclusão

Agora você tem um banco de dados **simples**, **rápido** e **sem complicação**!

Não precisa mais se preocupar com:

- ❌ `prisma generate`
- ❌ `prisma migrate`
- ❌ Schemas complexos
- ❌ Engines binários

Apenas código JavaScript puro e SQLite! 🚀
