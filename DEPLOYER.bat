@echo off
chcp 65001 >nul
title LogisTMA Factory — Deploiement automatique
color 0A

echo.
echo  =====================================================
echo   LOGISTMA FACTORY — Script de deploiement complet
echo  =====================================================
echo.
echo  Ce script va :
echo   1. Verifier Node.js et Git
echo   2. Installer Railway CLI et Vercel CLI
echo   3. Te demander tes tokens/secrets
echo   4. Creer le repo GitHub
echo   5. Deployer le backend sur Railway
echo   6. Deployer le frontend sur Vercel
echo   7. Configurer le webhook Telegram
echo.
echo  Appuie sur une touche pour commencer...
pause >nul

:: =====================================================
:: VERIFICATIONS
:: =====================================================
echo.
echo [1/7] Verification de Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo  ERREUR : Node.js n'est pas installe !
    echo  Telecharge-le sur : https://nodejs.org
    echo  Installe-le, puis relance ce script.
    pause
    exit /b 1
)
echo  OK - Node.js installe

echo.
echo [2/7] Verification de Git...
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo  ERREUR : Git n'est pas installe !
    echo  Telecharge-le sur : https://git-scm.com
    echo  Installe-le, puis relance ce script.
    pause
    exit /b 1
)
echo  OK - Git installe

:: =====================================================
:: INSTALLATION DES CLIs
:: =====================================================
echo.
echo [3/7] Installation de Railway CLI et Vercel CLI...
call npm install -g @railway/cli vercel --silent
echo  OK - CLIs installes

:: =====================================================
:: COLLECTE DES INFORMATIONS
:: =====================================================
echo.
echo  =====================================================
echo   CONFIGURATION — Reponds aux questions suivantes
echo  =====================================================
echo.

echo  ETAPE A : Telegram
echo  ------------------
echo  Va dans Telegram, cherche @BotFather, envoie /newbot
echo  Nom du bot : LogisTMA Factory
echo  Username : logistma_factory_bot  (ou un autre)
echo  Copie le TOKEN qu'il te donne.
echo.
set /p BOT_TOKEN="  Colle ton BOT TOKEN ici : "

echo.
echo  Va dans Telegram, cherche @userinfobot, envoie /start
echo  Il te repond avec ton ID Telegram (un nombre).
echo.
set /p ADMIN_ID="  Ton ID Telegram (nombre) : "

echo.
echo  Retourne dans @BotFather → /mybots → ton bot → Payments
echo  Choisis Stripe (TEST) → il te donne un PAYMENT TOKEN
echo  (ressemble a : 123456789:TEST:xxxxx)
echo.
set /p PAYMENT_TOKEN="  Colle ton PAYMENT TOKEN ici : "

echo.
echo  ETAPE B : GitHub
echo  ----------------
echo  Va sur github.com → cree un compte si pas fait
echo  Ton username GitHub (visible sur github.com)
echo.
set /p GITHUB_USER="  Ton username GitHub : "

echo.
echo  ETAPE C : Nom du repo GitHub
echo  Le repo va s'appeler logistma-factory (recommande)
echo  Appuie sur ENTREE pour garder ce nom, ou tape un autre
echo.
set /p REPO_NAME="  Nom du repo [logistma-factory] : "
if "%REPO_NAME%"=="" set REPO_NAME=logistma-factory

:: =====================================================
:: GENERATION DES SECRETS
:: =====================================================
echo.
echo [4/7] Generation des secrets de securite...
for /f "delims=" %%i in ('node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"') do set ENCRYPTION_KEY=%%i
for /f "delims=" %%i in ('node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"') do set WEBHOOK_SECRET=%%i
for /f "delims=" %%i in ('node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"') do set ADMIN_API_KEY=%%i
echo  OK - Secrets generes

:: =====================================================
:: CREATION DU .ENV
:: =====================================================
echo.
echo [5/7] Creation du fichier .env...
(
echo PORT=3001
echo NODE_ENV=production
echo FACTORY_BOT_TOKEN=%BOT_TOKEN%
echo FACTORY_ADMIN_ID=%ADMIN_ID%
echo ENCRYPTION_KEY=%ENCRYPTION_KEY%
echo FACTORY_WEBHOOK_SECRET=%WEBHOOK_SECRET%
echo ADMIN_API_KEY=%ADMIN_API_KEY%
echo TELEGRAM_PAYMENT_TOKEN=%PAYMENT_TOKEN%
echo FACTORY_DB_PATH=./data/factory.sqlite
echo FACTORY_FRONTEND_URL=https://%REPO_NAME%.vercel.app
) > factory-backend\.env
echo  OK - .env cree

:: =====================================================
:: CREATION DU .GITIGNORE
:: =====================================================
(
echo node_modules/
echo .env
echo .env.local
echo data/
echo dist/
echo *.sqlite
echo .DS_Store
) > .gitignore

:: =====================================================
:: INIT GIT ET PUSH GITHUB
:: =====================================================
echo.
echo [6/7] Configuration Git et push sur GitHub...
echo.
echo  On va maintenant connecter ton code a GitHub.
echo  Un navigateur va s'ouvrir pour que tu te connectes.
echo.

git init >nul 2>&1
git add .
git commit -m "initial commit - LogisTMA Factory" >nul 2>&1
git branch -M main >nul 2>&1

echo  Creation du repo GitHub en cours...
echo  (Si le navigateur s'ouvre, connecte-toi a GitHub)
gh repo create %REPO_NAME% --public --source=. --remote=origin --push >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  GitHub CLI non installe. On va faire autrement.
    echo.
    echo  1. Va sur : https://github.com/new
    echo  2. Repository name : %REPO_NAME%
    echo  3. Clique sur "Create repository"
    echo  4. Reviens ici et appuie sur ENTREE
    pause >nul
    git remote add origin https://github.com/%GITHUB_USER%/%REPO_NAME%.git >nul 2>&1
    git push -u origin main
)
echo  OK - Code pousse sur GitHub

:: =====================================================
:: DEPLOIEMENT RAILWAY (BACKEND)
:: =====================================================
echo.
echo [7/7] Deploiement du backend sur Railway...
echo.
echo  Un navigateur va s'ouvrir → connecte-toi avec GitHub
echo.

cd factory-backend
call railway login

echo.
echo  Initialisation du projet Railway...
call railway init --name logistma-factory-backend

echo.
echo  Deploiement en cours (2-3 minutes)...
call railway up

echo.
echo  Generation du domaine Railway...
call railway domain

:: Recupere l'URL Railway
for /f "delims=" %%i in ('railway domain 2^>^&1 ^| findstr /r "railway.app"') do set RAILWAY_URL=%%i
if "%RAILWAY_URL%"=="" set RAILWAY_URL=logistma-factory-backend.up.railway.app

echo.
echo  Configuration des variables d'environnement Railway...
call railway variables set FACTORY_BOT_TOKEN=%BOT_TOKEN%
call railway variables set FACTORY_ADMIN_ID=%ADMIN_ID%
call railway variables set ENCRYPTION_KEY=%ENCRYPTION_KEY%
call railway variables set FACTORY_WEBHOOK_SECRET=%WEBHOOK_SECRET%
call railway variables set ADMIN_API_KEY=%ADMIN_API_KEY%
call railway variables set TELEGRAM_PAYMENT_TOKEN=%PAYMENT_TOKEN%
call railway variables set NODE_ENV=production
call railway variables set FACTORY_DB_PATH=./data/factory.sqlite
call railway variables set FACTORY_FRONTEND_URL=https://%REPO_NAME%.vercel.app

echo.
echo  OK - Backend deploye sur Railway

:: =====================================================
:: DEPLOIEMENT VERCEL (FRONTEND)
:: =====================================================
echo.
echo  Deploiement du frontend sur Vercel...
echo.
echo  Un navigateur va s'ouvrir → connecte-toi avec GitHub
echo.

cd ..\factory-frontend

:: Cree vercel.json pour le routing SPA
(
echo {
echo   "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
echo }
) > vercel.json

call vercel login

echo.
echo  Deploiement Vercel (reponds Y a toutes les questions)...
call vercel --yes --name %REPO_NAME%

echo.
echo  Configuration de la variable API...
call vercel env add VITE_API_URL production <<< https://%RAILWAY_URL%

echo.
echo  Deploiement en production...
call vercel --prod --yes

echo.
echo  OK - Frontend deploye sur Vercel

:: =====================================================
:: WEBHOOK TELEGRAM
:: =====================================================
echo.
echo  Configuration du webhook Telegram...
cd ..

curl -s "https://api.telegram.org/bot%BOT_TOKEN%/setWebhook?url=https://%RAILWAY_URL%/bot-webhook&secret_token=%WEBHOOK_SECRET%" >nul
echo  OK - Webhook Telegram configure

:: Update Railway avec l'URL Vercel
cd factory-backend
call railway variables set FACTORY_FRONTEND_URL=https://%REPO_NAME%.vercel.app
cd ..

:: =====================================================
:: RESUME FINAL
:: =====================================================
echo.
echo.
echo  =====================================================
echo   DEPLOIEMENT TERMINE !
echo  =====================================================
echo.
echo   Frontend (wizard) : https://%REPO_NAME%.vercel.app
echo   Backend API       : https://%RAILWAY_URL%
echo   Bot Telegram      : Cherche ton bot dans Telegram
echo.
echo   Prochaine etape :
echo   → Ouvre https://%REPO_NAME%.vercel.app
echo   → Complete le wizard en 6 etapes
echo   → A la fin, le client reçoit une invoice Telegram
echo     et paie directement dans l'app
echo.
echo  Appuie sur une touche pour fermer.
pause >nul
