# PackID - Organização de fotos no Google Drive e atalhos de acesso

## Google Drive

Novos uploads de fotos passam a ser gravados na conta Google autenticada com esta estrutura:

```text
VSGI-Condominium/
  Block <bloco>/
    Apartment <apartamento>/
      packid-<id>-<timestamp>.<ext>
```

Exemplo:

```text
VSGI-Condominium/Block 2/Apartment 608/packid-....jpg
```

Se o cadastro ainda não tiver bloco ou apartamento preenchido, é usada a pasta `Block Unassigned` e/ou `Apartment Unassigned`.

As imagens continuam fora do PostgreSQL. O banco mantém apenas o ID do arquivo do Drive e os metadados já existentes.

Fotos antigas não são movidas automaticamente; seus IDs continuam válidos. A nova organização é aplicada a novos uploads/substituições.

## Backend alterado

- `GoogleDrivePhotoService.java`: cria/localiza a árvore de pastas no Drive e envia a foto para o apartamento correto.
- `RegistryPhotoService.java`: passa bloco e apartamento do cadastro para o serviço do Drive.
- Nenhuma nova migration foi necessária.

## Frontend

Nas abas `Visitantes` e `Entregadores`, a primeira coluna do grid, antes da foto, passa a exibir um botão verde de ação rápida:

- Visitantes: registrar nova visita.
- Entregadores: registrar nova entrega.

O botão abre diretamente o formulário já existente de registro do evento. O atalho duplicado da coluna de ações à direita foi removido; o histórico, edição e exclusão permanecem disponíveis.
