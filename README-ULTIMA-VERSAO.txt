VSGI CONDOMINIO - FRONT CONSOLIDADO - 2026-10-05

Base consolidada:
- vsgi-condominio-front-v10-1-foto-documento
- src-ajustado-build-v10 (correcoes de build)
- favicon v12 (casas + apartamentos)
- preparacao Android/Capacitor 8 feita em 05/10/2026

Android:
- appId: br.com.vsgi.condominio
- appName: VSGI Condominio
- build Android: npm run build:android
- API Android: https://app.vsgi.com.br/packid
- CapacitorHttp e CapacitorCookies habilitados

IMPORTANTE:
O package-lock original anterior ao Capacitor foi preservado como
package-lock.pre-capacitor.json. Como o Capacitor 8 foi adicionado depois,
execute `npm install` para gerar um package-lock.json atualizado antes de usar
`npm ci`.

Para recriar o projeto nativo Android, se a pasta android nao estiver presente:
1. npm install
2. npm run build:android
3. npx cap add android
4. npx cap sync android

Para build web de producao:
- npm run build:prod
