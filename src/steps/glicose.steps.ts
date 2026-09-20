import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { ApiWorld } from '../support/world';
import { novaGlicoseValida } from '../support/data-factory';
import { renderPayloadTemplate } from '../support/payload-loader';

Given('que não estou autenticado', async function (this: ApiWorld) {
  this.authToken = undefined;
});

Given('que eu tenho um registro de glicose previamente cadastrado', async function (this: ApiWorld) {
  const response = await this.apiContext.post('/glicose', {
    data: novaGlicoseValida(),
    headers: this.authHeader(),
  });
  expect(
    response.status(),
    `Falha ao preparar massa de dados (cadastro de glicose): ${await response.text()}`,
  ).toBe(201);
  const body = await response.json();
  // A API embrulha o registro criado em `{ mensagem, registro: {...} }` —
  // confirmado pela resposta real (ver notas no README sobre o schema).
  this.createdGlicoseId = body.registro?.id;
  expect(
    this.createdGlicoseId,
    `Resposta de cadastro não retornou um "registro.id": ${JSON.stringify(body)}`,
  ).toBeTruthy();
});

When(
  'envio uma requisição para cadastrar um registro de glicose válido',
  async function (this: ApiWorld) {
    const headers = this.authToken ? this.authHeader() : undefined;
    this.response = await this.apiContext.post('/glicose', {
      data: novaGlicoseValida(),
      headers,
    });
    await this.parseResponseBodyIfPossible();
  },
);

When(
  'envio uma requisição para cadastrar um registro de glicose com valor {string}, atividade {string}, data {string}, aplicouInsulinaRapida {string}, insulina rápida {string} e observação {string}',
  async function (
    this: ApiWorld,
    valor: string,
    atividade: string,
    dataMedicao: string,
    aplicouInsulinaRapidaTexto: string,
    insulinaRapidaTexto: string,
    observacao: string,
  ) {
    // Convertendo aqui pra tipo real (boolean/number) antes de montar o
    // payload — sem isso, o JSON gerado manda "true"/"4" como STRING
    // (entre aspas), e o backend trata qualquer string não-vazia como
    // truthy (inclusive a string "false"!), e nunca recebe o campo
    // insulinaRapidaUnidades com o nome certo.
    const aplicouInsulinaRapida = aplicouInsulinaRapidaTexto === 'true';
    const insulinaRapida = insulinaRapidaTexto === '' ? null : Number(insulinaRapidaTexto);

    // O corpo da requisição vem de um template JSON com placeholders
    // (payloads/glicose/cadastrar-glicose.template.json), preenchido com
    // os mesmos nomes de coluna usados na tabela "Exemplos" do .feature —
    // então quem for mexer no payload não precisa nem abrir este arquivo.
    const body = renderPayloadTemplate('glicose/cadastrar-glicose.template.json', {
      valor,
      atividade,
      data: dataMedicao,
      insulinaRapida,
      aplicouInsulinaRapida,
      observacao,
    });
    this.response = await this.apiContext.post('/glicose', {
      data: body,
      headers: this.authHeader(),
    });
    await this.parseResponseBodyIfPossible();
  },
);

When(
  'envio uma requisição para editar esse registro com valor {string}, atividade {string}, data {string}, aplicouInsulinaRapida {string}, insulina rápida {int} e observação {string}',
  async function (
    this: ApiWorld,
    valor: string,
    atividade: string,
    dataMedicao: string,
    aplicouInsulinaRapidaTexto: string,
    insulinaRapida: number,
    observacao: string,
  ) {
    const aplicouInsulinaRapida = aplicouInsulinaRapidaTexto === 'true';
    const body = renderPayloadTemplate('glicose/editar-glicose.template.json', {
      valor,
      atividade,
      data: dataMedicao,
      aplicouInsulinaRapida,
      insulinaRapida,
      observacao,
    });
    this.response = await this.apiContext.put(`/glicose/${this.createdGlicoseId}`, {
      data: body,
      headers: this.authHeader(),
    });
    await this.parseResponseBodyIfPossible();
  },
);

When('envio uma requisição para listar meus registros de glicose', async function (this: ApiWorld) {
  this.response = await this.apiContext.get('/glicose', {
    headers: this.authHeader(),
  });
  await this.parseResponseBodyIfPossible();
});

When('envio uma requisição para excluir esse registro', async function (this: ApiWorld) {
  this.response = await this.apiContext.delete(`/glicose/${this.createdGlicoseId}`, {
    headers: this.authHeader(),
  });
  await this.parseResponseBodyIfPossible();
});

When(
  'envio uma requisição para consultar as atividades disponíveis',
  async function (this: ApiWorld) {
    const headers = this.authToken ? this.authHeader() : undefined;
    this.response = await this.apiContext.get('/atividade', { headers });
    await this.parseResponseBodyIfPossible();
  },
);

/**
 * Extrai o array de registros da resposta de GET /glicose, tentando os
 * formatos de envelope mais prováveis. Ainda NÃO confirmamos com uma
 * resposta real qual desses a API usa — só temos evidência do envelope de
 * criação (`{ mensagem, registro }`). Se nenhum desses bater, o array
 * fica vazio e o teste falha com uma mensagem indicando o corpo recebido,
 * o que facilita ajustar aqui assim que soubermos o formato real.
 */
function extrairListaDeGlicose(responseBody: any): any[] {
  if (Array.isArray(responseBody)) return responseBody;
  return responseBody?.registros ?? responseBody?.items ?? responseBody?.data ?? [];
}

Then('a lista de glicose retornada deve conter o registro cadastrado', async function (this: ApiWorld) {
  const lista = extrairListaDeGlicose(this.responseBody);
  expect(
    lista.length > 0,
    `Não foi possível reconhecer a lista de glicose na resposta: ${JSON.stringify(this.responseBody)}`,
  ).toBe(true);
  const encontrado = lista.some((item) => item.id === this.createdGlicoseId);
  expect(encontrado, `Registro ${this.createdGlicoseId} não encontrado na listagem`).toBe(true);
});

Then(
  'a lista de glicose retornada não deve mais conter o registro excluído',
  async function (this: ApiWorld) {
    const listResponse = await this.apiContext.get('/glicose', { headers: this.authHeader() });
    const body = await listResponse.json();
    const lista = extrairListaDeGlicose(body);
    const encontrado = lista.some((item) => item.id === this.createdGlicoseId);
    expect(encontrado, `Registro ${this.createdGlicoseId} ainda aparece na listagem após exclusão`).toBe(
      false,
    );
  },
);
