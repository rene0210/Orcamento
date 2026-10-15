import express from 'express';
import { db } from './db/connection.ts';

const app = express();
const PORTA = 3000;

// Middleware para entender JSON no corpo das requisições
app.use(express.json());

// ------------------------------------------------------------
// Rota de saúde (health check)
// Confirma que o servidor está no ar e o banco responde
// ------------------------------------------------------------
app.get('/health', (_req, res) => {
  try {
    // Testa conexão com o banco
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

// ------------------------------------------------------------
// Inicia o servidor
// ------------------------------------------------------------
app.listen(PORTA, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORTA}`);
  console.log(`🔗 Teste: http://localhost:${PORTA}/health`);
});
