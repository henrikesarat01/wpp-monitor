#!/bin/bash

# Script de Setup Inicial do WPP Monitor
# Execute: chmod +x setup.sh && ./setup.sh

echo "🚀 Iniciando setup do WPP Monitor..."
echo ""

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado!"
    echo "Por favor, instale Node.js 18+ de https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "⚠️  Node.js versão $NODE_VERSION detectada"
    echo "Recomendamos Node.js 18 ou superior"
fi

echo "✅ Node.js $(node -v) detectado"
echo ""

# Instalar dependências
echo "📦 Instalando dependências..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Erro ao instalar dependências"
    exit 1
fi

echo "✅ Dependências instaladas"
echo ""

# Gerar Prisma
echo "🔨 Gerando cliente Prisma..."
npm run prisma:generate

if [ $? -ne 0 ]; then
    echo "❌ Erro ao gerar Prisma"
    exit 1
fi

echo "✅ Cliente Prisma gerado"
echo ""

# Criar estrutura de pastas
echo "📁 Criando estrutura de pastas..."
mkdir -p data/sessions
touch data/logs.txt

echo "✅ Estrutura de pastas criada"
echo ""

# Criar banco de dados
echo "🗄️  Criando banco de dados..."
npm run prisma:migrate

if [ $? -ne 0 ]; then
    echo "⚠️  Aviso: Pode ser necessário criar o banco manualmente"
fi

echo "✅ Banco de dados pronto"
echo ""

echo "✨ Setup concluído com sucesso!"
echo ""
echo "Para iniciar a aplicação, execute:"
echo "  npm run dev"
echo ""
echo "📖 Leia o GUIA.md para instruções detalhadas"
