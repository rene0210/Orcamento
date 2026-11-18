import { useEffect, useState } from 'react';
import { api } from '../api';
import { Plus } from 'lucide-react';

export function Rateios() {
  const [grupos, setGrupos] = useState<any[]>([]);
  const [grupo_id, setGrupoId] = useState('');
  const [rateios, setRateios] = useState<any[]>([]);
  const [nova, setNova] = useState(false);
  const [form, setForm] = useState({
    grupo_id: '',
    descricao: '',
    valor_total: '',
    regra_rateio: '50_50' as string,
    data_vencimento: '',
    criado_por_id: '',
    valores_fixos: [{ usuario_id: '', valor: '' }],
  });

  useEffect(() => {
    api.listarGrupos().then(setGrupos);
  }, []);

  useEffect(() => {
    if (grupo_id) {
      api.listarRateios(grupo_id).then(setRateios);
    }
  }, [grupo_id]);

  async function criarRateio(e: React.FormEvent) {
    e.preventDefault();
    await api.criarRateio(form);
    setNova(false);
    setForm({ grupo_id: '', descricao: '', valor_total: '', regra_rateio: '50_50', data_vencimento: '', criado_por_id: '', valores_fixos: [{ usuario_id: '', valor: '' }] });
    api.listarRateios(grupo_id).then(setRateios);
  }

  async function pagar(rateioId: number, usuario_id: string) {
    await api.pagarRateio(rateioId, Number(usuario_id));
    api.listarRateios(grupo_id!).then(setRateios);
  }

  if (!grupo_id) {
    return (
      <div className="card">
        <h2>Divisão de Contas</h2>
        <p>Selecione um grupo para criar e gerenciar rateios.</p>
        <div style={{ marginTop: '1rem' }}>
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
        <h1>Divisão de Contas (Rateio)</h1>
        <button onClick={() => setNova(!nova)} className="btn btn-primary btn-sm">
          <Plus size={18} /> {nova ? 'Cancelar' : 'Nova Conta'}
        </button>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label>Grupo</label>
        <select value={grupo_id} onChange={(e) => setGrupoId(e.target.value)} className="form-group-input">
          <option value="">Selecione</option>
          {grupos.map((g) => (
            <option key={g.id} value={g.id}>{g.nome}</option>
          ))}
        </select>
      </div>

      <div className="card">
        <h2 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem' }}>
          Rateios do Grupo
        </h2>
        <table className="table">
          <thead>
            <tr>
              <th>Descrição</th>
              <th>Valor Total</th>
              <th>Regra</th>
              <th>Vencimento</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {rateios.map((r: any) => (
              <tr key={r.id}>
                <td>{r.descricao}</td>
                <td>R$ {Number(r.valor_total).toFixed(2)}</td>
                <td>{r.regra_rateio}</td>
                <td>{r.data_vencimento}</td>
                <td>
                  <span className={`badge ${r.status === 'quitado' ? 'badge-pago' : 'badge-pendente'}`}>
                    {r.status}
                  </span>
                </td>
                <td>
                  {r.participantes.map((p: any) => (
                    <div key={p.id} style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                      {p.usuario_nome}: R$ {Number(p.valor_devido).toFixed(2)} -
                      <span className={`badge ${p.status === 'pago' ? 'badge-pago' : 'badge-pendente'}`} style={{ fontSize: '0.7rem' }}>
                        {p.status}
                      </span>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      const uid = prompt('Seu ID de usuário:');
                      if (uid) pagar(r.id, uid);
                    }}
                    className="btn btn-success btn-sm"
                  >
                    Pagar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {nova && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem' }}>
            Nova Conta para Rateio
          </h2>
          <form onSubmit={criarRateio}>
            <div className="form-group">
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
              <label>Valor Total (R$)</label>
              <input
                type="number"
                step="0.01"
                value={form.valor_total}
                onChange={(e) => setForm({ ...form, valor_total: e.target.value })}
                required
                className="form-group-input"
              />
            </div>
            <div className="form-group">
              <label>Regra de Rateio</label>
              <select
                value={form.regra_rateio}
                onChange={(e) => setForm({ ...form, regra_rateio: e.target.value as any })}
                required
                className="form-group-input"
              >
                <option value="50_50">50/50 (Igual)</option>
                <option value="proporcional_renda">Proporcional à Renda</option>
                <option value="valor_fixo">Valor Fixo por Pessoa</option>
              </select>
            </div>
            <div className="form-group">
              <label>Data Vencimento</label>
              <input
                type="date"
                value={form.data_vencimento}
                onChange={(e) => setForm({ ...form, data_vencimento: e.target.value })}
                className="form-group-input"
              />
            </div>
            <div className="form-group">
              <label>Seu ID de Usuário (Criador)</label>
              <input
                type="number"
                value={form.criado_por_id}
                onChange={(e) => setForm({ ...form, criado_por_id: e.target.value })}
                required
                className="form-group-input"
              />
            </div>
            {String(form.regra_rateio) === 'valor_fixo' && (
              <div className="form-group">
                <label>Valores Fixos por Usuário</label>
                {form.valores_fixos.map((vf: any, i: number) => (
                  <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input
                      type="number"
                      placeholder="ID usuário"
                      value={vf.usuario_id}
                      onChange={(e) => {
                        const nv = [...form.valores_fixos];
                        nv[i] = { ...nv[i], usuario_id: e.target.value };
                        setForm({ ...form, valores_fixos: nv });
                      }}
                      className="form-group-input"
                    />
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Valor"
                      value={vf.valor}
                      onChange={(e) => {
                        const nv = [...form.valores_fixos];
                        nv[i] = { ...nv[i], valor: e.target.value };
                        setForm({ ...form, valores_fixos: nv });
                      }}
                      className="form-group-input"
                    />
                  </div>
                ))}
              </div>
            )}
            <button type="submit" className="btn btn-primary">
              Criar Rateio
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
