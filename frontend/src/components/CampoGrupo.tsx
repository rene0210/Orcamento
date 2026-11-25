// Campo de grupo: seletor com avatar, busca e menu alinhado ao restante do painel.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, Users } from 'lucide-react';

interface Grupo {
  id: string | number;
  nome: string;
  descricao?: string;
}

interface CampoGrupoProps {
  label?: string;
  /** Valor selecionado (string do id). '' = vazio/placeholder. */
  value: string;
  onChange: (valor: string) => void;
  grupos: Grupo[];
  placeholder?: string;
  /** Se definido, mostra um item para limpar a seleção (ex.: "Todos os grupos"). */
  limparLabel?: string;
}

const CORES = ['#1d4ed8', '#6d28d9', '#be185d', '#c2410c', '#0f766e', '#4338ca', '#0369a1', '#4d7c0f'];

function corDoGrupo(nome: string) {
  let h = 0;
  for (let i = 0; i < nome.length; i++) h = (h * 31 + nome.charCodeAt(i)) >>> 0;
  return CORES[h % CORES.length];
}

function inicial(nome: string) {
  return nome.trim().charAt(0).toUpperCase() || '?';
}

export function CampoGrupo({
  label = 'Grupo',
  value,
  onChange,
  grupos,
  placeholder = 'Selecione um grupo',
  limparLabel,
}: CampoGrupoProps) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState('');
  const raizRef = useRef<HTMLDivElement>(null);
  const buscaRef = useRef<HTMLInputElement>(null);
  const selecionado = grupos.find((g) => String(g.id) === value);
  const comBusca = grupos.length > 4;

  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return grupos;
    return grupos.filter((g) => g.nome.toLowerCase().includes(q));
  }, [grupos, busca]);

  useEffect(() => {
    if (!aberto) return;
    if (comBusca) buscaRef.current?.focus();
    function aoClicarFora(e: MouseEvent) {
      if (raizRef.current && !raizRef.current.contains(e.target as Node)) setAberto(false);
    }
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === 'Escape') setAberto(false);
    }
    document.addEventListener('mousedown', aoClicarFora);
    document.addEventListener('keydown', aoTeclar);
    return () => {
      document.removeEventListener('mousedown', aoClicarFora);
      document.removeEventListener('keydown', aoTeclar);
    };
  }, [aberto, comBusca]);

  function escolher(valor: string) {
    onChange(valor);
    setAberto(false);
    setBusca('');
  }

  return (
    <div className="campo campo-grupo" ref={raizRef}>
      {label ? <span className="campo-label">{label}</span> : null}
      <div className={`campo-box campo-select${aberto ? ' aberto' : ''}`}>
        <button
          type="button"
          className="campo-gatilho"
          onClick={() => setAberto((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={aberto}
        >
          {selecionado ? (
            <span className="campo-avatar" style={{ background: corDoGrupo(selecionado.nome) }} aria-hidden="true">
              {inicial(selecionado.nome)}
            </span>
          ) : (
            <span className="campo-avatar campo-avatar-vazio" aria-hidden="true">
              <Users size={13} />
            </span>
          )}
          <span className={`campo-valor-texto${selecionado ? '' : ' vazio'}`}>
            {selecionado ? selecionado.nome : placeholder}
          </span>
          <ChevronDown size={16} className="campo-chevron" aria-hidden="true" />
        </button>

        {aberto && (
          <div className="campo-menu" role="listbox" aria-label={label || 'Grupo'}>
            <div className="campo-menu-cabeca">
              <span>Grupos</span>
              <span className="campo-menu-contagem">{grupos.length}</span>
            </div>
            {comBusca && (
              <label className="campo-menu-busca">
                <Search size={14} aria-hidden="true" />
                <input
                  ref={buscaRef}
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar grupo"
                  aria-label="Buscar grupo"
                />
              </label>
            )}
            <ul className="campo-menu-lista">
              {limparLabel && !busca.trim() && (
                <li
                  role="option"
                  aria-selected={value === ''}
                  className={`campo-menu-item${value === '' ? ' selecionada' : ''}`}
                  onClick={() => escolher('')}
                >
                  <span className="campo-avatar campo-avatar-vazio" aria-hidden="true">
                    <Users size={13} />
                  </span>
                  <span className="campo-menu-nome">{limparLabel}</span>
                  {value === '' && <Check size={15} className="campo-menu-check" />}
                </li>
              )}
              {visiveis.map((g) => {
                const sel = String(g.id) === value;
                return (
                  <li
                    key={g.id}
                    role="option"
                    aria-selected={sel}
                    className={`campo-menu-item${sel ? ' selecionada' : ''}`}
                    onClick={() => escolher(String(g.id))}
                  >
                    <span className="campo-avatar" style={{ background: corDoGrupo(g.nome) }} aria-hidden="true">
                      {inicial(g.nome)}
                    </span>
                    <span className="campo-menu-texto">
                      <span className="campo-menu-nome">{g.nome}</span>
                      {g.descricao ? <span className="campo-menu-desc">{g.descricao}</span> : null}
                    </span>
                    {sel && <Check size={15} className="campo-menu-check" />}
                  </li>
                );
              })}
              {grupos.length === 0 && <li className="campo-menu-vazio">Nenhum grupo cadastrado</li>}
              {grupos.length > 0 && visiveis.length === 0 && (
                <li className="campo-menu-vazio">Nenhum grupo com esse nome</li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
