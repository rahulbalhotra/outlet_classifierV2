@echo off
setlocal
echo ==========================================
echo Starting Outlet Classifier Ecosystem
echo ==========================================

:: Start Python Backend
echo [1/2] Starting Python Backend...
start /min "Outlet Backend" cmd /c "cd outlet-classifier\backend && python backend.py"

:: Give backend time to initialize
timeout /t 5 /nobreak > nul

:: Start Next.js Frontend
echo [2/2] Starting Next.js Frontend...
start /min "Outlet Frontend" cmd /c "cd outlet-classifier && npm run dev"

echo ==========================================
echo Ecosystem is starting! 
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:8001
echo ==========================================
echo Keep this window open or close it when done.
pause
