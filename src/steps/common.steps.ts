import { Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { ApiWorld } from '../support/world';

/**
 * Resolve um caminho com pontos (ex.: "registro.valor") dentro de um
 * objeto, do mesmo jeito que o `toHaveProperty` do Playwright/Jest já faz
 * internamente — mas aqui precisamos do VALOR em si, não só checar se
 * existe, então não dá pra usar bracket notation direto
 * (`obj["registro.valor"]` procuraria uma chave literal com ponto, que
 * não existe).
 */
function getByPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((atual, chave) => {
    if (atual === null || atual === undefined) return undefined;
    return (atual as Record<string, unknown>)[chave];
  }, obj);
}

Then('a resposta deve ter o status {int}', async function (this: ApiWorld, statusEsperado: number) {
  expect(
    this.response.status(),
    `Status inesperado. Corpo da resposta: ${JSON.stringify(this.responseBody)}`,
  ).toBe(statusEsperado);
});

Then(
  'a resposta deve ter o status {int} ou {int}',
  async function (this: ApiWorld, statusA: number, statusB: number) {
    expect(
      [statusA, statusB],
      `Status ${this.response.status()} não está entre os esperados (${statusA} ou ${statusB})`,
    ).toContain(this.response.status());
  },
);

Then('a resposta deve conter o campo {string}', async function (this: ApiWorld, campo: string) {
  expect(
    this.responseBody,
    'Corpo da resposta está vazio/indefinido — não é possível checar o campo',
  ).toBeTruthy();
  expect(this.responseBody).toHaveProperty(campo);
});

Then(
  'a resposta deve conter o campo {string} com o valor {string}',
  async function (this: ApiWorld, campo: string, valorEsperado: string) {
    expect(this.responseBody).toHaveProperty(campo);
    // Compara como string para não depender do tipo original (number, boolean, etc.)
    // Suporta campo aninhado (ex.: "registro.valor").
    expect(String(getByPath(this.responseBody, campo))).toBe(valorEsperado);
  },
);

Then('a resposta deve conter a mensagem de erro apropriada {string}', async function (this: ApiWorld, mensagemEsperada: string) {
  expect(this.responseBody).toHaveProperty('erro');
  expect(String(getByPath(this.responseBody, 'erro'))).toBe(mensagemEsperada);
});