// ============================================================
// Painel de Acessibilidade (modal)
// O usuário ativa o modo e sinaliza sua necessidade; as
// adaptações são aplicadas em tempo real na interface inteira.
// Acessível por teclado: ESC fecha, foco vai para o diálogo.
// ============================================================
import { useEffect, useRef } from 'react';
import {
  Accessibility,
  Brain,
  Check,
  EarOff,
  Eye,
  Mic,
  Palette,
  Type,
  X,
} from 'lucide-react';
import { TIPOS_A11Y, useA11y, type TipoA11y } from './A11yContext';

const ICONES: Record<TipoA11y, typeof Eye> = {
  visao: Eye,
  texto: Type,
  surdez: EarOff,
  daltonismo: Palette,
  autismo: Brain,
};

export function A11yPanel() {
  const {
    config,
    painelAberto,
    fecharPainel,
    alternarAtiva,
    alternarTipo,
    vozAtiva,
    alternarVoz,
    vozStatus,
    vozMensagem,
  } = useA11y();
  const dialogRef = useRef<HTMLDivElement>(null);

  // Ao abrir: foca o diálogo (teclado já cai dentro dele)
  useEffect(() => {
    if (painelAberto) dialogRef.current?.focus();
  }, [painelAberto]);

  // ESC fecha o modal
  useEffect(() => {
    if (!painelAberto) return;
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === 'Escape') fecharPainel();
    }
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [painelAberto, fecharPainel]);

  if (!painelAberto) return null;

  return (
    <div
      className="a11y-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) fecharPainel();
      }}
    >
      <div
        className="a11y-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="a11y-titulo"
        tabIndex={-1}
        ref={dialogRef}
      >
        <div className="a11y-dialog-head">
          <h2 id="a11y-titulo">
            <Accessibility size={20} />
            Acessibilidade
          </h2>
          <button
            className="icon-btn"
            aria-label="Fechar painel de acessibilidade"
            onClick={fecharPainel}
          >
            <X size={18} />
          </button>
        </div>

        <div className="a11y-dialog-body">
          {/* Chave mestra */}
          <button
            className={`a11y-master${config.ativa ? ' on' : ''}`}
            onClick={alternarAtiva}
            aria-pressed={config.ativa}
          >
            <span className="a11y-master-info">
              <strong>Ativar modo acessibilidade</strong>
              <span>
                O sistema se adapta à sua necessidade. Você pode escolher mais de uma
                opção abaixo.
              </span>
            </span>
            <span className="ai-switch">
              <span className="ai-knob" />
            </span>
          </button>

          {/* Tipos de acessibilidade (sinalizados pelo usuário) */}
          <div
            className={`a11y-tipos${config.ativa ? '' : ' desabilitado'}`}
            role="group"
            aria-label="Tipo de acessibilidade"
            aria-disabled={!config.ativa}
          >
            {TIPOS_A11Y.map(({ id, nome, oQueMuda }) => {
              const Icon = ICONES[id];
              const marcado = config.ativa && config.tipos.includes(id);
              return (
                <button
                  key={id}
                  className={`a11y-tipo${marcado ? ' marcado' : ''}`}
                  onClick={() => config.ativa && alternarTipo(id)}
                  aria-pressed={marcado}
                  disabled={!config.ativa}
                >
                  <span className="a11y-tipo-topo">
                    <span className="a11y-tipo-icone">
                      <Icon size={18} />
                    </span>
                    <strong>{nome}</strong>
                    {marcado && (
                      <span className="a11y-check">
                        <Check size={13} />
                      </span>
                    )}
                  </span>
                  <span className="a11y-tipo-desc">{oQueMuda}</span>
                </button>
              );
            })}
          </div>

          {config.ativa && config.tipos.length === 0 && (
            <p className="a11y-aviso">
              Selecione ao menos um tipo de necessidade para o sistema se adaptar.
            </p>
          )}

          {/* Assistente de voz: navegação e leitura por fala (Web Speech API local) */}
          <div className="a11y-voz" role="group" aria-label="Assistente de voz">
            <button
              className={`a11y-master a11y-voz-btn${vozAtiva ? ' on' : ''}`}
              onClick={alternarVoz}
              aria-pressed={vozAtiva}
            >
              <span className="a11y-tipo-icone a11y-voz-icone" aria-hidden="true">
                <Mic size={18} />
              </span>
              <span className="a11y-master-info">
                <strong>Assistente de voz</strong>
                <span>
                  Fale para navegar: “abrir dashboard”, “transações”, “metas”… ou diga
                  “ajuda” para ouvir os comandos e “ler sugestões” para a IA falar os
                  alertas da tela.
                </span>
              </span>
              <span className="ai-switch">
                <span className="ai-knob" />
              </span>
            </button>

            {/* Status da escuta anunciado para leitores de tela */}
            <p
              className={`a11y-voz-status${
                vozStatus === 'ouvindo'
                  ? ' ouvindo'
                  : vozStatus === 'erro' || vozStatus === 'nao-suportado'
                    ? ' erro'
                    : ''
              }`}
              role="status"
            >
              {vozAtiva
                ? vozMensagem || 'Pronto para ouvir.'
                : 'Desligado. Ative o botão acima para usar a voz.'}
            </p>
          </div>
        </div>

        <div className="a11y-dialog-foot">
          <button className="btn btn-primary" onClick={fecharPainel}>
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
}
