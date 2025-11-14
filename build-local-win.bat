@echo off
echo Compilando WPP Monitor para Windows (local)...
echo.

echo [1/4] Limpando cache...
rmdir /S /Q node_modules\.cache 2>nul
rmdir /S /Q dist-installer 2>nul

echo [2/4] Instalando dependencias...
call npm install

echo [3/4] Recompilando modulos nativos...
call npm rebuild better-sqlite3 --build-from-source

echo [4/4] Gerando build...
call npm run build:win

echo.
echo ✅ Build concluido! Instalador em: dist-installer\
pause
