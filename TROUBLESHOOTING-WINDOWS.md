# 🔧 Troubleshooting - Windows

## ❌ Problema: Tela Preta ao Abrir

### **Causas Comuns:**

1. **Arquivos não carregaram corretamente**
2. **Servidor backend não iniciou**
3. **Antivírus bloqueou execução**
4. **Porta 3000 ocupada**

---

## ✅ Soluções

### **1. Ver Logs de Debug**

**Abrir DevTools no app:**

```
1. Abra o WPP Monitor
2. Pressione: Ctrl + Shift + I
3. Vá na aba "Console"
4. Procure por erros em vermelho
```

**Logs incluem:**

```
[MAIN] App ready, iniciando servidor...
[MAIN] isPackaged: true
[MAIN] Importando módulo do servidor...
[MAIN] Iniciando servidor...
[MAIN] ✅ Servidor iniciado com sucesso!
[MAIN] Carregando arquivo: C:\...\dist\index.html
[MAIN] ✅ Página carregada com sucesso!
```

---

### **2. Verificar Porta 3000**

**Ver se porta está ocupada:**

```cmd
netstat -ano | findstr :3000
```

**Se estiver ocupada, fechar processo:**

```cmd
taskkill /PID [numero_do_pid] /F
```

---

### **3. Desabilitar Antivírus Temporariamente**

Alguns antivírus bloqueiam Node.js/Electron:

1. Windows Defender → Proteção em tempo real → Desligar
2. Tente abrir WPP Monitor novamente
3. Se funcionar, adicione exceção para a pasta do app

**Adicionar exceção:**

```
Windows Defender → Proteção contra vírus e ameaças
→ Configurações → Exclusões → Adicionar pasta
→ C:\Program Files\WPP Monitor\
```

---

### **4. Reinstalar Limpo**

```cmd
# Desinstalar
Control Panel → Programs → Uninstall WPP Monitor

# Apagar dados residuais
del /s /q "%APPDATA%\wpp-monitor"

# Reinstalar
WPP Monitor-Setup-1.0.0.exe
```

---

### **5. Verificar Logs do Sistema**

**Localização dos logs:**

```
C:\Users\{SeuUsuario}\AppData\Roaming\wpp-monitor\data\logs\
```

**Ver último log:**

```cmd
cd %APPDATA%\wpp-monitor\data\logs
type logs.txt
```

---

### **6. Executar como Administrador**

```
1. Feche o WPP Monitor
2. Clique direito no ícone
3. "Executar como administrador"
```

---

### **7. Verificar Requisitos do Sistema**

| Requisito      | Mínimo         |
| -------------- | -------------- |
| Windows        | 10/11 (64-bit) |
| RAM            | 4 GB           |
| Espaço         | 500 MB         |
| .NET Framework | 4.5+           |

---

## 🐛 Problemas Conhecidos

### **Tela preta mas servidor iniciou**

**Sintoma:**

```
Console mostra:
[MAIN] ✅ Servidor iniciado com sucesso!
[MAIN] ❌ Falha ao carregar: -6
```

**Solução:**

```
Arquivo index.html não encontrado.
Reinstale o aplicativo.
```

---

### **Erro: "Cannot find module"**

**Sintoma:**

```
[MAIN] ❌ Falha ao iniciar backend: Cannot find module './src/server/server.js'
```

**Solução:**

```
1. Desinstalar completamente
2. Baixar nova versão do instalador
3. Reinstalar
```

---

### **Erro: "Port 3000 already in use"**

**Sintoma:**

```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solução:**

```cmd
# Encontrar processo na porta 3000
netstat -ano | findstr :3000

# Matar processo
taskkill /PID [PID_AQUI] /F

# Reiniciar WPP Monitor
```

---

## 📞 Ainda com Problemas?

### **Envie as seguintes informações:**

1. **Versão do Windows:**

   ```cmd
   winver
   ```

2. **Logs do Console:**

   - Abra DevTools (Ctrl+Shift+I)
   - Copie tudo da aba Console
   - Cole em um arquivo .txt

3. **Logs do Sistema:**

   ```cmd
   type %APPDATA%\wpp-monitor\data\logs\logs.txt
   ```

4. **Screenshot do erro**

---

## ✅ Checklist de Diagnóstico

- [ ] Porta 3000 está livre
- [ ] Antivírus não está bloqueando
- [ ] App executando como administrador
- [ ] Logs do console verificados
- [ ] Reinstalação limpa realizada
- [ ] DevTools mostra erro específico
- [ ] Windows 10/11 64-bit
- [ ] Espaço em disco suficiente (500MB+)

---

## 🔄 Build Corrigido

**Versão 1.0.1 (11/Nov/2025):**

- ✅ Corrigido detecção de modo produção (`app.isPackaged`)
- ✅ Corrigido caminho do dist (de `dist/renderer` para `dist`)
- ✅ Adicionado logs de debug detalhados
- ✅ Adicionado handlers de erro de carregamento

**Nova versão disponível em:**

```
dist-installer/WPP Monitor-Setup-1.0.0.exe (103MB)
```

---

**Desenvolvido com ❤️ - WPP Monitor Team**
