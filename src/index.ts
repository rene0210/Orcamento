import express from 'express';
import { db } from './db/connection.ts';

const app = express();
const PORTA = 3000;

app.use(express.json());

// ============================================================
// ROTA DE SAÚDE
// ============================================================
app.get('/health', (_req, res) => {
  try {
    const resultado = db.prepare('SELECT 1 as ok').get() as { ok: number };
    res.json({
      status: 'ok',
      mensagem: 'Servidor rodando!',
      banco: resultado.ok === 1 ? 'conectado' : 'erro',
      timestamp: new Date().toISOString(),
    });
  } catch (erro) {
    res.status(500).json({
      status: 'erro',
      mensagem: 'Servidor no ar, mas banco não respondeu',
      erro: erro instanceof Error ? erro.message : String(erro),
    });
  }
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

// ============================================================
// RATEIOS - Divisão de contas
// ============================================================

// POST /rateios — cria uma conta e calcula quem deve quanto
app.post('/rateios', (req, res) => {
  try {
    const {
      grupo_id,
      descricao,
      valor_total,
      regra_rateio,
      data_vencimento,
      criado_por_id,
      valores_fixos,
    } = req.body;

    if (!grupo_id || !descricao || !valor_total || !regra_rateio || !criado_por_id) {
      res.status(400).json({
        erro: 'grupo_id, descricao, valor_total, regra_rateio e criado_por_id são obrigatórios',
      });
      return;
    }

    if (!['50_50', 'proporcional_renda', 'valor_fixo'].includes(regra_rateio)) {
      res.status(400).json({
        erro: "regra_rateio deve ser '50_50', 'proporcional_renda' ou 'valor_fixo'",
      });
      return;
    }

    const membros = db.prepare(
      'SELECT usuario_id, renda_mensal FROM membros_grupo WHERE grupo_id = ?'
    ).all(grupo_id) as Array<{ usuario_id: number; renda_mensal: number }>;

    if (membros.length === 0) {
      res.status(400).json({ erro: 'O grupo não possui membros cadastrados' });
      return;
    }

    type RateioParticipante = { usuario_id: number; valor_devido: number };
    const participantes: RateioParticipante[] = [];

    if (regra_rateio === '50_50') {
      const valorPorPessoa = valor_total / membros.length;
      for (const m of membros) {
        participantes.push({ usuario_id: m.usuario_id, valor_devido: valorPorPessoa });
      }
    } else if (regra_rateio === 'proporcional_renda') {
      const rendaTotal = membros.reduce((soma, m) => soma + m.renda_mensal, 0);

      if (rendaTotal <= 0) {
        res.status(400).json({
          erro: 'Não é possível ratear proporcionalmente: renda total do grupo é zero',
        });
        return;
      }

      for (const m of membros) {
        const proporcao = m.renda_mensal / rendaTotal;
        const valorDevido = valor_total * proporcao;
        participantes.push({ usuario_id: m.usuario_id, valor_devido: valorDevido });
      }
    } else if (regra_rateio === 'valor_fixo') {
      if (!valores_fixos || !Array.isArray(valores_fixos)) {
        res.status(400).json({
          erro: "valores_fixos é obrigatório para regra 'valor_fixo'",
        });
        return;
      }

      const somaFixos = valores_fixos.reduce((soma, v) => soma + v.valor, 0);
      if (Math.abs(somaFixos - valor_total) > 0.01) {
        res.status(400).json({
          erro: `A soma dos valores fixos (${somaFixos}) não confere com o valor total (${valor_total})`,
        });
        return;
      }

      for (const vf of valores_fixos) {
        participantes.push({ usuario_id: vf.usuario_id, valor_devido: vf.valor });
      }
    }

    const resultadoRateio = db.prepare(`
      INSERT INTO rateios (grupo_id, descricao, valor_total, regra_rateio, data_vencimento, status, criado_por_id)
      VALUES (?, ?, ?, ?, ?, 'aberto', ?)
    `).run(grupo_id, descricao, valor_total, regra_rateio, data_vencimento ?? null, criado_por_id);

    const rateioId = Number(resultadoRateio.lastInsertRowid);

    const inserirParticipante = db.prepare(`
      INSERT INTO rateio_participantes (rateio_id, usuario_id, valor_devido, valor_pago, status)
      VALUES (?, ?, ?, 0, 'pendente')
    `);

    for (const p of participantes) {
      inserirParticipante.run(rateioId, p.usuario_id, p.valor_devido);
    }

    const rateioCriado = db.prepare('SELECT * FROM rateios WHERE id = ?').get(rateioId);
    const participantesCriados = db.prepare(
      'SELECT * FROM rateio_participantes WHERE rateio_id = ?'
    ).all(rateioId);

    res.status(201).json({
      rateio: rateioCriado,
      participantes: participantesCriados,
      regra_aplicada: regra_rateio,
    });
  } catch (erro) {
    res.status(500).json({ erro: 'Falha ao criar rateio', detalhe: String(erro) });
  }
});

// GET /rateios — lista rateios de um grupo
app.get('/rateios', (_req, res) => {
  try {
    const { grupo_id } = _req.query as Record<string, string>;

    if (!grupo_id) {
      res.status(400).json({ erro: 'grupo_id é obrigatório (?grupo_id=1)' });
      return;
    }

    const rateios = db.prepare(`
      SELECT r.*, u.nome as criado_por_nome
      FROM rateios r
      JOIN usuarios u ON r.criado_por_id = u.id
      WHERE r.grupo_id = ?
      ORDER BY r.data_vencimento ASC, r.id DESC
    `).all(grupo_id) as Array<Record<string, unknown>>;

    const rateiosComParticipantes: Array<Record<string, unknown>> = [];
    for (const r of rateios) {
      const participantes = db.prepare(`
        SELECT rp.*, u.nome as usuario_nome
        FROM rateio_participantes rp
        JOIN usuarios u ON rp.usuario_id = u.id
        WHERE rp.rateio_id = ?
      `).all(r.id);

      rateiosComParticipantes.push({
        ...r,
        participantes,
      });
    }

    res.json(rateiosComParticipantes);
  } catch (erro) {
    res.status(500).json({ erro: 'Falha ao buscar rateios' });
  }
});

// POST /rateios/:id/pagar — marca a participação de um usuário como paga
app.post('/rateios/:id/pagar', (req, res) => {
  try {
    const rateioId = Number(req.params.id);
    const { usuario_id } = req.body;

    if (!usuario_id) {
      res.status(400).json({ erro: 'usuario_id é obrigatório no corpo' });
      return;
    }

    const rateio = db.prepare('SELECT * FROM rateios WHERE id = ?').get(rateioId);
    if (!rateio) {
      res.status(404).json({ erro: 'Rateio não encontrado' });
      return;
    }

    const participante = db.prepare(
      'SELECT * FROM rateio_participantes WHERE rateio_id = ? AND usuario_id = ?'
    ).get(rateioId, usuario_id);

    if (!participante) {
      res.status(404).json({ erro: 'Usuário não é participante deste rateio' });
      return;
    }

    db.prepare(`
      UPDATE rateio_participantes
      SET valor_pago = valor_devido, status = 'pago'
      WHERE rateio_id = ? AND usuario_id = ?
    `).run(rateioId, usuario_id);

    const pendentes = db.prepare(`
      SELECT COUNT(*) as total FROM rateio_participantes
      WHERE rateio_id = ? AND status = 'pendente'
    `).get(rateioId) as { total: number };

    if (pendentes.total === 0) {
      db.prepare('UPDATE rateios SET status = ? WHERE id = ?').run('quitado', rateioId);
    }

    res.json({
      mensagem: 'Pagamento registrado com sucesso',
      rateio_id: rateioId,
      usuario_id,
      rateio_quitado: pendentes.total === 0,
    });
  } catch (erro) {
    res.status(500).json({ erro: 'Falha ao registrar pagamento' });
  }
});

// GET /rateios/resumo?grupo_id=1 — resumo de quem deve quanto a quem
app.get('/rateios/resumo', (_req, res) => {
  try {
    const { grupo_id } = _req.query as Record<string, string>;

    if (!grupo_id) {
      res.status(400).json({ erro: 'grupo_id é obrigatório' });
      return;
    }

    const dividas = db.prepare(`
      SELECT
        rp.usuario_id as devedor_id,
        u.nome as devedor_nome,
        rp.valor_devido,
        rp.valor_pago,
        (rp.valor_devido - rp.valor_pago) as saldo_devedor,
        r.id as rateio_id,
        r.descricao as rateio_descricao
      FROM rateio_participantes rp
      JOIN rateios r ON rp.rateio_id = r.id
      JOIN usuarios u ON rp.usuario_id = u.id
      WHERE r.grupo_id = ? AND rp.status = 'pendente'
      ORDER BY u.nome
    `).all(grupo_id);

    res.json({
      grupo_id,
      total_dividas: dividas.length,
      dividas,
    });
  } catch (erro) {
    res.status(500).json({ erro: 'Falha ao buscar resumo de rateios' });
  }
});

app.listen(PORTA, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORTA}`);
});
