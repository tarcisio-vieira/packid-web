# Ajustes nas listas de encomendas

- Visão da unidade: removidas as colunas **Condômino** e **Observação** da lista de encomendas.
- Tela **Identificar pacote**: removidas as colunas **Condômino** e **Assinatura** do histórico.
- Impressão da tabela do histórico acompanha as mesmas colunas exibidas na tela.
- Corrigido o mapeamento do campo `bookPage` no frontend. A API já retornava a página, porém o `refreshHistory` não copiava o valor para `LabelHistoryRow`, por isso a coluna aparecia como `-`.
