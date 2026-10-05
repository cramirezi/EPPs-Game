@echo off
rem Doble clic para jugar Mision EPP en esta computadora (Windows).
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "tools\servidor.ps1"
