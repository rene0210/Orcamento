import { BrowserRouter, Routes, Route } from 'react-router-dom';
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

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <div className="container">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route
            path="/"
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
        </Routes>
      </div>
    </BrowserRouter>
  );
}
