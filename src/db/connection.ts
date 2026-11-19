import Database from 'better-sqlite3';
import type { Database as BetterSqlite3Database } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// --- Caminho absoluto do arquivo do banco de dados ---
// __dirname não existe em ES modules, então calculamos assim:
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// O banco será salvo em: raiz_do_projeto/database/orcamento.db
const dbPath = path.resolve(__dirname, '../../database/orcamento.db');

// Garante que a pasta database exista
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Abre (ou cria) o banco SQLite
// Tipamos explicitamente para o TypeScript conseguir nomear o tipo na exportação
export const db: BetterSqlite3Database = new Database(dbPath);

// Ativa integridade referencial (chaves estrangeiras)
db.pragma('foreign_keys = ON');

// Cria as tabelas automaticamente se o banco estiver vazio.
// Essencial em produção (Railway/Render): o arquivo .db nasce inexistente
// no ambiente do servidor e o init.ts não roda por lá.
const tabelaExiste = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='usuarios'")
  .get();

if (!tabelaExiste) {
  const schemaPath = path.resolve(__dirname, '../../database/schema.sql');
  db.exec(fs.readFileSync(schemaPath, 'utf-8'));
  console.log('✅ Tabelas criadas automaticamente a partir do schema.sql');
}

console.log(`📁 Banco de dados conectado: ${dbPath}`);
