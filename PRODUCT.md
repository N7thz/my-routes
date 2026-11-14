# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Uso pessoal: um único técnico/fiscal que visita empresas presencialmente, quase todas no estado do Rio de Janeiro e principalmente em Teresópolis. Ele organiza as visitas pela agenda do Google e precisa saber, a cada dia, quais empresas visitar e em que ordem. Outros usuários só existem para teste; a área de admin é restrita por e-mail.

## Product Purpose

Juntar num só lugar o cadastro das empresas visitadas e a organização dos deslocamentos. O app transforma a agenda do dia em uma rota pronta, para o usuário não precisar montar a ordem das visitas na mão. Sucesso é abrir o app e já encontrar a rota do dia certa, com os endereços resolvidos.

## Positioning

A agenda vira rota sozinha: eventos do Google Calendar → empresas da visita → endereços → rota do dia com ordem otimizada, gerada automaticamente. O cadastro da empresa vem preenchido a partir do CNPJ.

## Operating Context

- Quase tudo acontece no desktop: cadastro e organização de empresas, leitura da agenda, geração e ajuste de rotas, configurações.
- O celular é secundário, usado durante a rota na rua. Por isso o app é um PWA instalável, em retrato, e a rota do dia funciona sem sinal (página `/offline`).
- A agenda do Google é a fonte das visitas. Uma ou mais contas Google podem ser vinculadas.
- Fluxo natural: eventos do calendário → empresas → endereços (geocodificação) → rota otimizada → execução, com navegação até cada parada.

## Capabilities and Constraints

- Telas: empresas, agenda, rotas, perfil/configurações, admin.
- Empresas têm status, CNPJ, grupos, endereço geocodificado e marca de falha quando o endereço não é encontrado. Filtros podem ser salvos.
- Rotas por dia ou por janela de datas, com rota automática configurável e navegação até a parada.
- Só serviços gratuitos: nada com billing, nem com crédito grátis (mapas, geocodificação etc.). O uso das APIs com limite é acompanhado no app.
- Idioma: pt-BR.
- Stack existente: Next.js 16 (App Router), Tailwind 4, componentes ui-sdk com API do shadcn em `src/components/ui/*`, Prisma + Postgres (Supabase), Better Auth.
- Eventos da agenda casam com qualquer empresa cadastrada pelo nome. Os que não citam nenhuma aparecem em "Eventos sem empresa" (tela de rotas), onde viram empresa com o formulário já preenchido ou são marcados como "não é visita" (o título sai da rota e da lista).
- O mapa da rota mostra a posição do usuário ao vivo (GPS do aparelho). Na rota de hoje, ficar 1 min a até 80 m de uma parada a marca como visitada (com "Desfazer"), e o trajeto é gravado e desenhado no mapa. Liga/desliga por aparelho no menu de ações.

## Product Principles

1. Automático antes de manual: o caminho padrão é a agenda gerar a rota; o ajuste manual é exceção.
2. Feito para uma pessoa e um trabalho: preferir o atalho certo para esse fluxo a generalizar para um público que não existe.
3. A rota tem que funcionar na rua: o que a execução precisa continua disponível offline e no celular, mesmo com o desktop sendo o lugar principal.
4. Custo zero é requisito, não detalhe: nenhuma feature pode depender de serviço pago.
