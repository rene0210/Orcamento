// ============================================================
// Contexto global de ACESSIBILIDADE
// O usuário ativa o modo e sinaliza qual(is) necessidade(s):
//   - visao:      baixa visão / cegueira → alto contraste + texto grande
//   - texto:      só texto ampliado
//   - surdez:     surdez → alertas visuais reforçados (nada depende de som)
//   - daltonismo: daltonismo → paleta Okabe-Ito + ícones nos status
//   - autismo:    autismo / sensibilidade sensorial → sem animações nem gradientes
// A configuração fica no localStorage e é aplicada como classes
// no <html> (ex.: html.a11y-daltonismo), que o CSS transforma
// em adaptações reais na interface.
// ============================================================
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type TipoA11y = 'visao' | 'texto' | 'surdez' | 'daltonismo' | 'autismo';

export const TIPOS_A11Y: Array<{
  id: TipoA11y;
  nome: string;
  oQueMuda: string;
}> = [
  {
    id: 'visao',
    nome: 'Baixa visão / cegueira',
    oQueMuda: 'Alto contraste (preto no branco), bordas grossas, texto ampliado e foco de teclado bem visível.',
  },
  {
    id: 'texto',
    nome: 'Texto grande',
    oQueMuda: 'Aumenta todo o texto da interface em cerca de 20% sem mudar as cores.',
  },
  {
    id: 'surdez',
    nome: 'Surdez',
    oQueMuda: 'Nada depende de som: alertas ganham bordas fortes, ícones e texto de destaque.',
  },
  {
    id: 'daltonismo',
    nome: 'Daltonismo',
    oQueMuda: 'Cores trocadas pela paleta segura Okabe-Ito e ícones (✓ ⚠ ✕) nos status, além de gráficos adaptados.',
  },
  {
    id: 'autismo',
    nome: 'Autismo / sensibilidade',
    oQueMuda: 'Sem animações, sem gradientes e com espaçamento maior para reduzir a carga sensorial.',
  },
];

interface A11yConfig {
  ativa: boolean;
  tipos: TipoA11y[];
}

interface A11yContextValue {
  config: A11yConfig;
  painelAberto: boolean;
  abrirPainel: () => void;
  fecharPainel: () => void;
  alternarAtiva: () => void;
  alternarTipo: (tipo: TipoA11y) => void;
}

const CHAVE = 'a11y_config';

function carregar(): A11yConfig {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (bruto) {
      const cfg = JSON.parse(bruto) as A11yConfig;
      return { ativa: !!cfg.ativa, tipos: Array.isArray(cfg.tipos) ? cfg.tipos : [] };
    }
  } catch {
    // JSON corrompido: volta ao padrão (desligado)
  }
  return { ativa: false, tipos: [] };
}

const A11yContext = createContext<A11yContextValue>({
  config: { ativa: false, tipos: [] },
  painelAberto: false,
  abrirPainel: () => {},
  fecharPainel: () => {},
  alternarAtiva: () => {},
  alternarTipo: () => {},
});

export function A11yProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<A11yConfig>(carregar);
  const [painelAberto, setPainelAberto] = useState(false);

  // Persiste a escolha do usuário
  useEffect(() => {
    localStorage.setItem(CHAVE, JSON.stringify(config));
  }, [config]);

  // Aplica as adaptações como classes no <html> (o CSS faz o resto)
  useEffect(() => {
    const html = document.documentElement;
    html.classList.toggle('a11y-ativo', config.ativa);
    const todos: TipoA11y[] = ['visao', 'texto', 'surdez', 'daltonismo', 'autismo'];
    for (const t of todos) {
      html.classList.toggle(`a11y-${t}`, config.ativa && config.tipos.includes(t));
    }
  }, [config]);

  return (
    <A11yContext.Provider
      value={{
        config,
        painelAberto,
        abrirPainel: () => setPainelAberto(true),
        fecharPainel: () => setPainelAberto(false),
        alternarAtiva: () => setConfig((c) => ({ ...c, ativa: !c.ativa })),
        alternarTipo: (tipo) =>
          setConfig((c) => ({
            ...c,
            tipos: c.tipos.includes(tipo)
              ? c.tipos.filter((t) => t !== tipo)
              : [...c.tipos, tipo],
          })),
      }}
    >
      {children}
    </A11yContext.Provider>
  );
}

export function useA11y() {
  return useContext(A11yContext);
}
