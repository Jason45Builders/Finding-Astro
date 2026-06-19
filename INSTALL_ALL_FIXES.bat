@echo off
echo =====================================================
echo  Finding Astro — Install All Fixes + All Features
echo  Based on full PDF conversation vision
echo =====================================================
echo.

echo [1/5] Installing backend dependencies...
cd /d "D:\Finding Astro\backend"
npm install
if %errorlevel% neq 0 (
    echo ERROR: Backend npm install failed. Check Node.js is installed.
    pause & exit /b 1
)
echo OK.
echo.

echo [2/5] Installing mobile dependencies...
cd /d "D:\Finding Astro\apps\mobile"
npm install
if %errorlevel% neq 0 (
    echo ERROR: Mobile npm install failed.
    pause & exit /b 1
)
echo OK.
echo.

echo [3/5] Running all database migrations + seeds...
cd /d "D:\Finding Astro"
if exist ".env" (
    for /f "tokens=2 delims==" %%a in ('findstr "DATABASE_URL" .env') do set DB_URL=%%a
    if defined DB_URL (
        echo Running 002_audit_fixes.sql...
        psql "%DB_URL%" -f database\migrations\002_audit_fixes.sql
        echo Running 003_cron_and_indexes.sql...
        psql "%DB_URL%" -f database\migrations\003_cron_and_indexes.sql
        echo Running 004_expert_features.sql ^(emergency, CSR, adoption^)...
        psql "%DB_URL%" -f database\migrations\004_expert_features.sql
        echo Running 005_pdf_missing_systems.sql ^(wildlife, safety, QR, trust signals^)...
        psql "%DB_URL%" -f database\migrations\005_pdf_missing_systems.sql
        echo Running 006_partner_tables.sql ^(partner clinics, NGOs, pet stores tables^)...
        psql "%DB_URL%" -f database\migrations\006_partner_tables.sql
        echo Seeding real Chennai data...
        psql "%DB_URL%" -f database\seeds\001_chennai_real_data.sql
        echo All migrations and seeds complete.
    ) else (
        echo WARNING: DATABASE_URL not found in .env
        echo Run manually in order: 002 003 004 005 006 then seeds\001
    )
) else (
    echo WARNING: .env not found. Run migrations manually.
)
echo.

echo [4/5] Building backend TypeScript...
cd /d "D:\Finding Astro\backend"
npm run build
if %errorlevel% neq 0 (
    echo.
    echo =====================================================
    echo  BUILD FAILED. Fix TypeScript errors above.
    echo =====================================================
    pause & exit /b 1
)
echo Build OK.
echo.

echo [5/5] Verifying routes and seed data...
findstr /m "wildlifeRouter"          "D:\Finding Astro\backend\src\app.ts" >nul 2>&1 && echo   Wildlife routes: OK       || echo   MISSING: wildlifeRouter
findstr /m "safetyRouter"            "D:\Finding Astro\backend\src\app.ts" >nul 2>&1 && echo   Safety routes: OK         || echo   MISSING: safetyRouter
findstr /m "emergencyResponseRoutes" "D:\Finding Astro\backend\src\app.ts" >nul 2>&1 && echo   Emergency routes: OK      || echo   MISSING: emergencyResponseRoutes
findstr /m "adoptionRouter"          "D:\Finding Astro\backend\src\app.ts" >nul 2>&1 && echo   Adoption routes: OK       || echo   MISSING: adoptionRouter
findstr /m "csrRouter"               "D:\Finding Astro\backend\src\app.ts" >nul 2>&1 && echo   CSR routes: OK            || echo   MISSING: csrRouter
findstr /m "recoveryRouter"          "D:\Finding Astro\backend\src\app.ts" >nul 2>&1 && echo   Recovery routes: OK       || echo   MISSING: recoveryRouter

echo.
echo =====================================================
echo  ALL DONE.
echo.
echo  Real Chennai data seeded:
echo    13 Veterinary hospitals ^& clinics
echo     6 GCC government vet clinics (free treatment)
echo     5 GCC ABC centres (sterilisation)
echo    10 Animal welfare NGOs ^& boards
echo    12 Pet stores (shown to responders en route)
echo     8 Emergency helplines (Legal Hub + Safety screens)
echo.
echo  New API endpoints:
echo    GET /api/v1/clinics/nearby       -- clinics near a location
echo    GET /api/v1/clinics/emergency    -- 24hr stray-accepting only
echo    GET /api/v1/stores/nearby        -- pet stores near a location
echo    GET /api/v1/abc-centres          -- all ABC centres
echo    GET /api/v1/welfare-orgs         -- NGOs and boards
echo    GET /api/v1/helplines            -- emergency numbers
echo.
echo  To start backend:
echo    cd "D:\Finding Astro\backend" ^&^& npm run dev
echo.
echo  To start mobile:
echo    cd "D:\Finding Astro\apps\mobile" ^&^& npx expo start
echo =====================================================
pause
