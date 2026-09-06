@echo off
REM UpDev.bat - Levanta frontend + backend en modo desarrollo con hot reload

setlocal enabledelayedexpansion

REM Cambiar al directorio del proyecto
cd /d "%~dp0"

echo.
echo ========================================
echo   miOpenGym - Modo Desarrollo
echo ========================================
echo.
echo Este script levantará:
echo   • Backend API en http://localhost:3000
echo   • Frontend dev server en http://localhost:5173
echo.

REM Crear archivos de log
set "logDir=%TEMP%\miOpenGym-dev"
if not exist "!logDir!" mkdir "!logDir!"

set "apiLog=!logDir!\api.log"
set "frontendLog=!logDir!\frontend.log"

REM Limpiar logs anteriores
if exist "!apiLog!" del "!apiLog!"
if exist "!frontendLog!" del "!frontendLog!"

echo.
echo Iniciando Backend API (puerto 3000)...
start "miOpenGym - API Server" cmd /k "cd api && npm install --silent && npm start > !apiLog! 2>&1"

echo Iniciando Frontend Dev Server (puerto 5173)...
start "miOpenGym - Frontend Dev" cmd /k "cd frontend && pnpm install --silent && pnpm run dev"

echo.
echo ✓ Servidores iniciados en nuevas ventanas
echo.

REM Esperar a que ambos servidores estén listos
echo Esperando a que los servidores estén listos...
echo (esto puede tomar 30-60 segundos)
echo.

setlocal enabledelayedexpansion
set "maxRetries=60"
set "retryCount=0"
set "apiReady=0"
set "frontendReady=0"

:waitLoop
if !apiReady! equ 1 if !frontendReady! equ 1 goto ready

if !retryCount! geq !maxRetries! (
    echo.
    echo ✗ Los servidores tardaron demasiado en iniciar
    echo.
    echo Verifica los logs:
    echo   API Log: !apiLog!
    echo   Frontend Log: !frontendLog!
    echo.
    pause
    exit /b 1
)

REM Verificar si el API está listo
if !apiReady! equ 0 (
    curl -s http://localhost:3000/api/health >nul 2>&1
    if errorlevel 0 set "apiReady=1"
)

REM Verificar si el frontend está listo
if !frontendReady! equ 0 (
    curl -s http://localhost:5173 >nul 2>&1
    if errorlevel 0 set "frontendReady=1"
)

set /a retryCount+=1
if !retryCount! equ 10 echo  • Intento 10/60...
if !retryCount! equ 20 echo  • Intento 20/60...
if !retryCount! equ 30 echo  • Intento 30/60...
if !retryCount! equ 40 echo  • Intento 40/60...
if !retryCount! equ 50 echo  • Intento 50/60...

timeout /t 1 /nobreak >nul
goto waitLoop

:ready
echo.
echo ========================================
echo   ✓ ¡Servidores listos!
echo ========================================
echo.

REM Abrir navegador
echo Abriendo navegador en http://localhost:5173...
start http://localhost:5173

echo.
echo URLS disponibles:
echo   Frontend:  http://localhost:5173
echo   API:       http://localhost:3000
echo.
echo Las nuevas ventanas se cerrarán cuando detengas los servidores.
echo.
echo Logs:
echo   API: !apiLog!
echo   Frontend: !frontendLog!
echo.
echo Presiona ENTER para cerrar esta ventana...
pause

REM Opcionally, puedes descomentar las siguientes líneas para detener los servidores
REM echo.
REM echo Deteniendo servidores...
REM taskkill /FI "WINDOWTITLE eq miOpenGym*" /T /F >nul 2>&1
REM echo Done
