Correção V12 do ícone da aba do navegador.

Copie:
- index.html para a raiz do packid-web
- public/favicon.ico
- public/favicon-32.png
- public/vsgi-favicon.svg
- public/icons/vsgi-192.png
- public/icons/vsgi-512.png
- public/manifest.webmanifest

Depois execute:
npm run build:prod

Confira no dist:
ls -lh dist/favicon.ico dist/favicon-32.png dist/vsgi-favicon.svg

Em desenvolvimento/publicado, abra diretamente:
http://localhost:5173/condominio/favicon.ico?v=12
ou
https://app.vsgi.com.br/condominio/favicon.ico?v=12

Se o arquivo abrir e a aba ainda mostrar o ícone antigo, faça Ctrl+Shift+R ou feche/reabra a guia.
