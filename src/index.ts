import express from 'express';
import { db } from './db/connection.ts';
import categoriasRouter from './routes/categorias.ts';
import transacoesRouter from './routes/transacoes.ts';

const app = express();
const PORTA = 3000;

app.use(express.json());

// Rotas da API
app.use('/categorias', categoriasRouter);
app.use('/transacoes', transacoesRouter);

// Rota de saúde
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

app.listen(PORTA, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORTA}`);
});