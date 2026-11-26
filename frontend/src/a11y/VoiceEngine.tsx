// ============================================================
// Motor do ASSISTENTE DE VOZ (Web Speech API — 100% local)
// - Reconhecimento de voz em pt-BR converte fala em comandos
// - speechSynthesis dá retorno falado (sem custo, sem API externa)
// Montado no Layout (dentro do Router) para poder navegar com
// useNavigate. Nada roda enquanto o botão estiver desligado.
// ============================================================
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useA11y, type VozStatus } from './A11yContext';

// Comandos de navegação: chave normalizada (sem acento/maiúscula) → rota
const COMANDOS: Array<{ chaves: string[]; rota: string; nome: string }> = [
  { chaves: ['dashboard', 'painel', 'inicio', 'home'], rota: '/dashboard', nome: 'Dashboard' },
  { chaves: ['transacao', 'transacoes', 'movimentacao', 'extrato'], rota: '/transacoes', nome: 'Transações' },
  { chaves: ['orcamento', 'orcamentos', 'gasto', 'gastos'], rota: '/orcamentos', nome: 'Orçamento' },
  { chaves: ['meta', 'metas', 'objetivo', 'objetivos'], rota: '/metas', nome: 'Metas' },
  { chaves: ['rateio', 'rateios', 'divisao', 'divisoes', 'ratear'], rota: '/rateios', nome: 'Rateios' },
  { chaves: ['importar', 'importacao', 'ofx', 'csv'], rota: '/importar', nome: 'Importar' },
  { chaves: ['relatorio', 'relatorios', 'grafico', 'graficos', 'resumo'], rota: '/relatorios', nome: 'Relatórios' },
];

// Remove acento, maiúscula e espaços extras para comparar falas
function normalizar(fala: string) {
  return fala
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim();
}

/** Fala um texto em pt-BR (para comandos e erros). */
function falar(texto: string) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utts = new SpeechSynthesisUtterance(texto);
  utts.lang = 'pt-BR';
  utts.rate = 1.05;
  window.speechSynthesis.speak(utts);
}

export function VoiceEngine() {
  const { vozAtiva, setVozStatus } = useA11y();
  const navigate = useNavigate();
  // Evita recriar o recognizer a cada navegação
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const setRef = useRef(setVozStatus);
  setRef.current = setVozStatus;

  useEffect(() => {
    if (!vozAtiva) {
      setRef.current('desligado', 'Assistente de voz desligado.');
      return;
    }

    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    // Navegador sem suporte (ex.: Firefox/Safari antigo): avisa e desliga
    if (!SR || !('speechSynthesis' in window)) {
      setRef.current(
        'nao-suportado',
        'Seu navegador não suporta reconhecimento de voz. Use Chrome, Edge ou Opera.',
      );
      return;
    }

    const rec = new SR();
    rec.lang = 'pt-BR';
    rec.continuous = true; // fica ouvindo sem reiniciar a cada frase
    rec.interimResults = false;
    let ligado = true; // evita reiniciar após o stop() do cleanup

    const iniciar = () => {
      if (!ligado) return;
      try {
        rec.start();
      } catch {
        // Já estava iniciado — ignorar
      }
    };

    rec.onstart = () => {
      setRef.current('ouvindo', 'Ouvindo… diga “ajuda” para ver os comandos.');
    };

    rec.onerror = (e: any) => {
      const erro = e?.error;
      if (erro === 'not-allowed' || erro === 'service-not-allowed') {
        ligado = false;
        setRef.current(
          'erro',
          'Permissão de microfone negada. Libere o microfone no navegador e ative novamente.',
        );
      } else if (erro === 'no-speech') {
        // Silêncio normal: o onend abaixo reinicia a escuta
      } else if (erro !== 'aborted') {
        setRef.current('erro', `Falha no reconhecimento de voz (${erro}).`);
      }
    };

    // O navegador encerra a escuta após silêncio: reinicia enquanto estiver ligado
    rec.onend = () => {
      if (ligado) setTimeout(iniciar, 250);
    };

    rec.onresult = (event: any) => {
      const ultimo = event.results[event.results.length - 1];
      if (!ultimo?.isFinal) return;
      const fala = normalizar(String(ultimo[0]?.transcript ?? ''));
      if (!fala) return;

      // 1) Comandos de controle da própria voz
      if (/(para|parar|silencio|calar|desliga)/.test(fala)) {
        falar('Assistente desligado.');
        setRef.current('desligado', 'Você pediu para parar. Ative o botão para voltar.');
        ligado = false;
        try {
          rec.stop();
        } catch {
          /* já parado */
        }
        return;
      }
      if (/(ajuda|comandos|o que eu posso)/.test(fala)) {
        falar(
          'Você pode dizer: abrir dashboard, transações, orçamento, metas, rateios, importar, relatórios, ler sugestões, ou parar.',
        );
        return;
      }
      if (/(ler sugest|ouvir sugest|sugestoes da ia)/.test(fala)) {
        const itens = [...document.querySelectorAll('.insight-text')]
          .slice(0, 3)
          .map((el) => el.textContent?.trim())
          .filter(Boolean);
        falar(
          itens.length
            ? `As sugestões desta tela são: ${itens.join('. Próxima: ')}`
            : 'Nenhuma sugestão de IA nesta tela.',
        );
        return;
      }

      // 2) Navegação por voz
      const cmd = COMANDOS.find((c) => c.chaves.some((k) => fala.includes(k)));
      if (cmd) {
        navigateRef.current(cmd.rota);
        falar(`Abrindo ${cmd.nome}.`);
        return;
      }

      // 3) Nada reconhecido: devolve ajuda falada
      falar('Não entendi. Diga ajuda para ouvir os comandos.');
    };

    setRef.current('iniciando', 'Pedindo acesso ao microfone…');
    iniciar();

    return () => {
      ligado = false;
      try {
        rec.onend = null;
        rec.onerror = null;
        rec.onresult = null;
        rec.stop();
      } catch {
        /* já parado */
      }
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, [vozAtiva]);

  // Componente sem UI: só roda o motor
  return null;
}
