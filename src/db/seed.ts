import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { db } from './connection.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const seedPath = path.resolve(__dirname, '../../database/seed.sql');
const sql = fs.readFileSync(seedPath, 'utf-8');
db.exec(sql);

console.log('✅ Dados de exemplo inseridos!');
db.close();