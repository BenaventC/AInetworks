@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo Demarrage de Reseaux d'Acteurs IA...

set "NODE_EXE="
set "NPM_CMD="

where node >nul 2>nul
if not errorlevel 1 (
    for /f "delims=" %%I in ('where node 2^>nul') do (
        if not defined NODE_EXE set "NODE_EXE=%%~fI"
    )
)

if not defined NODE_EXE (
    for %%I in (
        "%ProgramFiles%\nodejs\node.exe"
        "%ProgramFiles(x86)%\nodejs\node.exe"
        "%LOCALAPPDATA%\Programs\nodejs\node.exe"
        "%LOCALAPPDATA%\nodejs\node.exe"
    ) do (
        if exist "%%~I" (
            set "NODE_EXE=%%~I"
            goto :node_found
        )
    )
)

:node_found
if not defined NODE_EXE (
    echo Node.js n'est pas detecte sur cette machine.
    echo Installez Node.js depuis https://nodejs.org/ puis relancez ce fichier.
    pause
    exit /b 1
)

for %%I in ("%NODE_EXE%") do set "NODE_DIR=%%~dpI"
if exist "%NODE_DIR%npm.cmd" (
    set "NPM_CMD=%NODE_DIR%npm.cmd"
) else (
    where npm >nul 2>nul
    if not errorlevel 1 (
        for /f "delims=" %%I in ('where npm 2^>nul') do (
            if not defined NPM_CMD set "NPM_CMD=%%~fI"
        )
    )
)

if not defined NPM_CMD (
    echo npm n'est pas detecte. Installez Node.js depuis https://nodejs.org/ puis relancez ce fichier.
    pause
    exit /b 1
)

if not exist package.json (
    echo package.json introuvable. Placez ce fichier a la racine du projet.
    pause
    exit /b 1
)

if not exist node_modules (
    echo Installation des dependances...
    call "%NPM_CMD%" install --no-fund --no-audit
    if errorlevel 1 (
        echo Echec de l'installation des dependances.
        pause
        exit /b 1
    )
)

echo Lancement de l'application...
start "" http://localhost:3000
call "%NODE_EXE%" server.js
