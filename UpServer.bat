@echo off
REM UpServer.bat - Levanta el servidor local de miOpenGym y abre en el navegador

setlocal enabledelayedexpansion

REM Cambiar al directorio del proyecto
cd /d "%~dp0"

echo.
echo ========================================
echo   miOpenGym - Iniciando Servidor Local
echo ========================================
echo.

REM Copiar .env.example si .env no existe
if not exist ".env" (
    echo Creando archivo .env...
    copy ".env.example" ".env" >nul
    echo ✓ .env creado
    echo.
)

REM Iniciar docker-compose
echo Levantando stack con docker-compose...
docker-compose up -d --build

if errorlevel 1 (
    echo.
    echo ✗ Error al levantar docker-compose
    echo Asegúrate de tener Docker Desktop instalado y ejecutándose
    pause
    exit /b 1
)

echo ✓ Docker-compose iniciado
echo.

REM Esperar a que el servidor esté listo
echo Esperando a que el servidor esté listo...
timeout /t 5 /nobreak

REM Intentar conectar hasta que el servidor responda
setlocal enabledelayedexpansion
set "maxRetries=30"
set "retryCount=0"

:retryLoop
if !retryCount! geq !maxRetries! (
    echo.
    echo ✗ El servidor tardó demasiado en iniciar
    pause
    exit /b 1
)

curl -s http://localhost:8080 >nul 2>&1
if errorlevel 1 (
    set /a retryCount+=1
    echo Intento !retryCount! de !maxRetries!...
    timeout /t 1 /nobreak
    goto retryLoop
)

echo ✓ Servidor respondiendo
echo.

REM Abrir navegador
echo Abriendo navegador...
start http://localhost:8080

echo.
echo ========================================
echo   ✓ Servidor levantado exitosamente
echo ========================================
echo.
echo Accede a: http://localhost:8080
echo.
echo Para ver los logs: docker-compose logs -f
echo Para detener: docker-compose down
echo.
pause
