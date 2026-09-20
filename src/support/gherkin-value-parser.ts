/**
 * Converte o texto que vem de uma célula da tabela `Exemplos` (sempre
 * texto, mesmo pra números/booleans) para o tipo certo antes de montar o
 * corpo da requisição — necessário porque `renderPayloadTemplate` só
 * preserva o tipo se você já passar o tipo certo pra ele.
 *
 * Regras (nessa ordem):
 * - célula vazia (`""`) → `undefined` (o campo é OMITIDO do corpo, útil
 *   pra testar validação de "campo obrigatório");
 * - texto literal `"null"` (sem diferenciar maiúscula/minúscula) →
 *   `null` de verdade (útil pra testar validação de "valor inválido",
 *   diferente de "campo ausente");
 * - `"true"` / `"false"` → boolean de verdade;
 * - texto que representa um número válido → number de verdade;
 * - qualquer outro texto → mantido como string.
 */
export function parseValorDeExemplo(texto: string): unknown {
  if (texto === '') return undefined;

  const normalizado = texto.trim();
  if (normalizado.toLowerCase() === 'null') return null;
  if (normalizado === 'true') return true;
  if (normalizado === 'false') return false;

  if (normalizado !== '' && !Number.isNaN(Number(normalizado))) {
    return Number(normalizado);
  }

  return texto;
}
