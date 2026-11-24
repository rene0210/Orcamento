import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AiProvider } from './ai/AiContext';
import { A11yProvider } from './a11y/A11yContext';
import { A11yPanel } from './a11y/A11yPanel';
import { AppLayout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
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
    // A11yProvider: modo acessibilidade global (classes no <html>)
    // AiProvider: estado global de ligar/desligar a IA de sugestões
    <A11yProvider>
      <AiProvider>
        <BrowserRouter>
      <Routes>
        {/* Autenticação: telas cheias, sem sidebar */}
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />

        {/* Área logada: envolvida pelo shell com sidebar (AppLayout) */}
        <Route element={<AppLayout />}>
          {/* "/" redireciona para /dashboard (rota usada pelo Login) */}
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
        </Route>
      </Routes>
        </BrowserRouter>
        {/* Modal de acessibilidade (disponível em qualquer tela) */}
        <A11yPanel />
      </AiProvider>
    </A11yProvider>
  );
}
