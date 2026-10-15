@echo off
title Jarvis Agentic OS
cd /d "%~dp0"
echo.
echo   Starting Jarvis. Keep this window open while you use it.
echo   Close this window to turn Jarvis off.
echo.
start "" powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0tools\open-jarvis.ps1"
call npm start
echo.
echo   Jarvis stopped. If you see an error above, send a screenshot of it.
pause
