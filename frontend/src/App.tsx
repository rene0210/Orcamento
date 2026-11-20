import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ReactNode } from 'react';
import { Login } from './pages/Login';
import { Cadastro } from './pages/Cadastro';
import { Dashboard } from './pages/Dashboard';
import { Transacoes } from './pages/Transacoes';
import { Orcamentos } from './pages/Orcamentos';
import { Metas } from './pages/Metas';
import { Rateios } from './pages/Rateios';
import { Importar } from './pages/Importar';
import { Relatorios } from './pages/Relatorios';

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <div className="container">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />
          {/* "/" redireciona para /dashboard (rota usada pelo Login e Navbar) */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/transacoes"
            element={
              <ProtectedRoute>
                <Transacoes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orcamentos"
            element={
              <ProtectedRoute>
                <Orcamentos />
              </ProtectedRoute>
            }
          />
          <Route
            path="/metas"
            element={
              <ProtectedRoute>
                <Metas />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rateios"
            element={
              <ProtectedRoute>
                <Rateios />
              </ProtectedRoute>
            }
          />
          <Route
            path="/importar"
            element={
              <ProtectedRoute>
                <Importar />
              </ProtectedRoute>
            }
          />
          <Route
            path="/relatorios"
            element={
              <ProtectedRoute>
                <Relatorios />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
