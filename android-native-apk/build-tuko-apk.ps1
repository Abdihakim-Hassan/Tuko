$ErrorActionPreference = "Stop"
$ProjectRoot = "C:\Users\Abdibaasid\Downloads\salaad-&-adhkaar-soomaali"
$ApkDir = "$ProjectRoot\android-native-apk"
$ToolsDir = "$ProjectRoot\usb-tools"

New-Item -ItemType Directory -Force -Path "$ToolsDir" | Out-Null
New-Item -ItemType Directory -Force -Path "$ApkDir\res\drawable" | Out-Null
New-Item -ItemType Directory -Force -Path "$ApkDir\build\gen" | Out-Null
New-Item -ItemType Directory -Force -Path "$ApkDir\build\obj" | Out-Null
New-Item -ItemType Directory -Force -Path "$ApkDir\build\dex" | Out-Null

# 1. Copy Tuko Icon
Copy-Item -Force "$ProjectRoot\public\pwa-192x192.png" "$ApkDir\res\drawable\ic_launcher.png"

# 2. Ensure Portable JDK 17
$JdkDir = Get-ChildItem -Path $ToolsDir -Directory -Filter "jdk*" -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $JdkDir) {
    Write-Output "[1/4] Downloading Portable OpenJDK 17..."
    $JdkZip = "$ToolsDir\openjdk17.zip"
    curl.exe -L -s "https://aka.ms/download-jdk/microsoft-jdk-17.0.13-windows-x64.zip" -o $JdkZip
    Expand-Archive -Path $JdkZip -DestinationPath $ToolsDir -Force
    Remove-Item $JdkZip -Force -ErrorAction SilentlyContinue
    $JdkDir = Get-ChildItem -Path $ToolsDir -Directory -Filter "jdk*" | Select-Object -First 1
}
$JavaHome = $JdkDir.FullName
$env:JAVA_HOME = $JavaHome
$JavacExe = "$JavaHome\bin\javac.exe"
$JavaExe = "$JavaHome\bin\java.exe"
$KeytoolExe = "$JavaHome\bin\keytool.exe"
$JarExe = "$JavaHome\bin\jar.exe"

# 3. Ensure Android Build-Tools 34
$BuildToolsSub = Get-ChildItem -Path $ToolsDir -Directory -Filter "android-*" -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $BuildToolsSub -or -not (Test-Path "$($BuildToolsSub.FullName)\aapt2.exe")) {
    Write-Output "[2/4] Downloading Google Android Build-Tools..."
    $BtZip = "$ToolsDir\build-tools.zip"
    curl.exe -L -s "https://dl.google.com/android/repository/build-tools_r34-windows.zip" -o $BtZip
    Expand-Archive -Path $BtZip -DestinationPath $ToolsDir -Force
    Remove-Item $BtZip -Force -ErrorAction SilentlyContinue
    $BuildToolsSub = Get-ChildItem -Path $ToolsDir -Directory -Filter "android-*" | Where-Object { Test-Path "$($_.FullName)\aapt2.exe" } | Select-Object -First 1
}
$BtPath = $BuildToolsSub.FullName
$Aapt2Exe = "$BtPath\aapt2.exe"
$ZipAlignExe = "$BtPath\zipalign.exe"
$D8Jar = "$BtPath\lib\d8.jar"
$ApkSignerJar = "$BtPath\lib\apksigner.jar"

# 4. Ensure Android Platform android.jar
$AndroidJar = Get-ChildItem -Path $ToolsDir -Recurse -Filter "android.jar" -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $AndroidJar) {
    Write-Output "[3/4] Downloading Google Android Platform SDK (android.jar)..."
    $PlatZip = "$ToolsDir\platform.zip"
    curl.exe -L -s "https://dl.google.com/android/repository/platform-34-ext7_r02.zip" -o $PlatZip
    Expand-Archive -Path $PlatZip -DestinationPath "$ToolsDir\platform" -Force
    Remove-Item $PlatZip -Force -ErrorAction SilentlyContinue
    $AndroidJar = Get-ChildItem -Path $ToolsDir -Recurse -Filter "android.jar" | Select-Object -First 1
}
$AndroidJarPath = $AndroidJar.FullName

Write-Output "[4/4] Compiling & Signing Native Tuko Android APK..."

# Compile resources with aapt2
& $Aapt2Exe compile --dir "$ApkDir\res" -o "$ApkDir\build\resources.zip"

# Link resources & generate R.java + base APK (including native audio assets)
$UnalignedApk = "$ApkDir\build\tuko-unaligned.apk"
if (Test-Path $UnalignedApk) { Remove-Item $UnalignedApk -Force }
& $Aapt2Exe link -o $UnalignedApk `
    --manifest "$ApkDir\AndroidManifest.xml" `
    -I $AndroidJarPath `
    -A "$ApkDir\assets" `
    --java "$ApkDir\build\gen" `
    "$ApkDir\build\resources.zip"

# Clean previous .class and .dex files so fresh Java code is always compiled
Remove-Item "$ApkDir\build\obj\*" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "$ApkDir\build\dex\*" -Recurse -Force -ErrorAction SilentlyContinue

# Compile all Java sources with UTF-8 encoding (target Java 8 bytecode for universal Android compatibility)
$JavaFiles = Get-ChildItem -Path "$ApkDir\src", "$ApkDir\build\gen" -Recurse -Filter "*.java" | Select-Object -ExpandProperty FullName
& $JavacExe -encoding UTF-8 -source 1.8 -target 1.8 -bootclasspath $AndroidJarPath -classpath $AndroidJarPath -d "$ApkDir\build\obj" $JavaFiles
if ($LASTEXITCODE -ne 0) { throw "javac compilation failed!" }

# Convert .class files to classes.dex using d8
$ClassFiles = Get-ChildItem -Path "$ApkDir\build\obj" -Recurse -Filter "*.class" | Select-Object -ExpandProperty FullName
& $JavaExe -cp $D8Jar com.android.tools.r8.D8 --lib $AndroidJarPath --output "$ApkDir\build\dex" $ClassFiles
if ($LASTEXITCODE -ne 0) { throw "d8 dexing failed!" }

# Add classes.dex to the root of the APK zip
Copy-Item -Force "$ApkDir\build\dex\classes.dex" "$ApkDir\build\classes.dex"
Push-Location "$ApkDir\build"
& $JarExe -uf $UnalignedApk "classes.dex"
Pop-Location

# Zipalign APK
$AlignedApk = "$ApkDir\build\tuko-aligned.apk"
if (Test-Path $AlignedApk) { Remove-Item $AlignedApk -Force }
& $ZipAlignExe -f -p 4 $UnalignedApk $AlignedApk

# Generate Release Keystore if not present
$KeystorePath = "$ApkDir\tuko-release.jks"
if (-not (Test-Path $KeystorePath)) {
    & $KeytoolExe -genkeypair -v `
        -keystore $KeystorePath `
        -alias tuko_key `
        -keyalg RSA `
        -keysize 2048 `
        -validity 10000 `
        -storepass tuko123456 `
        -keypass tuko123456 `
        -dname "CN=Tuko Salaad App, OU=Mobile, O=Tuko, L=Mogadishu, S=Banaadir, C=SO"
}

# Sign APK with v1, v2, and v3 signatures using apksigner
$FinalApk = "$ProjectRoot\tuko.apk"
& $JavaExe -jar $ApkSignerJar sign `
    --ks $KeystorePath `
    --ks-key-alias tuko_key `
    --ks-pass pass:tuko123456 `
    --key-pass pass:tuko123456 `
    --v1-signing-enabled true `
    --v2-signing-enabled true `
    --v3-signing-enabled true `
    --out $FinalApk `
    $AlignedApk

Copy-Item -Force $FinalApk "C:\Users\Abdibaasid\Downloads\tuko.apk"
Write-Output "SUCCESS! Signed APK generated at: $FinalApk ($((Get-Item $FinalApk).Length) bytes)"
