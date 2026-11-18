import { Navigate, Outlet } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const token = localStorage.getItem('token');
  return token ? <Outlet /> : <Navigate to="/login" replace />;
}
