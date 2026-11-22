import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { Plus } from 'lucide-react';

export function Transacoes() {
  const [transacoes, setTransacoes] = useState<any[]>([]);
  const [grupo_id, setGrupoId] = useState('');
  const [mes, setMes] = useState('');
  // Filtro de tipo inicializado pela URL (ex.: vindo do Dashboard: /transacoes?tipo=receita)
  const [searchParams, setSearchParams] = useSearchParams();
  const [tipo, setTipo] = useState(searchParams.get('tipo') || '');
  const [nova, setNova] = useState(false);
  const [form, setForm] = useState({
    grupo_id: '',
    categoria_id: '',
    usuario_id: '',
    descricao: '',
    valor: '',
    tipo: 'despesa' as const,
    data: new Date().toISOString().slice(0, 10),
    observacao: '',
  });
  const [categorias, setCategorias] = useState<any[]>([]);
  const [grupos, setGrupos] = useState<any[]>([]);

  useEffect(() => {
    api.listarTransacoes().then(setTransacoes);
    api.listarCategorias().then(setCategorias);
    // Carrega os grupos para o filtro (em vez de exigir o ID numérico)
    api.listarGrupos().then(setGrupos).catch(() => setGrupos([]));
  }, []);

  useEffect(() => {
    if (grupo_id || mes || tipo) {
      api.listarTransacoes({ grupo_id, mes, tipo }).then(setTransacoes);
    } else {
      api.listarTransacoes().then(setTransacoes);
    }
  }, [grupo_id, mes, tipo]);

  const total = transacoes.reduce(
    (s, t) => s + (t.tipo === 'receita' ? Number(t.valor) : -Number(t.valor)),
    0
  );

  async function criarTransacao(e: React.FormEvent) {
    e.preventDefault();
    await api.criarTransacao(form);
    setNova(false);
    setForm({
      grupo_id: '',
      categoria_id: '',
      usuario_id: '',
      descricao: '',
      valor: '',
      tipo: 'despesa',
      data: new Date().toISOString().slice(0, 10),
      observacao: '',
    });
    api.listarTransacoes().then(setTransacoes);
  }

  return (
    <div>
      <div className="page-header">
        <h1>Transações</h1>
        <button
          onClick={() => setNova(!nova)}
          className={`btn ${nova ? 'btn-secondary' : 'btn-primary'} btn-sm`}
        >
          <Plus size={18} /> {nova ? 'Cancelar' : 'Nova Transação'}
        </button>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header">
          <h2>Saldo do Período</h2>
        </div>
        <div className="valor" style={{ fontSize: '2rem', fontWeight: '700' }}>
          R$ {total.toFixed(2)}
        </div>
      </div>

      <div className="card">
        <div className="toolbar">
          <div className="form-group">
            <label>Grupo</label>
            <select
              value={grupo_id}
              onChange={(e) => setGrupoId(e.target.value)}
              className="form-group-input"
            >
              <option value="">Todos os grupos</option>
              {grupos.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Mês</label>
            <input
              type="month"
              value={mes}
              onChange={(e) => setMes(e.target.value)}
              className="form-group-input"
            />
          </div>
          <div className="form-group">
            <label>Tipo</label>
            <select
              value={tipo}
              onChange={(e) => {
                setTipo(e.target.value);
                // Mantém a URL em sincronia com o filtro (compartilhável/revisitable)
                const params = new URLSearchParams(searchParams);
                if (e.target.value) params.set('tipo', e.target.value);
                else params.delete('tipo');
                setSearchParams(params, { replace: true });
              }}
              className="form-group-input"
            >
              <option value="">Todos</option>
              <option value="receita">Receita</option>
              <option value="despesa">Despesa</option>
            </select>
          </div>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Descrição</th>
              <th>Categoria</th>
              <th>Tipo</th>
              <th>Valor</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {transacoes.map((t) => (
              <tr key={t.id}>
                <td>{t.data}</td>
                <td>{t.descricao}</td>
                <td>{t.categoria_nome}</td>
                <td>
                  <span className={`badge ${t.tipo === 'receita' ? 'badge-ok' : 'badge-estourou'}`}>
                    {t.tipo}
                  </span>
                </td>
                <td>R$ {Number(t.valor).toFixed(2)}</td>
                <td>
                  <button
                    onClick={() =>
                      api.deletarTransacao(t.id).then(() =>
                        api.listarTransacoes({ grupo_id, mes, tipo }).then(setTransacoes)
                      )
                    }
                    className="btn btn-danger btn-sm"
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {nova && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <div className="card-header">
            <h2>Nova Transação</h2>
          </div>
          <form onSubmit={criarTransacao} className="form-grid">
            <div className="form-group">
              <label>Grupo ID</label>
              <input
                type="number"
                value={form.grupo_id}
                onChange={(e) => setForm({ ...form, grupo_id: e.target.value })}
                required
                className="form-group-input"
              />
            </div>
            <div className="form-group">
              <label>Categoria ID</label>
              <select
                value={form.categoria_id}
                onChange={(e) => setForm({ ...form, categoria_id: e.target.value })}
                required
                className="form-group-input"
              >
                <option value="">Selecione</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome} ({c.tipo})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Usuário ID</label>
              <input
                type="number"
                value={form.usuario_id}
                onChange={(e) => setForm({ ...form, usuario_id: e.target.value })}
                required
                className="form-group-input"
              />
            </div>
            <div className="form-group">
              <label>Tipo</label>
              <select
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value as any })}
                required
                className="form-group-input"
              >
                <option value="receita">Receita</option>
                <option value="despesa">Despesa</option>
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label>Descrição</label>
              <input
                type="text"
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                required
                className="form-group-input"
              />
            </div>
            <div className="form-group">
              <label>Valor</label>
              <input
                type="number"
                step="0.01"
                value={form.valor}
                onChange={(e) => setForm({ ...form, valor: e.target.value })}
                required
                className="form-group-input"
              />
            </div>
            <div className="form-group">
              <label>Data</label>
              <input
                type="date"
                value={form.data}
                onChange={(e) => setForm({ ...form, data: e.target.value })}
                required
                className="form-group-input"
              />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label>Observação</label>
              <input
                type="text"
                value={form.observacao}
                onChange={(e) => setForm({ ...form, observacao: e.target.value })}
                className="form-group-input"
              />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <button type="submit" className="btn btn-primary">
                Salvar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
