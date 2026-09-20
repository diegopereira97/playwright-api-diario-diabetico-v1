import { APIRequestContext, request } from '@playwright/test';

export function getBaseURL(): string {
  return process.env.BASE_URL ?? 'http://localhost:3000';
}

/**
 * Cria um novo contexto de requisição do Playwright apontando para a
 * BASE_URL configurada. Cada cenário recebe seu próprio contexto
 * (ver hooks.ts) para evitar vazamento de headers/estado entre testes.
 */
export async function createApiContext(): Promise<APIRequestContext> {
  return request.newContext({
    baseURL: getBaseURL(),
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
    },
  });
}
