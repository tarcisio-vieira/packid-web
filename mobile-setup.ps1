$ErrorActionPreference = "Stop"

Write-Host "Preparando VSGI Condominio para Android/iOS..." -ForegroundColor Green
npm install --legacy-peer-deps
npm install @capacitor/core@8.5.2 @capacitor/android@8.5.2 @capacitor/ios@8.5.2 --save
npm install @capacitor/cli@8.5.2 --save-dev
npm run build:prod

if (-not (Test-Path "android")) {
  npx cap add android
}

if ($IsMacOS -and -not (Test-Path "ios")) {
  npx cap add ios
}

npx cap sync
Write-Host "Android pronto. Execute: npx cap open android" -ForegroundColor Cyan
if ($IsMacOS) {
  Write-Host "iOS pronto. Execute: npx cap open ios" -ForegroundColor Cyan
} else {
  Write-Host "O projeto iOS precisa ser criado/assinado em um Mac com Xcode." -ForegroundColor Yellow
}
