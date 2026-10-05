# VSGI Condomínio — preparação para Google Play e App Store

## Identidade do app
- Nome: VSGI Condomínio
- Application/Bundle ID: `br.com.vsgi.condominio`
- Empresa: Vieira Sistemas de Gestão Integrada Ltda
- D-U-N-S: `824172342`

## Preparação local
No Windows PowerShell:

```powershell
./mobile-setup.ps1
npx cap open android
```

No macOS, depois de instalar Node 22+, Xcode 26+ e CocoaPods:

```bash
npm install
npm install @capacitor/core@8.5.2 @capacitor/android@8.5.2 @capacitor/ios@8.5.2
npm install -D @capacitor/cli@8.5.2
npm run build:prod
npx cap add ios
npx cap sync ios
npx cap open ios
```

## Android
Capacitor 8 usa compileSdk/targetSdk 36, compatível com a exigência atual para novos apps do Google Play.
Gerar um Android App Bundle (.aab) assinado pelo Android Studio e enviar ao Play Console.

## iOS
O envio exige um Mac com Xcode. Use o Bundle ID `br.com.vsgi.condominio`, selecione a equipe da conta Apple Developer da Vieira Sistemas de Gestão Integrada Ltda e envie o archive pelo Xcode/App Store Connect.

## Antes da revisão
- Política de privacidade pública no domínio da VSGI.
- E-mail e telefone de suporte.
- Conta de demonstração ou instruções de acesso para a equipe de revisão, se o app exigir login.
- Screenshots reais do app.
- Ícone 1024x1024 e assets Android/iOS.
- Descrever claramente por que o app é mais que um site: notificações, navegação app-like, operação de portaria, carteira/piscina, área de lazer e fluxos autenticados.
