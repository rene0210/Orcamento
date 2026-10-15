import { Router } from 'express';
import { db } from '../db/connection.ts';

const router = Router();

// GET /transacoes — lista transações com filtros opcionais
// Query params: ?grupo_id=1&mes=2026-10&tipo=despesa
router.get('/', (_req, res) => {
  try {
    const { grupo_id, mes, tipo } = _req.query as Record<string, string>;

    let sql = `
      SELECT t.*, c.nome as categoria_nome, c.tipo as categoria_tipo
      FROM transacoes t
      JOIN categorias c ON t.categoria_id = c.id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (grupo_id) {
      sql += ' AND t.grupo_id = ?';
      params.push(grupo_id);
    }
    if (mes) {
      sql += " AND t.data LIKE ?";
      params.push(`${mes}%`);
    }
    if (tipo) {
      sql += ' AND t.tipo = ?';
      params.push(tipo);
    }

    sql += ' ORDER BY t.data DESC, t.id DESC';

    const transacoes = db.prepare(sql).all(...params);
    res.json(transacoes);
  } catch (erro) {
    res.status(500).json({ erro: 'Falha ao buscar transações' });
  }
});

// POST /transacoes — cria uma nova transação
router.post('/', (req, res) => {
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

// GET /transacoes/:id — busca uma transação específica
router.get('/:id', (req, res) => {
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

// PUT /transacoes/:id — atualiza uma transação
router.put('/:id', (req, res) => {
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

// DELETE /transacoes/:id — remove uma transação
router.delete('/:id', (req, res) => {
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

export default router;