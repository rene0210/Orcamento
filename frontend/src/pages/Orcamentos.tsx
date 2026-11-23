import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { Plus } from 'lucide-react';
import { InsightPanel } from '../ai/InsightPanel';

export function Orcamentos() {
  const [grupos, setGrupos] = useState<any[]>([]);
  const [grupo_id, setGrupoId] = useState('');
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7));
  const [status, setStatus] = useState<any>(null);
  // Filtro vindo do Dashboard: /orcamentos?filtro=alerta (mostra só categorias em alerta)
  const [searchParams, setSearchParams] = useSearchParams();
  const somenteAlerta = searchParams.get('filtro') === 'alerta';
  const [categorias, setCategorias] = useState<any[]>([]);
  const [nova, setNova] = useState(false);
  const [form, setForm] = useState({
    grupo_id: '',
    categoria_id: '',
    mes: new Date().toISOString().slice(0, 7),
    valor_limite: '',
    alerta_em: 80,
  });

  useEffect(() => {
    // Seleciona automaticamente o primeiro grupo do usuário
    api.listarGrupos().then((lista: any[]) => {
      setGrupos(lista);
      if (lista.length > 0) setGrupoId(String(lista[0].id));
    });
    api.listarCategorias().then(setCategorias);
  }, []);

  useEffect(() => {
    if (grupo_id) {
      api.statusOrcamento(grupo_id, mes).then(setStatus);
    }
  }, [grupo_id, mes]);

  async function criarOrcamento(e: React.FormEvent) {
    e.preventDefault();
    await api.criarOrcamento(form);
    setNova(false);
    setForm({ grupo_id: '', categoria_id: '', mes: new Date().toISOString().slice(0, 7), valor_limite: '', alerta_em: 80 });
    if (grupo_id) api.statusOrcamento(grupo_id, mes).then(setStatus);
  }

  if (!grupo_id) {
    return (
      <div className="card">
        <div className="card-header">
          <h2>Orçamento Mensal</h2>
        </div>
        <p>Selecione um grupo para visualizar e gerenciar orçamentos.</p>
        <div className="form-group" style={{ marginTop: '1rem', marginBottom: 0 }}>
          <label>Grupo</label>
          <select
            value={grupo_id}
            onChange={(e) => setGrupoId(e.target.value)}
            className="form-group-input"
          >
            <option value="">Selecione</option>
            {grupos.map((g) => (
              <option key={g.id} value={g.id}>{g.nome}</option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Orçamento Mensal</h1>
        <button onClick={() => setNova(!nova)} className="btn btn-primary btn-sm">
          <Plus size={18} /> {nova ? 'Cancelar' : 'Novo Orçamento'}
        </button>
      </div>

      <div className="toolbar">
        <div className="form-group">
          <label>Grupo</label>
          <select value={grupo_id} onChange={(e) => setGrupoId(e.target.value)} className="form-group-input">
            <option value="">Selecione</option>
            {grupos.map((g) => (
              <option key={g.id} value={g.id}>{g.nome}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Mês</label>
          <input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className="form-group-input" />
        </div>
      </div>

      {somenteAlerta && (
        <div className="filter-note">
          <span>
            Exibindo apenas <strong>categorias em alerta</strong> (estourou ou se aproxima do limite).
          </span>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setSearchParams({}, { replace: true })}
          >
            Ver todas
          </button>
        </div>
      )}

      {status && (
        <div className="card">
          <div className="card-header">
            <h2>
              {somenteAlerta ? 'Categorias em Alerta' : 'Status do Orçamento'} — {mes}
            </h2>
          </div>
          {(() => {
            const lista = somenteAlerta
              ? status.orcamentos.filter((o: any) => o.status !== 'ok')
              : status.orcamentos;
            if (lista.length === 0) {
              return (
                <div className="empty-state">
                  Nenhuma categoria em alerta neste mês. 🎉 Todos os limites estão sob controle.
                </div>
              );
            }
            return (
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
                  {lista.map((o: any) => (
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
            );
          })()}
        </div>
      )}

      {/* IA: limites estourados, alertas, orçamento diário e sugestão de limites */}
      <InsightPanel topico="orcamentos" grupo_id={grupo_id} mes={mes} />

      {nova && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <div className="card-header">
            <h2>Novo Orçamento</h2>
          </div>
          <form onSubmit={criarOrcamento}>
            <div className="form-group">
              <label>Categoria</label>
              <select
                value={form.categoria_id}
                onChange={(e) => setForm({ ...form, categoria_id: e.target.value })}
                required
                className="form-group-input"
              >
                <option value="">Selecione</option>
                {categorias
                  .filter((c) => c.tipo === 'despesa')
                  .map((c: any) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
              </select>
            </div>
            <div className="form-group">
              <label>Mês</label>
              <input
                type="month"
                value={form.mes}
                onChange={(e) => setForm({ ...form, mes: e.target.value })}
                required
                className="form-group-input"
              />
            </div>
            <div className="form-group">
              <label>Valor Limite (R$)</label>
              <input
                type="number"
                step="0.01"
                value={form.valor_limite}
                onChange={(e) => setForm({ ...form, valor_limite: e.target.value })}
                required
                className="form-group-input"
              />
            </div>
            <div className="form-group">
              <label>Alerta em (%)</label>
              <input
                type="number"
                value={form.alerta_em}
                onChange={(e) => setForm({ ...form, alerta_em: Number(e.target.value) })}
                className="form-group-input"
              />
            </div>
            <button type="submit" className="btn btn-primary">
              Salvar Orçamento
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
