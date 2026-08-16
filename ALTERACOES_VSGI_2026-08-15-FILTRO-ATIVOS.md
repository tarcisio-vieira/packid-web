# VSGI Condomínio — filtro de registros ativos/inativos

## Alteração

Os grids de cadastros da Gestão do condomínio passam a iniciar mostrando somente registros ativos.

Foi adicionado o checkbox **Mostrar inativos** ao lado da pesquisa. Quando marcado, o grid exibe ativos e inativos juntos.

A regra vale para as abas:

- Condôminos
- Entregadores
- Visitantes
- Bicicletas
- Pets
- Veículos

## Comportamento

- Padrão ao abrir a tela: somente ativos.
- Checkbox desmarcado: registros inativos não aparecem no grid nem entram na paginação.
- Checkbox marcado: ativos e inativos aparecem normalmente.
- A pesquisa continua funcionando sobre a lista filtrada.
- A paginação continua com 5, 10 e 50 registros, iniciando com 10.
- Ao alterar o checkbox, a paginação volta para a primeira página.
- Se um registro inativo estiver selecionado e o usuário desmarcar o checkbox, a seleção é limpa.
