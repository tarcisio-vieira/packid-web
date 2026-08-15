# Pesquisa de unidade no histórico de encomendas

A pesquisa da tela **PackID - Recebimento de encomendas** agora reconhece também:

- Página + Bloco + Apartamento: `09911203` → página `099`, bloco `1`, apartamento `1203`.
- Bloco + Apartamento: `11203` → bloco `1`, apartamento `1203`.
- Os filtros anteriores por código da encomenda, página, bloco e apartamento continuam funcionando.

A alteração é somente de frontend e não exige migration de banco.
