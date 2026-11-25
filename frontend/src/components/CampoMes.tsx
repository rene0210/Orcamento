// Campo de mês: controle segmentado (anterior / período / próximo) e grade anual.
import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const MESES_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

interface CampoMesProps {
  label?: string;
  /** Valor no formato 'YYYY-MM'. '' = sem filtro (usa limparLabel como texto). */
  value: string;
  onChange: (valor: string) => void;
  /** Se definido, permite limpar a seleção (ex.: "Todos os meses"). */
  limparLabel?: string;
}

function partes(valor: string) {
  const [ano, mes] = valor.split('-').map(Number);
  if (!ano || !mes || mes < 1 || mes > 12) return null;
  return { ano, mes, nome: MESES[mes - 1] };
}

function deslocar(valor: string, delta: number) {
  const atual = partes(valor) ?? { ano: new Date().getFullYear(), mes: new Date().getMonth() + 1 };
  const data = new Date(atual.ano, atual.mes - 1 + delta, 1);
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
}

const MES_ATUAL = new Date().toISOString().slice(0, 7);

export function CampoMes({ label = 'Mês', value, onChange, limparLabel }: CampoMesProps) {
  const [painel, setPainel] = useState(false);
  const raizRef = useRef<HTMLDivElement>(null);
  const info = partes(value);
  const anoValor = info?.ano ?? new Date().getFullYear();
  const [anoPainel, setAnoPainel] = useState(anoValor);

  useEffect(() => {
    if (!painel) return;
    function aoClicarFora(e: MouseEvent) {
      if (raizRef.current && !raizRef.current.contains(e.target as Node)) setPainel(false);
    }
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === 'Escape') setPainel(false);
    }
    document.addEventListener('mousedown', aoClicarFora);
    document.addEventListener('keydown', aoTeclar);
    return () => {
      document.removeEventListener('mousedown', aoClicarFora);
      document.removeEventListener('keydown', aoTeclar);
    };
  }, [painel]);

  function abrirPainel() {
    setAnoPainel(anoValor);
    setPainel((v) => !v);
  }

  function escolherMes(mes: number) {
    onChange(`${anoPainel}-${String(mes).padStart(2, '0')}`);
    setPainel(false);
  }

  function irParaAtual() {
    onChange(MES_ATUAL);
    setPainel(false);
  }

  return (
    <div className="campo campo-periodo" ref={raizRef}>
      {label ? <span className="campo-label">{label}</span> : null}
      <div className={`campo-box campo-mes${painel ? ' aberto' : ''}`}>
        <button
          type="button"
          className="campo-seta"
          aria-label="Mês anterior"
          onClick={() => onChange(deslocar(value, -1))}
        >
          <ChevronLeft size={16} />
        </button>

        <button
          type="button"
          className="campo-gatilho campo-mes-valor"
          onClick={abrirPainel}
          aria-haspopup="dialog"
          aria-expanded={painel}
        >
          <span className="campo-mes-nome">{info?.nome ?? limparLabel ?? 'Selecionar'}</span>
          <span className="campo-mes-ano-mini">{info?.ano ?? ''}</span>
        </button>

        <button
          type="button"
          className="campo-seta"
          aria-label="Próximo mês"
          onClick={() => onChange(deslocar(value, 1))}
        >
          <ChevronRight size={16} />
        </button>

        {painel && (
          <div className="campo-mes-painel" role="dialog" aria-label="Escolher mês">
            <div className="campo-mes-ano">
              <button
                type="button"
                className="campo-seta"
                aria-label="Ano anterior"
                onClick={() => setAnoPainel((a) => a - 1)}
              >
                <ChevronLeft size={16} />
              </button>
              <strong>{anoPainel}</strong>
              <button
                type="button"
                className="campo-seta"
                aria-label="Próximo ano"
                onClick={() => setAnoPainel((a) => a + 1)}
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="campo-mes-grade">
              {MESES_CURTOS.map((nome, i) => {
                const m = String(i + 1).padStart(2, '0');
                const chave = `${anoPainel}-${m}`;
                const sel = chave === value;
                const atual = chave === MES_ATUAL;
                return (
                  <button
                    key={nome}
                    type="button"
                    className={`campo-mes-cell${sel ? ' selecionado' : ''}${atual ? ' atual' : ''}`}
                    onClick={() => escolherMes(i + 1)}
                    aria-pressed={sel}
                    aria-label={MESES[i]}
                  >
                    {nome}
                  </button>
                );
              })}
            </div>

            <div className="campo-mes-acoes">
              <button type="button" className="campo-mes-hoje" onClick={irParaAtual}>
                Este mês
              </button>
              {limparLabel && value && (
                <button
                  type="button"
                  className="campo-mes-hoje"
                  onClick={() => {
                    onChange('');
                    setPainel(false);
                  }}
                >
                  {limparLabel}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
