@echo off
echo ================================================
echo   WPP Monitor - Build para Windows
echo ================================================
echo.

echo [1/4] Limpando builds anteriores...
if exist dist-installer rmdir /s /q dist-installer
if exist dist rmdir /s /q dist

echo [2/4] Instalando dependencias...
call npm install

echo [3/4] Gerando Prisma Client...
call npm run prisma:generate

echo [4/4] Criando instalador Windows...
call npm run build:win

echo.
echo ================================================
echo   Build concluido!
echo   Instalador em: dist-installer\
echo ================================================
pause
