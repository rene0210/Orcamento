import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

// Bloqueia o acesso a rotas protegidas: sem token, redireciona para /login.
// Renderiza os children diretamente (as rotas são folhas, sem rotas filhas,
// por isso não usamos <Outlet /> — ele renderizaria nada aqui).
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const token = localStorage.getItem('token');
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}
