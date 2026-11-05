@echo off
title Tuko APK - Ka Soo Dejiso Chrome-ka Mobile-kaaga (Wi-Fi Download)
color 0A
echo ====================================================================
echo   TUKO.APK - KA SOO DEJISO CHROME-KA MOBILE-KAAGA (WI-FI SERVER)
echo ====================================================================
echo.
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    for /f "tokens=* delims= " %%b in ("%%a") do (
        echo   👉 Ku qor Chrome-ka Mobile-kaaga:  http://%%b:8090/tuko.apk
    )
)
echo.
echo   Markaad link-gaas ku qorto Chrome-ka Mobile-kaaga, toos ayuu
echo   kuugu soo dejinayaa "tuko.apk" kadibna taabo "Install"!
echo ====================================================================
echo.
node -e "const http=require('http'),fs=require('fs'),path=require('path');const apkPath=path.join(__dirname,'tuko.apk');http.createServer((req,res)=>{const data=fs.readFileSync(apkPath);res.writeHead(200,{'Content-Type':'application/vnd.android.package-archive','Content-Disposition':'attachment; filename=\"tuko.apk\"','Content-Length':data.length});res.end(data);console.log('[+] Tuko.apk si guul leh ayaa looga soo dejiyay:',req.socket.remoteAddress);}).listen(8090,'0.0.0.0',()=>console.log('[*] Server-ka Tuko.apk waa shidan yahay (Port 8090)...'));"
pause
