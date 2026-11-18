# 💰 Orçamento Compartilhado

App de finanças pessoais focado em **orçamento compartilhado**, com **metas conjuntas** e **divisão automática de contas**.

---

## 🚀 Funcionalidades

| Módulo | Funcionalidades |
|--------|----------------|
| **Autenticação** | Registro, login com JWT, recuperação de sessão |
| **Grupos** | Criar grupos (casal, família, colegas), adicionar membros, definir renda de cada um |
| **Transações** | Receitas e despesas com categorias, filtro por grupo/mês/tipo |
| **Orçamento** | Limite mensal por categoria, alerta em 80%/100%, status ok/alerta/estourou |
| **Rateio** | Divisão automática: 50/50, proporcional à renda, valor fixo. Quem deve quanto a quem |
| **Metas** | Metas compartilhadas (viagem, casa), contribuições por membro, progresso % |
| **Importação** | Parser de CSV e OFX no backend, validação e deduplicação |
| **Relatórios** | PDF com resumo de transações e orçamento por categoria |
| **Frontend** | React + Vite + TypeScript, rotas protegidas, design responsivo |

---

## 🛠️ Tecnologias

### Backend
- **Node.js** + **TypeScript** (modo strict)
- **Express.js** (API REST)
- **SQLite** (banco de dados, arquivo único)
- **better-sqlite3** (driver síncrono)
- **jsonwebtoken** (autenticação)
- **bcryptjs** (hash de senhas)
- **pdfkit** (geração de relatórios PDF)

### Frontend
- **React 18** + **TypeScript**
- **Vite** (build e dev server)
- **React Router DOM** (roteamento)
- **Recharts** (gráficos)
- **Lucide React** (ícones)

---

## 📋 Como Rodar o Projeto

### Pré-requisitos
- Node.js 18+
- npm

### 1. Backend

```bash
# Instalar dependências
npm install

# Criar tabelas do banco
npx tsx src/db/init.ts

# Inserir dados de exemplo (opcional)
npx tsx src/db/seed.ts

# Iniciar o servidor (porta 3000)
npm run dev
```

### 2. Frontend

```bash
cd frontend

# Instalar dependências
npm install

# Build para produção
npm run build

# Ou rodar em desenvolvimento
npm run dev
```

Após o build do frontend, o backend serve automaticamente os arquivos estáticos em `http://localhost:3000`.

---

## 🔗 Endpoints da API

### Autenticação
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/auth/registro` | Cadastro de usuário |
| POST | `/auth/login` | Login e geração de JWT |
| GET | `/auth/perfil` | Dados do usuário logado |

### Grupos
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/grupos` | Criar grupo |
| GET | `/grupos` | Listar grupos do usuário |
| POST | `/grupos/:id/membros` | Adicionar membro ao grupo |

### Categorias
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/categorias` | Listar categorias |
| POST | `/categorias` | Criar categoria |

### Transações
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/transacoes` | Listar (filtro por grupo/mês/tipo) |
| POST | `/transacoes` | Criar transação |
| GET | `/transacoes/:id` | Buscar por ID |
| PUT | `/transacoes/:id` | Atualizar |
| DELETE | `/transacoes/:id` | Excluir |

### Orçamentos
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/orcamentos` | Criar/atualizar orçamento mensal |
| GET | `/orcamentos/status?grupo_id=1&mes=2026-10` | Status com % consumido e alerta |

### Rateios (Divisão de Contas)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/rateios` | Criar rateio (50/50, proporcional, valor fixo) |
| GET | `/rateios?grupo_id=1` | Listar rateios com participantes |
| POST | `/rateios/:id/pagar` | Registrar pagamento de um participante |
| GET | `/rateios/resumo?grupo_id=1` | Quem deve quanto a quem |

### Metas
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/metas` | Criar meta compartilhada |
| GET | `/metas?grupo_id=1` | Listar metas com progresso |
| POST | `/metas/:id/contribuicoes` | Adicionar contribuição |

### Importação
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/importacoes` | Importar extrato CSV/OFX |

### Relatórios
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/relatorios/pdf?grupo_id=1&mes=2026-10` | Gerar PDF do orçamento |

> Todas as rotas (exceto auth) exigem header `Authorization: Bearer <token>`.

---

## 💡 Exemplo de Rateio Proporcional à Renda

Ana ganha R$ 6.000, Bruno ganha R$ 4.000. Conta de luz: R$ 280.

- Renda total: R$ 10.000
- Ana: 60% → paga R$ 168
- Bruno: 40% → paga R$ 112

---

## 📁 Estrutura do Projeto

```
Orçamento/
├── src/
│   ├── index.ts          ← Backend completo (todas as rotas)
│   ├── db/
│   │   ├── connection.ts ← Conexão SQLite
│   │   ├── init.ts       ← Criar tabelas
│   │   └── seed.ts       ← Dados de exemplo
├── database/
│   ├── schema.sql        ← Modelo de dados (11 tabelas)
│   └── seed.sql          ← Dados de exemplo
├── frontend/
│   ├── src/
│   │   ├── api.ts        ← Camada de API (fetch)
│   │   ├── App.tsx       ← Roteamento
│   │   ├── components/   ← Navbar, ProtectedRoute
│   │   └── pages/        ← Login, Cadastro, Dashboard, Transacoes, Orcamentos, Metas, Rateios, Importar
│   ├── dist/             ← Build de produção
│   ├── package.json
│   └── vite.config.ts
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🎯 Para Entrevistas

### O que este projeto demonstra:

1. **Modelagem de banco relacional** — 11 tabelas com chaves estrangeiras, índices, constraints CHECK e UNIQUE
2. **API REST com Express** — CRUD completo, middleware de autenticação JWT, tratamento de erros
3. **Lógica de negócio complexa** — Rateio proporcional à renda, cálculo de percentual de orçamento, alertas automáticos
4. **Parsers de arquivo** — CSV e OFX processados no backend
5. **Geração de documentos** — PDF com pdfkit
6. **Frontend moderno** — React + TypeScript + Vite, rotas protegidas, consumo de API
7. **TypeScript strict** — Tipagem forte em todo o projeto

### Perguntas prováveis de entrevista:

- **"Como funciona o rateio proporcional?"** → Soma das rendas, cada membro paga `valor_total × (renda_pessoal / renda_total)`.
- **"Como você evita SQL Injection?"** → Prepared statements com placeholders `?` via better-sqlite3.
- **"Como funciona a autenticação?"** → JWT assinado com secret, enviado no header Authorization, verificado em middleware.
- **"O que melhoraria?"** → Separar rotas em controllers/services, adicionar testes unitários, migrar para PostgreSQL, Docker.

---

## 📄 Licença

MIT

---

*Projeto desenvolvido para fins de aprendizado e portfólio. Backend em Node.js/TypeScript, Frontend em React/TypeScript.*
