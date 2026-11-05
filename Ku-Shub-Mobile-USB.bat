@echo off
title Tuko - Ku Xir Mobile-ka USB (ADB USB Runner & Installer)
color 0B
echo ====================================================================
echo   TUKO - SALAAD ^& ADHKAAR (QAABKA XADHIGGA USB-GA EE MOBILE-KA)
echo ====================================================================
echo.
echo Tallaabooyinka Mobile-kaaga (Android):
echo   1. Ku xir Mobile-kaaga Computer-ka adigoo isticmaalaya Xadhigga USB.
echo   2. Gal Settings ^> About Phone ^> Taabo "Build Number" 7 jeer.
echo   3. Gal Settings ^> Developer Options ^> Shid "USB Debugging".
echo   4. Marka shaashadda Mobile-ka ay soo baxdo "Allow USB Debugging",
echo      calaamadee "Always allow" kadibna riix "Allow".
echo.
echo ====================================================================

set "TOOLS_DIR=%~dp0usb-tools\platform-tools"
set "ADB_EXE=%TOOLS_DIR%\adb.exe"

if not exist "%ADB_EXE%" (
    echo [*] Waxaa la soo dejinayaa qalabka rasmiga ah ee Google USB ADB...
    if not exist "%~dp0usb-tools" mkdir "%~dp0usb-tools"
    powershell -Command "Invoke-WebRequest -Uri 'https://dl.google.com/android/repository/platform-tools-latest-windows.zip' -OutFile '%~dp0usb-tools\platform-tools.zip'"
    powershell -Command "Expand-Archive -Path '%~dp0usb-tools\platform-tools.zip' -DestinationPath '%~dp0usb-tools' -Force"
)

echo.
echo [*] Waxaa la baarayaa Mobile-ka ku xiran Xadhigga USB-ga...
"%ADB_EXE%" start-server
"%ADB_EXE%" devices

echo.
echo [*] Waxaa Mobile-ka loo fasaxayaa Heeganka Aadaanka 24/7 (Battery Whitelist)...
"%ADB_EXE%" shell dumpsys deviceidle whitelist +com.android.chrome >nul 2>nul

if exist "%~dp0tuko.apk" (
    echo [*] Waxaa si toos ah Mobile-ka loogu shubayaa Tuko APK (Native Android App)...
    "%ADB_EXE%" install -r "%~dp0tuko.apk"
    "%ADB_EXE%" shell dumpsys deviceidle whitelist +com.tuko.salaad >nul 2>nul
    echo [*] Waxaa shaashadda Mobile-kaaga si toos ah looga furayaa Tuko Native App...
    "%ADB_EXE%" shell am start -n com.tuko.salaad/.MainActivity
) else (
    echo [*] Waxaa shaashadda Mobile-kaaga si toos ah looga furayaa Tuko App...
    "%ADB_EXE%" shell am start -a android.intent.action.VIEW -d "https://tuko-8a4e3.web.app"
)

echo.
echo ====================================================================
echo   GUUL! Mobile-kaaga si toos ah ayaa loogu furay Tuko App
echo   oo loo fasaxay inuusan hurdo gelin xilliga Aadaanka!
echo ====================================================================
pause
