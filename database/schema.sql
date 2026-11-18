-- ============================================================
-- App de Orçamento Compartilhado — Banco de Dados (SQLite)
-- ============================================================
-- SQLite escolhido por ser arquivo único, sem servidor externo.
-- Ideal para MVP e portfólio; fácil de migrar para PostgreSQL depois.
-- PRAGMA foreign_keys = ON ativa integridade referencial (sem órfãos).
PRAGMA foreign_keys = ON;

-- ------------------------------------------------------------
-- 1. USUÁRIOS
-- Quem acessa o app
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    senha_hash TEXT NOT NULL,
    criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ------------------------------------------------------------
-- 2. GRUPOS
-- Um "núcleo" compartilhado: casal, família, colegas de quarto, etc.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS grupos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    descricao TEXT,
    criado_por_id INTEGER NOT NULL,
    criado_em TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (criado_por_id) REFERENCES usuarios(id)
);

-- ------------------------------------------------------------
-- 3. MEMBROS_GRUPO
-- Liga usuário <-> grupo. Guarda a renda mensal de cada um
-- (usada no rateio proporcional à renda).
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS membros_grupo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    grupo_id INTEGER NOT NULL,
    usuario_id INTEGER NOT NULL,
    papel TEXT NOT NULL CHECK (papel IN ('admin', 'membro')) DEFAULT 'membro',
    renda_mensal REAL DEFAULT 0, -- em reais, ex: 5000.00
    entrou_em TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    UNIQUE (grupo_id, usuario_id)
);

-- ------------------------------------------------------------
-- 4. CATEGORIAS
-- Receita ou despesa. Pode ser global (null) ou de um grupo.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categorias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    grupo_id INTEGER, -- NULL = categoria padrão do sistema
    nome TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('receita', 'despesa')),
    cor TEXT DEFAULT '#6366f1',
    icone TEXT DEFAULT 'wallet',
    FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- 5. TRANSACOES
-- Cada lançamento financeiro (receita ou despesa).
-- 'origem' distingue lançamentos manuais de importados (CSV/OFX).
-- 'arquivo_origem' permite rastrear de qual extrato veio a transação.
-- ON DELETE CASCADE: se excluir grupo/categoria/usuario, transações somam junto.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transacoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    grupo_id INTEGER NOT NULL,
    categoria_id INTEGER NOT NULL,
    usuario_id INTEGER NOT NULL, -- quem lançou a transação
    descricao TEXT NOT NULL,
    valor REAL NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('receita', 'despesa')),
    data TEXT NOT NULL, -- ISO 8601: "2026-10-15"
    observacao TEXT,
    origem TEXT NOT NULL DEFAULT 'manual', -- manual | importado
    arquivo_origem TEXT, -- nome do CSV/OFX importado
    criado_em TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- ------------------------------------------------------------
-- 6. ORCAMENTOS
-- Limite mensal por categoria dentro de um grupo
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orcamentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    grupo_id INTEGER NOT NULL,
    categoria_id INTEGER NOT NULL,
    mes TEXT NOT NULL, -- formato "YYYY-MM", ex: "2026-10"
    valor_limite REAL NOT NULL,
    alerta_em INTEGER NOT NULL DEFAULT 80, -- % de consumo para alertar
    FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id),
    UNIQUE (grupo_id, categoria_id, mes)
);

-- ------------------------------------------------------------
-- 7. METAS
-- Objetivo financeiro compartilhado (viagem, casa, carro)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS metas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    grupo_id INTEGER NOT NULL,
    nome TEXT NOT NULL,
    descricao TEXT,
    valor_alvo REAL NOT NULL,
    valor_guardado REAL NOT NULL DEFAULT 0,
    data_alvo TEXT, -- "YYYY-MM-DD", opcional
    status TEXT NOT NULL DEFAULT 'ativa', -- ativa | concluida | cancelada
    criado_em TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- 8. CONTRIBUICOES_META
-- Quanto cada membro colocou em cada meta
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contribuicoes_meta (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    meta_id INTEGER NOT NULL,
    usuario_id INTEGER NOT NULL,
    valor REAL NOT NULL,
    data TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (meta_id) REFERENCES metas(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- ------------------------------------------------------------
-- 9. RATEIOS
-- Uma conta a ser dividida entre os membros do grupo.
-- regra_rateio define a lógica de divisão (50_50, proporcional_renda, valor_fixo).
-- status 'aberto' = pendente de pagamento; 'quitado' = todos pagaram.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rateios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    grupo_id INTEGER NOT NULL,
    descricao TEXT NOT NULL,
    valor_total REAL NOT NULL,
    regra_rateio TEXT NOT NULL CHECK (regra_rateio IN ('50_50', 'proporcional_renda', 'valor_fixo')),
    data_vencimento TEXT,
    status TEXT NOT NULL DEFAULT 'aberto', -- aberto | quitado
    criado_por_id INTEGER NOT NULL,
    criado_em TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE,
    FOREIGN KEY (criado_por_id) REFERENCES usuarios(id)
);

-- ------------------------------------------------------------
-- 10. RATEIO_PARTICIPANTES
-- Quem deve quanto em cada rateio.
-- UNIQUE (rateio_id, usuario_id) impede duplicatas do mesmo usuário num rateio.
-- valor_devido é calculado no backend (rateio); valor_pago é atualizado quando paga.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rateio_participantes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rateio_id INTEGER NOT NULL,
    usuario_id INTEGER NOT NULL,
    valor_devido REAL NOT NULL DEFAULT 0,
    valor_pago REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pendente', -- pendente | pago
    FOREIGN KEY (rateio_id) REFERENCES rateios(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    UNIQUE (rateio_id, usuario_id)
);

-- ------------------------------------------------------------
-- 11. IMPORTACOES
-- Log de arquivos CSV/OFX importados
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS importacoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    grupo_id INTEGER NOT NULL,
    usuario_id INTEGER NOT NULL,
    arquivo_nome TEXT NOT NULL,
    formato TEXT NOT NULL CHECK (formato IN ('csv', 'ofx')),
    status TEXT NOT NULL DEFAULT 'processando', -- processando | concluido | erro
    linhas_processadas INTEGER DEFAULT 0,
    criado_em TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- ------------------------------------------------------------
-- Índices para consultas rápidas
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_transacoes_grupo_data ON transacoes(grupo_id, data);
CREATE INDEX IF NOT EXISTS idx_transacoes_categoria ON transacoes(categoria_id);
CREATE INDEX IF NOT EXISTS idx_orcamentos_mes ON orcamentos(grupo_id, mes);
CREATE INDEX IF NOT EXISTS idx_rateios_grupo ON rateios(grupo_id);
