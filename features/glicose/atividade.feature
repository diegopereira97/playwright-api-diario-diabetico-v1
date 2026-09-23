# language: pt
Funcionalidade: Consulta de Atividades
  Como usuário autenticado
  Eu quero consultar a lista de atividades disponíveis
  Para associá-las aos meus registros de glicose

  @DDD-T25 @regressivo
  Cenário: DDD-T25-Consultar atividades estando autenticado
    Dado que estou autenticado como o usuário de teste
    Quando envio uma requisição para consultar as atividades disponíveis
    Então a resposta deve ter o status 200

  # ACHADO (2026-09-11): a API atualmente responde 200 e retorna a lista
  # completa de atividades mesmo sem token de autenticação. O cenário abaixo
  # documenta esse comportamento ATUAL. Se o correto for exigir autenticação,
  # troque a asserção para 401 assim que a API for corrigida — não delete
  # este cenário, ele serve de sinalizador para essa revisão.
  @DDD-T2600 @revisar-seguranca
  Cenário: DDD-T26-Consultar atividades sem estar autenticado (comportamento atual: acesso liberado)
    Dado que não estou autenticado
    Quando envio uma requisição para consultar as atividades disponíveis
    Então a resposta deve ter o status 200
