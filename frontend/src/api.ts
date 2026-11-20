// URL base da API. Em produção, vem de VITE_API_URL (variável de ambiente).
// Em desenvolvimento, aponta para localhost:3000 (backend local).
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function baseURL(): string {
  return API_BASE;
}

// Recupera JWT do localStorage. Usado para autenticar requisições.
function getToken(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem('token');
}

// Função genérica de requisição HTTP.
// Adiciona automaticamente o header Authorization: Bearer <token> se houver.
// Se receber 401 (não autorizado), limpa o token e redireciona para login.
async function request(
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  // Token expirado ou inválido: força logout e volta para tela de login.
  // Só redireciona se existia uma sessão ativa (havia token) — assim um
  // erro de login (senha errada) mostra a mensagem em vez de recarregar
  // a página e apagar o formulário.
  if (response.status === 401) {
    const sessaoAtiva = !!getToken();
    localStorage.removeItem('token');
    if (sessaoAtiva && window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    // Tenta extrair a mensagem amigável do JSON de erro do backend
    // (ex: {"erro": "Email ou senha inválidos"}) em vez de mostrar o JSON cru.
    let mensagem = errorBody || `Erro ${response.status}`;
    try {
      const corpo = JSON.parse(errorBody);
      if (corpo && corpo.erro) mensagem = corpo.erro;
    } catch {
      // corpo não é JSON: mantém o texto original
    }
    throw new Error(mensagem);
  }

  if (response.status === 204) return null;
  return response.json();
}

export const api = {
  // Auth
  registro: (dados: { nome: string; email: string; senha: string }) =>
    request('/auth/registro', { method: 'POST', body: JSON.stringify(dados) }),
  login: (dados: { email: string; senha: string }) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify(dados) }),
  perfil: () => request('/auth/perfil'),

  // Grupos
  listarGrupos: () => request('/grupos'),
  criarGrupo: (dados: { nome: string; descricao?: string }) =>
    request('/grupos', { method: 'POST', body: JSON.stringify(dados) }),
  adicionarMembro: (grupoId: number, dados: { usuario_email: string; renda_mensal?: number }) =>
    request(`/grupos/${grupoId}/membros`, { method: 'POST', body: JSON.stringify(dados) }),

  // Categorias
  listarCategorias: (grupo_id?: string) =>
    request(`/categorias${grupo_id ? `?grupo_id=${grupo_id}` : ''}`),
  criarCategoria: (dados: any) =>
    request('/categorias', { method: 'POST', body: JSON.stringify(dados) }),

  // Transações
  listarTransacoes: (params?: { grupo_id?: string; mes?: string; tipo?: string }) => {
    const qs = params
      ? '?' +
        new URLSearchParams(
          Object.fromEntries(Object.entries(params).filter(([, v]) => v))
        ).toString()
      : '';
    return request(`/transacoes${qs}`);
  },
  criarTransacao: (dados: any) =>
    request('/transacoes', { method: 'POST', body: JSON.stringify(dados) }),
  atualizarTransacao: (id: number, dados: any) =>
    request(`/transacoes/${id}`, { method: 'PUT', body: JSON.stringify(dados) }),
  deletarTransacao: (id: number) =>
    request(`/transacoes/${id}`, { method: 'DELETE' }),

  // Orçamentos
  criarOrcamento: (dados: any) =>
    request('/orcamentos', { method: 'POST', body: JSON.stringify(dados) }),
  statusOrcamento: (grupo_id: string, mes: string) =>
    request(`/orcamentos/status?grupo_id=${grupo_id}&mes=${mes}`),

  // Rateios
  listarRateios: (grupo_id: string) =>
    request(`/rateios?grupo_id=${grupo_id}`),
  criarRateio: (dados: any) =>
    request('/rateios', { method: 'POST', body: JSON.stringify(dados) }),
  pagarRateio: (id: number, usuario_id: number) =>
    request(`/rateios/${id}/pagar`, {
      method: 'POST',
      body: JSON.stringify({ usuario_id }),
    }),
  resumoRateios: (grupo_id: string) =>
    request(`/rateios/resumo?grupo_id=${grupo_id}`),

  // Metas
  listarMetas: (grupo_id: string) =>
    request(`/metas?grupo_id=${grupo_id}`),
  criarMeta: (dados: any) =>
    request('/metas', { method: 'POST', body: JSON.stringify(dados) }),
  contribuirMeta: (id: number, dados: { usuario_id: number; valor: number }) =>
    request(`/metas/${id}/contribuicoes`, {
      method: 'POST',
      body: JSON.stringify(dados),
    }),

  // Importação
  importarExtrato: (dados: any) =>
    request('/importacoes', { method: 'POST', body: JSON.stringify(dados) }),

  // Relatório PDF
  gerarPDF: (grupo_id: string, mes: string) =>
    fetch(`${API_BASE}/relatorios/pdf?grupo_id=${grupo_id}&mes=${mes}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    }),

  // Relatórios para gráficos
  relatoriosGraficosCategoria: (grupo_id: string, mes: string) =>
    request(`/relatorios/gastos-categoria?grupo_id=${grupo_id}&mes=${mes}`),
  relatoriosEvolucaoMensal: (grupo_id: string) =>
    request(`/relatorios/evolucao-mensal?grupo_id=${grupo_id}`),
};
