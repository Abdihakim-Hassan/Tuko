@echo off
title Tuko - Salaad & Adhkaar Desktop App (24/7 Aadaan Mode)
echo ========================================================
echo   TUKO - SALAAD ^& ADHKAAR DESKTOP APP (24/7 AADAAN)
echo   Waxaa la furayaa App-ka oo leh Aadaan toos ah...
echo ========================================================

:: Launch Chrome or Edge in Native App Mode with Autoplay & Background Timer unthrottled so Adhan rings 24/7!
where msedge >nul 2>nul
if %errorlevel%==0 (
    start "" msedge --app="https://tuko-8a4e3.web.app" --autoplay-policy=no-user-gesture-required --disable-background-timer-throttling --disable-renderer-backgrounding
    exit
)

if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --app="https://tuko-8a4e3.web.app" --autoplay-policy=no-user-gesture-required --disable-background-timer-throttling --disable-renderer-backgrounding
    exit
)

if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --app="https://tuko-8a4e3.web.app" --autoplay-policy=no-user-gesture-required --disable-background-timer-throttling --disable-renderer-backgrounding
    exit
)

start "" "https://tuko-8a4e3.web.app"
