const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const projectRoot = path.join(__dirname, '..');

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: true, // necessário no Windows para resolver .cmd (npx, allure, etc.)
    cwd: projectRoot,
  });
  return result.status ?? 1;
}

// 1) Limpa os resultados da execução anterior.
fs.rmSync(path.join(projectRoot, 'allure-results'), { recursive: true, force: true });

// 2) Roda os testes. Guardamos o código de saída, mas NÃO interrompemos o
//    pipeline aqui — ao contrário de um `&&` no package.json, queremos
//    gerar e abrir o relatório mesmo quando cenários falham (é o caso mais
//    útil de se olhar um relatório).
const testExitCode = run('npx', ['cucumber-js', '--profile', 'allure']);

if (testExitCode === 0) {
  console.log('\n✅ Todos os cenários passaram.\n');
} else {
  console.log(
    `\n⚠️  Um ou mais cenários falharam (código de saída ${testExitCode}). ` +
      'Gerando o relatório Allure mesmo assim para você investigar...\n',
  );
}

// 3) Copia o histórico da execução anterior para preservar o gráfico de
//    tendência (ver comentários em prepare-allure-history.js).
require('./prepare-allure-history');

// 4) Gera o site estático do Allure a partir dos resultados brutos.
const generateExitCode = run('npx', [
  'allure',
  'generate',
  'allure-results',
  '--clean',
  '-o',
  'allure-report',
]);

if (generateExitCode !== 0) {
  console.error(
    '\n❌ Falha ao gerar o relatório Allure. Verifique se o Java está instalado ' +
      '(rode `java -version` no terminal) — o Allure CLI depende dele.\n',
  );
  process.exit(generateExitCode);
}

// 5) Abre o relatório no navegador. Isso sobe um servidor local e só
//    retorna quando você fecha com Ctrl+C — não é um travamento.
run('npx', ['allure', 'open', 'allure-report']);

// Propaga o resultado real dos testes (útil se este script for chamado
// por outra automação que precise saber se a suíte passou ou não).
process.exit(testExitCode);
