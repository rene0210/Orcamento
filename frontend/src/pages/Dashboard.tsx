import { useEffect, useState } from 'react';
import { api } from '../api';
import { AlertTriangle, Plus, TrendingDown, TrendingUp, UserPlus, Wallet } from 'lucide-react';

// Formata número em BRL (ex: 1234.5 -> "R$ 1.234,50")
function brl(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function Dashboard() {
  const [grupos, setGrupos] = useState<any[]>([]);
  const [grupoSelecionado, setGrupoSelecionado] = useState<string | null>(null);
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7));
  const [status, setStatus] = useState<any>(null);
  const [transacoes, setTransacoes] = useState<any[]>([]);
  const [erro, setErro] = useState('');

  // Estado do formulário de criação de grupo (primeiro acesso)
  const [nomeGrupo, setNomeGrupo] = useState('');
  const [descGrupo, setDescGrupo] = useState('');
  const [salvando, setSalvando] = useState(false);

  // Estado do formulário de convite de membro (rateio compartilhado)
  const [emailMembro, setEmailMembro] = useState('');
  const [rendaMembro, setRendaMembro] = useState('');
  const [msgMembro, setMsgMembro] = useState('');

  // Carrega os grupos do usuário logado
  useEffect(() => {
    api
      .listarGrupos()
      .then((lista: any[]) => {
        setGrupos(lista);
        // Seleciona automaticamente o primeiro grupo
        if (lista.length > 0 && !grupoSelecionado) {
          setGrupoSelecionado(String(lista[0].id));
        }
      })
      .catch((e: Error) => setErro(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Carrega status do orçamento + transações do mês selecionado
  useEffect(() => {
    if (!grupoSelecionado) {
      setStatus(null);
      setTransacoes([]);
      return;
    }
    api
      .statusOrcamento(grupoSelecionado, mes)
      .then(setStatus)
      .catch((e: Error) => setErro(e.message));
    api
      .listarTransacoes({ grupo_id: grupoSelecionado, mes })
      .then(setTransacoes)
      .catch((e: Error) => setErro(e.message));
  }, [grupoSelecionado, mes]);

  // Cria o primeiro grupo e já o seleciona
  async function criarGrupo(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    setSalvando(true);
    try {
      await api.criarGrupo({ nome: nomeGrupo, descricao: descGrupo });
      setNomeGrupo('');
      setDescGrupo('');
      const lista = await api.listarGrupos();
      setGrupos(lista);
      if (lista.length > 0) setGrupoSelecionado(String(lista[0].id));
    } catch (err: any) {
      setErro(err.message || 'Falha ao criar grupo');
    } finally {
      setSalvando(false);
    }
  }

  // Convida outro usuário para o grupo (necessário para rateio)
  async function adicionarMembro(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    setMsgMembro('');
    try {
      await api.adicionarMembro(Number(grupoSelecionado), {
        usuario_email: emailMembro,
        renda_mensal: rendaMembro ? Number(rendaMembro) : undefined,
      });
      setMsgMembro('Membro adicionado com sucesso!');
      setEmailMembro('');
      setRendaMembro('');
    } catch (err: any) {
      setErro(err.message || 'Falha ao adicionar membro');
    }
  }

  // Totais reais do mês a partir das transações carregadas
  const receitas = transacoes
    .filter((t) => t.tipo === 'receita')
    .reduce((s, t) => s + Number(t.valor), 0);
  const despesas = transacoes
    .filter((t) => t.tipo === 'despesa')
    .reduce((s, t) => s + Number(t.valor), 0);
  const saldo = receitas - despesas;
  const alertas = status
    ? status.orcamentos.filter((o: any) => o.status !== 'ok').length
    : 0;

  // Sem grupo: mostra o formulário de criação (evita tela vazia)
  if (grupos.length === 0) {
    return (
      <div>
        <div className="page-header">
          <h1>Bem-vindo!</h1>
        </div>
        {erro && <div className="alert alert-error">{erro}</div>}
        <div className="card" style={{ maxWidth: '520px' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Criar seu primeiro grupo
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1rem' }}>
            Um grupo é o núcleo do orçamento compartilhado: casal, família ou colegas de
            quarto. Nele ficam as transações, orçamentos, metas e rateios.
          </p>
          <form onSubmit={criarGrupo}>
            <div className="form-group">
              <label>Nome do grupo</label>
              <input
                type="text"
                value={nomeGrupo}
                onChange={(e) => setNomeGrupo(e.target.value)}
                placeholder="Ex: Casa Ana & Bruno"
                required
                className="form-group-input"
              />
            </div>
            <div className="form-group">
              <label>Descrição (opcional)</label>
              <input
                type="text"
                value={descGrupo}
                onChange={(e) => setDescGrupo(e.target.value)}
                placeholder="Ex: Orçamento compartilhado do casal"
                className="form-group-input"
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={salvando}>
              <Plus size={18} /> {salvando ? 'Criando...' : 'Criar grupo'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="page-subtitle">
            Visão geral de receitas, despesas e alertas do mês.
          </p>
        </div>
      </div>

      {erro && <div className="alert alert-error">{erro}</div>}

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Grupo</label>
          <select
            value={grupoSelecionado || ''}
            onChange={(e) => setGrupoSelecionado(e.target.value || null)}
            className="form-group-input"
          >
            <option value="">Selecione um grupo</option>
            {grupos.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Mês</label>
          <input
            type="month"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className="form-group-input"
          />
        </div>
      </div>

      {/* Totais reais do mês */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-icon icon-green">
            <TrendingUp size={20} />
          </span>
          <h3>Total Receitas</h3>
          <div className="valor text-success">{brl(receitas)}</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon icon-red">
            <TrendingDown size={20} />
          </span>
          <h3>Total Despesas</h3>
          <div className="valor text-danger">{brl(despesas)}</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon icon-blue">
            <Wallet size={20} />
          </span>
          <h3>Saldo</h3>
          <div className={`valor ${saldo < 0 ? 'text-danger' : ''}`}>{brl(saldo)}</div>
        </div>
        <div className="stat-card">
          <span className="stat-icon icon-amber">
            <AlertTriangle size={20} />
          </span>
          <h3>Categorias em Alerta</h3>
          <div className="valor text-warning">{alertas}</div>
        </div>
      </div>

      {grupoSelecionado && status && status.orcamentos.length > 0 && (
        <div className="card">
          <h2 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem' }}>
            Status do Orçamento - {mes}
          </h2>
          <table className="table">
            <thead>
              <tr>
                <th>Categoria</th>
                <th>Limite</th>
                <th>Gasto</th>
                <th>Consumo</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {status.orcamentos.map((o: any) => (
                <tr key={o.categoria_id}>
                  <td>{o.categoria}</td>
                  <td>R$ {Number(o.limite).toFixed(2)}</td>
                  <td>R$ {Number(o.gasto).toFixed(2)}</td>
                  <td>{o.percentual_consumido}%</td>
                  <td>
                    <span className={`badge badge-${o.status}`}>{o.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {grupoSelecionado && status && status.orcamentos.length === 0 && (
        <div className="card">
          <p style={{ color: '#64748b' }}>
            Nenhum orçamento definido para este mês. Crie um na página{' '}
            <strong>Orçamento</strong>.
          </p>
        </div>
      )}

      {/* Convite de membros: necessário para rateio compartilhado */}
      {grupoSelecionado && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem' }}>
            <UserPlus size={18} style={{ verticalAlign: 'middle', marginRight: '0.4rem' }} />
            Adicionar membro ao grupo
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1rem' }}>
            O outro usuário precisa estar cadastrado. A renda mensal é usada no rateio
            proporcional.
          </p>
          {msgMembro && <div className="alert alert-success">{msgMembro}</div>}
          <form onSubmit={adicionarMembro} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>E-mail do membro</label>
              <input
                type="email"
                value={emailMembro}
                onChange={(e) => setEmailMembro(e.target.value)}
                placeholder="email@exemplo.com"
                required
                className="form-group-input"
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Renda mensal (R$)</label>
              <input
                type="number"
                step="0.01"
                value={rendaMembro}
                onChange={(e) => setRendaMembro(e.target.value)}
                placeholder="Opcional"
                className="form-group-input"
              />
            </div>
            <button type="submit" className="btn btn-primary">
              Adicionar
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
