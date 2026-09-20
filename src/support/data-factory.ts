import { renderPayloadTemplate } from './payload-loader';

interface GlicosePayload {
  valor: number;
  atividade: string;
  data: string;
  insulinaRapida: number;
  observacao: string;
}

/**
 * Gera um e-mail único por execução, evitando falhas por "usuário já
 * cadastrado" em execuções repetidas. Usado no cenário de registro (que
 * roda o Esquema do Cenário) e em qualquer outro que precise de um e-mail
 * descartável.
 */
export function gerarEmailUnico(): string {
  const timestamp = Date.now();
  return `qa.playwright+${timestamp}@exemplo.com`;
}

/**
 * Payload de glicose com valores padrão — usado apenas onde o dado em si
 * não é relevante para o teste (massa de dados para editar/listar/
 * excluir, e o teste negativo de cadastro sem autenticação).
 *
 * Repare que usa o MESMO template que o Esquema do Cenário de cadastro
 * (payloads/glicose/cadastrar-glicose.template.json) — não existe um
 * segundo JSON fixo duplicando a estrutura. Os valores padrão abaixo só
 * fazem sentido aqui porque esses dois cenários não se importam com QUAIS
 * valores são usados, só que a requisição seja válida.
 */
export function novaGlicoseValida(): GlicosePayload {
  return renderPayloadTemplate<GlicosePayload>('glicose/cadastrar-glicose.template.json', {
    valor: 120,
    atividade: 'Jejum',
    data: '2026-09-12',
    insulinaRapida: 4,
    // Backend limita "observacao" a 20 caracteres — mantenha curto se for editar.
    observacao: 'Massa de teste',
  });
}
