// ============================================================
// MOTOR DE ANÁLISE — IA local de sugestões de melhoria
// Analisa os dados reais do grupo (SQL) e devolve recomendações
// concretas por tópico de tela. Sem chave de API: 100% local,
// gratuito e sempre disponível.
//
// Cada insight tem:
//   - analise: o que os números mostram
//   - caminho: passo a passo de como melhorar
//   - metrica: número de destaque (R$ / %)
//   - rota: link interno para agir sobre o problema
// ============================================================
import { db } from './db/connection.ts';

export type Severidade = 'critico' | 'atencao' | 'dica' | 'ok';
export type Topico =
  | 'dashboard'
  | 'transacoes'
  | 'orcamentos'
  | 'metas'
  | 'rateios'
  | 'relatorios'
  | 'importar';

export interface Insight {
  id: string;
  topico: Topico;
  titulo: string;
  severidade: Severidade;
  analise: string;
  caminho: string;
  metrica?: string;
  rota?: string;
}

// ---------- Helpers de formatação e tempo ----------
const brl = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const p1 = (n: number) => `${n.toFixed(1).replace('.', ',')}%`;

function mesAnterior(mes: string): string {
  const [ano = 0, m = 1] = mes.split('-').map(Number);
  const d = new Date(ano, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Dias úteis restantes do mês consultado para "gasto diário permitido"
function diasRestantes(mes: string): number {
  const [ano = 0, m = 1] = mes.split('-').map(Number);
  const hoje = new Date();
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
  const diasNoMes = new Date(ano, m, 0).getDate();
  if (mes < mesAtual) return 0; // mês fechado
  if (mes > mesAtual) return diasNoMes; // mês futuro
  return Math.max(1, diasNoMes - hoje.getDate());
}

// Meses até uma data-alvo (mínimo 1 se ainda não venceu)
function mesesAte(dataISO: string): number {
  const hoje = new Date();
  const alvo = new Date(dataISO);
  const dif =
    (alvo.getFullYear() - hoje.getFullYear()) * 12 +
    (alvo.getMonth() - hoje.getMonth());
  if (dif <= 0) return alvo > hoje ? 1 : 0;
  return dif;
}

// ---------- Coleta dos dados brutos (SQL) ----------
interface Dados {
  receitas: number;
  despesas: number;
  lancamentos: number;
  receitasAnt: number;
  despesasAnt: number;
  categorias: Array<{ categoria: string; total: number }>;
  orcamentos: Array<{
    categoria: string;
    limite: number;
    gasto: number;
    percentual_consumido: number;
    status: string;
  }>;
  semOrcamento: Array<{ categoria: string; total: number }>;
  recorrentes: Array<{ descricao: string; n: number; total: number }>;
  maiorDespesa: { descricao: string; valor: number } | undefined;
  metas: Array<{
    nome: string;
    valor_alvo: number;
    valor_guardado: number;
    data_alvo: string | null;
  }>;
  rateiosPendentes: { qtd: number; pendente: number; vencidos: number };
  totalRateios: number;
  importacoes: { n: number; ultimo: string | null };
  evolucao: Array<{ mes: string; receitas: number; despesas: number }>;
}

function coletarDados(grupo_id: string, mes: string): Dados {
  const mesAnt = mesAnterior(mes);

  const totais = db
    .prepare(
      `SELECT
        ROUND(COALESCE(SUM(CASE WHEN tipo='receita' THEN valor ELSE 0 END),0),2) as receitas,
        ROUND(COALESCE(SUM(CASE WHEN tipo='despesa' THEN valor ELSE 0 END),0),2) as despesas,
        COUNT(*) as lancamentos
      FROM transacoes WHERE grupo_id = ? AND data LIKE ?`
    )
    .get(grupo_id, `${mes}%`) as {
    receitas: number;
    despesas: number;
    lancamentos: number;
  };

  const totaisAnt = db
    .prepare(
      `SELECT
        ROUND(COALESCE(SUM(CASE WHEN tipo='receita' THEN valor ELSE 0 END),0),2) as receitas,
        ROUND(COALESCE(SUM(CASE WHEN tipo='despesa' THEN valor ELSE 0 END),0),2) as despesas
      FROM transacoes WHERE grupo_id = ? AND data LIKE ?`
    )
    .get(grupo_id, `${mesAnt}%`) as { receitas: number; despesas: number };

  const categorias = db
    .prepare(
      `SELECT c.nome as categoria, ROUND(SUM(t.valor),2) as total
       FROM transacoes t JOIN categorias c ON c.id = t.categoria_id
       WHERE t.grupo_id = ? AND t.tipo = 'despesa' AND t.data LIKE ?
       GROUP BY c.id, c.nome
       ORDER BY total DESC`
    )
    .all(grupo_id, `${mes}%`) as Dados['categorias'];

  // Mesmo cálculo do endpoint /orcamentos/status
  const orcamentos = db
    .prepare(
      `SELECT
        c.nome as categoria,
        o.valor_limite as limite,
        COALESCE(SUM(t.valor), 0) as gasto,
        ROUND(COALESCE(SUM(t.valor), 0) * 100.0 / NULLIF(o.valor_limite, 0), 2) as percentual_consumido,
        CASE
          WHEN COALESCE(SUM(t.valor), 0) >= o.valor_limite THEN 'estourou'
          WHEN COALESCE(SUM(t.valor), 0) * 100.0 / o.valor_limite >= o.alerta_em THEN 'alerta'
          ELSE 'ok'
        END as status
      FROM orcamentos o
      JOIN categorias c ON o.categoria_id = c.id
      LEFT JOIN transacoes t
        ON t.categoria_id = c.id AND t.grupo_id = o.grupo_id
        AND t.tipo = 'despesa' AND t.data LIKE ?
      WHERE o.grupo_id = ? AND o.mes = ?
      GROUP BY c.id, c.nome, o.valor_limite, o.alerta_em
      ORDER BY percentual_consumido DESC`
    )
    .all(`${mes}%`, grupo_id, mes) as Dados['orcamentos'];

  // Categorias que gastaram no mês SEM ter limite definido
  const semOrcamento = db
    .prepare(
      `SELECT c.nome as categoria, ROUND(SUM(t.valor),2) as total
       FROM transacoes t JOIN categorias c ON c.id = t.categoria_id
       WHERE t.grupo_id = ? AND t.tipo = 'despesa' AND t.data LIKE ?
         AND t.categoria_id NOT IN (
           SELECT categoria_id FROM orcamentos WHERE grupo_id = ? AND mes = ?
         )
       GROUP BY c.id, c.nome
       ORDER BY total DESC
       LIMIT 3`
    )
    .all(grupo_id, `${mes}%`, grupo_id, mes) as Dados['semOrcamento'];

  // Gastos repetidos (mesma descrição 3+ vezes no mês) = assinaturas/fixos
  const recorrentes = db
    .prepare(
      `SELECT descricao, COUNT(*) as n, ROUND(SUM(valor),2) as total
       FROM transacoes
       WHERE grupo_id = ? AND tipo = 'despesa' AND data LIKE ?
       GROUP BY LOWER(descricao)
       HAVING COUNT(*) >= 3
       ORDER BY SUM(valor) DESC
       LIMIT 3`
    )
    .all(grupo_id, `${mes}%`) as Dados['recorrentes'];

  const maiorDespesa = db
    .prepare(
      `SELECT descricao, ROUND(valor,2) as valor
       FROM transacoes
       WHERE grupo_id = ? AND tipo = 'despesa' AND data LIKE ?
       ORDER BY valor DESC LIMIT 1`
    )
    .get(grupo_id, `${mes}%`) as Dados['maiorDespesa'];

  const metas = db
    .prepare(
      `SELECT nome, valor_alvo, valor_guardado, data_alvo
       FROM metas
       WHERE grupo_id = ? AND status = 'ativa'
       ORDER BY data_alvo IS NULL, data_alvo`
    )
    .all(grupo_id) as Dados['metas'];

  const rateiosPendentes = db
    .prepare(
      `SELECT
        COUNT(DISTINCT r.id) as qtd,
        COALESCE(SUM(rp.valor_devido - rp.valor_pago), 0) as pendente,
        COALESCE(SUM(CASE
          WHEN r.data_vencimento IS NOT NULL AND r.data_vencimento < date('now')
          THEN 1 ELSE 0 END), 0) as vencidos
      FROM rateios r
      JOIN rateio_participantes rp ON rp.rateio_id = r.id
      WHERE r.grupo_id = ? AND rp.status = 'pendente'`
    )
    .get(grupo_id) as Dados['rateiosPendentes'];

  const totalRateios = db
    .prepare('SELECT COUNT(*) as n FROM rateios WHERE grupo_id = ?')
    .get(grupo_id) as { n: number };

  const importacoes = db
    .prepare(
      'SELECT COUNT(*) as n, MAX(criado_em) as ultimo FROM importacoes WHERE grupo_id = ?'
    )
    .get(grupo_id) as Dados['importacoes'];

  const evolucao = db
    .prepare(
      `SELECT substr(data,1,7) as mes,
        ROUND(COALESCE(SUM(CASE WHEN tipo='receita' THEN valor ELSE 0 END),0),2) as receitas,
        ROUND(COALESCE(SUM(CASE WHEN tipo='despesa' THEN valor ELSE 0 END),0),2) as despesas
      FROM transacoes WHERE grupo_id = ?
      GROUP BY substr(data,1,7)
      ORDER BY mes DESC
      LIMIT 6`
    )
    .all(grupo_id) as Dados['evolucao'];

  return {
    receitas: Number(totais.receitas),
    despesas: Number(totais.despesas),
    lancamentos: Number(totais.lancamentos),
    receitasAnt: Number(totaisAnt.receitas),
    despesasAnt: Number(totaisAnt.despesas),
    categorias,
    orcamentos,
    semOrcamento,
    recorrentes,
    maiorDespesa,
    metas,
    rateiosPendentes,
    totalRateios: totalRateios.n,
    importacoes,
    evolucao,
  };
}

// ---------- Regras de análise por tópico ----------
export function gerarInsights(grupo_id: string, mes: string): Insight[] {
  const d = coletarDados(grupo_id, mes);
  const insights: Insight[] = [];
  const saldo = d.receitas - d.despesas;
  const dias = diasRestantes(mes);
  const topCategoria = d.categorias[0];

  // Sem movimentação: devolve apenas o diagnóstico base
  if (d.lancamentos === 0) {
    insights.push(
      {
        id: 'sem-dados',
        topico: 'dashboard',
        titulo: 'Sem movimentação no mês',
        severidade: 'critico',
        analise: `Nenhuma transação registrada em ${mes}. Sem dados, a IA não consegue apontar melhorias.`,
        caminho: 'Importe um extrato CSV/OFX ou lance receitas e despesas manualmente para ativar a análise inteligente.',
        metrica: '0 lançamentos',
        rota: '/importar',
      },
      {
        id: 'sem-dados-import',
        topico: 'importar',
        titulo: 'Dados insuficientes para análise',
        severidade: 'atencao',
        analise: 'O grupo não tem lançamentos neste mês — o extrato está desatualizado.',
        caminho: 'Baixe o extrato do seu banco em CSV ou OFX e importe aqui. Com dados frescos, a IA passa a sugerir cortes e economias reais.',
        rota: '/importar',
      }
    );
    return insights;
  }

  const taxaEconomia = d.receitas > 0 ? (saldo / d.receitas) * 100 : 0;

  // ===== DASHBOARD =====
  if (saldo < 0) {
    const corte = topCategoria ? topCategoria.total * 0.2 : Math.abs(saldo);
    insights.push({
      id: 'saldo-negativo',
      topico: 'dashboard',
      titulo: 'Gasto acima da receita',
      severidade: 'critico',
      analise: `Suas despesas superaram as receitas em ${brl(Math.abs(saldo))} neste mês (gasto de ${brl(d.despesas)} contra ${brl(d.receitas)} de entrada).`,
      caminho: topCategoria
        ? `1) Corte 20% da categoria "${topCategoria.categoria}" (economia de ${brl(corte)}/mês); 2) adie compras não essenciais até o próximo salário; 3) registre tudo em Transações para não perder o controle.`
        : '1) Adie compras não essenciais; 2) aumente receitas com venda de itens parados; 3) registre tudo em Transações.',
      metrica: `-${brl(Math.abs(saldo))}`,
      rota: '/transacoes',
    });
  } else if (d.receitas > 0 && taxaEconomia < 10) {
    insights.push({
      id: 'economia-baixa',
      topico: 'dashboard',
      titulo: 'Índice de economia baixo',
      severidade: 'atencao',
      analise: `Você está guardando apenas ${p1(taxaEconomia)} do que entra. A recomendação para saúde financeira é poupar 20% ou mais.`,
      caminho: `Automatize uma transferência de 10% para uma Meta assim que o dinheiro entrar; para chegar a 20%, faltam ${brl(d.receitas * 0.2 - saldo)} neste mês.`,
      metrica: p1(taxaEconomia),
      rota: '/metas',
    });
  } else if (d.receitas > 0) {
    insights.push({
      id: 'economia-boa',
      topico: 'dashboard',
      titulo: 'Saudável: mantenha o ritmo',
      severidade: 'ok',
      analise: `Você economizou ${p1(taxaEconomia)} das suas receitas (${brl(saldo)} guardados).`,
      caminho: `Destine parte do excedente para uma Meta compartilhada — R$ 20% (${brl(saldo * 0.2)}) já aceleraria seu objetivo principal.`,
      metrica: p1(taxaEconomia),
      rota: '/metas',
    });
  }

  // Tendência de despesas vs mês anterior
  if (d.despesasAnt > 0) {
    const variacao = ((d.despesas - d.despesasAnt) / d.despesasAnt) * 100;
    if (variacao > 15) {
      insights.push({
        id: 'despesas-subindo',
        topico: 'dashboard',
        titulo: 'Despesas em alta',
        severidade: 'atencao',
        analise: `Suas despesas subiram ${p1(variacao)} em relação ao mês anterior (${brl(d.despesasAnt)} → ${brl(d.despesas)}).`,
        caminho: 'Abra Transações com o filtro "Despesa" e ordene por valor: identifique o que mudou, cancele o que for supérfluo e reative os alertas de orçamento.',
        metrica: `+${p1(variacao)}`,
        rota: '/transacoes?tipo=despesa',
      });
    } else if (variacao < -10) {
      insights.push({
        id: 'despesas-caindo',
        topico: 'dashboard',
        titulo: 'Despesas em queda',
        severidade: 'ok',
        analise: `Você reduziu despesas em ${p1(Math.abs(variacao))} comparado ao mês anterior.`,
        caminho: 'Excelente progresso! Redirecione a economia do mês para uma meta antes que ela seja gasta por impulso.',
        metrica: `${p1(variacao)}`,
        rota: '/metas',
      });
    }
  }

  // Alertas de orçamento
  const estourados = d.orcamentos.filter((o) => o.status === 'estourou');
  const emAlerta = d.orcamentos.filter((o) => o.status === 'alerta');
  if (estourados.length > 0 || emAlerta.length > 0) {
    const nomes = [...estourados, ...emAlerta].slice(0, 2).map((o) => o.categoria).join(', ');
    insights.push({
      id: 'alertas-orcamento',
      topico: 'dashboard',
      titulo: `${estourados.length + emAlerta.length} categoria(s) em alerta`,
      severidade: estourados.length > 0 ? 'critico' : 'atencao',
      analise: `Limites ultrapassados ou próximos do limite: ${nomes}.`,
      caminho: `Reduza o consumo dessas categorias nos próximos ${dias} dia(s) ou revise o limite com base na média real dos últimos meses.`,
      metrica: `${estourados.length} estourada(s)`,
      rota: '/orcamentos?filtro=alerta',
    });
  }

  // Concentração de gasto numa única categoria
  if (topCategoria && d.despesas > 0) {
    const share = (topCategoria.total / d.despesas) * 100;
    if (share > 40) {
      insights.push({
        id: 'concentracao',
        topico: 'dashboard',
        titulo: 'Gasto concentrado em uma categoria',
        severidade: 'atencao',
        analise: `"${topCategoria.categoria}" representa ${p1(share)} de todas as despesas do mês (${brl(topCategoria.total)}).`,
        caminho: `Negocie, renegocie ou cancele 20% dessa categoria = ${brl(topCategoria.total * 0.2)}/mês de economia imediata. Se for conta da casa, divida com o rateio.`,
        metrica: p1(share),
        rota: '/rateios',
      });
    }
  }

  // ===== TRANSAÇÕES =====
  const recorrente = d.recorrentes[0];
  if (recorrente) {
    const r = recorrente;
    insights.push({
      id: 'gastos-recorrentes',
      topico: 'transacoes',
      titulo: 'Gastos recorrentes detectados',
      severidade: 'atencao',
      analise: `"${r.descricao}" aparece ${r.n} vezes neste mês somando ${brl(r.total)}${d.recorrentes.length > 1 ? `, além de outros ${d.recorrentes.length - 1} itens repetidos` : ''}.`,
      caminho: `Liste esses lançamentos com o filtro de tipo, renegocie/cancele o que não for essencial e, se for conta compartilhada, transforme em rateio automático.`,
      metrica: brl(r.total),
      rota: '/rateios',
    });
  }

  if (d.maiorDespesa && d.despesas > 0) {
    const share = (d.maiorDespesa.valor / d.despesas) * 100;
    insights.push({
      id: 'maior-despesa',
      topico: 'transacoes',
      titulo: 'Avalie a maior despesa do mês',
      severidade: 'dica',
      analise: `"${d.maiorDespesa.descricao}" foi o maior gasto: ${brl(d.maiorDespesa.valor)} (${p1(share)} das despesas).`,
      caminho: 'Pergunte-se: foi essencial ou adiável? Se for fixa e grande, crie um orçamento dedicado para ela e divida com o grupo quando possível.',
      metrica: brl(d.maiorDespesa.valor),
      rota: '/orcamentos',
    });
  }

  if (d.lancamentos > 15) {
    insights.push({
      id: 'volume-lancamentos',
      topico: 'transacoes',
      titulo: 'Alto volume de lançamentos',
      severidade: 'dica',
      analise: `${d.lancamentos} transações registradas neste mês — difícil acompanhar tudo manualmente.`,
      caminho: 'Use a importação CSV/OFX para manter o extrato completo sem digitação e o filtro por mês/tipo para revisar em blocos semanais.',
      metrica: `${d.lancamentos} lançamentos`,
      rota: '/importar',
    });
  }

  // ===== ORÇAMENTOS =====
  const limites = d.orcamentos.filter((o) => o.status === 'estourou').slice(0, 2);
  for (const o of limites) {
    insights.push({
      id: `estouro-${o.categoria}`,
      topico: 'orcamentos',
      titulo: `Limite estourado: ${o.categoria}`,
      severidade: 'critico',
      analise: `Gasto de ${brl(o.gasto)} contra limite de ${brl(o.limite)} (${p1(o.percentual_consumido)}).`,
      caminho:
        dias > 0
          ? `Plano de recuperação: ${brl(Math.max(0, o.gasto - o.limite))} acima do limite. Zere o gasto nessa categoria por ${dias} dia(s) ou ajuste o limite para ${brl(o.gasto)} (média real).`
          : `O mês fechou ${brl(o.gasto - o.limite)} acima do limite. Defina o próximo limite a partir deste valor e corte o excesso já no mês atual.`,
      metrica: p1(o.percentual_consumido),
      rota: '/orcamentos',
    });
  }

  const alertas = d.orcamentos.filter((o) => o.status === 'alerta').slice(0, 2);
  for (const o of alertas) {
    const folga = o.limite - o.gasto;
    const porDia = dias > 0 ? folga / dias : 0;
    insights.push({
      id: `alerta-${o.categoria}`,
      topico: 'orcamentos',
      titulo: `Atenção: ${o.categoria} em ${p1(o.percentual_consumido)}`,
      severidade: 'atencao',
      analise: `Restam ${brl(folga)} do limite de ${brl(o.limite)} com ${dias} dia(s) do mês.`,
      caminho:
        dias > 0
          ? `Gaste no máximo ${brl(porDia)}/dia nessa categoria até o fim do mês para não estourar.`
          : `Considere revisar o limite com base no seu padrão de consumo.`,
      metrica: `${brl(porDia)}/dia`,
      rota: '/orcamentos',
    });
  }

  const semLimite = d.semOrcamento[0];
  if (semLimite) {
    const s = semLimite;
    insights.push({
      id: 'sem-limite',
      topico: 'orcamentos',
      titulo: `Sem limite: ${s.categoria}`,
      severidade: 'dica',
      analise: `"${s.categoria}" gastou ${brl(s.total)} neste mês sem nenhum orçamento definido — a IA não consegue avisar quando chegar perto do limite.`,
      caminho: `Crie um limite para essa categoria (sugestão: ${brl(Math.round(s.total * 1.1))}, 10% acima do consumo atual) para ativar os alertas automáticos.`,
      metrica: brl(s.total),
      rota: '/orcamentos',
    });
  }

  const todosOk = d.orcamentos.length > 0 && d.orcamentos.every((o) => o.status === 'ok');
  if (todosOk) {
    const folgaTotal = d.orcamentos.reduce((s, o) => s + (o.limite - o.gasto), 0);
    insights.push({
      id: 'folga',
      topico: 'orcamentos',
      titulo: 'Limites sob controle',
      severidade: 'ok',
      analise: `Todas as ${d.orcamentos.length} categorias estão dentro do limite, com ${brl(folgaTotal)} de folga somada.`,
      caminho: `Regra de ouro: ao fim do mês, leve 50% da folga (${brl(folgaTotal * 0.5)}) para uma Meta em vez de deixar o gasto "esquentar".`,
      metrica: brl(folgaTotal),
      rota: '/metas',
    });
  }

  // ===== METAS =====
  for (const m of d.metas.slice(0, 3)) {
    const restante = m.valor_alvo - m.valor_guardado;
    const progresso = m.valor_alvo > 0 ? (m.valor_guardado / m.valor_alvo) * 100 : 0;
    if (restante <= 0) continue;

    if (m.data_alvo) {
      const meses = mesesAte(m.data_alvo);
      if (meses === 0) {
        insights.push({
          id: `meta-vencida-${m.nome}`,
          topico: 'metas',
          titulo: `Prazo vencido: ${m.nome}`,
          severidade: 'critico',
          analise: `A data-alvo (${new Date(m.data_alvo).toLocaleDateString('pt-BR')}) já passou e faltam ${brl(restante)} (${p1(progresso)} concluído).`,
          caminho: 'Reabra o prazo com uma data realista ou divida o restante em parcelas mensais menores — o importante é não parar de contribuir.',
          metrica: p1(progresso),
          rota: '/metas',
        });
      } else {
        const porMes = restante / meses;
        insights.push({
          id: `meta-ritmo-${m.nome}`,
          topico: 'metas',
          titulo: `Ritmo para ${m.nome}`,
          severidade: progresso < 30 && meses > 6 ? 'atencao' : 'dica',
          analise: `${p1(progresso)} concluído (${brl(m.valor_guardado)} de ${brl(m.valor_alvo)}) com ${meses} mês(es) até ${new Date(m.data_alvo).toLocaleDateString('pt-BR')}.`,
          caminho: `Guarde ${brl(porMes)}/mês para bater o alvo. Com ${brl(saldo)} de saldo neste mês, já dá para começar com uma contribuição de ${brl(Math.min(saldo * 0.5, porMes))}.`,
          metrica: `${brl(porMes)}/mês`,
          rota: '/metas',
        });
      }
    } else {
      const porMes = restante / 12;
      insights.push({
        id: `meta-12-${m.nome}`,
        topico: 'metas',
        titulo: `Acelere ${m.nome}`,
        severidade: 'dica',
        analise: `${p1(progresso)} concluído e sem data-alvo definida — sem prazo, o objetivo costuma travar.`,
        caminho: `Coloque uma data e guarde ${brl(porMes)}/mês (plano de 12 meses). Defina o prazo na criação da meta para a IA acompanhar o ritmo.`,
        metrica: p1(progresso),
        rota: '/metas',
      });
    }
  }

  const metasAtivas = d.metas.length;
  const metaDestaque = d.metas[0];
  if (metasAtivas > 0 && saldo > 0 && metaDestaque) {
    const destaque = metaDestaque;
    insights.push({
      id: 'saldo-para-meta',
      topico: 'metas',
      titulo: 'Saldo sobrando? Invista na meta',
      severidade: 'dica',
      analise: `Há ${brl(saldo)} livres neste mês e ${metasAtivas} meta(s) ativas — o dinheiro parado perde para a inflação.`,
      caminho: `Destine 20% (${brl(saldo * 0.2)}) agora para "${destaque.nome}" e configure a mentalidade de contribuir todo mês, mesmo que pouco.`,
      metrica: brl(saldo * 0.2),
      rota: '/metas',
    });
  }

  // ===== RATEIOS =====
  const r = d.rateiosPendentes;
  if (r.pendente > 0) {
    insights.push({
      id: 'rateios-pendentes',
      topico: 'rateios',
      titulo: 'Contas pendentes de acerto',
      severidade: r.vencidos > 0 ? 'critico' : 'atencao',
      analise: `${brl(r.pendente)} ainda em aberto em ${r.qtd} conta(s)${r.vencidos > 0 ? `, sendo ${r.vencidos} com vencimento vencido` : ''}.`,
      caminho:
        'Registre os pagamentos pendentes e, para não brigar na divisão, use a regra proporcional_renda — cada um paga conforme sua renda, o acerto mais justo.',
      metrica: brl(r.pendente),
      rota: '/rateios',
    });
  } else if (d.totalRateios > 0) {
    insights.push({
      id: 'rateios-quitados',
      topico: 'rateios',
      titulo: 'Divisões em dia',
      severidade: 'ok',
      analise: `Todas as ${d.totalRateios} conta(s) divididas estão quitadas.`,
      caminho: 'Para manter a cadência, transforme contas fixas da casa (internet, mercado) em rateios mensais automáticos de regra 50/50 ou proporcional à renda.',
      metrica: '0 pendências',
      rota: '/rateios',
    });
  }

  // ===== RELATÓRIOS (indicadores + como melhorar cada um) =====
  if (d.receitas > 0) {
    const faltaParaMeta = Math.max(0, d.receitas * 0.2 - saldo);
    insights.push({
      id: 'ind-economia',
      topico: 'relatorios',
      titulo: 'Indicador: taxa de economia',
      severidade: taxaEconomia >= 20 ? 'ok' : taxaEconomia >= 10 ? 'atencao' : 'critico',
      analise: `Atual: ${p1(taxaEconomia)} — meta recomendada: 20% (${brl(d.receitas * 0.2)}).`,
      caminho:
        faltaParaMeta > 0
          ? `Para melhorar, corte ${brl(faltaParaMeta)} nas despesas deste mês (equivalente a reduzir a maior categoria em ~${p1((faltaParaMeta / (topCategoria?.total || 1)) * 100)}).`
          : 'Meta atingida! Agora proteja o indicador automatizando a poupança antes de gastar.',
      metrica: p1(taxaEconomia),
      rota: '/transacoes',
    });

    const conc = topCategoria && d.despesas > 0 ? (topCategoria.total / d.despesas) * 100 : 0;
    const corteConc = Math.max(0, topCategoria ? topCategoria.total - d.despesas * 0.35 : 0);
    insights.push({
      id: 'ind-concentracao',
      topico: 'relatorios',
      titulo: 'Indicador: concentração de gastos',
      severidade: conc > 50 ? 'critico' : conc > 35 ? 'atencao' : 'ok',
      analise: `Maior categoria ("${topCategoria?.categoria ?? '-'}") em ${p1(conc)} das despesas — meta saudável: até 35%.`,
      caminho:
        corteConc > 0
          ? `Melhoria: corte ${brl(corteConc)} dessa categoria para trazer o indicador a 35% — diversifique gastos e renegocie contratos fixos.`
          : 'Distribuição saudável de gastos. Mantenha diversificando as categorias.',
      metrica: p1(conc),
      rota: '/transacoes?tipo=despesa',
    });
  }

  const evolAtual = d.evolucao[0];
  const evolAnterior = d.evolucao[1];
  if (evolAtual && evolAnterior) {
    const atual = evolAtual;
    const anterior = evolAnterior;
    const varDesp = anterior.despesas > 0 ? ((atual.despesas - anterior.despesas) / anterior.despesas) * 100 : 0;
    insights.push({
      id: 'ind-tendencia',
      topico: 'relatorios',
      titulo: 'Indicador: tendência de despesas',
      severidade: varDesp > 10 ? 'atencao' : 'ok',
      analise: `Mês ${atual.mes}: ${brl(atual.despesas)} vs ${anterior.mes}: ${brl(anterior.despesas)} (${varDesp >= 0 ? '+' : ''}${p1(varDesp)}).`,
      caminho:
        varDesp > 10
          ? 'Para reverter a alta: audite o gráfico "Gastos por Categoria", ataque a categoria que mais subiu e reative os alertas de orçamento.'
          : 'Tendência estável — preserve os limites e revise os gráficos toda semana para antecipar surpresas.',
      metrica: `${varDesp >= 0 ? '+' : ''}${p1(varDesp)}`,
      rota: '/orcamentos',
    });
  }

  if (d.metas.length > 0) {
    const media =
      (d.metas.reduce((s, m) => s + (m.valor_alvo > 0 ? (m.valor_guardado / m.valor_alvo) * 100 : 0), 0) /
        d.metas.length);
    insights.push({
      id: 'ind-metas',
      topico: 'relatorios',
      titulo: 'Indicador: progresso das metas',
      severidade: media >= 70 ? 'ok' : media >= 30 ? 'atencao' : 'critico',
      analise: `Progresso médio de ${p1(media)} em ${d.metas.length} meta(s) ativas.`,
      caminho:
        media < 70
          ? `Para chegar a 70% em 6 meses, aumente a contribuição mensal: priorize a meta mais próxima do prazo e automatize a transferência logo após o salário.`
          : 'Bom andamento! Finalize a meta mais próxima para liberar aportes na seguinte.',
      metrica: p1(media),
      rota: '/metas',
    });
  }

  // ===== IMPORTAR =====
  if (d.importacoes.n === 0) {
    insights.push({
      id: 'nunca-importou',
      topico: 'importar',
      titulo: 'Nenhum extrato importado ainda',
      severidade: 'atencao',
      analise: 'Você ainda não importou nenhum CSV/OFX — todos os dados foram digitados à mão.',
      caminho: 'Importe o extrato do seu banco todo mês: menos erros de digitação, lançamentos automáticos e análise da IA sempre com dados frescos.',
      rota: '/importar',
    });
  } else if (d.lancamentos < 5) {
    insights.push({
      id: 'poucos-dados',
      topico: 'importar',
      titulo: 'Poucos dados para uma boa análise',
      severidade: 'dica',
      analise: `Apenas ${d.lancamentos} lançamento(s) neste mês — quanto mais dados, mais precisas as sugestões da IA.`,
      caminho: 'Baixe o extrato completo do banco (CSV ou OFX) e importe para enriquecer a base de análise e os gráficos de relatório.',
      rota: '/importar',
    });
  } else {
    insights.push({
      id: 'importacao-ok',
      topico: 'importar',
      titulo: 'Base de dados atualizada',
      severidade: 'ok',
      analise: `${d.lancamentos} lançamentos e ${d.importacoes.n} importação(ões) registradas${d.importacoes.ultimo ? ` (última: ${d.importacoes.ultimo.slice(0, 10)})` : ''}.`,
      caminho: 'Mantenha a rotina: importe o extrato no fim de cada mês para que os indicadores e sugestões da IA fiquem ainda mais precisos.',
      rota: '/importar',
    });
  }

  return ordenarPorPrioridade(insights);
}

// Ordena por severidade (crítico primeiro) e limita a 4 insights por tópico
function ordenarPorPrioridade(insights: Insight[]): Insight[] {
  const peso: Record<Severidade, number> = { critico: 0, atencao: 1, dica: 2, ok: 3 };
  const porTopico = new Map<Topico, Insight[]>();

  for (const i of insights) {
    const lista = porTopico.get(i.topico) ?? [];
    lista.push(i);
    porTopico.set(i.topico, lista);
  }

  const resultado: Insight[] = [];
  for (const lista of porTopico.values()) {
    lista.sort((a, b) => peso[a.severidade] - peso[b.severidade]);
    resultado.push(...lista.slice(0, 4));
  }
  return resultado;
}
