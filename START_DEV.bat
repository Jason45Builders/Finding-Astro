@echo off
setlocal EnableDelayedExpansion
title Finding Astro — Dev Startup
color 0A

echo.
echo  ╔══════════════════════════════════════════════════╗
echo  ║      Finding Astro — Dev Mode                   ║
echo  ╚══════════════════════════════════════════════════╝
echo.

cd /d "D:\Finding Astro"

:: ── 1. Check Node ─────────────────────────────────────────────────────────────
echo [1/5] Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo  [X] Node.js not found. Install from https://nodejs.org ^(v20+^)
    pause & exit /b 1
)
for /f %%v in ('node --version') do echo  [OK] Node %%v

:: ── 2. Check PostgreSQL ────────────────────────────────────────────────────────
echo [2/5] Checking PostgreSQL...
pg_isready -h localhost -p 5432 >nul 2>&1
if %errorlevel% neq 0 (
    echo  [X] PostgreSQL not running. Start it then re-run this script.
    echo      Option A: Open Services ^(Win+R -^> services.msc^) find PostgreSQL -^> Start
    echo      Option B: net start postgresql-x64-16
    pause & exit /b 1
)
echo  [OK] PostgreSQL running

:: ── 3. Kill anything already on port 4000 ─────────────────────────────────────
echo [3/5] Clearing port 4000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :4000 ^| findstr LISTENING 2^>nul') do (
    echo  Killing process %%a on port 4000...
    taskkill /PID %%a /F >nul 2>&1
)
echo  [OK] Port 4000 is free

:: ── 4. Check .env ─────────────────────────────────────────────────────────────
echo [4/5] Checking backend environment...
if not exist "backend\.env" (
    echo  Creating backend\.env from template...
    (
        echo NODE_ENV=development
        echo PORT=4000
        echo DATABASE_URL=postgresql://postgres:postgres@localhost:5432/finding_astro
        echo JWT_SECRET=bb92534d2479b13dfeb443935c7027bdc93c163eecb5a4ad35ff4bad08570a69
        echo JWT_EXPIRES_IN=7d
        echo OTP_TTL_MINUTES=10
        echo SHOW_MOCK_OTP=true
        echo CORS_ORIGIN=http://localhost:3000,exp://localhost:8081
        echo AADHAAR_HASH_SALT=a3f9c21de7b04158e6d3c98fa24b0e7d1f82c4690a3be5712d9e6c08f4a1b593
        echo R2_BUCKET_NAME=finding-astro-media
        echo SMS_PROVIDER=none
    ) > backend\.env
    echo  [OK] backend\.env created
) else (
    echo  [OK] backend\.env exists
)

:: ── 5. Install and start ───────────────────────────────────────────────────────
echo [5/5] Starting backend...
cd backend
if not exist "node_modules" (
    echo  Installing packages...
    npm install
)

echo.
echo  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo  Backend:  http://localhost:4000
echo  Health:   http://localhost:4000/health
echo  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo  Press Ctrl+C to stop.
echo.

npm run dev
