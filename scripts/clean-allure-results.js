const fs = require('fs');
const path = require('path');

// Remove os resultados brutos da execução anterior. Importante: isso NÃO
// apaga allure-report/ (o site já gerado), pois é de lá que tiramos o
// histórico para preservar o gráfico de tendência entre execuções
// (ver scripts/prepare-allure-history.js).
const resultsDir = path.join(__dirname, '..', 'allure-results');
fs.rmSync(resultsDir, { recursive: true, force: true });
