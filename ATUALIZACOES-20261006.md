# VSGI Condomínio — front consolidado em 06/10/2026

Esta base foi montada sobre o ZIP mais recente enviado e inclui as alterações tratadas até aqui:

1. **Fotos/imagens no app Android**
   - `AuthenticatedMedia.tsx` busca as imagens com `credentials: "include"` e cria Object URLs;
   - aplicado às fotos de moradores/condôminos, fotos de ambientes e logo da carteirinha;
   - mantém o acesso ao Google Drive encapsulado pelo backend.

2. **Safe area no Android**
   - o portal do morador respeita `env(safe-area-inset-top)` e `env(safe-area-inset-bottom)`;
   - o cabeçalho sticky das páginas internas não fica sob a barra de status.

3. **Política de Privacidade**
   - página pública: `public/politica-de-privacidade.html`;
   - URL de produção: `https://app.vsgi.com.br/condominio/politica-de-privacidade.html`;
   - link incluído nas telas de login do morador e do colaborador.

4. **Play Store / Android**
   - identidade: `VSGI Condomínio` / pacote `br.com.vsgi.condominio`;
   - como a versão 2 (1.0.1) já foi usada no teste interno, o próximo AAB deve usar:

```gradle
versionCode 3
versionName "1.0.2"
```

O projeto Android não veio dentro deste ZIP do front, então essa alteração deve ser feita no `android/app/build.gradle` do projeto Android já existente no computador.

## Build web

```bash
npm run build:prod
```

## Build Android

```bash
npm run build:android
npx cap sync android
```
