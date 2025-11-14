# 🚀 Quick Start - WPP Monitor

## Início Rápido em 3 Passos

### 1️⃣ Instalar

```bash
npm install
```

### 2️⃣ Configurar

```bash
npm run prisma:generate
npm run prisma:migrate
```

### 3️⃣ Executar

```bash
npm run dev
```

## 📱 Adicionar WhatsApp

1. Clique em **"Adicionar Conta"**
2. Preencha:
   - Nome: `Minha Conta`
   - Número: `5511999999999` (país + DDD + número)
3. Escaneie o **QR Code** com WhatsApp
4. Pronto! ✅

## 📊 Interface

```
┌─────────────┬────────────────────────────────────────────┐
│  SIDEBAR    │            HEADER                          │
│             ├────────────────────────────────────────────┤
│  • Conta 1  │  CHAT LIST  │  CHAT WINDOW  │  [STATS]   │
│  • Conta 2  │             │               │             │
│  • Conta 3  │  Contatos   │   Mensagens   │ Estatísticas│
│             │             │               │             │
│  [+] Add    │             │               │             │
└─────────────┴─────────────┴───────────────┴─────────────┘
```

## 🎯 Atalhos

- **Adicionar Conta**: Botão na sidebar
- **Ver Stats**: Ícone 📊 no header
- **Ver Logs**: Ícone 📄 no header
- **Atualizar**: Ícone 🔄 no header

## 📖 Documentação Completa

- **README.md** - Visão geral
- **GUIA.md** - Guia detalhado de uso
- **TECNICO.md** - Documentação técnica
- **PROJETO.md** - Resumo do projeto

## ⚡ Comandos Úteis

```bash
# Desenvolvimento
npm run dev

# Build
npm run build

# Prisma
npm run prisma:generate
npm run prisma:migrate

# Limpar e reinstalar
rm -rf node_modules
npm install
```

## 🆘 Problemas Comuns

**QR Code não aparece?**
→ Aguarde alguns segundos ou reinicie

**Conta não conecta?**
→ Verifique o número e conexão internet

**Erro no Prisma?**
→ Execute `npm run prisma:generate`

## 📦 O que foi instalado?

- ✅ Electron (desktop)
- ✅ React + Vite (UI)
- ✅ Express (API)
- ✅ Baileys (WhatsApp)
- ✅ Socket.io (real-time)
- ✅ Prisma + SQLite (database)
- ✅ TailwindCSS (styles)

## 🎉 Pronto!

Agora é só usar! 🚀

**WPP Monitor** - Monitor WhatsApp 100% Local
