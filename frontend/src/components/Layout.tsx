import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAi } from '../ai/AiContext';
import { useA11y } from '../a11y/A11yContext';
import {
  Accessibility,
  BarChart3,
  Flag,
  LayoutDashboard,
  LogOut,
  Menu,
  PieChart,
  Sparkles,
  Upload,
  Users,
  Wallet,
  ArrowLeftRight,
} from 'lucide-react';

// Itens de navegação com ícone (sidebar estilo dashboard profissional)
const LINKS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/transacoes', label: 'Transações', icon: ArrowLeftRight },
  { to: '/orcamentos', label: 'Orçamento', icon: PieChart },
  { to: '/metas', label: 'Metas', icon: Flag },
  { to: '/rateios', label: 'Rateios', icon: Users },
  { to: '/importar', label: 'Importar', icon: Upload },
  { to: '/relatorios', label: 'Relatórios', icon: BarChart3 },
];

// Lê o e-mail do payload do JWT (sem dependências extras)
function emailDoToken(): string | null {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.email || null;
  } catch {
    return null;
  }
}

// Shell da área logada: sidebar fixa + conteúdo (via <Outlet />)
export function AppLayout() {
  const [menuAberto, setMenuAberto] = useState(false);
  const location = useLocation();
  const email = emailDoToken();
  const { ativa: iaAtiva, alternar: alternarIa } = useAi();
  const { config: a11y, abrirPainel } = useA11y();

  // Fecha o menu mobile ao trocar de página
  useEffect(() => {
    setMenuAberto(false);
  }, [location.pathname]);

  function sair() {
    localStorage.removeItem('token');
    window.location.href = '/login';
  }

  return (
    <div className={`app-shell${menuAberto ? ' sidebar-open' : ''}`}>
      <aside className="sidebar">
        {/* Marca clicável: volta ao Dashboard de qualquer tela */}
        <NavLink to="/dashboard" className="sidebar-brand" title="Ir para o Dashboard">
          <span className="brand-icon">
            <Wallet size={20} />
          </span>
          Orçamento
        </NavLink>

        <nav className="sidebar-nav">
          <div className="nav-label">Menu principal</div>
          {LINKS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Toggle da IA: liga/desliga as sugestões em todas as telas */}
        <button
          className={`ai-toggle${iaAtiva ? ' on' : ''}`}
          onClick={alternarIa}
          title={
            iaAtiva
              ? 'Clique para desabilitar as sugestões da IA'
              : 'Clique para habilitar as sugestões da IA'
          }
        >
          <Sparkles size={16} />
          <span>Sugestões da IA</span>
          <span className="ai-switch">
            <span className="ai-knob" />
          </span>
        </button>

        {/* Entrada do modo acessibilidade (abre o painel de escolha) */}
        <button
          className={`a11y-entry${a11y.ativa ? ' on' : ''}`}
          onClick={abrirPainel}
          aria-haspopup="dialog"
          title="Configurar acessibilidade (contraste, daltonismo, audição...)"
        >
          <Accessibility size={16} />
          <span>Acessibilidade</span>
          {a11y.ativa && a11y.tipos.length > 0 && (
            <span className="a11y-count">{a11y.tipos.length}</span>
          )}
        </button>

        <div className="sidebar-footer">
          {email && (
            <div className="sidebar-user">
              <span className="sidebar-avatar">{email.charAt(0)}</span>
              <div className="sidebar-user-info">
                <div className="sidebar-user-name">{email}</div>
                <div className="sidebar-user-role">Conta ativa</div>
              </div>
            </div>
          )}
          <button className="nav-item logout" onClick={sair}>
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </aside>

      {/* Overlay fecha o menu ao clicar fora (mobile) */}
      {menuAberto && (
        <div className="sidebar-overlay" onClick={() => setMenuAberto(false)} />
      )}

      <div className="main">
        <div className="mobile-topbar">
          <button
            className="icon-btn"
            aria-label="Abrir menu"
            onClick={() => setMenuAberto(true)}
          >
            <Menu size={20} />
          </button>
          <NavLink to="/dashboard" className="mobile-brand" title="Ir para o Dashboard">
            <Wallet size={18} /> Orçamento
          </NavLink>
          <span style={{ width: 38 }} />
        </div>

        <div className="container">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
