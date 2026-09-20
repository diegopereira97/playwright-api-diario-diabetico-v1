const fs = require('fs');
const path = require('path');

// O Allure só desenha o gráfico de tendência/histórico entre execuções se
// encontrar uma pasta "history/" dentro de allure-results/ na hora de gerar
// o relatório. Essa pasta é produzida DENTRO do relatório HTML anterior
// (allure-report/history), então copiamos ela de volta antes de cada
// `allure generate`.
const previousHistory = path.join(__dirname, '..', 'allure-report', 'history');
const targetHistory = path.join(__dirname, '..', 'allure-results', 'history');

if (fs.existsSync(previousHistory)) {
  fs.cpSync(previousHistory, targetHistory, { recursive: true });
  console.log('[allure] Histórico da execução anterior copiado — tendência preservada.');
} else {
  console.log('[allure] Nenhum histórico anterior encontrado (normal na primeira execução).');
}
