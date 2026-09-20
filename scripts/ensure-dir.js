const fs = require('fs');
const path = require('path');

const target = process.argv[2];

if (!target) {
  console.error('Uso: node ensure-dir.js <caminho-do-diretorio>');
  process.exit(1);
}

fs.mkdirSync(path.join(__dirname, '..', target), { recursive: true });
