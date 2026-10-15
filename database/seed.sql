-- ============================================================
-- Seed: dados de exemplo para testar o banco
-- Rode depois do schema.sql
-- ============================================================

-- 1. Dois usuários
INSERT OR IGNORE INTO usuarios (nome, email, senha_hash) VALUES
  ('Ana Silva', 'ana@email.com', 'hash_ana_123'),
  ('Bruno Silva', 'bruno@email.com', 'hash_bruno_123');

-- 2. Um grupo (casal)
INSERT INTO grupos (nome, descricao, criado_por_id) VALUES
  ('Casa Ana & Bruno', 'Orçamento compartilhado do casal', 1);

-- 3. Ambos são membros do grupo, com rendas diferentes
-- (essencial para rateio proporcional à renda)
INSERT OR IGNORE INTO membros_grupo (grupo_id, usuario_id, papel, renda_mensal) VALUES
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

-- 5. Transações de outubro/2026
INSERT INTO transacoes (grupo_id, categoria_id, usuario_id, descricao, valor, tipo, data, observacao, origem) VALUES
  (1, 1, 1, 'Salário Ana', 6000, 'receita', '2026-10-05', 'Salário mensal', 'manual'),
  (1, 1, 2, 'Salário Bruno', 4000, 'receita', '2026-10-05', 'Salário mensal', 'manual'),
  (1, 2, 1, 'Supermercado', 450, 'despesa', '2026-10-07', 'Arroz, feijão, carne', 'manual'),
  (1, 3, 2, 'Aluguel', 1800, 'despesa', '2026-10-01', 'Aluguel do apartamento', 'manual'),
  (1, 4, 1, 'Uber', 35, 'despesa', '2026-10-10', 'Corrida até o shopping', 'manual'),
  (1, 5, 2, 'Cinema', 60, 'despesa', '2026-10-12', 'Ingresso + pipoca', 'manual'),
  (1, 6, 1, 'Passagem aérea', 1200, 'despesa', '2026-10-14', 'Reserva para dezembro', 'manual');

-- 6. Orçamento mensal (outubro/2026)
INSERT OR IGNORE INTO orcamentos (grupo_id, categoria_id, mes, valor_limite, alerta_em) VALUES
  (1, 2, '2026-10', 800, 80),   -- Alimentação: R$ 800, alerta a 80%
  (1, 3, '2026-10', 2000, 90),  -- Moradia: R$ 2000, alerta a 90%
  (1, 4, '2026-10', 300, 80),   -- Transporte: R$ 300, alerta a 80%
  (1, 5, '2026-10', 400, 80);   -- Lazer: R$ 400, alerta a 80%

-- 7. Meta compartilhada: viagem
INSERT INTO metas (grupo_id, nome, descricao, valor_alvo, valor_guardado, data_alvo, status) VALUES
  (1, 'Viagem para o Japão', 'Fundo de viagem de férias', 15000, 3500, '2027-03-01', 'ativa');

-- 8. Contribuições para a meta
INSERT INTO contribuicoes_meta (meta_id, usuario_id, valor, data) VALUES
  (1, 1, 2000, '2026-09-01'),
  (1, 2, 1500, '2026-09-15');

-- 9. Rateio de conta de luz (proporcional à renda)
INSERT INTO rateios (grupo_id, descricao, valor_total, regra_rateio, data_vencimento, status, criado_por_id) VALUES
  (1, 'Conta de luz - outubro', 280, 'proporcional_renda', '2026-10-20', 'aberto', 1);

-- Participantes do rateio de luz:
-- Renda total = 10.000. Ana = 60%, Bruno = 40%
-- Ana paga 280 * 60% = 168, Bruno paga 280 * 40% = 112
INSERT INTO rateio_participantes (rateio_id, usuario_id, valor_devido, valor_pago, status) VALUES
  (1, 1, 168, 0, 'pendente'),
  (1, 2, 112, 0, 'pendente');

-- 10. Rateio de internet (50/50)
INSERT OR IGNORE INTO rateios (grupo_id, descricao, valor_total, regra_rateio, data_vencimento, status, criado_por_id) VALUES
  (1, 'Internet fibra - outubro', 100, '50_50', '2026-10-15', 'aberto', 2);

INSERT OR IGNORE INTO rateio_participantes (rateio_id, usuario_id, valor_devido, valor_pago, status) VALUES
  (2, 1, 50, 50, 'pago'),
  (2, 2, 50, 50, 'pago');

-- 11. Log de importação
INSERT INTO importacoes (grupo_id, usuario_id, arquivo_nome, formato, status, linhas_processadas, criado_em) VALUES
  (1, 1, 'extrato_outubro.csv', 'csv', 'concluido', 25, datetime('now'));
