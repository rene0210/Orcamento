import { Router } from 'express';
import { db } from '../db/connection.ts';

const router = Router();

// GET /categorias — lista todas as categorias
router.get('/', (_req, res) => {
  try {
    const categorias = db.prepare('SELECT * FROM categorias ORDER BY nome').all();
    res.json(categorias);
  } catch (erro) {
    res.status(500).json({ erro: 'Falha ao buscar categorias' });
  }
});

// POST /categorias — cria uma nova categoria
router.post('/', (req, res) => {
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

export default router;