# Guia de Instalação e Uso - WPP Monitor

## 📦 Instalação Completa

### 1. Pré-requisitos

Antes de começar, certifique-se de ter instalado:

- **Node.js 18+** - [Download](https://nodejs.org/)
- **npm** (vem com Node.js) ou **yarn**
- **Git** (opcional)

### 2. Instalação das Dependências

```bash
# Entre na pasta do projeto
cd monitor-whats

# Instale todas as dependências
npm install

# Gere o cliente Prisma
npm run prisma:generate

# Crie o banco de dados (primeira vez)
npm run prisma:migrate
```

**Nota**: Durante `npm install`, o Prisma será automaticamente gerado através do script `postinstall`.

## 🚀 Executando a Aplicação

### Modo Desenvolvimento

```bash
npm run dev
```

Isso irá:
1. ✅ Iniciar o Vite dev server (React) em `http://localhost:5173`
2. ✅ Compilar o TypeScript do Electron
3. ✅ Abrir a janela do Electron
4. ✅ Iniciar o servidor Express interno em `http://localhost:3000`
5. ✅ Conectar ao Socket.io para atualizações em tempo real

### Primeira Execução

Na primeira vez que você executar, a aplicação irá:
- Criar a pasta `data/` automaticamente
- Criar o arquivo `database.sqlite`
- Criar a pasta `sessions/` para armazenar autenticações
- Criar o arquivo `logs.txt`

## 📱 Conectando uma Conta WhatsApp

### Passo a Passo

1. **Abra a aplicação** executando `npm run dev`

2. **Clique em "Adicionar Conta"** na sidebar esquerda

3. **Preencha o formulário:**
   - **Nome da Conta**: Ex: "Atendimento Principal", "Vendas", etc.
   - **Número WhatsApp**: No formato internacional
     - Exemplo: `5511999999999` (Brasil)
     - Formato: Código do país + DDD + Número
     - **Sem** espaços, parênteses ou hífens

4. **Clique em "Continuar"**

5. **Escaneie o QR Code:**
   - Abra o WhatsApp no seu celular
   - Toque em **Menu** (⋮) ou **Configurações**
   - Toque em **Aparelhos conectados**
   - Toque em **Conectar um aparelho**
   - Aponte a câmera para o QR Code na tela

6. **Aguarde a conexão**
   - O status mudará de "Aguardando QR" → "Conectado"
   - A conta aparecerá na sidebar com um ponto verde

## 💬 Monitorando Mensagens

### Visualizar Conversas

1. **Selecione uma conta** na sidebar (lado esquerdo)
2. **Veja a lista de contatos** que aparecem no painel central
3. **Clique em um contato** para ver o histórico de mensagens
4. As mensagens são exibidas em tempo real conforme chegam

### Entendendo as Cores

- 🔵 **Azul**: Mensagens enviadas pela conta conectada
- ⚪ **Branco**: Mensagens recebidas

### Atualizações em Tempo Real

- Novas mensagens aparecem automaticamente
- Não é necessário atualizar manualmente
- O scroll automático leva para a última mensagem

## 📊 Visualizando Estatísticas

1. Clique no ícone **📊 Gráfico** no header superior direito
2. Veja as métricas:
   - Total de contas conectadas
   - Total de mensagens
   - Total de contatos
   - Gráfico de mensagens por hora

## 📝 Consultando Logs

1. Clique no ícone **📄 Arquivo** no header superior direito
2. Visualize todos os eventos do sistema
3. **Filtros disponíveis:**
   - Todos
   - INFO (informações gerais)
   - WARN (avisos)
   - ERROR (erros)
4. **Ações:**
   - 🔄 Atualizar logs
   - 💾 Baixar logs
   - 🗑️ Limpar logs

## 🗂️ Estrutura de Dados Local

Todos os dados são salvos em:

```
monitor-whats/
└── data/
    ├── sessions/                    # Sessões WhatsApp
    │   └── 5511999999999/          # Uma pasta por número
    │       ├── creds.json          # Credenciais
    │       └── keys/               # Chaves de criptografia
    │
    ├── database.sqlite              # Banco de dados SQLite
    └── logs.txt                     # Logs do sistema
```

### Backup dos Dados

Para fazer backup:
```bash
# Copie toda a pasta data/
cp -r data/ backup-data/
```

Para restaurar:
```bash
# Restaure a pasta data/
cp -r backup-data/ data/
```

## 🔧 Solução de Problemas

### Problema: QR Code não aparece

**Solução:**
1. Verifique se o servidor está rodando (porta 3000)
2. Olhe os logs no console
3. Tente fechar e reabrir a aplicação

### Problema: Conta não conecta após QR Code

**Solução:**
1. Verifique sua conexão com a internet
2. Certifique-se de que o número está correto
3. Tente remover e adicionar a conta novamente
4. Delete a pasta `data/sessions/[número]` e tente novamente

### Problema: Mensagens não aparecem

**Solução:**
1. Verifique se a conta está com status "Conectado" (ponto verde)
2. Clique no botão 🔄 Atualizar no header
3. Verifique os logs para erros

### Problema: Erro ao instalar dependências

**Solução:**
```bash
# Limpe o cache do npm
npm cache clean --force

# Delete node_modules e package-lock.json
rm -rf node_modules package-lock.json

# Reinstale
npm install
```

### Problema: Erro do Prisma

**Solução:**
```bash
# Regenere o cliente Prisma
npm run prisma:generate

# Se necessário, recrie o banco
rm data/database.sqlite
npm run prisma:migrate
```

## 🛡️ Segurança e Privacidade

### Dados Locais

- ✅ **Todos os dados ficam no seu computador**
- ✅ Nenhuma informação é enviada para servidores externos
- ✅ Sessões WhatsApp são criptografadas
- ✅ Banco de dados local (SQLite)

### Recomendações

- 🔒 Não compartilhe a pasta `data/sessions/`
- 🔒 Faça backup regular da pasta `data/`
- 🔒 Use apenas em contas próprias
- 🔒 Respeite os termos de uso do WhatsApp

## 🎯 Casos de Uso

### Uso Pessoal
- Monitorar múltiplas contas pessoais
- Manter histórico de conversas
- Análise de padrões de mensagens

### Uso Empresarial
- Monitorar contas de atendimento
- Supervisão de equipes
- Análise de métricas
- Backup de conversas importantes

## ⚠️ Limitações

- Apenas **leitura** de mensagens (não envia)
- Requer WhatsApp instalado no celular
- Depende de conexão com internet
- Não funciona com WhatsApp GB ou modificados

## 🔄 Atualizações

Para atualizar a aplicação:

```bash
# Faça backup dos dados
cp -r data/ backup-data/

# Atualize o código
git pull  # Se estiver usando git

# Reinstale dependências se necessário
npm install

# Regenere o Prisma se houve mudanças no schema
npm run prisma:generate
```

## 📞 Suporte

Para problemas ou dúvidas:

1. Verifique os logs da aplicação
2. Consulte esta documentação
3. Abra uma issue no GitHub
4. Consulte a documentação do Baileys

---

**WPP Monitor** - Monitore seu WhatsApp de forma segura e local! 🚀
