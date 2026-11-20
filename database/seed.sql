-- ============================================================
-- Seed: dados de exemplo para testar o banco
-- Rode depois do schema.sql
-- Este script é idempotente: pode ser executado múltiplas vezes
-- ============================================================

-- Limpa todas as tabelas (ordem reversa das foreign keys)
DELETE FROM importacoes;
DELETE FROM rateio_participantes;
DELETE FROM rateios;
DELETE FROM contribuicoes_meta;
DELETE FROM metas;
DELETE FROM orcamentos;
DELETE FROM transacoes;
DELETE FROM categorias;
DELETE FROM membros_grupo;
DELETE FROM grupos;
DELETE FROM usuarios;

-- Reinicia os autoincrementos (opcional, para IDs começarem em 1)
DELETE FROM sqlite_sequence WHERE name IN (
  'usuarios','grupos','membros_grupo','categorias','transacoes',
  'orcamentos','metas','contribuicoes_meta','rateios',
  'rateio_participantes','importacoes'
);

-- 1. Dois usuários (senha de ambos: senha123 — hash bcrypt real)
INSERT INTO usuarios (nome, email, senha_hash) VALUES
  ('Ana Silva', 'ana@email.com', '$2b$10$V.HaG.cG3zsFr2rMBJvww.HLi3rv4iN6nHPJn3D9yaLRpJchd1c6G'),
  ('Bruno Silva', 'bruno@email.com', '$2b$10$6h1GXPoQU6g6LrtEuB1C.uDdSIJfVa3eGIrjG5ygdwLGXU/8CxHOm');

-- 2. Um grupo (casal)
INSERT INTO grupos (nome, descricao, criado_por_id) VALUES
  ('Casa Ana & Bruno', 'Orçamento compartilhado do casal', 1);

-- 3. Ambos são membros do grupo, com rendas diferentes
-- (essencial para rateio proporcional à renda)
INSERT INTO membros_grupo (grupo_id, usuario_id, papel, renda_mensal) VALUES
  (1, 1, 'admin', 6000),   -- Ana ganha R$ 6.000
  (1, 2, 'membro', 4000);  -- Bruno ganha R$ 4.000

-- 4. Categorias globais + uma específica do grupo
INSERT INTO categorias (grupo_id, nome, tipo, cor, icone) VALUES
  (NULL, 'Salário', 'receita', '#22c55e', 'banknote'),
  (NULL, 'Alimentação', 'despesa', '#ef4444', 'utensils'),
  (NULL, 'Moradia', 'despesa', '#3b82f6', 'home'),
  (NULL, 'Transporte', 'despesa', '#f59e0b', 'car'),
  (NULL, 'Lazer', 'despesa', '#a855f7', 'film'),
  (1, 'Viagem Japão', 'despesa', '#10b981', 'plane'); -- categoria do grupo

-- 5. Transações do mês ATUAL (datas relativas: o seed sempre mostra dados
--     no mês corrente, independentemente da data em que o app for executado)
INSERT INTO transacoes (grupo_id, categoria_id, usuario_id, descricao, valor, tipo, data, observacao, origem) VALUES
  (1, 1, 1, 'Salário Ana', 6000, 'receita', date('now','start of month','+4 days'), 'Salário mensal', 'manual'),
  (1, 1, 2, 'Salário Bruno', 4000, 'receita', date('now','start of month','+4 days'), 'Salário mensal', 'manual'),
  (1, 2, 1, 'Supermercado', 450, 'despesa', date('now','start of month','+6 days'), 'Arroz, feijão, carne', 'manual'),
  (1, 3, 2, 'Aluguel', 1800, 'despesa', date('now','start of month'), 'Aluguel do apartamento', 'manual'),
  (1, 4, 1, 'Uber', 35, 'despesa', date('now','start of month','+9 days'), 'Corrida até o shopping', 'manual'),
  (1, 5, 2, 'Cinema', 60, 'despesa', date('now','start of month','+11 days'), 'Ingresso + pipoca', 'manual'),
  (1, 6, 1, 'Passagem aérea', 1200, 'despesa', date('now','start of month','+13 days'), 'Reserva para dezembro', 'manual');

-- 6. Orçamento mensal do mês ATUAL
INSERT INTO orcamentos (grupo_id, categoria_id, mes, valor_limite, alerta_em) VALUES
  (1, 2, strftime('%Y-%m','now'), 800, 80),   -- Alimentação: R$ 800, alerta a 80%
  (1, 3, strftime('%Y-%m','now'), 2000, 90),  -- Moradia: R$ 2000, alerta a 90%
  (1, 4, strftime('%Y-%m','now'), 300, 80),   -- Transporte: R$ 300, alerta a 80%
  (1, 5, strftime('%Y-%m','now'), 400, 80);   -- Lazer: R$ 400, alerta a 80%

-- 7. Meta compartilhada: viagem
INSERT INTO metas (grupo_id, nome, descricao, valor_alvo, valor_guardado, data_alvo, status) VALUES
  (1, 'Viagem para o Japão', 'Fundo de viagem de férias', 15000, 3500, '2027-03-01', 'ativa');

-- 8. Contribuições para a meta (mês passado)
INSERT INTO contribuicoes_meta (meta_id, usuario_id, valor, data) VALUES
  (1, 1, 2000, date('now','start of month','-5 days')),
  (1, 2, 1500, date('now','start of month','-1 day'));

-- 9. Rateio de conta de luz (proporcional à renda)
INSERT INTO rateios (grupo_id, descricao, valor_total, regra_rateio, data_vencimento, status, criado_por_id) VALUES
  (1, 'Conta de luz', 280, 'proporcional_renda', date('now','start of month','+19 days'), 'aberto', 1);

-- Participantes do rateio de luz:
-- Renda total = 10.000. Ana = 60%, Bruno = 40%
-- Ana paga 280 * 60% = 168, Bruno paga 280 * 40% = 112
INSERT INTO rateio_participantes (rateio_id, usuario_id, valor_devido, valor_pago, status) VALUES
  (1, 1, 168, 0, 'pendente'),
  (1, 2, 112, 0, 'pendente');

-- 10. Rateio de internet (50/50)
INSERT INTO rateios (grupo_id, descricao, valor_total, regra_rateio, data_vencimento, status, criado_por_id) VALUES
  (1, 'Internet fibra', 100, '50_50', date('now','start of month','+14 days'), 'quitado', 2);

INSERT INTO rateio_participantes (rateio_id, usuario_id, valor_devido, valor_pago, status) VALUES
  (2, 1, 50, 50, 'pago'),
  (2, 2, 50, 50, 'pago');

-- 11. Log de importação
INSERT INTO importacoes (grupo_id, usuario_id, arquivo_nome, formato, status, linhas_processadas, criado_em) VALUES
  (1, 1, 'extrato_outubro.csv', 'csv', 'concluido', 25, datetime('now'));

-- ============================================================
-- Fim do seed
-- ============================================================
