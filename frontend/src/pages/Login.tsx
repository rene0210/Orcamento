import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import {
  BarChart3,
  CheckCircle2,
  Flag,
  Lock,
  Mail,
  Wallet,
  ArrowLeftRight,
} from 'lucide-react';

export function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    try {
      const resposta = await api.login({ email, senha });
      localStorage.setItem('token', resposta.token);
      navigate('/dashboard');
    } catch (err: any) {
      setErro(err.message || 'Erro ao fazer login');
    }
  }

  return (
    <div className="login-page">
      {/* Painel de marca (lado esquerdo) */}
      <div className="auth-brand">
        <div className="auth-logo">
          <span className="brand-icon">
            <Wallet size={20} />
          </span>
          Orçamento
        </div>

        <div className="auth-brand-body">
          <h1>Seu orçamento compartilhado, sob controle.</h1>
          <p>
            Controle receitas e despesas, divida contas automaticamente e alcance
            metas com quem importa — tudo em um só lugar.
          </p>
          <ul className="auth-features">
            <li>
              <CheckCircle2 size={18} /> Transações e orçamentos mensais com alertas
            </li>
            <li>
              <ArrowLeftRight size={18} /> Rateio automático 50/50 ou proporcional
            </li>
            <li>
              <Flag size={18} /> Metas compartilhadas com progresso em tempo real
            </li>
            <li>
              <BarChart3 size={18} /> Relatórios e gráficos exportáveis em CSV
            </li>
          </ul>
        </div>

        <p className="auth-demo">
          Conta demo: <strong>ana@email.com</strong> · senha <strong>senha123</strong>
        </p>
      </div>

      {/* Formulário (lado direito) */}
      <div className="auth-card">
        <div className="login-card">
          <div className="auth-mobile-logo">
            <span className="brand-icon">
              <Wallet size={20} />
            </span>
          </div>
          <h2>Bem-vindo de volta</h2>
          <p className="auth-sub">Entre para acompanhar seu orçamento.</p>

          {erro && <div className="alert alert-error">{erro}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>E-mail</label>
              <div className="input-wrap">
                <Mail size={16} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@email.com"
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label>Senha</label>
              <div className="input-wrap">
                <Lock size={16} />
                <input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-block">
              Entrar
            </button>
          </form>

          <p className="auth-switch">
            Não tem conta? <Link to="/cadastro">Cadastre-se</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
