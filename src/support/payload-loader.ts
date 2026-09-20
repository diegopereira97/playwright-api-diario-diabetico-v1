import * as fs from 'fs';
import * as path from 'path';

// Raiz da pasta payloads/, na raiz do projeto (fora de src/), para deixar
// os corpos de requisição isolados do código de steps/fábricas e mais
// fáceis de manter por quem não mexe em TypeScript no dia a dia.
const PAYLOADS_ROOT = path.join(__dirname, '..', '..', 'payloads');

/**
 * Carrega um payload JSON "template", com placeholders `"{{nomeDaVariavel}}"`,
 * e substitui cada um pelo valor correspondente em `variables` — mantendo
 * o tipo certo (número, string, boolean) automaticamente.
 *
 * Os nomes dos placeholders devem ser os MESMOS nomes de coluna usados na
 * tabela `Exemplos` do Esquema do Cenário no `.feature`, para ficar óbvio,
 * só de olhar o JSON, de onde cada valor vem. Existe UM template por
 * formato de requisição — tanto os cenários que variam os dados via
 * `Exemplos` quanto os que usam valores padrão fixos (definidos no
 * código, não em outro JSON) chamam essa mesma função, sobre o mesmo
 * arquivo. Isso evita ter dois JSONs descrevendo a mesma estrutura.
 *
 * Exemplo de template (`payloads/glicose/cadastrar-glicose.template.json`):
 * ```json
 * {
 *   "valor": "{{valor}}",
 *   "atividade": "{{atividade}}"
 * }
 * ```
 * Chamando `renderPayloadTemplate('glicose/cadastrar-glicose.template.json',
 * { valor: 120, atividade: 'Jejum' })` produz `{ valor: 120, atividade: 'Jejum' }`
 * — repare que `valor` vira número de verdade, não a string `"120"`.
 *
 * @param relativePath caminho relativo dentro de payloads/
 * @param variables valores a substituir, nas chaves iguais aos placeholders
 */
export function renderPayloadTemplate<T = Record<string, unknown>>(
  relativePath: string,
  variables: Record<string, unknown>,
): T {
  const fullPath = path.join(PAYLOADS_ROOT, relativePath);
  let raw: string;
  try {
    raw = fs.readFileSync(fullPath, 'utf8');
  } catch (error) {
    throw new Error(
      `Não foi possível ler o template de payload "${relativePath}" em ${fullPath}. ` +
        'Confira se o arquivo existe e o nome está correto.',
    );
  }

  let rendered = raw;
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `"{{${key}}}"`;
    if (!rendered.includes(placeholder)) {
      throw new Error(
        `O template "${relativePath}" não tem o placeholder ${placeholder}. ` +
          'Confira se o nome da variável no step bate com o nome usado no JSON.',
      );
    }
    // JSON.stringify decide a formatação certa sozinho: número vira
    // "120" (sem aspas no resultado final), string vira "\"Jejum\""
    // (com aspas), boolean vira "true"/"false" — o placeholder some e o
    // tipo do valor é preservado no JSON gerado.
    rendered = rendered.split(placeholder).join(JSON.stringify(value));
  }

  try {
    return JSON.parse(rendered) as T;
  } catch (error) {
    throw new Error(
      `Depois de substituir as variáveis, o template "${relativePath}" não virou um JSON ` +
        `válido: ${(error as Error).message}\nConteúdo gerado:\n${rendered}`,
    );
  }
}
