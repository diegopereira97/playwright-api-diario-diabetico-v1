const fs = require('fs');
const path = require('path');

const cacheFile = path.join(__dirname, '..', '.cache', 'auth-token.json');

if (fs.existsSync(cacheFile)) {
  fs.rmSync(cacheFile);
  console.log('Cache do token de autenticação removido. O próximo teste fará um novo login.');
} else {
  console.log('Nenhum cache de token encontrado (nada a fazer).');
}
