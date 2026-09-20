import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { ApiWorld } from '../support/world';
import { gerarEmailUnico } from '../support/data-factory';
import { renderPayloadTemplate } from '../support/payload-loader';
import { getSharedAuthToken, getTestUser } from '../support/auth-session';
import { withRateLimitRetry } from '../support/http-retry';

Given('que existe um usuário de teste cadastrado', async function (this: ApiWorld) {
  // Assume que o usuário de teste já foi previamente criado no ambiente
  // (via seed do banco ou execução anterior do cenário de registro).
  // Registrar aqui de novo geraria 409/erro de duplicidade em execuções repetidas.
  this.registeredUser = getTestUser();
});

Given('que estou autenticado como o usuário de teste', async function (this: ApiWorld) {
  // Reaproveita um token obtido uma única vez por execução da suíte
  // (ver support/auth-session.ts) em vez de logar de novo a cada cenário,
  // evitando o rate limit de /auth/login.
  this.authToken = await getSharedAuthToken();
});

When(
  'envio uma requisição de registro com nome {string}, data de nascimento {string}, senha {string} e aceite de termos {string}',
  async function (
    this: ApiWorld,
    nomeCompleto: string,
    dataNascimento: string,
    senha: string,
    aceiteTermosTexto: string,
  ) {
    const email = gerarEmailUnico();
    this.registeredUser = { email, senha };
    const aceiteTermos = aceiteTermosTexto === 'true';
    const body = renderPayloadTemplate('cadastro/registrar-usuario.template.json', {
      email,
      senha,
      nomeCompleto,
      dataNascimento,
      aceiteTermos,
    });
    this.response = await withRateLimitRetry(() =>
      this.apiContext.post('/auth/register', { data: body }),
    );
    await this.parseResponseBodyIfPossible();
  },
);

When(
  'envio uma requisição de login com email e senha válidos',
  async function (this: ApiWorld) {
    const usuario = this.registeredUser ?? getTestUser();
    this.response = await withRateLimitRetry(() =>
      this.apiContext.post('/auth/login', {
        data: { email: usuario.email, senha: usuario.senha },
      }),
    );
    await this.parseResponseBodyIfPossible();
  },
);

When(
  'envio uma requisição de login com email {string} e senha {string}',
  async function (this: ApiWorld, email: string, senha: string) {
    this.response = await withRateLimitRetry(() =>
      this.apiContext.post('/auth/login', { data: { email, senha } }),
    );
    await this.parseResponseBodyIfPossible();
  },
);

When(
  'envio uma requisição de "esqueci minha senha" para o e-mail do usuário de teste',
  async function (this: ApiWorld) {
    this.response = await withRateLimitRetry(() =>
      this.apiContext.post('/auth/esqueci-senha', { data: { email: getTestUser().email } }),
    );
    await this.parseResponseBodyIfPossible();
  },
);

When('consulto meus dados de usuário autenticado', async function (this: ApiWorld) {
  this.response = await this.apiContext.get('/auth/me', {
    headers: this.authHeader(),
  });
  await this.parseResponseBodyIfPossible();
});

When(
  'consulto meus dados de usuário sem informar o token de autenticação',
  async function (this: ApiWorld) {
    this.response = await this.apiContext.get('/auth/me');
    await this.parseResponseBodyIfPossible();
  },
);

Then('a resposta deve conter um token de acesso', async function (this: ApiWorld) {
  const token =
    this.responseBody?.token ?? this.responseBody?.accessToken ?? this.responseBody?.access_token;
  expect(token, `Corpo da resposta não contém token: ${JSON.stringify(this.responseBody)}`).toBeTruthy();
});
