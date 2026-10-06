# VSGI Condomínio — consolidação para Play Store

Incluído nesta versão do front:

- carregamento autenticado de fotos/imagens via backend (`AuthenticatedMedia`);
- correção das fotos no portal do morador, reservas de ambientes e carteirinha;
- respeito à área segura (`safe-area`) superior/inferior no Android;
- Política de Privacidade pública em `/condominio/politica-de-privacidade.html`;
- link para a Política de Privacidade nas telas de login de morador e colaborador;
- identidade VSGI Condomínio preservada.

Para o próximo App Bundle Android, usar no projeto Android local:

```gradle
versionCode 3
versionName "1.0.2"
```

Depois:

```bash
npm run build:android
npx cap sync android
```
