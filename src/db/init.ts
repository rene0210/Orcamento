import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { db } from './connection.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Caminho do schema.sql
const schemaPath = path.resolve(__dirname, '../../database/schema.sql');

// Lê o arquivo SQL e executa no banco
const sql = fs.readFileSync(schemaPath, 'utf-8');
db.exec(sql);

console.log('✅ Tabelas criadas com sucesso!');

// Fecha a conexão (útil em scripts de inicialização)
db.close();
