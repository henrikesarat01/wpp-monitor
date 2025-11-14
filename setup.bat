@echo off
REM Script de Setup Inicial do WPP Monitor (Windows)
REM Execute: setup.bat

echo ===================================
echo    WPP Monitor - Setup Inicial
echo ===================================
echo.

REM Verificar Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERRO] Node.js nao encontrado!
    echo Por favor, instale Node.js 18+ de https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js detectado
node -v
echo.

REM Instalar dependencias
echo Instalando dependencias...
call npm install

if %ERRORLEVEL% NEQ 0 (
    echo [ERRO] Falha ao instalar dependencias
    pause
    exit /b 1
)

echo [OK] Dependencias instaladas
echo.

REM Gerar Prisma
echo Gerando cliente Prisma...
call npm run prisma:generate

if %ERRORLEVEL% NEQ 0 (
    echo [ERRO] Falha ao gerar Prisma
    pause
    exit /b 1
)

echo [OK] Cliente Prisma gerado
echo.

REM Criar estrutura de pastas
echo Criando estrutura de pastas...
if not exist "data" mkdir data
if not exist "data\sessions" mkdir data\sessions
if not exist "data\logs.txt" type nul > data\logs.txt

echo [OK] Estrutura de pastas criada
echo.

REM Criar banco de dados
echo Criando banco de dados...
call npm run prisma:migrate

echo [OK] Banco de dados pronto
echo.

echo ===================================
echo      Setup concluido!
echo ===================================
echo.
echo Para iniciar a aplicacao, execute:
echo   npm run dev
echo.
echo Leia o GUIA.md para instrucoes detalhadas
echo.
pause
