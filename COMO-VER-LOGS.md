# 📋 Como Ver Logs do WPP Monitor

## 🖥️ Opção 1: Console do DevTools (Logs em Tempo Real)

### **Windows:**

1. **Abra o WPP Monitor**

2. **Pressione o atalho:**

   ```
   Ctrl + Shift + I
   ```

   OU clique com botão direito → "Inspecionar Elemento"

3. **Vá na aba "Console"**

4. **Você verá logs como:**

   ```
   [MAIN] App ready, iniciando servidor...
   [MAIN] __dirname: C:\Program Files\WPP Monitor\resources\app.asar
   [MAIN] isPackaged: true
   [MAIN] Importando módulo do servidor...
   [MAIN] Iniciando servidor...
   ✓ Database connected
   ✓ Socket.io initialized
   Servidor rodando em http://localhost:3000
   [MAIN] Servidor iniciado com sucesso!
   [MAIN] Carregando arquivo: C:\...\dist\index.html
   [MAIN] ✅ Página carregada com sucesso!
   ```

5. **Filtrar logs:**
   - Digite `[MAIN]` na caixa de filtro para ver apenas logs principais
   - Digite `💬` para ver apenas logs de mensagens WhatsApp
   - Digite `❌` para ver apenas erros

---

## 📁 Opção 2: Arquivo de Logs (Histórico)

### **Localização do arquivo:**

**Windows:**

```
C:\Users\{SeuUsuario}\AppData\Roaming\wpp-monitor\data\logs\logs.txt
```

**Atalho rápido:**

```
1. Pressione: Windows + R
2. Digite: %APPDATA%\wpp-monitor\data\logs
3. Enter
4. Abra: logs.txt
```

### **Ver logs no terminal:**

```cmd
# Abrir pasta
cd %APPDATA%\wpp-monitor\data\logs

# Ver últimas 50 linhas
powershell -command "Get-Content logs.txt -Tail 50"

# Ver em tempo real
powershell -command "Get-Content logs.txt -Wait -Tail 50"
```

---

## 🔍 Tipos de Logs

### **Logs do Sistema ([MAIN]):**

```
[MAIN] App ready, iniciando servidor...
[MAIN] isPackaged: true
[MAIN] Servidor iniciado com sucesso!
[MAIN] ✅ Página carregada com sucesso!
```

### **Logs do Servidor (✓):**

```
✓ Database connected
✓ Socket.io initialized
Servidor rodando em http://localhost:3000
```

### **Logs de WhatsApp (💬):**

```
💬 [WHATSAPP] Nova mensagem
💬 [MSG] isFromMe: false | remoteJid: 554491271434@s.whatsapp.net
💬 [MSG] ✅ PROCESSANDO mensagem...
💬 [WHATSAPP] Mensagem salva e emitida
```

### **Logs de Erro (❌):**

```
❌ [SIGNAL] Bad MAC para 554491271434@s.whatsapp.net
❌ [MAIN] Falha ao carregar: -6 ERR_FILE_NOT_FOUND
```

---

## 🐛 Exemplos de Uso

### **1. Verificar se servidor iniciou:**

```
Procure por:
[MAIN] ✅ Servidor iniciado com sucesso!
```

### **2. Verificar se página carregou:**

```
Procure por:
[MAIN] ✅ Página carregada com sucesso!
```

### **3. Ver mensagens recebidas:**

```
Filtre por: 💬 [WHATSAPP] Nova mensagem
```

### **4. Ver erros de conexão:**

```
Filtre por: ❌
```

### **5. Ver QR Code gerado:**

```
Procure por:
📱 [WHATSAPP] QR Code gerado
```

---

## 📊 Localização de Dados

### **Estrutura completa:**

```
%APPDATA%\wpp-monitor\
├── data\
│   ├── database.sqlite          ← Banco de dados
│   ├── logs\
│   │   └── logs.txt            ← Logs do servidor
│   └── sessions\
│       └── {accountId}\         ← Sessões WhatsApp
│           ├── creds.json
│           ├── app-state-sync-key-*.json
│           └── session-*.json
```

---

## 🔧 Troubleshooting

### **Problema: DevTools não abre**

**Solução:**

```
1. Feche o WPP Monitor
2. Clique direito no ícone
3. "Executar como administrador"
4. Tente Ctrl+Shift+I novamente
```

### **Problema: Logs.txt vazio**

**Causa:** Servidor não iniciou corretamente

**Solução:**

```
1. Abra DevTools (Ctrl+Shift+I)
2. Veja erros no Console
3. Procure por: [MAIN] ❌ Falha ao iniciar backend
```

### **Problema: Muitos logs, difícil de ler**

**Solução - Limpar console:**

```
1. No DevTools, clique direito no console
2. "Clear console" (ou Ctrl+L)
3. OU digite: console.clear() e Enter
```

---

## 📸 Screenshots Úteis

### **DevTools aberto:**

```
1. Console mostrando logs [MAIN]
2. Network mostrando requisições
3. Application mostrando Local Storage
```

### **Logs em tempo real:**

```
1. Abra DevTools
2. Mande mensagem no WhatsApp
3. Veja logs aparecendo instantaneamente
```

---

## 💡 Dicas Pro

### **1. Salvar logs para análise:**

```
1. Abra DevTools (Ctrl+Shift+I)
2. Clique direito no console
3. "Save as..." → logs-debug.txt
```

### **2. Filtros úteis:**

```
[MAIN]     → Logs principais do sistema
💬         → Logs de mensagens WhatsApp
❌         → Apenas erros
✅         → Sucessos
📱         → Logs de conexão WhatsApp
```

### **3. Ver logs de um número específico:**

```
Digite no filtro: 554491271434
```

### **4. Exportar logs do servidor:**

```cmd
copy %APPDATA%\wpp-monitor\data\logs\logs.txt C:\Desktop\logs-backup.txt
```

---

## 🎯 Checklist de Diagnóstico

Ao reportar problema, envie:

- [ ] Screenshot do Console (Ctrl+Shift+I)
- [ ] Conteúdo do logs.txt
- [ ] Versão do Windows
- [ ] Passo a passo para reproduzir
- [ ] Última mensagem antes do erro

---

**Desenvolvido com ❤️ - WPP Monitor Team**
