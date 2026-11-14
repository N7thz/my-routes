-- Runrunit removido: a fonte da rota automática passa a ser as empresas
-- agendadas. Renomeia a coluna para manter a preferência de cada usuário.
ALTER TABLE "auto_route_settings" RENAME COLUMN "use_runrunit" TO "use_companies";
