import { useEffect, useState } from 'react';
import { api } from '../api';


export function Metas() {
  const [grupos, setGrupos] = useState<any[]>([]);
  const [grupo_id, setGrupoId] = useState('');
  const [metas, setMetas] = useState<any[]>([]);
  const [nova, setNova] = useState(false);
  const [form, setForm] = useState({
    grupo_id: '',
    nome: '',
    descricao: '',
    valor_alvo: '',
    data_alvo: '',
  });

  useEffect(() => {
    api.listarGrupos().then(setGrupos);
  }, []);

  useEffect(() => {
    if (grupo_id) {
      api.listarMetas(grupo_id).then(setMetas);
    }
  }, [grupo_id]);

  async function criarMeta(e: React.FormEvent) {
    e.preventDefault();
    await api.criarMeta(form);
    setNova(false);
    setForm({ grupo_id: '', nome: '', descricao: '', valor_alvo: '', data_alvo: '' });
    api.listarMetas(grupo_id).then(setMetas);
  }

  async function contribuir(metaId: number, usuario_id: string, valor: string) {
    await api.contribuirMeta(metaId, { usuario_id: Number(usuario_id), valor: Number(valor) });
    api.listarMetas(grupo_id!).then(setMetas);
  }

  if (!grupo_id) {
    return (
      <div className="card">
        <h2>Metas Compartilhadas</h2>
        <p>Selecione um grupo para visualizar e gerenciar metas.</p>
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
        <h1>Metas Compartilhadas</h1>
        <button onClick={() => setNova(!nova)} className="btn btn-primary btn-sm">
          ➕ {nova ? 'Cancelar' : 'Nova Meta'}
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
          Metas do Grupo
        </h2>
        <table className="table">
          <thead>
            <tr>
              <th>Meta</th>
              <th>Valor Alvo</th>
              <th>Guardado</th>
              <th>Progresso</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {metas.map((m: any) => {
              const alvo = Number(m.valor_alvo);
              const guardado = Number(m.valor_guardado);
              const pct = alvo > 0 ? ((guardado / alvo) * 100).toFixed(1) : '0';
              return (
                <tr key={m.id}>
                  <td>{m.nome}</td>
                  <td>R$ {alvo.toFixed(2)}</td>
                  <td>R$ {guardado.toFixed(2)}</td>
                  <td>{pct}%</td>
                  <td>
                    <span className={`badge ${m.status === 'concluida' ? 'badge-pago' : 'badge-pendente'}`}>
                      {m.status}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => {
                        const uid = prompt('Seu ID de usuário:');
                        const val = prompt('Valor da contribuição (R$):');
                        if (uid && val) contribuir(m.id, uid, val);
                      }}
                      className="btn btn-secondary btn-sm"
                    >
                      Contribuir
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {nova && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem' }}>
            Nova Meta
          </h2>
          <form onSubmit={criarMeta}>
            <div className="form-group">
              <label>Nome da Meta</label>
              <input
                type="text"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                required
                className="form-group-input"
              />
            </div>
            <div className="form-group">
              <label>Descrição</label>
              <input
                type="text"
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                className="form-group-input"
              />
            </div>
            <div className="form-group">
              <label>Valor Alvo (R$)</label>
              <input
                type="number"
                step="0.01"
                value={form.valor_alvo}
                onChange={(e) => setForm({ ...form, valor_alvo: e.target.value })}
                required
                className="form-group-input"
              />
            </div>
            <div className="form-group">
              <label>Data Alvo</label>
              <input
                type="date"
                value={form.data_alvo}
                onChange={(e) => setForm({ ...form, data_alvo: e.target.value })}
                className="form-group-input"
              />
            </div>
            <button type="submit" className="btn btn-primary">
              Criar Meta
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
