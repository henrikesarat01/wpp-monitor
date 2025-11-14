# 📦 Guia de Build - WPP Monitor

## 🎯 Objetivo
Criar instalador executável (.exe) do WPP Monitor para Windows.

---

## ✅ Pré-requisitos

### No Windows:
- **Node.js 18+** - [Download](https://nodejs.org/)
- **Git** (opcional) - [Download](https://git-scm.com/)
- **Visual Studio Build Tools** (para compilar dependências nativas)
  ```cmd
  npm install --global windows-build-tools
  ```

---

## 🚀 Método 1: Build Automático (Recomendado)

### **Passo 1: Preparar ambiente**
```cmd
# Instalar dependências
npm install

# Gerar Prisma Client
npm run prisma:generate
```

### **Passo 2: Executar build**
```cmd
# Opção A: Instalador NSIS (recomendado)
npm run build:win

# Opção B: Versão Portable (sem instalação)
npm run build:win-portable

# Opção C: Build tudo (Windows + Mac + Linux)
npm run build:all
```

### **Passo 3: Localizar instalador**
```
dist-installer/
├── WPP Monitor-Setup-1.0.0.exe    ← Instalador Windows
└── WPP Monitor-Portable-1.0.0.exe ← Versão Portable
```

---

## 🔧 Método 2: Build Manual

```cmd
# 1. Limpar builds anteriores
rmdir /s /q dist-installer
rmdir /s /q dist

# 2. Instalar dependências
npm install

# 3. Gerar Prisma
npm run prisma:generate

# 4. Build do frontend (Vite)
npm run build

# 5. Build do instalador
npx electron-builder --win --x64
```

---

## 📁 Estrutura de Arquivos para Build

```
monitor-whats/
├── build/                    ← Recursos de build
│   ├── icon.ico             ← Ícone Windows (256x256)
│   ├── icon.icns            ← Ícone macOS (512x512)
│   └── icon.png             ← Ícone Linux (512x512)
├── dist/                     ← Build do Vite (gerado)
├── dist-installer/           ← Instaladores (gerado)
├── prisma/                   ← Schema e migrations
├── src/                      ← Código fonte
├── main.js                   ← Electron main
├── preload.js               ← Electron preload
└── package.json             ← Configuração
```

---

## 🎨 Criar Ícones (Obrigatório)

### **1. Preparar imagem base**
- Crie ou obtenha logo em **PNG 512x512px**
- Fundo transparente recomendado

### **2. Converter para formatos necessários**

**Windows (.ico):**
```
1. Acesse: https://cloudconvert.com/png-to-ico
2. Upload da imagem PNG
3. Configure: 256x256, 128x128, 64x64, 48x48, 32x32, 16x16
4. Baixe e salve como: build/icon.ico
```

**macOS (.icns):**
```
1. Acesse: https://cloudconvert.com/png-to-icns
2. Upload da imagem PNG 512x512
3. Baixe e salve como: build/icon.icns
```

**Linux (.png):**
```
Copie o PNG 512x512 diretamente para: build/icon.png
```

---

## ⚙️ Configuração Avançada

### **Personalizar Instalador (package.json)**

```json
"build": {
  "appId": "com.suaempresa.wppmonitor",     // Seu ID único
  "productName": "Seu Nome",                 // Nome do produto
  "copyright": "Copyright © 2025 Sua Empresa",
  
  "nsis": {
    "oneClick": false,                       // Permitir escolher pasta
    "allowToChangeInstallationDirectory": true,
    "createDesktopShortcut": true,          // Atalho desktop
    "createStartMenuShortcut": true,        // Atalho menu iniciar
    "installerLanguages": ["pt_BR", "en_US"]
  }
}
```

---

## 🧪 Testar Instalador

### **Antes de distribuir:**

1. **Instale em máquina limpa** (sem Node.js)
2. **Teste funcionalidades principais:**
   - Adicionar conta
   - Escanear QR Code
   - Enviar/receber mensagens
   - Reconexão após reiniciar
3. **Verifique logs em:**
   - `C:\Users\{Usuario}\AppData\Roaming\wpp-monitor\data\logs\`

---

## 📦 Distribuição

### **Método 1: Download Direto**
```
Hospedar em:
- Google Drive / Dropbox
- GitHub Releases
- Seu próprio site
```

### **Método 2: Auto-update (Avançado)**
```javascript
// Adicionar ao package.json
"build": {
  "publish": {
    "provider": "github",
    "owner": "seu-usuario",
    "repo": "wpp-monitor"
  }
}
```

---

## 🐛 Troubleshooting

### **Erro: "não é possível encontrar módulo @prisma/client"**
```cmd
npm run prisma:generate
npm run build:win
```

### **Erro: "Python not found"**
```cmd
npm install --global windows-build-tools
```

### **Erro: "icon.ico not found"**
```
Crie os ícones conforme seção "Criar Ícones"
```

### **Build muito grande (>200MB)**
```
Normal! Inclui:
- Node.js runtime
- Chromium (Electron)
- Dependências nativas
```

---

## 📊 Tamanhos Esperados

| Componente | Tamanho |
|------------|---------|
| Instalador .exe | ~150-200 MB |
| Instalado | ~250-300 MB |
| Portable .exe | ~200-250 MB |

---

## ✅ Checklist Final

- [ ] Ícones criados (icon.ico, icon.icns, icon.png)
- [ ] LICENSE criado
- [ ] package.json configurado
- [ ] `npm run build:win` executado com sucesso
- [ ] Instalador testado em Windows limpo
- [ ] Funcionalidades principais testadas
- [ ] Logs verificados

---

## 📞 Suporte

Problemas? Abra issue no GitHub ou consulte:
- [Electron Builder Docs](https://www.electron.build/)
- [Electron Docs](https://www.electronjs.org/docs)
- [Baileys Docs](https://github.com/WhiskeySockets/Baileys)

---

**Desenvolvido com ❤️ usando Electron + Baileys + Prisma**
