import { APIResponse } from '@playwright/test';

interface RetryOptions {
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;

  /**
   * Identificação da requisição para facilitar o diagnóstico
   * nos testes locais e no GitHub Actions.
   */
  requestName?: string;
}

/**
 * Reexecuta uma requisição quando o servidor responde 429 (rate limit),
 * respeitando o header Retry-After quando presente.
 *
 * O retry é utilizado para evitar falhas imediatas em situações
 * transitórias de rate limit.
 */
export async function withRateLimitRetry(
  doRequest: () => Promise<APIResponse>,
  options: RetryOptions = {},
): Promise<APIResponse> {
  const retries = options.retries ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 3000;
  const maxDelayMs = options.maxDelayMs ?? 15000;
  const requestName = options.requestName ?? 'requisição';

  let response = await doRequest();
  let attempt = 0;

  while (response.status() === 429 && attempt < retries) {
    const retryAfterHeader = response.headers()['retry-after'];

    const retryAfterSeconds = retryAfterHeader
      ? Number(retryAfterHeader)
      : undefined;

    const requestedDelayMs =
      retryAfterSeconds !== undefined && !Number.isNaN(retryAfterSeconds)
        ? retryAfterSeconds * 1000
        : baseDelayMs * 2 ** attempt;

    console.warn(
      `[rate-limit] ${requestName} retornou HTTP 429. ` +
        `Retry-After: ${retryAfterHeader ?? 'não informado'} | ` +
        `espera calculada: ${Math.round(requestedDelayMs / 1000)}s`,
    );

    if (requestedDelayMs > maxDelayMs) {
      console.warn(
        `[rate-limit] ${requestName} pediu ${Math.round(requestedDelayMs / 1000)}s ` +
          `(acima do limite de ${Math.round(maxDelayMs / 1000)}s para retry automático). ` +
          'Desistindo do retry.',
      );

      return response;
    }

    console.warn(
      `[rate-limit] Aguardando ${Math.round(requestedDelayMs / 1000)}s ` +
        `antes da tentativa ${attempt + 1}/${retries} de ${requestName}...`,
    );

    await new Promise((resolve) =>
      setTimeout(resolve, requestedDelayMs),
    );

    response = await doRequest();
    attempt += 1;
  }

  if (response.status() === 429) {
    console.error(
      `[rate-limit] ${requestName} continuou retornando HTTP 429 ` +
        `após ${retries} tentativa(s) de retry.`,
    );
  }

  return response;
}