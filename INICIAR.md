# 🚀 WPP Monitor - Guia de Início Rápido

## Aplicação Funcionando! ✅

A aplicação **WPP Monitor** está configurada e pronta para uso.

### Como Iniciar

```bash
npm run dev
```

Este comando irá:
1. Iniciar o Vite dev server (porta 5173)
2. Compilar o servidor backend
3. Abrir a janela do Electron

### O que está rodando

- ✅ **Frontend (React + Vite)**: http://localhost:5173/
- ✅ **Backend (Express)**: http://localhost:3000
- ✅ **Socket.io**: Comunicação em tempo real ativa
- ✅ **Database (SQLite)**: `data/database.sqlite`
- ✅ **Electron**: Janela desktop

### Primeiros Passos

1. Na interface, clique em **"+ Adicionar Conta"**
2. Digite o número no formato internacional (ex: 5511999999999)
3. Escaneie o QR Code com o WhatsApp Web
4. Aguarde a conexão
5. Comece a monitorar suas mensagens!

### Estrutura de Dados

Todos os dados são armazenados localmente em:
- `data/database.sqlite` - Banco de dados SQLite
- `data/sessions/` - Sessões do WhatsApp (chaves de autenticação)

### Problemas?

Se a janela do Electron não abrir:
- Verifique se as portas 3000 e 5173 estão disponíveis
- Tente `npm run dev` novamente

### Funcionalidades Disponíveis

- ✅ Gerenciar múltiplas contas WhatsApp
- ✅ Visualizar conversas em tempo real
- ✅ Enviar mensagens
- ✅ Dashboard com estatísticas
- ✅ Logs de eventos
- ✅ Interface moderna e responsiva

## Desenvolvimento

### Build do Servidor

```bash
node build-server.js
```

### Compilar TypeScript

```bash
npx tsc -p tsconfig.json
```

### Build de Produção

```bash
npm run build
```

---

**Desenvolvido com ❤️ usando Electron + React + Baileys**
