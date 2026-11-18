import express from 'express';
import { db } from './db/connection.ts';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORTA = 3000;
// Segredo para assinar JWT. Em produção, deve vir de variável de ambiente.
const JWT_SECRET = process.env.JWT_SECRET || 'orcamento-secreto-mudar-em-producao';

// Middleware para parsear corpo JSON nas requisições
app.use(express.json());
// Serve arquivos estáticos do frontend buildado (Vite build -> frontend/dist)
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// ============================================================
// MIDDLEWARE DE AUTENTICAÇÃO JWT
// ============================================================
interface TokenPayload {
  usuario_id: number;
  email: string;
}

function autenticarToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ erro: 'Token de acesso não fornecido' });
    return;
  }

  jwt.verify(token, JWT_SECRET, (erro, usuario) => {
    if (erro) {
      res.status(403).json({ erro: 'Token inválido ou expirado' });
      return;
    }
    (req as any).usuario = usuario as TokenPayload;
    next();
  });
}

// ============================================================
// AUTENTICAÇÃO
// ============================================================
app.post('/auth/registro', (req, res) => {
  try {
    const { nome, email, senha } = req.body;

    if (!nome || !email || !senha) {
      res.status(400).json({ erro: 'nome, email e senha são obrigatórios' });
      return;
    }

    const existente = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(email);
    if (existente) {
      res.status(409).json({ erro: 'Email já cadastrado' });
      return;
    }

    const senhaHash = bcrypt.hashSync(senha, 10);
    const resultado = db.prepare(
      'INSERT INTO usuarios (nome, email, senha_hash) VALUES (?, ?, ?)'
    ).run(nome, email, senhaHash);

    const token = jwt.sign(
      { usuario_id: Number(resultado.lastInsertRowid), email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      mensagem: 'Usuário cadastrado com sucesso',
      token,
      usuario: { id: Number(resultado.lastInsertRowid), nome, email },
    });
  } catch (erro) {
    res.status(500).json({ erro: 'Falha ao cadastrar usuário' });
  }
});

app.post('/auth/login', (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      res.status(400).json({ erro: 'email e senha são obrigatórios' });
      return;
    }

    const usuario = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email) as {
      id: number;
      nome: string;
      email: string;
      senha_hash: string;
    } | undefined;

    if (!usuario) {
      res.status(401).json({ erro: 'Email ou senha inválidos' });
      return;
    }

    const senhaValida = bcrypt.compareSync(senha, usuario.senha_hash);
    if (!senhaValida) {
      res.status(401).json({ erro: 'Email ou senha inválidos' });
      return;
    }

    const token = jwt.sign(
      { usuario_id: usuario.id, email: usuario.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      mensagem: 'Login realizado com sucesso',
      token,
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email },
    });
  } catch (erro) {
    res.status(500).json({ erro: 'Falha ao fazer login' });
  }
});

app.get('/auth/perfil', autenticarToken, (req, res) => {
  const usuario = (req as any).usuario;
  const u = db.prepare('SELECT id, nome, email FROM usuarios WHERE id = ?').get(usuario.usuario_id);
  res.json({ usuario: u });
});

// ============================================================
// GRUPOS E MEMBROS
// ============================================================
app.post('/grupos', autenticarToken, (req, res) => {
  try {
    const { nome, descricao } = req.body;
    const usuario_id = (req as any).usuario.usuario_id;

    if (!nome) {
      res.status(400).json({ erro: 'nome é obrigatório' });
      return;
    }

    const resultado = db.prepare(
      'INSERT INTO grupos (nome, descricao, criado_por_id) VALUES (?, ?, ?)'
    ).run(nome, descricao ?? null, usuario_id);

    const grupoId = Number(resultado.lastInsertRowid);

    // O criador vira admin do grupo
    db.prepare(
      'INSERT INTO membros_grupo (grupo_id, usuario_id, papel) VALUES (?, ?, ?)'
    ).run(grupoId, usuario_id, 'admin');

    res.status(201).json({
      mensagem: 'Grupo criado com sucesso',
      grupo_id: grupoId,
    });
  } catch (erro) {
    res.status(500).json({ erro: 'Falha ao criar grupo' });
  }
});

app.post('/grupos/:id/membros', autenticarToken, (req, res) => {
  try {
    const grupoId = Number(req.params.id);
    const { usuario_email, renda_mensal } = req.body;
    const solicitante_id = (req as any).usuario.usuario_id;

    // Verificar se o solicitante é admin do grupo
    const membroSolicitante = db.prepare(
      'SELECT papel FROM membros_grupo WHERE grupo_id = ? AND usuario_id = ?'
    ).get(grupoId, solicitante_id) as { papel: string } | undefined;

    if (!membroSolicitante || membroSolicitante.papel !== 'admin') {
      res.status(403).json({ erro: 'Apenas admin pode adicionar membros' });
      return;
    }

    const usuarioConvidado = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(
      usuario_email
    ) as { id: number } | undefined;

    if (!usuarioConvidado) {
      res.status(404).json({ erro: 'Usuário não encontrado' });
      return;
    }

    db.prepare(
      'INSERT OR IGNORE INTO membros_grupo (grupo_id, usuario_id, papel, renda_mensal) VALUES (?, ?, ?, ?)'
    ).run(grupoId, usuarioConvidado.id, 'membro', renda_mensal ?? 0);

    res.json({ mensagem: 'Membro adicionado com sucesso' });
  } catch (erro) {
    res.status(500).json({ erro: 'Falha ao adicionar membro' });
  }
});

app.get('/grupos', autenticarToken, (_req, res) => {
  try {
    const usuario_id = (_req as any).usuario.usuario_id;
    const grupos = db.prepare(`
      SELECT g.*, mg.papel, mg.renda_mensal
      FROM grupos g
      JOIN membros_grupo mg ON g.id = mg.grupo_id
      WHERE mg.usuario_id = ?
    `).all(usuario_id);
    res.json(grupos);
  } catch (erro) {
    res.status(500).json({ erro: 'Falha ao buscar grupos' });
  }
});

// ============================================================
// CATEGORIAS
// ============================================================
app.get('/categorias', autenticarToken, (_req, res) => {
  try {
    const grupo_id = (_req.query as Record<string, string>).grupo_id;
    let sql = 'SELECT * FROM categorias WHERE grupo_id IS NULL';
    const params: unknown[] = [];

    if (grupo_id) {
      sql += ' OR grupo_id = ?';
      params.push(grupo_id);
    }
    sql += ' ORDER BY nome';

    const categorias = db.prepare(sql).all(...params);
    res.json(categorias);
  } catch (erro) {
    res.status(500).json({ erro: 'Falha ao buscar categorias' });
  }
});

app.post('/categorias', autenticarToken, (req, res) => {
  try {
    const { nome, tipo, cor, icone, grupo_id } = req.body;

    if (!nome || !tipo) {
      res.status(400).json({ erro: 'nome e tipo são obrigatórios' });
      return;
    }

    const resultado = db.prepare(
      'INSERT INTO categorias (nome, tipo, cor, icone, grupo_id) VALUES (?, ?, ?, ?, ?)'
    ).run(nome, tipo, cor ?? '#6366f1', icone ?? 'wallet', grupo_id ?? null);

    const novaCategoria = db.prepare('SELECT * FROM categorias WHERE id = ?').get(
      resultado.lastInsertRowid
    );

    res.status(201).json(novaCategoria);
  } catch (erro) {
    res.status(500).json({ erro: 'Falha ao criar categoria' });
  }
});

// ============================================================
// TRANSACOES
// ============================================================
app.get('/transacoes', autenticarToken, (_req, res) => {
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

app.post('/transacoes', autenticarToken, (req, res) => {
  try {
    const {
      grupo_id,
      categoria_id,
      usuario_id,
      descricao,
      valor,
      tipo,
      data,
      observacao,
    } = req.body;

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

    const novaTransacao = db.prepare('SELECT * FROM transacoes WHERE id = ?').get(
      resultado.lastInsertRowid
    );

    res.status(201).json(novaTransacao);
  } catch (erro) {
    res.status(500).json({ erro: 'Falha ao criar transação' });
  }
});

app.get('/transacoes/:id', autenticarToken, (req, res) => {
  try {
    const transacao = db.prepare('SELECT * FROM transacoes WHERE id = ?').get(
      Number(req.params.id)
    );

    if (!transacao) {
      res.status(404).json({ erro: 'Transação não encontrada' });
      return;
    }

    res.json(transacao);
  } catch (erro) {
    res.status(500).json({ erro: 'Falha ao buscar transação' });
  }
});

app.put('/transacoes/:id', autenticarToken, (req, res) => {
  try {
    const { descricao, valor, tipo, data, observacao, categoria_id } = req.body;

    const existente = db.prepare('SELECT id FROM transacoes WHERE id = ?').get(
      Number(req.params.id)
    );
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

    const atualizada = db.prepare('SELECT * FROM transacoes WHERE id = ?').get(
      Number(req.params.id)
    );
    res.json(atualizada);
  } catch (erro) {
    res.status(500).json({ erro: 'Falha ao atualizar transação' });
  }
});

app.delete('/transacoes/:id', autenticarToken, (req, res) => {
  try {
    const existente = db.prepare('SELECT id FROM transacoes WHERE id = ?').get(
      Number(req.params.id)
    );
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
app.post('/orcamentos', autenticarToken, (req, res) => {
  try {
    const { grupo_id, categoria_id, mes, valor_limite, alerta_em } = req.body;

    if (!grupo_id || !categoria_id || !mes || !valor_limite) {
      res.status(400).json({
        erro: 'grupo_id, categoria_id, mes e valor_limite são obrigatórios',
      });
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

app.get('/orcamentos/status', autenticarToken, (_req, res) => {
  try {
    const { grupo_id, mes } = _req.query as Record<string, string>;

    if (!grupo_id || !mes) {
      res.status(400).json({ erro: 'grupo_id e mes são obrigatórios' });
      return;
    }

    // Calcula percentual consumido por categoria e classifica status:
    // 'ok' = abaixo do limite de alerta
    // 'alerta' = atingiu o % de alerta configurado (ex: 80%)
    // 'estourou' = gasto >= valor_limite (100% ou mais)
    // COALESCE trata categorias sem transações (retorna 0 em vez de NULL)
    // NULLIF evita divisão por zero quando valor_limite = 0
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
      orcamentos: status,
    });
  } catch (erro) {
    res.status(500).json({ erro: 'Falha ao buscar status do orçamento' });
  }
});

// ============================================================
// RATEIOS - Divisão de contas (diferencial técnico)
// Três regras de negócio para calcular quem deve quanto a quem:
//   1. 50_50: divide igualmente entre todos os membros
//   2. proporcional_renda: cada um paga proporcional à sua renda
//      (usa renda_mensal da tabela membros_grupo)
//   3. valor_fixo: cada membro define um valor específico
// ============================================================
app.post('/rateios', autenticarToken, (req, res) => {
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

    // Busca membros e suas rendas (essencial para rateio proporcional)
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
      // Divisão igualitária: valor total dividido pelo número de membros
      const valorPorPessoa = valor_total / membros.length;
      for (const m of membros) {
        participantes.push({ usuario_id: m.usuario_id, valor_devido: valorPorPessoa });
      }
    } else if (regra_rateio === 'proporcional_renda') {
      // Rateio proporcional: valor_total * (renda_pessoa / renda_total_grupo)
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
      // Cada membro paga um valor definido manualmente
      // Tolerância de 0.01 para evitar erros de ponto flutuante (0.1 + 0.2 !== 0.3)
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

app.get('/rateios', autenticarToken, (_req, res) => {
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

app.post('/rateios/:id/pagar', autenticarToken, (req, res) => {
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

app.get('/rateios/resumo', autenticarToken, (_req, res) => {
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

// ============================================================
// METAS COMPARTILHADAS
// ============================================================
app.post('/metas', autenticarToken, (req, res) => {
  try {
    const { grupo_id, nome, descricao, valor_alvo, data_alvo } = req.body;

    if (!grupo_id || !nome || !valor_alvo) {
      res.status(400).json({ erro: 'grupo_id, nome e valor_alvo são obrigatórios' });
      return;
    }

    const resultado = db.prepare(`
      INSERT INTO metas (grupo_id, nome, descricao, valor_alvo, valor_guardado, data_alvo, status)
      VALUES (?, ?, ?, ?, 0, ?, 'ativa')
    `).run(grupo_id, nome, descricao ?? null, valor_alvo, data_alvo ?? null);

    res.status(201).json({
      mensagem: 'Meta criada com sucesso',
      meta_id: Number(resultado.lastInsertRowid),
    });
  } catch (erro) {
    res.status(500).json({ erro: 'Falha ao criar meta' });
  }
});

app.get('/metas', autenticarToken, (_req, res) => {
  try {
    const { grupo_id } = _req.query as Record<string, string>;

    if (!grupo_id) {
      res.status(400).json({ erro: 'grupo_id é obrigatório' });
      return;
    }

    const metas = db.prepare(`
      SELECT m.*,
             ROUND(m.valor_guardado * 100.0 / NULLIF(m.valor_alvo, 0), 2) as percentual_concluido
      FROM metas m
      WHERE m.grupo_id = ?
      ORDER BY m.status, m.data_alvo
    `).all(grupo_id);

    res.json(metas);
  } catch (erro) {
    res.status(500).json({ erro: 'Falha ao buscar metas' });
  }
});

app.post('/metas/:id/contribuicoes', autenticarToken, (req, res) => {
  try {
    const metaId = Number(req.params.id);
    const { usuario_id, valor } = req.body;

    if (!usuario_id || !valor) {
      res.status(400).json({ erro: 'usuario_id e valor são obrigatórios' });
      return;
    }

    const meta = db.prepare('SELECT * FROM metas WHERE id = ?').get(metaId);
    if (!meta) {
      res.status(404).json({ erro: 'Meta não encontrada' });
      return;
    }

    db.prepare(
      'INSERT INTO contribuicoes_meta (meta_id, usuario_id, valor) VALUES (?, ?, ?)'
    ).run(metaId, usuario_id, valor);

    const novoGuardado =
      (meta as { valor_guardado: number }).valor_guardado + valor;
    const novoStatus =
      novoGuardado >= (meta as { valor_alvo: number }).valor_alvo ? 'concluida' : 'ativa';

    db.prepare('UPDATE metas SET valor_guardado = ?, status = ? WHERE id = ?').run(
      novoGuardado,
      novoStatus,
      metaId
    );

    res.json({
      mensagem: 'Contribuição registrada com sucesso',
      valor_guardado: novoGuardado,
      status: novoStatus,
    });
  } catch (erro) {
    res.status(500).json({ erro: 'Falha ao registrar contribuição' });
  }
});

// ============================================================
// IMPORTAÇÃO CSV / OFX (parser próprio no backend)
// Parser manual sem dependência externa. Converte arquivo de extrato
// em transações no banco, com deduplicação implícita via origem='importado'.
// ============================================================
function parseCSV(conteudo: string): Array<Record<string, string>> {
  // Separa linhas e extrai cabeçalho + dados. Primeira linha = nomes das colunas.
  const linhas = conteudo.trim().split(/\r?\n/);
  if (linhas.length < 2) return [];

  const cabecalho = (linhas[0] as string)
    .split(',')
    .map((c) => c.trim().replace(/"/g, ''));

  const resultados: Array<Record<string, string>> = [];
  for (let i = 1; i < linhas.length; i++) {
    const valores = (linhas[i] as string).split(',').map((v) => v.trim().replace(/"/g, ''));
    const registro: Record<string, string> = {};
    for (let j = 0; j < cabecalho.length; j++) {
      registro[(cabecalho[j] as string)] = (valores[j] as string) ?? '';
    }
    resultados.push(registro);
  }
  return resultados;
}

function parseOFX(conteudo: string): Array<Record<string, string>> {
  // OFX é um formato bancário legado (XML-like). Extrai blocos <STMTTRN>
  // e converte DTPOSTED (YYYYMMDD) para ISO (YYYY-MM-DD).
  // Valor positivo = receita, negativo = despesa.
  const transacoes: Array<Record<string, string>> = [];
  const blocos = conteudo.split(/<STMTTRN>/);

  for (let i = 1; i < blocos.length; i++) {
    const bloco = (blocos[i] as string);
    const getTag = (tag: string) => {
      const match = bloco.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
      return match ? (match[1] as string).trim() : '';
    };

    const dtPostado = getTag('DTPOSTED');
    const valor = getTag('TRNAMT');
    const nome = getTag('NAME') || getTag('MEMO') || '';

    let dataISO = '';
    if (dtPostado && dtPostado.length >= 8) {
      const ano = dtPostado.substring(0, 4);
      const mes = dtPostado.substring(4, 6);
      const dia = dtPostado.substring(6, 8);
      dataISO = `${ano}-${mes}-${dia}`;
    }

    transacoes.push({
      data: dataISO,
      descricao: nome,
      valor: valor,
      tipo: parseFloat(valor) >= 0 ? 'receita' : 'despesa',
    });
  }

  return transacoes;
}

app.post('/importacoes', autenticarToken, (req, res) => {
  try {
    const { arquivo_nome, conteudo, grupo_id, formato } = req.body;
    const usuario_id = (req as any).usuario.usuario_id;

    if (!arquivo_nome || !conteudo || !grupo_id || !formato) {
      res.status(400).json({
        erro: 'arquivo_nome, conteudo, grupo_id e formato são obrigatórios',
      });
      return;
    }

    if (!['csv', 'ofx'].includes(formato)) {
      res.status(400).json({ erro: "formato deve ser 'csv' ou 'ofx'" });
      return;
    }

    let transacoes: Array<Record<string, string>> = [];

    if (formato === 'csv') {
      transacoes = parseCSV(conteudo);
    } else {
      transacoes = parseOFX(conteudo);
    }

    // Registra log da importação para rastreabilidade
    const resultado = db.prepare(`
      INSERT INTO importacoes (grupo_id, usuario_id, arquivo_nome, formato, status, linhas_processadas)
      VALUES (?, ?, ?, ?, 'concluido', ?)
    `).run(grupo_id, usuario_id, arquivo_nome, formato, transacoes.length);

    const importacaoId = Number(resultado.lastInsertRowid);

    // Insere cada transação importada. Usa categoria padrão do sistema (grupo_id IS NULL)
    // quando não há categoria específica definida.
    const categoriaPadrao = db.prepare(
      'SELECT id FROM categorias WHERE grupo_id IS NULL LIMIT 1'
    ).get() as { id: number } | undefined;

    const inserirTransacao = db.prepare(`
      INSERT INTO transacoes (grupo_id, categoria_id, usuario_id, descricao, valor, tipo, data, observacao, origem, arquivo_origem)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'importado', ?)
    `);

    let inseridas = 0;
    for (const t of transacoes) {
      try {
        inserirTransacao.run(
          grupo_id,
          categoriaPadrao?.id ?? null,
          usuario_id,
          (t.descricao as string) || 'Importado',
          Math.abs(parseFloat((t.valor as string) || '0') || 0),
          (t.tipo as string) || 'despesa',
          (t.data as string) || new Date().toISOString().split('T')[0],
          `Importado de ${arquivo_nome}`,
          arquivo_nome
        );
        inseridas++;
      } catch {
        // Ignora erros individuais de linha para não falhar toda a importação
      }
    }

    res.json({
      mensagem: 'Importação concluída com sucesso',
      importacao_id: importacaoId,
      total_linhas: transacoes.length,
      transacoes_inseridas: inseridas,
    });
  } catch (erro) {
    res.status(500).json({ erro: 'Falha ao processar importação' });
  }
});

// ============================================================
// RELATÓRIO PDF
// ============================================================
app.get('/relatorios/pdf', autenticarToken, (_req, res) => {
  try {
    const { grupo_id, mes } = _req.query as Record<string, string>;

    if (!grupo_id || !mes) {
      res.status(400).json({ erro: 'grupo_id e mes são obrigatórios' });
      return;
    }

    const transacoes = db.prepare(`
      SELECT t.*, c.nome as categoria_nome, c.tipo as categoria_tipo
      FROM transacoes t
      JOIN categorias c ON t.categoria_id = c.id
      WHERE t.grupo_id = ? AND t.data LIKE ?
      ORDER BY t.data DESC
    `).all(grupo_id, `${mes}%`);

    const orcamentos = db.prepare(`
      SELECT c.nome as categoria, o.valor_limite,
             COALESCE(SUM(t.valor), 0) as gasto
      FROM orcamentos o
      JOIN categorias c ON o.categoria_id = c.id
      LEFT JOIN transacoes t
        ON t.categoria_id = c.id AND t.grupo_id = o.grupo_id
        AND t.tipo = 'despesa' AND t.data LIKE ?
      WHERE o.grupo_id = ? AND o.mes = ?
      GROUP BY c.id, c.nome, o.valor_limite
    `).all(`${mes}%`, grupo_id, mes);

    // Gerar PDF
    // Gera PDF com pdfkit: transmite o documento diretamente na resposta HTTP
    // (doc.pipe(res)) sem salvar arquivo temporário no disco.
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=orcamento_${grupo_id}_${mes}.pdf`
    );

    doc.pipe(res);

    doc.fontSize(20).text('Relatório de Orçamento', { align: 'center' });
    doc.fontSize(12).text(`Grupo: ${grupo_id} | Mês: ${mes}`, { align: 'center' });
    doc.moveDown();

    doc.fontSize(14).text('Transações do Mês', { underline: true });
    doc.moveDown(0.5);

    let totalReceitas = 0;
    let totalDespesas = 0;

    for (const t of transacoes as Array<any>) {
      const valor = Number(t.valor);
      if (t.tipo === 'receita') totalReceitas += valor;
      else totalDespesas += valor;

      doc
        .fontSize(10)
        .text(
          `${t.data} | ${t.descricao} | ${t.categoria_nome} | R$ ${valor.toFixed(2)} (${
            t.tipo
          })`
        );
    }

    doc.moveDown();
    doc.fillColor('green').fontSize(12).text(`Total Receitas: R$ ${totalReceitas.toFixed(2)}`);
    doc.fillColor('red').fontSize(12).text(`Total Despesas: R$ ${totalDespesas.toFixed(2)}`);
    doc.fillColor('#1e293b').fontSize(12).text(`Saldo: R$ ${(totalReceitas - totalDespesas).toFixed(2)}`);

    doc.moveDown();
    doc.fontSize(14).text('Orçamento por Categoria', { underline: true });
    doc.moveDown(0.5);

    for (const o of orcamentos as Array<any>) {
      const gasto = Number(o.gasto);
      const limite = Number(o.valor_limite);
      const pct = limite > 0 ? ((gasto / limite) * 100).toFixed(1) : '0';
      doc
        .fontSize(10)
        .text(
          `${o.categoria}: R$ ${gasto.toFixed(2)} / R$ ${limite.toFixed(2)} (${pct}%)`
        );
    }

    doc.end();
  } catch (erro) {
    res.status(500).json({ erro: 'Falha ao gerar relatório PDF' });
  }
});

// ============================================================
// RELATÓRIOS PARA GRÁFICOS (Frontend)
// ============================================================

// GET /relatorios/gastos-categoria?grupo_id=1&mes=2026-10
// Retorna soma de despesas por categoria (para gráfico de pizza)
app.get('/relatorios/gastos-categoria', autenticarToken, (_req, res) => {
  try {
    const { grupo_id, mes } = _req.query as Record<string, string>;

    if (!grupo_id || !mes) {
      res.status(400).json({ erro: 'grupo_id e mes são obrigatórios' });
      return;
    }

    const dados = db.prepare(`
      SELECT
        c.nome as categoria,
        ROUND(COALESCE(SUM(t.valor), 0), 2) as total
      FROM categorias c
      LEFT JOIN transacoes t
        ON t.categoria_id = c.id
        AND t.grupo_id = ?
        AND t.tipo = 'despesa'
        AND t.data LIKE ?
      WHERE c.grupo_id = ? OR c.grupo_id IS NULL
      GROUP BY c.id, c.nome
      HAVING total > 0
      ORDER BY total DESC
    `).all(grupo_id, `${mes}%`, grupo_id);

    res.json({
      grupo_id,
      mes,
      dados,
    });
  } catch (erro) {
    res.status(500).json({ erro: 'Falha ao buscar gastos por categoria' });
  }
});

// GET /relatorios/evolucao-mensal?grupo_id=1
// Retorna receitas e despesas por mês (últimos 6 meses) - gráfico de linha
app.get('/relatorios/evolucao-mensal', autenticarToken, (_req, res) => {
  try {
    const { grupo_id } = _req.query as Record<string, string>;

    if (!grupo_id) {
      res.status(400).json({ erro: 'grupo_id é obrigatório' });
      return;
    }

    const dados = db.prepare(`
      SELECT
        substr(data, 1, 7) as mes,
        ROUND(SUM(CASE WHEN tipo = 'receita' THEN valor ELSE 0 END), 2) as receitas,
        ROUND(SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END), 2) as despesas
      FROM transacoes
      WHERE grupo_id = ?
      GROUP BY substr(data, 1, 7)
      ORDER BY mes DESC
      LIMIT 6
    `).all(grupo_id);

    res.json({
      grupo_id,
      dados: dados.reverse(), // ordem cronológica
    });
  } catch (erro) {
    res.status(500).json({ erro: 'Falha ao buscar evolução mensal' });
  }
});

// GET /exportar/csv?grupo_id=1
// Exporta todas as transações do grupo em formato CSV
app.get('/exportar/csv', autenticarToken, (_req, res) => {
  try {
    const { grupo_id } = _req.query as Record<string, string>;

    if (!grupo_id) {
      res.status(400).json({ erro: 'grupo_id é obrigatório' });
      return;
    }

    const transacoes = db.prepare(`
      SELECT t.data, t.descricao, c.nome as categoria, c.tipo as tipo_transacao,
             t.valor, t.observacao
      FROM transacoes t
      JOIN categorias c ON t.categoria_id = c.id
      WHERE t.grupo_id = ?
      ORDER BY t.data DESC
    `).all(grupo_id) as Array<Record<string, unknown>>;

    // Cabeçalho CSV
    const cabecalho = 'Data,Descricao,Categoria,Tipo,Valor,Observacao\n';

    const linhas = transacoes.map((t) =>
      `"${t.data}","${t.descricao}","${t.categoria}","${t.tipo_transacao}",${t.valor},"${t.observacao ?? ''}"`
    ).join('\n');

    const csv = cabecalho + linhas;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=transacoes_grupo_${grupo_id}_${new Date().toISOString().slice(0, 10)}.csv`
    );

    res.send(csv);
  } catch (erro) {
    res.status(500).json({ erro: 'Falha ao exportar CSV' });
  }
});

app.listen(PORTA, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORTA}`);
});
