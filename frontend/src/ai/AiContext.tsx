// ============================================================
// Contexto global da IA de sugestões
// O usuário liga/desliga em qualquer lugar e a preferência fica
// salva no localStorage (persiste entre sessões e telas).
// ============================================================
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface AiContextValue {
  ativa: boolean;
  alternar: () => void;
}

const AiContext = createContext<AiContextValue>({ ativa: true, alternar: () => {} });

export function AiProvider({ children }: { children: ReactNode }) {
  // Liga por padrão; "0" no localStorage = desligada pelo usuário
  const [ativa, setAtiva] = useState(() => localStorage.getItem('ia_ativa') !== '0');

  useEffect(() => {
    localStorage.setItem('ia_ativa', ativa ? '1' : '0');
  }, [ativa]);

  return (
    <AiContext.Provider value={{ ativa, alternar: () => setAtiva((v) => !v) }}>
      {children}
    </AiContext.Provider>
  );
}

export function useAi() {
  return useContext(AiContext);
}
