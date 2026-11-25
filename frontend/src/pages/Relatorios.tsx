import { useEffect, useState } from 'react';
import { api, baseURL } from '../api';
import { InsightPanel } from '../ai/InsightPanel';
import { useA11y } from '../a11y/A11yContext';
import { CampoGrupo } from '../components/CampoGrupo';
import { CampoMes } from '../components/CampoMes';
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

// Paleta padrão dos gráficos
const COLORS_PADRAO = ['#2563eb', '#ef4444', '#10b981', '#f59e0b', '#a855f7', '#ec4899', '#6366f1', '#14b8a6'];
// Paleta Okabe-Ito: segura para todos os tipos de daltonismo
const COLORS_DALTONISMO = ['#0072B2', '#E69F00', '#009E73', '#D55E00', '#56B4E9', '#CC79A7', '#F0E442', '#000000'];
// Cores das linhas do gráfico de evolução (verde/vermelho → pares seguros no daltonismo)
const RECEITA_PADRAO = '#22c55e';
const DESPESA_PADRAO = '#ef4444';
const RECEITA_DALTONISMO = '#009E73';
const DESPESA_DALTONISMO = '#D55E00';

export function Relatorios() {
  const { config } = useA11y();
  // No modo daltonismo os gráficos trocam para a paleta segura Okabe-Ito
  const daltonismoAtivo = config.ativa && config.tipos.includes('daltonismo');
  const COLORS = daltonismoAtivo ? COLORS_DALTONISMO : COLORS_PADRAO;
  const COR_RECEITA = daltonismoAtivo ? RECEITA_DALTONISMO : RECEITA_PADRAO;
  const COR_DESPESA = daltonismoAtivo ? DESPESA_DALTONISMO : DESPESA_PADRAO;
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
        <div style={{ marginTop: '1rem', maxWidth: 320 }}>
          <CampoGrupo
            value={grupo_id}
            onChange={setGrupoId}
            grupos={grupos}
            placeholder="Selecione um grupo"
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Relatórios e Gráficos</h1>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <CampoGrupo
            value={grupo_id}
            onChange={setGrupoId}
            grupos={grupos}
            placeholder="Selecione um grupo"
            limparLabel="Selecione um grupo"
          />
          <CampoMes value={mes} onChange={setMes} />
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
                {/* ResponsiveContainer: a PieChart precisa de um container com
                    dimensões para renderizar (sem ele o SVG fica vazio) */}
                <ResponsiveContainer width="100%" height={300}>
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
                      isAnimationActive={false}
                    >
                      {graficoCategoria.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
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
                        <stop offset="5%" stopColor={COR_RECEITA} stopOpacity={0.8} />
                        <stop offset="95%" stopColor={COR_RECEITA} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorDespesas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COR_DESPESA} stopOpacity={0.8} />
                        <stop offset="95%" stopColor={COR_DESPESA} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="mes" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {/* isAnimationActive={false}: a animação do Recharts 2.10
                        pode deixar as curvas sem renderizar em alguns ambientes */}
                    <Line type="monotone" dataKey="receitas" stroke={COR_RECEITA} strokeWidth={2} name="Receitas" isAnimationActive={false} />
                    <Line type="monotone" dataKey="despesas" stroke={COR_DESPESA} strokeWidth={2} name="Despesas" isAnimationActive={false} />
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

      {/* IA: indicadores do relatório (economia, concentração, tendência, metas) e como melhorá-los */}
      <InsightPanel topico="relatorios" grupo_id={grupo_id} mes={mes} />
    </div>
  );
}
