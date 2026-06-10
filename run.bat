@echo off
echo =========================================
echo    Starting Dorado POS System
echo =========================================

echo Starting Backend Server...
start cmd /k "cd backend && npm install && node server.js"

echo Starting Frontend Server...
start cmd /k "cd frontend && npm install && npm run dev"

echo Both servers are starting up in separate windows!
echo Once they are ready, check the frontend terminal for the Local URL (usually http://localhost:5173).
