const process = require('process');

const baseUrl = process.env.BASE_URL;
const healthcheckUrl = process.env.HEALTHCHECK_URL || baseUrl;
const timeoutMs = Number(process.env.API_STARTUP_TIMEOUT_SECONDS || 120) * 1000;
const intervalMs = Number(process.env.API_STARTUP_INTERVAL_SECONDS || 5) * 1000;

if (!healthcheckUrl) {
  console.error('BASE_URL ou HEALTHCHECK_URL precisa estar configurada.');
  process.exit(1);
}

const deadline = Date.now() + timeoutMs;

async function waitForApi() {
  console.log(`[startup] Aguardando a API responder em ${healthcheckUrl}...`);

  while (Date.now() < deadline) {
    try {
      const response = await fetch(healthcheckUrl, {
        signal: AbortSignal.timeout(Math.min(intervalMs, 10000)),
      });

      if (response.status < 500) {
        console.log(`[startup] API online (HTTP ${response.status}).`);
        return;
      }

      console.log(`[startup] API respondeu HTTP ${response.status}; aguardando...`);
    } catch (error) {
      console.log(`[startup] API ainda indisponível; aguardando... (${error.message})`);
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  console.error(
    `[startup] A API não respondeu em até ${Math.round(timeoutMs / 1000)}s: ${healthcheckUrl}`,
  );
  process.exit(1);
}

waitForApi();