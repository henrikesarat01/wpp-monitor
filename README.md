# WPP Monitor

Monitor múltiplos números de WhatsApp Business localmente usando Electron + React + Baileys.

## 🚀 Características

- ✅ Múltiplas contas WhatsApp simultâneas
- ✅ Interface moderna com React + TypeScript + TailwindCSS
- ✅ 100% local - sem servidor online
- ✅ Monitoramento em tempo real via Socket.io
- ✅ Banco de dados SQLite local
- ✅ QR Code para autenticação
- ✅ Estatísticas e logs
- ✅ Armazenamento de mensagens e contatos

## 📋 Requisitos

- Node.js 18+ 
- npm ou yarn

## 🛠️ Instalação

```bash
# Instalar dependências
npm install

# Gerar cliente Prisma
npm run prisma:generate

# Criar banco de dados
npm run prisma:migrate
```

## 💻 Desenvolvimento

```bash
# Iniciar aplicação em modo desenvolvimento
npm run dev
```

Isso irá:
1. Iniciar o servidor Vite (React) na porta 5173
2. Iniciar o servidor Express (API) na porta 3000
3. Abrir a aplicação Electron

## 🏗️ Build

```bash
# Build para produção
npm run build
```

## 📁 Estrutura do Projeto

```
wpp-monitor/
├── src/
│   ├── server/              # Backend (Express + Baileys)
│   │   ├── index.ts         # Servidor principal
│   │   ├── baileys.ts       # Integração WhatsApp
│   │   ├── database.ts      # Gerenciador SQLite
│   │   ├── socket.ts        # Socket.io
│   │   └── types.ts         # Types compartilhados
│   │
│   └── renderer/            # Frontend (React)
│       ├── components/      # Componentes React
│       ├── context/         # Context API
│       ├── hooks/           # Custom hooks
│       ├── utils/           # Utilitários
│       └── styles/          # CSS/Tailwind
│
├── data/                    # Dados locais
│   ├── sessions/            # Sessões WhatsApp
│   ├── database.sqlite      # Banco de dados
│   └── logs.txt             # Logs
│
├── main.ts                  # Processo principal Electron
├── preload.ts               # Preload script
└── prisma/
    └── schema.prisma        # Schema do banco
```

## 🔐 Segurança

- Todos os dados são armazenados localmente
- Nenhuma informação é enviada para servidores externos
- Sessões WhatsApp criptografadas pelo Baileys
- Comunicação segura entre processos Electron

## 📝 Como Usar

1. **Adicionar Conta**
   - Clique em "Adicionar Conta"
   - Preencha nome e número
   - Escaneie o QR Code com WhatsApp

2. **Monitorar Mensagens**
   - Selecione uma conta na sidebar
   - Escolha um contato
   - Visualize mensagens em tempo real

3. **Ver Estatísticas**
   - Clique no ícone de gráfico
   - Veja métricas e mensagens por hora

4. **Consultar Logs**
   - Clique no ícone de arquivo
   - Visualize, filtre ou baixe logs

## 🛡️ Tecnologias

- **Frontend**: React 18, TypeScript, TailwindCSS, Lucide Icons
- **Backend**: Node.js, Express, Socket.io
- **Desktop**: Electron
- **WhatsApp**: Baileys
- **Database**: SQLite + Prisma ORM
- **Build**: Vite

## ⚠️ Avisos

- Use apenas com contas próprias
- Respeite os termos de uso do WhatsApp
- Não use para spam ou automações proibidas
- Aplicação apenas para monitoramento pessoal/empresarial

## 📄 Licença

MIT

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou pull requests.

---

**WPP Monitor** - Monitor WhatsApp 100% Local 🚀
