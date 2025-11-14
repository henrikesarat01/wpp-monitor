# WPP Monitor - Documentação Técnica

## 🏗️ Arquitetura do Sistema

O WPP Monitor é uma aplicação desktop híbrida que combina:

### Frontend (Renderer Process)
- **Framework**: React 18 com TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **State Management**: Context API
- **Real-time**: Socket.io Client
- **Icons**: Lucide React

### Backend (Main Process)
- **Runtime**: Node.js + Electron
- **API**: Express.js
- **WebSocket**: Socket.io Server
- **WhatsApp**: Baileys Library
- **Database**: SQLite + Prisma ORM

## 📊 Fluxo de Dados

```
┌─────────────────────────────────────────────────────────────┐
│                    ELECTRON MAIN PROCESS                     │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                   Express Server (Port 3000)            │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │ │
│  │  │   Baileys    │  │  Socket.io   │  │   Prisma     │ │ │
│  │  │  (WhatsApp)  │  │   (Events)   │  │  (Database)  │ │ │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │ │
│  └─────────┼──────────────────┼──────────────────┼─────────┘ │
└────────────┼──────────────────┼──────────────────┼───────────┘
             │                  │                  │
             │    ┌─────────────┼──────────────────┘
             │    │             │
┌────────────┼────┼─────────────┼──────────────────────────────┐
│            ▼    ▼             ▼                               │
│        ELECTRON RENDERER PROCESS                              │
│  ┌──────────────────────────────────────────────────────────┐│
│  │                    React Application                      ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ││
│  │  │  Components  │  │   Context    │  │    Hooks     │  ││
│  │  │              │  │              │  │              │  ││
│  │  │  - Sidebar   │  │  - AppContext│  │  - useSocket │  ││
│  │  │  - ChatList  │  │              │  │  - useApp    │  ││
│  │  │  - Messages  │  │              │  │              │  ││
│  │  └──────────────┘  └──────────────┘  └──────────────┘  ││
│  └──────────────────────────────────────────────────────────┘│
└───────────────────────────────────────────────────────────────┘
```

## 🔄 Ciclo de Vida da Aplicação

### 1. Inicialização

```typescript
// main.ts
app.whenReady()
  → startServer()      // Inicia Express + Baileys + Socket.io
  → createWindow()     // Cria janela Electron
  → loadURL()          // Carrega React app
```

### 2. Conexão WhatsApp

```typescript
// Frontend
addAccount(name, number)
  → POST /api/accounts
  
// Backend
baileysManager.connectAccount()
  → useMultiFileAuthState()
  → makeWASocket()
  → emit('qr-code')
  
// Frontend
socket.on('qr-code')
  → Display QR Code
  
// WhatsApp App
User scans QR
  → Baileys receives auth
  → emit('connection-status', 'connected')
```

### 3. Recebimento de Mensagens

```typescript
// Baileys Event
socket.ev.on('messages.upsert')
  → Parse message
  → db.createContact()
  → db.createMessage()
  → socketManager.emitNewMessage()
  
// Frontend
socket.on('new-message')
  → Update messages state
  → Render MessageItem
```

## 🗄️ Schema do Banco de Dados

### Tabela: accounts
```sql
CREATE TABLE accounts (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  number      TEXT UNIQUE NOT NULL,
  status      TEXT DEFAULT 'disconnected',
  dataLogin   DATETIME DEFAULT CURRENT_TIMESTAMP,
  createdAt   DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt   DATETIME
);
```

### Tabela: contacts
```sql
CREATE TABLE contacts (
  id        TEXT PRIMARY KEY,
  name      TEXT,
  number    TEXT UNIQUE NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME
);
```

### Tabela: messages
```sql
CREATE TABLE messages (
  id                  TEXT PRIMARY KEY,
  content             TEXT NOT NULL,
  timestamp           DATETIME DEFAULT CURRENT_TIMESTAMP,
  direction           TEXT NOT NULL, -- 'sent' | 'received'
  type                TEXT DEFAULT 'text',
  senderId            TEXT NOT NULL,
  receiverId          TEXT NOT NULL,
  contactSenderId     TEXT,
  contactReceiverId   TEXT,
  createdAt           DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (senderId) REFERENCES accounts(id),
  FOREIGN KEY (receiverId) REFERENCES accounts(id),
  FOREIGN KEY (contactSenderId) REFERENCES contacts(id),
  FOREIGN KEY (contactReceiverId) REFERENCES contacts(id)
);
```

## 🔌 API Endpoints

### Accounts
- `GET /api/accounts` - Lista todas as contas
- `POST /api/accounts` - Cria nova conta
  ```json
  {
    "name": "Atendimento",
    "number": "5511999999999"
  }
  ```
- `DELETE /api/accounts/:id` - Remove conta

### Contacts
- `GET /api/contacts` - Lista todos os contatos

### Messages
- `GET /api/messages/:accountId` - Mensagens de uma conta
- `GET /api/messages/:accountId/:contactNumber` - Conversa específica

### Stats
- `GET /api/stats` - Estatísticas gerais
  ```json
  {
    "totalAccounts": 3,
    "activeAccounts": 2,
    "totalMessages": 150,
    "totalContacts": 45,
    "messagesPerHour": [...]
  }
  ```

### Logs
- `GET /api/logs` - Retorna logs
- `DELETE /api/logs` - Limpa logs

## 🔐 Segurança

### Processo Principal (Electron)
- Context isolation habilitado
- Node integration desabilitado
- Preload script com API limitada

### Comunicação IPC
```typescript
// Preload expõe APIs seguras
contextBridge.exposeInMainWorld('electron', {
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
  getVersion: () => ipcRenderer.invoke('get-version'),
  platform: process.platform
});
```

### Armazenamento
- Credenciais WhatsApp criptografadas pelo Baileys
- Banco SQLite local
- Sem upload para servidores externos

## 📦 Estrutura de Componentes React

```
App.tsx
├── AppProvider (Context)
│   ├── Socket.io Client
│   ├── State Management
│   └── API Calls
│
├── Sidebar
│   ├── AccountList
│   └── AddAccountButton
│
├── Header
│   ├── AccountStatus
│   └── ActionButtons
│
├── ChatList
│   ├── SearchBar
│   └── ContactItems
│
├── ChatWindow
│   ├── ChatHeader
│   ├── MessagesList
│   │   └── MessageItem[]
│   └── InfoFooter
│
├── StatsPanel (conditional)
│   ├── StatCards
│   └── HourlyChart
│
└── Modals
    ├── AddAccountModal
    │   ├── FormStep
    │   └── QRCodeStep
    └── LogsModal
        ├── LogFilters
        └── LogsList
```

## 🎨 Padrão de Estilos

### TailwindCSS Utilities
```tsx
// Cores primárias
bg-blue-500     // Ações principais
bg-gray-50      // Backgrounds
bg-white        // Cards

// Espaçamento
p-4, m-4        // Padrão
gap-2, gap-4    // Espaçamento flex/grid

// Arredondamento
rounded-lg      // Padrão
rounded-xl      // Cards maiores
rounded-full    // Botões circulares

// Sombras
shadow-sm       // Sutil
shadow-2xl      // Modals
```

### Responsividade
- Layout fixo para desktop (mínimo 1000x700)
- Componentes adaptáveis internamente
- Scrolls personalizados

## 🧪 Testing (Futuro)

### Sugestões de Testes

1. **Unit Tests** (Jest + React Testing Library)
   - Componentes individuais
   - Funções utilitárias
   - Context providers

2. **Integration Tests**
   - Fluxo de adicionar conta
   - Recebimento de mensagens
   - API endpoints

3. **E2E Tests** (Playwright)
   - Fluxo completo de uso
   - Conexão WhatsApp
   - Navegação

## 🚀 Performance

### Otimizações Implementadas

1. **React**
   - Context API para evitar prop drilling
   - useMemo/useCallback onde necessário
   - Lazy loading de modais

2. **Socket.io**
   - Eventos específicos
   - Debouncing de atualizações
   - Reconexão automática

3. **Database**
   - Índices em campos de busca
   - Limit de queries
   - Transactions onde apropriado

## 📚 Dependências Principais

```json
{
  "@baileys/baileys": "^6.7.7",      // WhatsApp Web
  "@prisma/client": "^5.7.1",        // ORM
  "electron": "^28.0.0",             // Desktop
  "express": "^4.18.2",              // API Server
  "react": "^18.2.0",                // UI Framework
  "socket.io": "^4.6.1",             // WebSocket
  "tailwindcss": "^3.3.6",           // Styles
  "typescript": "^5.3.3"             // Type Safety
}
```

## 🔧 Configurações Importantes

### TypeScript
- `strict: true` - Type safety máxima
- `noUnusedLocals: true` - Clean code
- Dois tsconfig: um para Electron, um para React

### Vite
- HMR para desenvolvimento rápido
- Build otimizado para produção
- Alias @ para imports

### Prisma
- Auto-generate após npm install
- Migrations no data/
- SQLite provider

## 📖 Recursos Adicionais

- [Baileys Documentation](https://github.com/WhiskeySockets/Baileys)
- [Electron Guide](https://www.electronjs.org/docs/latest)
- [Prisma Docs](https://www.prisma.io/docs)
- [Socket.io Docs](https://socket.io/docs/v4)
- [TailwindCSS](https://tailwindcss.com/docs)

---

**WPP Monitor** - Arquitetura moderna, código limpo, 100% local! 🚀
