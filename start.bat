@echo off
setlocal EnableExtensions
cd /d "%~dp0"

REM Script pour installer et lancer l'application
set "NODE_EXE="
set "NPM_CMD="

for %%I in (node.exe node.cmd) do (
    for /f "delims=" %%J in ('where %%I 2^>nul') do (
        if not defined NODE_EXE set "NODE_EXE=%%~fJ"
    )
)

if not defined NODE_EXE (
    for %%I in ("%ProgramFiles%\nodejs\node.exe" "%ProgramFiles(x86)%\nodejs\node.exe" "%LOCALAPPDATA%\Programs\nodejs\node.exe" "%LOCALAPPDATA%\nodejs\node.exe") do (
        if exist "%%~I" (
            set "NODE_EXE=%%~I"
            goto :node_found
        )
    )
)

:node_found
if not defined NODE_EXE (
    echo Node.js n'est pas detecte sur cette machine.
    echo Installez Node.js depuis https://nodejs.org/ puis relancez ce script.
    pause
    exit /b 1
)

for %%I in ("%NODE_EXE%") do set "NODE_DIR=%%~dpI"
if exist "%NODE_DIR%npm.cmd" (
    set "NPM_CMD=%NODE_DIR%npm.cmd"
)

if not defined NPM_CMD (
    for %%I in (npm.cmd npm) do (
        for /f "delims=" %%J in ('where %%I 2^>nul') do (
            if not defined NPM_CMD set "NPM_CMD=%%~fJ"
        )
    )
)

if not defined NPM_CMD (
    echo npm n'est pas detecte. Installez Node.js depuis https://nodejs.org/ puis relancez ce script.
    pause
    exit /b 1
)

echo.
echo ==========================================
echo Reseaux d'Acteurs IA - Installation
echo ==========================================
echo.
echo Node.js detecte : %NODE_EXE%
echo npm detecte : %NPM_CMD%

echo.
echo Installation des dependances...
call "%NPM_CMD%" install --no-fund --no-audit
if errorlevel 1 (
    echo Erreur lors de l'installation des dependances.
    pause
    exit /b 1
)

echo.
echo ==========================================
echo Installation terminee!
echo ==========================================
echo.
echo Lancement du serveur...
echo.
echo L'application sera disponible sur:
echo    http://localhost:3000
echo.
echo Appuyez sur Ctrl+C pour arreter le serveur
echo.

start "" http://localhost:3000
call "%NODE_EXE%" server.js
exit /b %ERRORLEVEL%
