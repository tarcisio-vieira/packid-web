# VSGI Condomínio - captura de fotos pela câmera

## Alteração
O cadastro agora permite obter a foto de duas formas:

- **Escolher arquivo**: seleciona JPG/PNG já existente no computador ou celular.
- **Tirar foto**: abre a câmera do dispositivo, mostra uma prévia ao vivo e permite capturar a imagem.

A foto capturada é convertida em JPG e segue o mesmo fluxo de upload já existente. Portanto, a imagem continua sendo armazenada no Google Drive da conta autenticada e não no banco de dados.

## Mensagens ao usuário
Foram adicionadas mensagens específicas para:

- permissão da câmera negada;
- câmera inexistente;
- câmera ocupada por outro aplicativo;
- navegador sem suporte à câmera;
- imagem ainda não pronta para captura.

## Observação de segurança do navegador
O acesso à câmera funciona em `localhost` durante o desenvolvimento e em produção deve ser servido por HTTPS.
