import { useEffect, useState } from 'react';
import { api } from '../api';

export function Dashboard() {
  const [grupos, setGrupos] = useState<any[]>([]);
  const [grupoSelecionado, setGrupoSelecionado] = useState<string | null>(null);
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7));
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    api.listarGrupos().then(setGrupos);
  }, []);

  useEffect(() => {
    if (grupoSelecionado) {
      api.statusOrcamento(grupoSelecionado, mes).then(setStatus);
    }
  }, [grupoSelecionado, mes]);

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
      </div>

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

      {grupoSelecionado && status && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Total Receitas</h3>
              <div className="valor text-success">R$ 0,00</div>
            </div>
            <div className="stat-card">
              <h3>Total Despesas</h3>
              <div className="valor text-danger">R$ 0,00</div>
            </div>
            <div className="stat-card">
              <h3>Saldo</h3>
              <div className="valor">R$ 0,00</div>
            </div>
            <div className="stat-card">
              <h3>Categorias em Alerta</h3>
              <div className="valor text-warning">
                {status.orcamentos.filter((o: any) => o.status !== 'ok').length}
              </div>
            </div>
          </div>

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
        </>
      )}
    </div>
  );
}
