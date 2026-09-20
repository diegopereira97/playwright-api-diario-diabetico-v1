import { APIResponse } from '@playwright/test';

interface RetryOptions {
  retries?: number;
  baseDelayMs?: number;
  /**
   * Teto para o tempo de espera entre tentativas. Se a API pedir mais que
   * isso via header Retry-After, NÃO ficamos travados esperando — melhor
   * falhar rápido e avisar o tempo real, do que travar o terminal em uma
   * suíte de testes local por vários minutos em silêncio.
   */
  maxDelayMs?: number;
}

/**
 * Reexecuta uma requisição quando o servidor responde 429 (rate limit),
 * respeitando o header Retry-After quando presente (com fallback para
 * backoff exponencial). Necessário porque os endpoints de autenticação
 * (/auth/*) desta API têm um limitador de tentativas que a suíte pode
 * atingir ao rodar vários cenários em sequência rápida.
 *
 * Cada tentativa (e a espera aplicada) é logada no console — se parecer
 * que "travou", é porque está aguardando o tempo pedido pela própria API.
 */
export async function withRateLimitRetry(
  doRequest: () => Promise<APIResponse>,
  options: RetryOptions = {},
): Promise<APIResponse> {
  const retries = options.retries ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 3000;
  const maxDelayMs = options.maxDelayMs ?? 15000;

  let response = await doRequest();
  let attempt = 0;

  while (response.status() === 429 && attempt < retries) {
    const retryAfterHeader = response.headers()['retry-after'];
    const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : undefined;
    const requestedDelayMs =
      retryAfterSeconds && !Number.isNaN(retryAfterSeconds)
        ? retryAfterSeconds * 1000
        : baseDelayMs * 2 ** attempt;

    if (requestedDelayMs > maxDelayMs) {
      // A API pediu uma espera longa demais para um retry automático de
      // teste (ex.: Retry-After de vários minutos). Em vez de travar o
      // terminal em silêncio, desistimos aqui e devolvemos a resposta 429
      // como está — o step vai falhar com uma mensagem clara em vez de um
      // "hang" sem explicação.
      console.warn(
        `[rate-limit] API pediu ${Math.round(requestedDelayMs / 1000)}s de espera ` +
          `(acima do limite de ${Math.round(maxDelayMs / 1000)}s para retry automático). ` +
          'Desistindo do retry — espere manualmente antes de rodar os testes de novo.',
      );
      return response;
    }

    console.warn(
      `[rate-limit] Resposta 429 recebida. Aguardando ${Math.round(requestedDelayMs / 1000)}s ` +
        `antes da tentativa ${attempt + 1}/${retries}...`,
    );
    await new Promise((resolve) => setTimeout(resolve, requestedDelayMs));
    response = await doRequest();
    attempt += 1;
  }

  return response;
}
