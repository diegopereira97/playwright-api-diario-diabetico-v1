import { setWorldConstructor, World, IWorldOptions } from '@cucumber/cucumber';
import { APIRequestContext, APIResponse } from '@playwright/test';

export class ApiWorld extends World {
  apiContext!: APIRequestContext;
  response!: APIResponse;
  responseBody: any;

  // Estado compartilhado entre steps dentro de um mesmo cenário
  authToken?: string;
  registeredUser?: { email: string; senha: string };
  createdGlicoseId?: string;

  constructor(options: IWorldOptions) {
    super(options);
  }

  async parseResponseBodyIfPossible(): Promise<void> {
    try {
      this.responseBody = await this.response.json();
    } catch {
      // Corpo vazio ou não-JSON (ex.: 204 No Content) — não é um erro do teste
      this.responseBody = undefined;
    }
  }

  authHeader(): Record<string, string> {
    if (!this.authToken) {
      throw new Error(
        'Nenhum token de autenticação disponível no World. ' +
          'Garanta que um step de login/autenticação rodou antes deste.',
      );
    }
    return { Authorization: `Bearer ${this.authToken}` };
  }
}

setWorldConstructor(ApiWorld);
