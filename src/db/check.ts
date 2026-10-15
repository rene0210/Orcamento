import { db } from './connection.ts';

const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
  .all() as Array<{ name: string }>;

console.log('📋 Tabelas criadas:');
tables.forEach((t) => console.log('  -', t.name));

db.close();
