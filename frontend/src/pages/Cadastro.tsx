import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import {
  BarChart3,
  CheckCircle2,
  Flag,
  Lock,
  Mail,
  User,
  Wallet,
  ArrowLeftRight,
} from 'lucide-react';

export function Cadastro() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    try {
      await api.registro({ nome, email, senha });
      navigate('/login');
    } catch (err: any) {
      setErro(err.message || 'Erro ao cadastrar');
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
          <h1>Comece a organizar as finanças hoje.</h1>
          <p>
            Crie sua conta, monte o grupo do casal, família ou colegas de quarto e
            compartilhe metas e despesas em minutos.
          </p>
          <ul className="auth-features">
            <li>
              <CheckCircle2 size={18} /> Cadastro gratuito e sem cartão
            </li>
            <li>
              <ArrowLeftRight size={18} /> Divisão de contas automática e justa
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
          <h2>Criar conta</h2>
          <p className="auth-sub">Leva menos de um minuto.</p>

          {erro && <div className="alert alert-error">{erro}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Nome completo</label>
              <div className="input-wrap">
                <User size={16} />
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome"
                  required
                />
              </div>
            </div>
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
                  placeholder="Mínimo 6 caracteres"
                  minLength={6}
                  required
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-block">
              Criar conta
            </button>
          </form>

          <p className="auth-switch">
            Já tem conta? <Link to="/login">Faça login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
