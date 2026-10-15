import express from 'express';
import { db } from './db/connection.ts';

const app = express();
const PORTA = 3000;

app.use(express.json());

// ============================================================
// ROTAS INLINE - TUDO AQUI MESMO
// ============================================================

// Health
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', mensagem: 'Servidor rodando!' });
});

// ============================================================
// CATEGORIAS
// ============================================================
app.get('/categorias', (_req, res) => {
  try {
    const categorias = db.prepare('SELECT * FROM categorias ORDER BY nome').all();
    res.json(categorias);
  } catch (erro) {
    res.status(500).json({ erro: 'Falha ao buscar categorias' });
  }
});

app.post('/categorias', (req, res) => {
  try {
    const { nome, tipo, cor, icone, grupo_id } = req.body;

    if (!nome || !tipo) {
      res.status(400).json({ erro: 'nome e tipo são obrigatórios' });
      return;
    }

    const resultado = db.prepare(
      'INSERT INTO categorias (nome, tipo, cor, icone, grupo_id) VALUES (?, ?, ?, ?, ?)'
    ).run(nome, tipo, cor ?? '#6366f1', icone ?? 'wallet', grupo_id ?? null);

    const novaCategoria = db.prepare('SELECT * FROM categorias WHERE id = ?').get(resultado.lastInsertRowid);

    res.status(201).json(novaCategoria);
  } catch (erro) {
    res.status(500).json({ erro: 'Falha ao criar categoria' });
  }
});

// ============================================================
// TRANSACOES
// ============================================================
app.get('/transacoes', (_req, res) => {
  try {
    const transacoes = db.prepare(`
      SELECT t.*, c.nome as categoria_nome, c.tipo as categoria_tipo
      FROM transacoes t
      JOIN categorias c ON t.categoria_id = c.id
      ORDER BY t.data DESC, t.id DESC
    `).all();
    res.json(transacoes);
  } catch (erro) {
    res.status(500).json({ erro: 'Falha ao buscar transações' });
  }
});

app.post('/transacoes', (req, res) => {
  try {
    const { grupo_id, categoria_id, usuario_id, descricao, valor, tipo, data, observacao } = req.body;

    if (!grupo_id || !categoria_id || !usuario_id || !descricao || !valor || !tipo || !data) {
      res.status(400).json({ erro: 'Todos os campos obrigatórios devem ser preenchidos' });
      return;
    }

    if (tipo !== 'receita' && tipo !== 'despesa') {
      res.status(400).json({ erro: 'tipo deve ser receita ou despesa' });
      return;
    }

    const resultado = db.prepare(`
      INSERT INTO transacoes (grupo_id, categoria_id, usuario_id, descricao, valor, tipo, data, observacao)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(grupo_id, categoria_id, usuario_id, descricao, valor, tipo, data, observacao ?? null);

    const novaTransacao = db.prepare('SELECT * FROM transacoes WHERE id = ?').get(resultado.lastInsertRowid);

    res.status(201).json(novaTransacao);
  } catch (erro) {
    res.status(500).json({ erro: 'Falha ao criar transação' });
  }
});

app.get('/transacoes/:id', (req, res) => {
  try {
    const transacao = db.prepare('SELECT * FROM transacoes WHERE id = ?').get(Number(req.params.id));

    if (!transacao) {
      res.status(404).json({ erro: 'Transação não encontrada' });
      return;
    }

    res.json(transacao);
  } catch (erro) {
    res.status(500).json({ erro: 'Falha ao buscar transação' });
  }
});

app.put('/transacoes/:id', (req, res) => {
  try {
    const { descricao, valor, tipo, data, observacao, categoria_id } = req.body;

    const existente = db.prepare('SELECT id FROM transacoes WHERE id = ?').get(Number(req.params.id));
    if (!existente) {
      res.status(404).json({ erro: 'Transação não encontrada' });
      return;
    }

    db.prepare(`
      UPDATE transacoes
      SET descricao = COALESCE(?, descricao),
          valor = COALESCE(?, valor),
          tipo = COALESCE(?, tipo),
          data = COALESCE(?, data),
          observacao = COALESCE(?, observacao),
          categoria_id = COALESCE(?, categoria_id)
      WHERE id = ?
    `).run(descricao, valor, tipo, data, observacao, categoria_id, Number(req.params.id));

    const atualizada = db.prepare('SELECT * FROM transacoes WHERE id = ?').get(Number(req.params.id));
    res.json(atualizada);
  } catch (erro) {
    res.status(500).json({ erro: 'Falha ao atualizar transação' });
  }
});

app.delete('/transacoes/:id', (req, res) => {
  try {
    const existente = db.prepare('SELECT id FROM transacoes WHERE id = ?').get(Number(req.params.id));
    if (!existente) {
      res.status(404).json({ erro: 'Transação não encontrada' });
      return;
    }

    db.prepare('DELETE FROM transacoes WHERE id = ?').run(Number(req.params.id));
    res.json({ mensagem: 'Transação removida com sucesso' });
  } catch (erro) {
    res.status(500).json({ erro: 'Falha ao remover transação' });
  }
});

// ============================================================
// ORCAMENTOS
// ============================================================
app.post('/orcamentos', (req, res) => {
  try {
    const { grupo_id, categoria_id, mes, valor_limite, alerta_em } = req.body;

    if (!grupo_id || !categoria_id || !mes || !valor_limite) {
      res.status(400).json({ erro: 'grupo_id, categoria_id, mes e valor_limite são obrigatórios' });
      return;
    }

    const existente = db.prepare(
      'SELECT id FROM orcamentos WHERE grupo_id = ? AND categoria_id = ? AND mes = ?'
    ).get(grupo_id, categoria_id, mes);

    if (existente) {
      db.prepare(`
        UPDATE orcamentos
        SET valor_limite = ?, alerta_em = ?
        WHERE grupo_id = ? AND categoria_id = ? AND mes = ?
      `).run(valor_limite, alerta_em ?? 80, grupo_id, categoria_id, mes);

      res.json({ mensagem: 'Orçamento atualizado com sucesso' });
    } else {
      db.prepare(`
        INSERT INTO orcamentos (grupo_id, categoria_id, mes, valor_limite, alerta_em)
        VALUES (?, ?, ?, ?, ?)
      `).run(grupo_id, categoria_id, mes, valor_limite, alerta_em ?? 80);

      res.status(201).json({ mensagem: 'Orçamento criado com sucesso' });
    }
  } catch (erro) {
    res.status(500).json({ erro: 'Falha ao salvar orçamento' });
  }
});

app.get('/orcamentos/status', (_req, res) => {
  try {
    const { grupo_id, mes } = _req.query as Record<string, string>;

    if (!grupo_id || !mes) {
      res.status(400).json({ erro: 'grupo_id e mes são obrigatórios' });
      return;
    }

    const status = db.prepare(`
      SELECT
        c.id as categoria_id,
        c.nome as categoria,
        o.valor_limite as limite,
        COALESCE(SUM(t.valor), 0) as gasto,
        ROUND(
          COALESCE(SUM(t.valor), 0) * 100.0 / NULLIF(o.valor_limite, 0),
          2
        ) as percentual_consumido,
        o.alerta_em as limite_alerta,
        CASE
          WHEN COALESCE(SUM(t.valor), 0) >= o.valor_limite THEN 'estourou'
          WHEN COALESCE(SUM(t.valor), 0) * 100.0 / o.valor_limite >= o.alerta_em THEN 'alerta'
          ELSE 'ok'
        END as status
      FROM orcamentos o
      JOIN categorias c ON o.categoria_id = c.id
      LEFT JOIN transacoes t
        ON t.categoria_id = c.id
        AND t.grupo_id = o.grupo_id
        AND t.tipo = 'despesa'
        AND t.data LIKE ?
      WHERE o.grupo_id = ? AND o.mes = ?
      GROUP BY c.id, c.nome, o.valor_limite, o.alerta_em
      ORDER BY c.nome
    `).all(`${mes}%`, grupo_id, mes);

    res.json({
      grupo_id,
      mes,
      orcamentos: status
    });
  } catch (erro) {
    res.status(500).json({ erro: 'Falha ao buscar status do orçamento' });
  }
});

app.listen(PORTA, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORTA}`);
});
