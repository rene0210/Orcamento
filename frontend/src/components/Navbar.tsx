import { Link } from 'react-router-dom';
import { LogOut, Menu, User } from 'lucide-react';

export function Navbar() {
  const token = localStorage.getItem('token');

  const links = token
    ? [
        { to: '/dashboard', label: 'Dashboard' },
        { to: '/transacoes', label: 'Transações' },
        { to: '/orcamentos', label: 'Orçamento' },
        { to: '/metas', label: 'Metas' },
        { to: '/rateios', label: 'Rateios' },
        { to: '/importar', label: 'Importar' },
      ]
    : [];

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <Link to="/dashboard" className="navbar-brand">
          <User size={24} /> Orçamento
        </Link>
        <div className="navbar-links">
          {links.map((l) => (
            <Link key={l.to} to={l.to} className="navbar-links">
              {l.label}
            </Link>
          ))}
          {token && (
            <button
              onClick={() => {
                localStorage.removeItem('token');
                window.location.href = '/login';
              }}
              className="btn btn-danger btn-sm"
            >
              <LogOut size={16} /> Sair
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
