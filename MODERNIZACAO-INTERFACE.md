# Modernização da interface — VSGI Condomínio

## Alterações aplicadas
- Tema global verde VSGI em Material UI.
- Fundo claro com profundidade visual discreta.
- AppBar fixa, translúcida e responsiva.
- Logo do condomínio com melhor destaque.
- Menu lateral com aparência mais moderna.
- Barra de navegação inferior no celular, com Início, PackID, Gestão, Piscina e Ajustes conforme permissões.
- Espaçamento inferior adaptado para navegação mobile.
- Login de colaborador e morador alinhados à nova identidade verde.
- Botões, inputs, cards, tipografia, bordas e sombras padronizados via tema MUI.
- Mantido o fluxo atual de negócio e as permissões existentes.

## Próxima etapa recomendada
- Revisar RegistryScreen por módulos e quebrar o componente grande em subcomponentes menores.
- Criar dashboard mobile específico para morador.
- Adicionar Capacitor para Android/iOS.
- Adicionar splash screen, ícone adaptativo e notificações push.

## Etapa 2 — experiência de aplicativo

- Dashboard operacional no início com saudação e status de conexão.
- Indicadores reais de PackID: recebidas hoje, aguardando retirada e últimos 7 dias.
- Atalhos em cards para Gestão, PackID, Área de lazer, Piscina e Ajustes.
- Navegação inferior mobile mantida e integrada ao dashboard.
- Manifesto PWA atualizado para a identidade verde do VSGI Condomínio.
- Safe areas preparadas para telas com notch/edge-to-edge.
- Configuração-base do Capacitor incluída (`capacitor.config.json`).
- Identificador definido: `br.com.vsgi.condominio`.
- Script PowerShell `mobile-setup.ps1` para preparar Android e, quando executado em macOS, iOS.
- Guia de publicação incluído em `PUBLICACAO-LOJAS.md`.
