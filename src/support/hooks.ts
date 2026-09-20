import { Before, After, setDefaultTimeout } from '@cucumber/cucumber';
import { createApiContext } from './api-client';
import { ApiWorld } from './world';

// O .env agora é carregado em cucumber.js (antes de qualquer arquivo de
// support/steps ser importado) — ver o comentário lá para o motivo.

// O timeout padrão do Cucumber por step é de 5s — curto demais para os
// steps que usam withRateLimitRetry() (login, registro, esqueci-senha):
// em caso de 429, esse helper já espera de propósito, com backoff
// (3s, 6s, 12s...) até 3 tentativas, o que sozinho já passa de 5s.
// 30s dá margem confortável acima do pior caso (~21s de espera do
// retry + o tempo das próprias requisições), sem deixar um step
// realmente travado rodar por tempo indefinido.
setDefaultTimeout(30 * 1000);

Before(async function (this: ApiWorld) {
  // Contexto de requisição isolado por cenário: evita que headers
  // (ex.: Authorization) ou cookies vazem entre testes.
  this.apiContext = await createApiContext();
});

After(async function (this: ApiWorld) {
  await this.apiContext?.dispose();
});
