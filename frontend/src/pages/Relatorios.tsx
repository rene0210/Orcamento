import { useEffect, useState } from 'react';
import { api, baseURL } from '../api';
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  Legend,
  XAxis,
  YAxis,
} from 'recharts';

const COLORS = ['#2563eb', '#ef4444', '#10b981', '#f59e0b', '#a855f7', '#ec4899', '#6366f1', '#14b8a6'];

export function Relatorios() {
  const [grupos, setGrupos] = useState<any[]>([]);
  const [grupo_id, setGrupoId] = useState('');
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7));
  const [graficoCategoria, setGraficoCategoria] = useState<any[]>([]);
  const [graficoEvolucao, setGraficoEvolucao] = useState<any[]>([]);

  useEffect(() => {
    // Seleciona automaticamente o primeiro grupo do usuário
    api.listarGrupos().then((lista: any[]) => {
      setGrupos(lista);
      if (lista.length > 0) setGrupoId(String(lista[0].id));
    });
  }, []);

  useEffect(() => {
    if (grupo_id) {
      carregarGraficos();
    }
  }, [grupo_id, mes]);

  async function carregarGraficos() {
    const [cat, evo] = await Promise.all([
      api.relatoriosGraficosCategoria(grupo_id, mes),
      api.relatoriosEvolucaoMensal(grupo_id),
    ]);
    setGraficoCategoria(cat.dados || []);
    setGraficoEvolucao(evo.dados || []);
  }

  async function exportarCSV() {
    if (!grupo_id) {
      alert('Selecione um grupo');
      return;
    }
    const response = await fetch(`${baseURL()}/exportar/csv?grupo_id=${grupo_id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    if (!response.ok) {
      alert('Erro ao exportar CSV');
      return;
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transacoes_grupo_${grupo_id}_${mes}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  if (!grupo_id) {
    return (
      <div className="card">
        <div className="card-header">
          <h2>Relatórios e Gráficos</h2>
        </div>
        <p>Selecione um grupo para visualizar relatórios.</p>
        <div className="form-group" style={{ marginTop: '1rem', marginBottom: 0 }}>
          <label>Grupo</label>
          <select value={grupo_id} onChange={(e) => setGrupoId(e.target.value)} className="form-group-input">
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
        <h1>Relatórios e Gráficos</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <select
            value={grupo_id}
            onChange={(e) => setGrupoId(e.target.value)}
            className="form-group-input"
            style={{ width: '200px' }}
          >
            <option value="">Selecione um grupo</option>
            {grupos.map((g) => (
              <option key={g.id} value={g.id}>{g.nome}</option>
            ))}
          </select>
          <input
            type="month"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className="form-group-input"
            style={{ marginLeft: '0.5rem' }}
          />
          <button onClick={exportarCSV} className="btn btn-secondary btn-sm">
            📥 Exportar CSV
          </button>
        </div>
      </div>

      <div className="charts-grid">
        {/* Gráfico de Pizza - Gastos por Categoria */}
        <div className="card">
          <div className="card-header">
            <h2>Gastos por Categoria — {mes}</h2>
          </div>
          {graficoCategoria.length === 0 ? (
            <div className="empty-state">Nenhuma despesa cadastrada neste mês.</div>
          ) : (
            <>
              <div style={{ height: 300 }}>
                <PieChart>
                  <Pie
                    data={graficoCategoria}
                    dataKey="total"
                    nameKey="categoria"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    label
                  >
                    {graficoCategoria.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </div>
              <table className="table" style={{ marginTop: '1rem', fontSize: '0.875rem' }}>
                <thead>
                  <tr>
                    <th>Categoria</th>
                    <th>Total</th>
                    <th>%</th>
                  </tr>
                </thead>
                <tbody>
                  {graficoCategoria.map((c: any) => {
                    const total = Number(c.total);
                    const somaTotal = graficoCategoria.reduce(
                      (s: number, item: any) => s + Number(item.total),
                      0
                    );
                    const pct = somaTotal > 0 ? ((total / somaTotal) * 100).toFixed(1) : '0';
                    return (
                      <tr key={c.categoria}>
                        <td>{c.categoria}</td>
                        <td>R$ {total.toFixed(2)}</td>
                        <td>{pct}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </div>

        {/* Gráfico de Linha - Evolução Mensal */}
        <div className="card">
          <div className="card-header">
            <h2>Evolução Mensal — últimos 6 meses</h2>
          </div>
          {graficoEvolucao.length === 0 ? (
            <div className="empty-state">Nenhuma transação encontrada.</div>
          ) : (
            <>
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={graficoEvolucao}>
                    <defs>
                      <linearGradient id="colorReceitas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorDespesas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="mes" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="receitas" stroke="#22c55e" strokeWidth={2} name="Receitas" />
                    <Line type="monotone" dataKey="despesas" stroke="#ef4444" strokeWidth={2} name="Despesas" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <table className="table" style={{ marginTop: '1rem', fontSize: '0.875rem' }}>
                <thead>
                  <tr>
                    <th>Mês</th>
                    <th>Receitas</th>
                    <th>Despesas</th>
                    <th>Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {graficoEvolucao.map((m: any) => (
                    <tr key={m.mes}>
                      <td>{m.mes}</td>
                      <td>R$ {Number(m.receitas || 0).toFixed(2)}</td>
                      <td>R$ {Number(m.despesas || 0).toFixed(2)}</td>
                      <td>
                        {Number(m.receitas || 0) - Number(m.despesas || 0) >= 0 ? (
                          <span className="text-success">
                            R$ {(Number(m.receitas || 0) - Number(m.despesas || 0)).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-danger">
                            R$ {(Number(m.receitas || 0) - Number(m.despesas || 0)).toFixed(2)}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
