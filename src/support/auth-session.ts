import { request } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { getBaseURL } from './api-client';
import { withRateLimitRetry } from './http-retry';

/**
 * Lê as credenciais do usuário de teste em CADA chamada (em vez de uma
 * constante fixa lida uma única vez no import). Isso evita um bug de
 * ordem de carregamento: se algo importar este módulo antes do `.env`
 * estar carregado em `process.env`, uma constante fixa "congelaria" os
 * valores padrão (que não existem na API de verdade) para o resto da
 * execução. Como função, sempre lê o valor atual de `process.env`.
 */
export function getTestUser() {
  return {
    email: process.env.TEST_USER_EMAIL ?? 'teste.qa@exemplo.com',
    senha: process.env.TEST_USER_PASSWORD ?? 'SenhaForte123',
  };
}

// Cache do token em DISCO (não só em memória): sobrevive entre execuções
// separadas de `npm test`/`npm run test:allure`, para não fazer login de
// novo toda vez que você roda a suíte durante o desenvolvimento — isso é
// o que estava batendo no rate limit de /auth/login.
const CACHE_FILE = path.join(__dirname, '..', '..', '.cache', 'auth-token.json');
// Renova um pouco antes da expiração real, para não arriscar usar um
// token que expira no meio de um cenário.
const EXPIRY_BUFFER_MS = 30_000;
// Se o token não for um JWT decodificável (não conseguimos ler a
// expiração real), assumimos uma validade curta e conservadora.
const FALLBACK_TTL_MS = 5 * 60_000;

interface CachedToken {
  token: string;
  expiresAt: number; // epoch ms
}

let cachedTokenPromise: Promise<string> | undefined;

function decodeJwtExpiryMs(token: string): number | undefined {
  const parts = token.split('.');
  if (parts.length !== 3) return undefined; // não parece um JWT — sem claim "exp" para ler
  try {
    const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
    const payload = JSON.parse(payloadJson);
    return typeof payload.exp === 'number' ? payload.exp * 1000 : undefined;
  } catch {
    return undefined;
  }
}

function readTokenFromDisk(): CachedToken | undefined {
  try {
    const raw = fs.readFileSync(CACHE_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (typeof parsed?.token === 'string' && typeof parsed?.expiresAt === 'number') {
      return parsed as CachedToken;
    }
    return undefined;
  } catch {
    return undefined; // arquivo não existe, corrompido, ou ilegível — trata como "sem cache"
  }
}

function writeTokenToDisk(entry: CachedToken): void {
  fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(entry, null, 2));
}

async function loginAndCache(): Promise<string> {
  const testUser = getTestUser();
  const context = await request.newContext({ baseURL: getBaseURL() });
  try {
    const response = await withRateLimitRetry(() =>
    context.post('/auth/login', {
      data: { email: testUser.email, senha: testUser.senha },
    }),
  {
    requestName: 'POST /auth/login',
  },
);
    if (response.status() !== 200) {
      throw new Error(
        'Falha ao autenticar o usuário de teste (login compartilhado). ' +
          `Status ${response.status()} — ${await response.text()}. ` +
          `E-mail usado: ${testUser.email}. ` +
          'Confira se TEST_USER_EMAIL/TEST_USER_PASSWORD estão corretos no .env, se o ' +
          'usuário existe no ambiente, e se você não está sob o rate limit da API ' +
          '(veja o log [rate-limit] acima, se houver).',
      );
    }
    const body = await response.json();
    const token = body.token ?? body.accessToken ?? body.access_token;
    if (!token) {
      throw new Error(
        `Resposta de login não retornou um token reconhecível: ${JSON.stringify(body)}`,
      );
    }
    const decodedExpiry = decodeJwtExpiryMs(token);
    const expiresAt = decodedExpiry ?? Date.now() + FALLBACK_TTL_MS;
    writeTokenToDisk({ token, expiresAt });
    return token as string;
  } finally {
    await context.dispose();
  }
}

/**
 * Retorna um token de autenticação válido, reaproveitando entre execuções
 * do processo (cache em `.cache/auth-token.json`) sempre que possível. Só
 * faz um novo login quando não há token em cache ou quando ele está perto
 * de expirar — assim, rodar a suíte várias vezes seguidas durante o
 * desenvolvimento não gera uma chamada de /auth/login por execução.
 *
 * Para forçar um novo login (ex.: token de cache com problema), apague
 * manualmente o arquivo de cache ou rode `npm run auth:clear-cache`.
 */
export function getSharedAuthToken(): Promise<string> {
  if (!cachedTokenPromise) {
    cachedTokenPromise = (async () => {
      const cached = readTokenFromDisk();
      const stillValid = cached !== undefined && cached.expiresAt - EXPIRY_BUFFER_MS > Date.now();
      if (stillValid) {
        return cached!.token;
      }
      return loginAndCache();
    })();
  }
  return cachedTokenPromise;
}
