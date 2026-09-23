// Carrega o .env AQUI, antes de qualquer coisa — inclusive antes dos
// arquivos listados em `require` abaixo serem importados pelo Cucumber.
// BUG CORRIGIDO: antes, o dotenv.config() rodava dentro de um hook
// BeforeAll (src/support/hooks.ts). Mas o Cucumber importa TODOS os
// arquivos de support/steps antes de rodar qualquer hook — e alguns deles
// (ex.: auth-session.ts) leem process.env.TEST_USER_EMAIL/PASSWORD em uma
// constante de nível de módulo, no momento em que são importados. Ou seja,
// esses valores eram lidos ANTES do .env existir em process.env, e o
// código caía silenciosamente nos valores padrão embutidos (que não
// existem na API de verdade) — causando 401 mesmo com o .env correto.
require('dotenv').config();

const common = {
  requireModule: ['ts-node/register'],
  require: ['src/support/**/*.ts', 'src/steps/**/*.ts'],
  paths: ['features/**/*.feature'],
  // 'progress' (não 'progress-bar'): imprime texto puro, linha a linha.
  // O 'progress-bar' usa códigos de controle de cursor para desenhar uma
  // barra ao vivo, o que não renderiza de forma confiável em alguns
  // terminais Windows (ex.: Git Bash/MINGW64) e pode esconder o resumo
  // final de falhas.
  format: ['progress'],
};

module.exports = {
  default: common,
  // Perfil usado no CI: uma única execução gera o relatório JSON (legado)
  // E os dados brutos do Allure ao mesmo tempo — rodar cucumber-js duas
  // vezes dobraria as chamadas de login em /auth/*, arriscando o rate limit.
  ci: {
    ...common,
    format: [...common.format, 'json:reports/cucumber-report.json', 'allure-cucumberjs/reporter'],
    formatOptions: {
      resultsDir: 'allure-results',
    },
  },
  // Perfil para gerar o relatório Allure localmente
  // (rode via `npm run test:allure`, depois `npm run allure:generate` e
  // `npm run allure:open` — ou tudo de uma vez com `npm run test:allure:report`)
  allure: {
    ...common,
    format: [...common.format, 'allure-cucumberjs/reporter'],
    formatOptions: {
      resultsDir: 'allure-results',
    },
  },
};
