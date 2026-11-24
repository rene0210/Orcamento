// ============================================================
// Campo de filtro moderno (grupo, mês, tipo...)
// Caixa arredondada com ícone à esquerda, label em caixa alta
// e anel de foco azul — usado nas toolbars de todas as telas.
// ============================================================
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface CampoProps {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}

export function Campo({ icon: Icon, label, children }: CampoProps) {
  return (
    <label className="campo">
      <span className="campo-label">{label}</span>
      <span className="campo-box">
        <Icon size={16} className="campo-icone" aria-hidden="true" />
        {children}
      </span>
    </label>
  );
}
