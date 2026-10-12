@echo off
title Jarvis Agentic OS
cd /d "%~dp0"
echo.
echo   Starting Jarvis. Keep this window open while you use it.
echo   Close this window to turn Jarvis off.
echo.
start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 4; Start-Process http://127.0.0.1:3217"
call npm start
echo.
echo   Jarvis stopped. If you see an error above, send a screenshot of it.
pause
