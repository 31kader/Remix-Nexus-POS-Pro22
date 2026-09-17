@echo off
cd /d "%~dp0"
title Compilation Nexus POS Pro - Production
echo ========================================================
echo   Nexus POS Pro - Script de Compilation Windows (.exe)
echo ========================================================
echo.
echo Ce script va compiler le client Vite et generer le fichier d'installation
echo final (setup .exe) dans le dossier 'release/'.
echo.
echo Appuyez sur une touche pour demarrer...
pause > nul
echo.
echo [+] Nettoyage des anciennes builds...
if exist dist rd /s /q dist
if exist release rd /s /q release
echo.
echo [+] Execution de 'npm run dist'...
call npm run dist
echo.
echo ========================================================
echo   Compilation terminee !
echo ========================================================
echo L'installateur final (.exe) a ete cree dans le dossier:
echo   c:\Users\ks2\antigravity\Remix-Nexus-POS-Pro\release\
echo.
echo Appuyez sur une touche pour quitter...
pause > nul
