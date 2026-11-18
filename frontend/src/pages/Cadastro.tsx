import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Mail, Lock, User } from 'lucide-react';

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
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
    }}>
      <div style={{
        background: 'white',
        padding: '2.5rem',
        borderRadius: '1rem',
        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
        width: '100%',
        maxWidth: '400px',
      }}>
        <h2 style={{ textAlign: 'center', fontSize: '1.5rem', fontWeight: '700', color: '#1e293b', marginBottom: '1.5rem' }}>
          Criar conta
        </h2>
        {erro && <div style={{ padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem', background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' }}>{erro}</div>}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
              <User size={18} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} /> Nome completo
            </label>
            <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} required style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem' }} />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
              <Mail size={18} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} /> E-mail
            </label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem' }} />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
              <Lock size={18} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} /> Senha
            </label>
            <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem' }} />
          </div>
          <button type="submit" style={{ width: '100%', padding: '0.5rem 1rem', borderRadius: '0.5rem', background: '#2563eb', color: 'white', fontWeight: '500', border: 'none', cursor: 'pointer' }}>
            Criar conta
          </button>
        </form>
        <p style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.875rem', color: '#64748b' }}>
          Já tem conta? <Link to="/login" style={{ color: '#2563eb', fontWeight: '500' }}>Faça login</Link>
        </p>
      </div>
    </div>
  );
}
