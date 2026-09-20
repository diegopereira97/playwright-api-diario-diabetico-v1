# Testes de API — Cadastro & Glicose (Playwright + Cucumber/Gherkin)

Suíte de testes de API em TypeScript, usando o `request` do Playwright como
cliente HTTP e o Cucumber para escrever os cenários em Gherkin (pt-BR).

## Estrutura

```
payloads/                        # corpos de requisição em JSON puro, fora do código TS
  cadastro/
    registrar-usuario.template.json  # template — Esquema do Cenário de registro
  glicose/
    cadastrar-glicose.template.json  # template — Esquema do Cenário de cadastro
    editar-glicose.template.json     # template — Esquema do Cenário de edição
features/
  cadastro/
    autenticacao.feature      # registro, login, esqueci senha, /auth/me
  glicose/
    glicose.feature           # CRUD de glicose
    atividade.feature         # GET /atividade
src/
  steps/
    cadastro.steps.ts
    glicose.steps.ts
    common.steps.ts           # steps genéricos (status code, campos do body)
  support/
    world.ts                  # World customizado (contexto de API, token, ids)
    hooks.ts                  # Before/After — cria/fecha o contexto por cenário
    api-client.ts             # criação do APIRequestContext (BASE_URL)
    payload-loader.ts         # renderiza os payloads template (placeholders, omissão, null)
    gherkin-value-parser.ts   # converte texto da tabela Exemplos pro tipo certo (number/boolean/null/omitido)
    data-factory.ts           # valores-padrão de glicose (via template) + e-mail único
    auth-session.ts           # login único por execução + cache do token em disco
    http-retry.ts             # retry/backoff para respostas 429 (rate limit)
.github/workflows/
  api-tests.yml                # workflow já preparado (gatilho automático comentado)
cucumber.js                    # perfis do cucumber (default / ci / allure)
```

### Sobre a pasta `payloads/`

Todo corpo de requisição fica em um único arquivo **template** por
formato (`*.template.json`), com placeholders `"{{nomeDaVariavel}}"`. Não
existe um segundo JSON "fixo" duplicando a mesma estrutura — quando um
cenário não precisa variar os dados (ex.: massa de dados para editar/
listar/excluir glicose, ou o teste negativo de "cadastrar sem
autenticação"), ele chama o **mesmo template**, só que com valores-padrão
definidos como um objeto simples em `data-factory.ts`, em vez de ler um
segundo arquivo. Assim, se o nome de um campo mudar (bem provável
enquanto o schema real da API ainda está sendo confirmado), só existe
**um lugar** pra atualizar.

`src/support/payload-loader.ts` tem a função `renderPayloadTemplate(caminho,
variaveis)`, que lê o template (via `JSON.parse`, não substituição de texto
cru) e monta o corpo campo a campo, com o tipo certo (número continua
número, string continua string, boolean continua boolean). Ela também
suporta dois casos especiais, essenciais pra testar validação de API:

- **Omitir um campo de propósito** — se você não passar uma variável (nem
  com valor `undefined`), o campo correspondente **some** do corpo da
  requisição. Útil pra testar "campo obrigatório".
- **Mandar `null` de verdade** — se você passar `null` como valor, o JSON
  final tem `null` de verdade (não a string `"null"`). Útil pra testar
  "valor inválido", que costuma ser uma mensagem diferente de "campo
  obrigatório".

Só que o Cucumber sempre entrega o valor de uma célula da tabela
`Exemplos` como **texto puro** (mesmo "4" ou "true"), então antes de
chamar `renderPayloadTemplate` é preciso converter esse texto pro tipo
certo. É isso que `src/support/gherkin-value-parser.ts` faz, com a função
`parseValorDeExemplo(texto)`:

| Texto na célula | Vira |
|---|---|
| `""` (célula vazia) | `undefined` → campo omitido |
| `"null"` (qualquer capitalização) | `null` de verdade |
| `"true"` / `"false"` | `boolean` de verdade |
| texto numérico (ex.: `"120"`) | `number` de verdade |
| qualquer outro texto | mantido como string |

Isso resolveu um bug real: um step que declarava `{string}` pra todos os
parâmetros (necessário pra aceitar célula vazia/`"null"`, já que `{int}`
do Cucumber rejeita esses valores) estava mandando `"insulinaRapida": "4"`
(string) em vez de `"insulinaRapida": 4` (number) pra API — que então
recusava o campo por tipo errado ANTES de validar o que o cenário
realmente queria testar. Ao aplicar `parseValorDeExemplo` em cada
parâmetro antes de montar o corpo, o tipo fica certo em todos os casos —
inclusive nos propositalmente inválidos.

Cada template usa os **mesmos nomes de coluna** da tabela `Exemplos` do
`.feature` correspondente. Exemplo (`cadastrar-glicose.template.json`):

```json
{
  "valor": "{{valor}}",
  "atividade": "{{atividade}}",
  "data": "{{data}}",
  "aplicouInsulinaRapida": "{{aplicouInsulinaRapida}}",
  "insulinaRapida": "{{insulinaRapida}}",
  "observacao": "{{observacao}}"
}
```

Assim, olhando só o JSON (sem precisar ler o `.steps.ts`), já dá pra ver
exatamente quais variáveis do `.feature` alimentam cada campo da
requisição — e pra adicionar uma nova coluna na tabela `Exemplos`, basta
adicionar o placeholder correspondente aqui e passar o valor no step.

**Atenção ao adicionar `aplicouInsulinaRapida` ao template:** o cenário de
**cadastro com sucesso** (`Cadastrar um novo registro de glicose com
sucesso`) não tem essa coluna na tabela `Exemplos` — o step calcula um
valor (`insulinaRapida > 0`) pra preencher esse placeholder sozinho. É uma
inferência razoável, mas se você quiser controlar esse valor
explicitamente, o mais correto é adicionar a coluna `aplicouInsulinaRapida`
na tabela `Exemplos` desse cenário também, do mesmo jeito que já existe no
cenário de validação de erros.

**Exceção ao padrão — o e-mail no registro de usuário:** o template de
registro tem um placeholder `{{email}}`, mas esse valor **não vem** de uma
coluna da tabela `Exemplos` — é gerado dinamicamente
(`gerarEmailUnico()`), de propósito, porque um e-mail fixo faria a segunda
execução do teste falhar com "usuário já cadastrado". O mecanismo de
template não se importa de onde vem o valor, só que todo placeholder
receba um.

**O que ficou de fora de propósito:** os corpos de `login` e `esqueci
senha` (`cadastro.steps.ts`) continuam montados diretamente no código,
porque eles não têm "dado de negócio" fixo — são só `email`/`senha`
vindos do usuário de teste (`.env`) ou do usuário recém-registrado durante
o próprio cenário. Não há nada de estático para externalizar ali; seria só
um JSON com placeholders reimplementando o que o `.env` já resolve.

### ⚠️ Schema real da API — confirmado por evidência, ainda incompleto

Rodando os testes contra a API de verdade, algumas respostas reais vieram
diferentes do que a gente tinha assumido. O que já está **confirmado e
corrigido no código**, com base nas respostas reais observadas:

| Endpoint | Resposta real observada | Onde estava errado |
|---|---|---|
| `POST /auth/register` | `{"mensagem":..., "user_id":...}` | Não existe campo `email` na resposta — usamos `user_id` agora |
| `GET /auth/me` | `{"user": {"email":..., "id":..., "nome_completo":..., "role":...}}` | O `email` está dentro de `user`, não na raiz — usamos `user.email` |
| `POST /glicose` | `{"mensagem":..., "registro": {"id":..., "valor":..., ...}}` | O `id`/`valor` estão dentro de `registro`, não na raiz — usamos `registro.id` |

O step genérico `a resposta deve conter o campo {string} com o valor
{string}` (`common.steps.ts`) agora resolve caminhos com ponto (ex.:
`"registro.valor"`) via uma função `getByPath` — antes ele acessava a
chave por bracket notation (`obj["registro.valor"]`), que não resolve
caminho aninhado e teria continuado falhando mesmo depois de trocar o
texto no `.feature`.

**O que AINDA não está confirmado (evidência aponta pra um problema, mas
não sabemos o nome certo do campo):**

Na resposta real de `POST /glicose` que você recebeu, o `registro` veio
assim:

```json
{
  "valor": 120,
  "observacao": "novo café",
  "data_hora": "2026-09-13T00:46:49.383502+00:00",
  "insulina_rapida_unidades": null,
  "aplicou_insulina_rapida": false,
  "id": "..."
}
```

Repare que:

1. **Não existe `atividade` nem `atividade_id` na resposta.** O campo que
   mandamos (`"atividade": "Jejum"`) parece ter sido silenciosamente
   ignorado pela API. Suspeita, baseada na collection original do Postman
   (que tinha um `GET /atividade` retornando `{"id":..., "nome":...}`, e um
   body de exemplo com `"atividade_id": "b8026788-..."`): talvez o campo
   certo seja `atividade_id`, esperando o **UUID** de uma atividade
   (obtido via `GET /atividade`), não o nome em texto.
2. **`insulinaRapida` (nosso campo, um número) também foi ignorado.** A
   resposta tem DOIS campos separados: `aplicou_insulina_rapida`
   (boolean) e `insulina_rapida_unidades` (número, veio `null`). Ou seja,
   provavelmente são dois campos no request também, não um só.
3. **`data_hora` bate muito com "agora"** (a hora bate com o horário real
   da requisição) — o que sugere que esse campo pode ser **gerado pelo
   servidor**, e não controlável pelo cliente. Mandamos `"data":
   "2026-09-12"` e o servidor pode ter simplesmente ignorado e carimbado a
   hora atual.

Como já erramos esse schema uma vez, prefiro confirmar antes de mudar os
templates de novo — testa manualmente no Postman um `POST /glicose` com,
por exemplo:

```json
{
  "valor": 120,
  "atividade_id": "<um id real de GET /atividade>",
  "aplicou_insulina_rapida": true,
  "insulina_rapida_unidades": 4,
  "observacao": "teste de schema"
}
```

e me manda a resposta. Com isso eu ajusto
`cadastrar-glicose.template.json` e `editar-glicose.template.json` de
vez, incluindo os nomes de campo certos e, se `data_hora` for mesmo
gerado pelo servidor, tiro a coluna `data` da tabela `Exemplos` (não faz
sentido teste variar um campo que a API ignora).

**Ainda em aberto (sem evidência ainda):** o formato de resposta de
`GET /glicose` (listagem) — hoje o código tenta `registros`, `items` ou
`data` como possíveis nomes do array (`extrairListaDeGlicose` em
`glicose.steps.ts`), na mesma lógica de "assume e sinaliza". Se nenhum
bater, o teste vai falhar com uma mensagem mostrando o corpo recebido,
o que te dá o que eu preciso pra ajustar.

### Sobre o usuário de teste não conseguir logar (401 "Invalid login credentials")

Se os cenários autenticados falharem com `401` (e não `429`), **não é bug
do projeto de testes** — é a API recusando a senha/e-mail configurados em
`TEST_USER_EMAIL`/`TEST_USER_PASSWORD` no `.env`. Antes de mexer em
qualquer código:

1. Teste manualmente a rota de login (Postman/Insomnia/curl) com
   exatamente esses valores.
2. Se der 401 ali também, o problema é a credencial em si — confirme a
   senha correta ou registre esse usuário de novo com a senha que você
   quer usar como fixa, e atualize o `.env`.
3. O cenário de "Registrar um novo usuário" **não** cria esse usuário
   fixo — ele gera um e-mail único a cada execução (`data-factory.ts`),
   de propósito, para não colidir em execuções repetidas.

## Pré-requisitos

- Node.js 18+
- As APIs "Serviço de Cadastro" e "Serviço de Glicose" rodando localmente
  (por padrão, ambas em `http://localhost:3000`, conforme as collections
  do Postman fornecidas).

## Como rodar localmente

```bash
npm install
cp .env.example .env
# edite o .env se necessário (BASE_URL, usuário de teste, etc.)
npm test
```

Para rodar apenas um subconjunto de cenários (usando as tags definidas nas
features: `@smoke`, `@cadastro`, `@glicose`, `@atividade`):

```bash
npm run test:tag "@smoke"
```

## Relatório de execução com Allure

Além do console (progress-bar), a suíte pode gerar um relatório HTML
interativo via [Allure](https://allurereport.org/), com linha do tempo,
gráfico de tendência entre execuções, filtro por tag/feature e detalhes de
cada passo (request/response incluídos como texto simples).

**Pré-requisito:** o Allure CLI depende de **Java 8+** instalado e no PATH.
Confira com `java -version`; se não tiver, instale um JDK (ex.:
[Temurin](https://adoptium.net/)) antes de gerar o relatório.

```bash
npm install                 # traz allure-cucumberjs e allure-commandline
npm run test:allure:report  # roda os testes, gera o HTML e já abre no navegador
                             # (gera e abre o relatório mesmo se algum
                             # cenário falhar — é aí que ele é mais útil)
```

Se preferir rodar passo a passo (note que aqui, diferente do comando acima,
cada etapa só roda se a anterior tiver saído com sucesso — então se os
testes falharem, `allure:generate`/`allure:open` não vão rodar a menos que
você os chame manualmente):

```bash
npm run test:allure        # roda os testes e grava os dados brutos em allure-results/
npm run allure:generate    # gera o site estático em allure-report/
npm run allure:open        # sobe um servidor local e abre o relatório
```

### Como funciona o histórico/tendência

O Allure só desenha o gráfico de tendência entre execuções se encontrar uma
pasta `history/` dentro de `allure-results/` no momento de gerar o relatório.
Como cada execução limpa `allure-results/` do zero (`pretest:allure`), o
script `scripts/prepare-allure-history.js` copia automaticamente a pasta
`allure-report/history/` (do relatório HTML gerado na execução anterior) de
volta para dentro de `allure-results/` antes de rodar o `allure generate`.
Ou seja: **basta não apagar a pasta `allure-report/` entre execuções** (ela
já está no `.gitignore`, mas continua no seu disco local) que o histórico se
acumula sozinho a cada `npm run test:allure:report`.

No GitHub Actions, isso ainda não está resolvido: cada execução do workflow
roda em uma máquina limpa, então o relatório sempre "zera" o histórico. Para
manter tendência entre execuções no CI, é preciso publicar o relatório em um
lugar persistente (ex.: uma branch `gh-pages` ou GitHub Pages) e restaurar a
pasta `history/` de lá antes de gerar o próximo — isso ficou como próximo
passo, não implementado ainda.

## Cache do token entre execuções (evita repetir login)

Antes, cada `npm test` fazia um login novo em `/auth/login` — rodar a
suíte várias vezes seguidas durante o desenvolvimento rapidamente batia no
rate limit da API (ver seção de Troubleshooting abaixo). Agora o token é
salvo em `.cache/auth-token.json` (fora do Git) com sua data de expiração
lida diretamente do JWT, e só é renovado quando:

- não existe cache ainda, ou
- o token salvo já expirou (ou está a menos de 30s de expirar).

Ou seja, rodar `npm test` dez vezes seguidas em poucos minutos agora só
loga uma vez de verdade — as próximas reaproveitam o token salvo.

Se algo der errado com o token em cache (ex.: a API foi reiniciada e
invalidou sessões), limpe manualmente:

```bash
npm run auth:clear-cache
```

**Por que não simplesmente trocar de e-mail a cada execução?** Não é uma
solução confiável: se o rate limit da API for por IP (o mais comum em
proteções contra brute-force), trocar de conta não muda nada — o bloqueio
continua batendo. E mesmo que fosse por conta, `/auth/register` costuma
estar sob o mesmo limitador, então criar um usuário novo a cada execução
provavelmente esbarraria no mesmo problema (além de acumular usuários de
teste descartáveis no banco). Rotacionar credenciais para "furar" um
rate limiter é combater o sintoma, não a causa.

### Reduzindo ainda mais o risco durante o desenvolvimento

O cache de token acima resolve os cenários que **precisam estar
autenticados** (`Dado que estou autenticado como o usuário de teste` —
usado em Glicose e Atividade). Mas os cenários que **testam os próprios
endpoints de autenticação** (registro, login, login inválido, esqueci
senha — tag `@cadastro`) sempre vão fazer chamadas reais a `/auth/*`,
porque é exatamente isso que eles verificam.

Ao iterar rapidamente em cenários de Glicose/Atividade, rode só essas tags
para não tocar em `/auth/register` nem `/auth/login` repetidamente:

```bash
npm run test:tag "@glicose or @atividade"
```

Rode a suíte completa (incluindo `@cadastro`) com menos frequência — por
exemplo, antes de um commit/PR, não a cada alteração local.

**Fix definitivo:** o jeito mais robusto de resolver isso de vez é
conversar com quem mantém a API sobre liberar o rate limit para o
ambiente/IP de testes automatizados (muitas implementações permitem uma
allowlist, ou desabilitar o limitador quando `NODE_ENV=test`/`ci`).
Trabalhar em volta de uma proteção de segurança do lado do cliente de
teste é sempre mais frágil do que ajustar isso na própria API.

## Troubleshooting: "o terminal travou" durante os testes

Se `npm test` / `npm run test:allure` parecer parado sem nenhum output por
um tempo longo (minutos), normalmente é uma destas coisas — **nenhuma delas
é o processo travado de verdade**:

1. **A API te mandou esperar, e o código está obedecendo.** Quando uma rota
   de `/auth/*` responde `429` com um header `Retry-After`, o
   `http-retry.ts` respeita esse valor antes de tentar de novo. Isso agora
   é logado no console (`[rate-limit] Resposta 429 recebida. Aguardando
   Xs...`), e se o tempo pedido passar de 15s, o retry **desiste e falha
   rápido** em vez de travar o terminal — você vai ver um aviso
   `[rate-limit] API pediu Xs de espera (...) Desistindo do retry`. Se
   isso acontecer, espere o tempo indicado pela API antes de rodar os
   testes de novo (rodar de novo na hora só reinicia o bloqueio).
2. **`npm run allure:open` fica de propósito "parado".** Esse comando sobe
   um servidor local para servir o relatório HTML e só termina quando você
   aperta `Ctrl+C` no terminal — não é um travamento, é o servidor rodando.
3. **`npm run test:allure:report` não gerava/abria o relatório quando havia
   falhas.** Isso era um bug de encadeamento (`&&` no `package.json` parava
   tudo assim que o Cucumber saía com código de erro). Foi corrigido: esse
   comando agora usa `scripts/run-allure-report.js`, que gera e abre o
   relatório independentemente de os testes terem passado ou não.
4. **Nenhum resumo de falhas aparecia no console.** O formatter
   `progress-bar` do Cucumber usa códigos de controle de cursor para
   desenhar uma barra ao vivo, que não renderiza de forma confiável em
   alguns terminais Windows (Git Bash/MINGW64). Trocamos para `progress`,
   que imprime texto puro, linha a linha — mais lento visualmente, mas
   sempre visível.

## Sobre a aba "Playwright" do VS Code

Se você instalou a extensão oficial **Playwright Test for VSCode**, ela só
lista testes escritos com o test runner do próprio Playwright (`test()` em
arquivos `*.spec.ts`). Como este projeto usa o Cucumber como runner (o
Playwright aqui é usado só como cliente HTTP, via `request`), essa aba não
vai mostrar as features/steps daqui — use os comandos `npm test` /
`npm run test:allure:report` mesmo, ou instale uma extensão de sintaxe
Gherkin (ex.: "Cucumber (Gherkin) Full Support") só para realce de sintaxe
e autocomplete nos arquivos `.feature`.

## Sobre o usuário de teste

Vários cenários (login, `/auth/me`, todo o CRUD de glicose) dependem de um
usuário já autenticável. Para evitar acoplar os testes ao cenário de
"registro" (que sempre cria um usuário novo com e-mail único), os steps
usam um **usuário fixo** definido em `TEST_USER_EMAIL` / `TEST_USER_PASSWORD`
no `.env`.

**Ação necessária de sua parte:** garanta que esse usuário exista no seu
banco local (crie-o manualmente uma vez via `/auth/register`, ou adicione
um seed). Sem isso, os cenários que dependem de login vão falhar com 401/404
antes mesmo de testar o comportamento esperado.

## Rate limit em `/auth/*`

A API tem um limitador de tentativas nas rotas de autenticação
(`{"erro":"Muitas tentativas. Aguarde alguns minutos e tente novamente."}`,
HTTP 429). Rodar um login a cada cenário autenticado estourava esse limite
rapidamente. Por isso:

- `support/auth-session.ts` faz login **uma única vez por execução da
  suíte** e reaproveita o token em todos os cenários que usam
  `Dado que estou autenticado como o usuário de teste`.
- `support/http-retry.ts` reexecuta com backoff (respeitando o header
  `Retry-After`, se existir) qualquer chamada a `/auth/register`,
  `/auth/login` ou `/auth/esqueci-senha` que receba 429.

Se mesmo assim você ver 429 com frequência, aumente `baseDelayMs`/`retries`
em `http-retry.ts`, ou rode a suíte com `--parallel 1` (padrão) e evite
rodar cenários `@cadastro` repetidamente em um curto intervalo — o próprio
limite de tentativas é uma proteção da API contra brute-force, não um bug.

## Achado: `GET /atividade` não exige autenticação

Ao rodar a suíte, o cenário que esperava 401 sem token recebeu **200** com
a lista completa de atividades. Isso foi documentado no código
(`features/glicose/atividade.feature`, cenário marcado com a tag
`@revisar-seguranca`) refletindo o comportamento **atual** da API, em vez
de deixar um teste quebrado.

**Ação recomendada:** confirmar com o time se `/atividade` é intencionalmente
pública (dado não sensível, ok deixar aberto) ou se deveria exigir token
como as demais rotas. Se a API for corrigida para exigir autenticação, basta
trocar a asserção desse cenário de volta para 401.

## Pontos já sinalizados nas collections originais (revisar antes de expandir a suíte)

- **"Editar Glicose"**: no Postman, o header `Authorization` estava sem o
  prefixo `Bearer`. Os steps aqui sempre enviam `Bearer {token}` — se a API
  realmente exigir o formato sem prefixo nessa rota, os testes vão falhar e
  isso indicará uma inconsistência real da API a ser corrigida.
- **IDs fixos** usados no Postman para editar/deletar glicose foram
  substituídos por um registro criado dinamicamente em cada cenário
  (`Dado que eu tenho um registro de glicose previamente cadastrado`), para
  não depender de dados fixos do ambiente.
- Não existe endpoint de consulta de um único registro de glicose
  (`GET /glicose/:id`) nas collections fornecidas — por isso, o cenário de
  exclusão valida o resultado consultando a **listagem**, não um "get by id".
  Se esse endpoint existir na API real, vale adicionar um step mais direto.

## Preparando para o GitHub Actions

O workflow em `.github/workflows/api-tests.yml` já está criado, mas com o
gatilho automático (`push`/`pull_request`) **comentado de propósito**, já
que hoje a API só roda localmente. Antes de reativá-lo, resolva os `TODO`s
marcados no arquivo:

1. Definir como a API vai subir no runner do CI (serviço Docker via
   `services:`, ou build/start a partir do código-fonte).
2. Ajustar a variável `BASE_URL` para apontar para onde a API estará
   acessível no CI.
3. Cadastrar `TEST_USER_EMAIL` e `TEST_USER_PASSWORD` como *secrets* do
   repositório (ou criar o usuário de teste via seed no próprio workflow).
4. Descomentar o gatilho (`push`/`pull_request`) quando tudo estiver ok.

Até lá, o workflow pode ser disparado manualmente pela aba **Actions** do
GitHub (`workflow_dispatch`).

### Aguardar o cold start do Render

O workflow agora executa `npm run wait:api` antes dos testes. Esse comando
consulta a URL configurada a cada 5 segundos, por até 120 segundos, e só
continua quando o Render responde. Respostas HTTP abaixo de 500, inclusive
404, são consideradas suficientes para confirmar que o servidor está no ar.

Configure estes secrets no repositório GitHub:

- `BASE_URL`: URL pública da API no Render, sem barra final.
- `HEALTHCHECK_URL`: rota pública usada para acordar/verificar a API. Se não
  existir uma rota de health check, use a própria `BASE_URL`.
- `TEST_USER_EMAIL` e `TEST_USER_PASSWORD`: credenciais do usuário de teste.

Se o cold start puder passar de dois minutos, aumente
`API_STARTUP_TIMEOUT_SECONDS` no workflow.
