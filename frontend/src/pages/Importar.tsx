import { useEffect, useState } from 'react';
import { api } from '../api';
import { InsightPanel } from '../ai/InsightPanel';

// Importar não tem filtro de mês: a IA analisa o mês corrente
const MES_ATUAL = new Date().toISOString().slice(0, 7);

export function Importar() {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [conteudo, setConteudo] = useState('');
  const [formato, setFormato] = useState<'csv' | 'ofx'>('csv');
  const [grupo_id, setGrupoId] = useState('');
  const [grupos, setGrupos] = useState<any[]>([]);
  const [resultado, setResultado] = useState<any>(null);
  const [erro, setErro] = useState('');

  // Grupos servem para a IA analisar (mesmo antes do usuário digitar o ID)
  useEffect(() => {
    api.listarGrupos().then(setGrupos).catch(() => setGrupos([]));
  }, []);

  async function handleArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setArquivo(file);
    setErro('');

    const texto = await file.text();
    setConteudo(texto);

    if (file.name.toLowerCase().endsWith('.ofx')) {
      setFormato('ofx');
    } else {
      setFormato('csv');
    }
  }

  async function handleImportar() {
    if (!arquivo || !grupo_id) {
      setErro('Selecione um arquivo e informe o ID do grupo.');
      return;
    }
    setErro('');
    setResultado(null);

    try {
      const resposta = await api.importarExtrato({
        arquivo_nome: arquivo.name,
        conteudo,
        grupo_id,
        formato,
      });
      setResultado(resposta);
    } catch (err: any) {
      setErro(err.message || 'Erro ao importar');
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Importar Extrato</h1>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Importar CSV ou OFX</h2>
        </div>

        <div className="form-group">
          <label>Arquivo</label>
          <input
            type="file"
            accept=".csv,.ofx"
            onChange={handleArquivo}
          />
          {arquivo && (
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem' }}>
              {arquivo.name} ({formato.toUpperCase()})
            </p>
          )}
        </div>

        <div className="form-group">
          <label>ID do Grupo</label>
          <input
            type="number"
            value={grupo_id}
            onChange={(e) => setGrupoId(e.target.value)}
            required
            className="form-group-input"
          />
        </div>

        <button
          onClick={handleImportar}
          className="btn btn-primary"
          disabled={!arquivo || !grupo_id}
        >
          ⬆ Importar Extrato
        </button>

        {erro && (
          <div className="alert alert-error" style={{ marginTop: '1rem' }}>
            {erro}
          </div>
        )}

        {resultado && (
          <div className="alert alert-success" style={{ marginTop: '1rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Importação Concluída</h3>
            <p><strong>Arquivo:</strong> {resultado.importacao_id}</p>
            <p><strong>Linhas processadas:</strong> {resultado.total_linhas}</p>
            <p><strong>Transações inseridas:</strong> {resultado.transacoes_inseridas}</p>
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div className="card-header">
          <h2>Pré-visualização do Conteúdo</h2>
        </div>
        <pre style={{ fontSize: '0.75rem', background: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', overflow: 'auto', maxHeight: '300px' }}>
          {conteudo.slice(0, 2000)}
        </pre>
      </div>

      {/* IA: qualidade dos dados e rotina de importação */}
      <InsightPanel
        topico="importar"
        grupo_id={grupo_id || grupos[0]?.id || ''}
        mes={MES_ATUAL}
      />
    </div>
  );
}
