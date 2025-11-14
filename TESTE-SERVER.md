# Como Testar se o Servidor Está Funcionando

## Após Instalar no Windows

### 1. Instale o novo instalador:

```
dist-installer\WPP Monitor-Setup-1.0.0.exe
```

### 2. Abra o aplicativo WPP Monitor

### 3. No Windows, abra o PowerShell ou Prompt de Comando e execute:

#### Testar se o servidor está rodando:

```powershell
curl http://localhost:3000/api/accounts
```

**Resposta esperada:** Array vazio `[]` ou lista de contas (se já tiver alguma conectada)

#### Testar se o Socket.io está respondendo:

```powershell
curl http://localhost:3000/socket.io/
```

**Resposta esperada:** Algo como `{"sid":"...","upgrades":["websocket"],"pingInterval":25000,"pingTimeout":20000}`

### 4. Verificar logs no DevTools do Electron

Dentro do aplicativo, pressione:

- `Ctrl + Shift + I` (Windows/Linux)
- `Cmd + Option + I` (Mac)

Procure por logs que começam com `[MAIN]`:

```
[MAIN] App ready, iniciando servidor...
[MAIN] __dirname: ...
[MAIN] isPackaged: true
[MAIN] app.getAppPath(): ...
[MAIN] Importando módulo do servidor...
[MAIN] Caminho do servidor: ./server-bundle.js
[MAIN] Módulo importado, iniciando servidor...
[MAIN] Servidor iniciado com sucesso!
```

### 5. Se o servidor NÃO estiver respondendo:

#### Verifique se a porta 3000 está em uso:

```powershell
netstat -ano | findstr :3000
```

#### Copie TODOS os logs do DevTools e me envie

---

## Comandos de Teste Completos (PowerShell)

Copie e cole no PowerShell após abrir o app:

```powershell
# Teste 1: Verificar API de contas
Write-Host "=== TESTE 1: API Accounts ===" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/accounts" -UseBasicParsing
    Write-Host "✓ Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "✓ Resposta: $($response.Content)" -ForegroundColor Green
} catch {
    Write-Host "✗ Erro: $_" -ForegroundColor Red
}

# Teste 2: Verificar Socket.io
Write-Host "`n=== TESTE 2: Socket.io ===" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/socket.io/" -UseBasicParsing
    Write-Host "✓ Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "✓ Resposta: $($response.Content)" -ForegroundColor Green
} catch {
    Write-Host "✗ Erro: $_" -ForegroundColor Red
}

# Teste 3: Verificar porta 3000
Write-Host "`n=== TESTE 3: Porta 3000 ===" -ForegroundColor Cyan
$port = netstat -ano | findstr :3000
if ($port) {
    Write-Host "✓ Porta 3000 está em uso:" -ForegroundColor Green
    Write-Host $port
} else {
    Write-Host "✗ Porta 3000 NÃO está em uso - servidor não iniciou!" -ForegroundColor Red
}

Write-Host "`n=== RESUMO ===" -ForegroundColor Yellow
Write-Host "Se TODOS os testes passaram: ✓ Servidor funcionando corretamente!"
Write-Host "Se algum teste falhou: Copie os logs do DevTools (Ctrl+Shift+I) e me envie"
```

---

## Comandos de Teste Completos (CMD)

Se preferir usar o Prompt de Comando:

```cmd
echo === TESTE 1: API Accounts ===
curl http://localhost:3000/api/accounts

echo.
echo === TESTE 2: Socket.io ===
curl http://localhost:3000/socket.io/

echo.
echo === TESTE 3: Porta 3000 ===
netstat -ano | findstr :3000
```

---

## O que mudou nesta versão?

1. ✅ O servidor agora é **bundled** em um arquivo único (`server-bundle.js`)
2. ✅ O `main.js` detecta automaticamente se está em produção e usa o bundle correto
3. ✅ Mais logs de debug para identificar problemas
4. ✅ Todas as dependências do servidor são incluídas no instalador

Se ainda não funcionar, me envie:

- Logs do DevTools completos
- Resultado dos comandos de teste acima
- Captura de tela do aplicativo
