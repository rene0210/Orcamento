// ============================================================
// Painel de sugestões da IA — renderizado em cada tópico de tela.
// Busca /analise/insights (motor local do backend), filtra pelo
// tópico atual e some completamente quando o usuário desliga a IA.
// ============================================================
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, AlertTriangle, AlertCircle, Lightbulb, CheckCircle2, ArrowRight } from 'lucide-react';
import { api } from '../api';
import { useAi } from './AiContext';

type Topico = 'dashboard' | 'transacoes' | 'orcamentos' | 'metas' | 'rateios' | 'relatorios' | 'importar';
type Severidade = 'critico' | 'atencao' | 'dica' | 'ok';

interface Insight {
  id: string;
  topico: Topico;
  titulo: string;
  severidade: Severidade;
  analise: string;
  caminho: string;
  metrica?: string;
  rota?: string;
}

// Cache em memória por grupo+mes: navegar entre telas não refaz a chamada
const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { ts: number; insights: Insight[] }>();

// Ícone e cor por severidade
const SEVERIDADE = {
  critico: { Icon: AlertTriangle, rotulo: 'Crítico' },
  atencao: { Icon: AlertCircle, rotulo: 'Atenção' },
  dica: { Icon: Lightbulb, rotulo: 'Dica' },
  ok: { Icon: CheckCircle2, rotulo: 'Bom' },
} as const;

interface Props {
  topico: Topico;
  grupo_id?: string | number | null;
  mes: string;
}

export function InsightPanel({ topico, grupo_id, mes }: Props) {
  const { ativa } = useAi();
  const [insights, setInsights] = useState<Insight[]>([]);
  const chave = `${grupo_id}|${mes}`;

  useEffect(() => {
    if (!ativa || !grupo_id) {
      setInsights([]);
      return;
    }

    const cacheado = cache.get(chave);
    if (cacheado && Date.now() - cacheado.ts < CACHE_TTL_MS) {
      setInsights(cacheado.insights);
      return;
    }

    let vivo = true;
    api
      .analiseInsights(String(grupo_id), mes)
      .then((dados: { insights: Insight[] }) => {
        cache.set(chave, { ts: Date.now(), insights: dados.insights });
        if (vivo) setInsights(dados.insights);
      })
      .catch(() => {
        // Falha da IA nunca quebra a página: painel simplesmente não aparece
      });

    return () => {
      vivo = false;
    };
  }, [ativa, chave, grupo_id, mes]);

  // Desligada, sem grupo ou ainda carregando: nada é renderizado
  if (!ativa || !grupo_id) return null;
  const meus = insights.filter((i) => i.topico === topico);
  if (meus.length === 0) return null;

  return (
    <div className="insight-card">
      <div className="insight-head">
        <h2>
          <Sparkles size={17} />
          IA — Sugestões de melhoria
        </h2>
        <span className="insight-badge">{meus.length} análise(s)</span>
      </div>

      <div className="insight-body">
        {meus.map((ins) => {
          const { Icon, rotulo } = SEVERIDADE[ins.severidade];
          return (
            <div key={ins.id} className={`insight-item sev-${ins.severidade}`}>
              <div className="insight-item-top">
                <span className="sev-icon">
                  <Icon size={15} />
                </span>
                <strong>{ins.titulo}</strong>
                <span className={`sev-tag tag-${ins.severidade}`}>{rotulo}</span>
                {ins.metrica && <span className="insight-metric">{ins.metrica}</span>}
              </div>
              <p className="insight-text">{ins.analise}</p>
              <p className="insight-text">
                <b>Como melhorar:</b> {ins.caminho}
              </p>
              {ins.rota && (
                <Link to={ins.rota} className="insight-route">
                  Agir sobre isso <ArrowRight size={13} />
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
