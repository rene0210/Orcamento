import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Mail, Lock } from 'lucide-react';

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
      <div className="login-card">
        <h2>Bem-vindo de volta</h2>
        {erro && <div className="alert alert-error">{erro}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>E-mail</label>
            <Mail size={18} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Senha</label>
            <Lock size={18} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            Entrar
          </button>
        </form>
        <p style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.875rem', color: '#64748b' }}>
          Não tem conta? <Link to="/cadastro" style={{ color: '#2563eb', fontWeight: 500 }}>Cadastre-se</Link>
        </p>
      </div>
    </div>
  );
}
