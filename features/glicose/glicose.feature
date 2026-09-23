# language: pt
Funcionalidade: Gestão de registros de Glicose
  Como usuário autenticado
  Eu quero cadastrar, editar, listar e excluir meus registros de glicose
  Para acompanhar meu histórico de medições

  Contexto:
    Dado que estou autenticado como o usuário de teste

  @regressivo
  Esquema do Cenário: "<nomeCenario>"
    Quando envio uma requisição para cadastrar um registro de glicose com valor "<valor>", atividade "<atividade>", data "<data>", aplicouInsulinaRapida "<aplicouInsulinaRapida>", insulina rápida "<insulinaRapida>" e observação "<observacao>"
    Então a resposta deve ter o status 201
    E a resposta deve conter o campo "registro.id"

    @DDD-T26
    Exemplos:
      |nomeCenario | valor | atividade | data       |aplicouInsulinaRapida | insulinaRapida | observacao  |
      |DDD-T26     | 120   | Jejum     | 2026-09-12 | true                |4              |             |

    @DDD-T27
    Exemplos:
      |nomeCenario | valor | atividade | data       |aplicouInsulinaRapida | insulinaRapida | observacao        |  
      |DDD-T27     | 180   | Almoço    | 2026-09-12 | true                 |6              | novo carboidratos |


  @DDD-T33 @regressivo
  Cenário: DDD-T33 - Cadastrar glicose com data vazia usa o horário atual do servidor
    # dataHora é opcional; o backend trata string vazia "" igual a campo
    # ausente (decisão de produto confirmada, não é bug — ver
    # validarDataHoraGlicose em Node/src/validators/glicoseValidator.js).
    Quando envio uma requisição para cadastrar um registro de glicose com valor "134", atividade "Janta", data "", aplicouInsulinaRapida "false", insulina rápida "1" e observação "novo dormir"
    Então a resposta deve ter o status 201
    E a resposta deve conter o campo "registro.data_hora"

  @regressivo
  Esquema do Cenário: "<nomeCenario>"
    Quando envio uma requisição para cadastrar um registro de glicose com valor "<valor>", atividade "<atividade>", data "<data>", aplicouInsulinaRapida "<aplicouInsulinaRapida>", insulina rápida "<insulinaRapida>" e observação "<observacao>"
    Então a resposta deve ter o status 400
    E a resposta deve conter a mensagem de erro apropriada "<mensagemEsperada>"

    
    @DDD-T28
    Exemplos:
      |nomeCenario | valor | atividade | data       | insulinaRapida | observacao   |  mensagemEsperada                                |aplicouInsulinaRapida |
      |DDD-T28     | 95    | Dormir    | 2026-09-12 | 0              | novo dormir  | Informe a quantidade de insulina rápida aplicada | true |
      
    @DDD-T29
    Exemplos:
      |nomeCenario | valor | atividade | data       | insulinaRapida | observacao        |mensagemEsperada        |aplicouInsulinaRapida|
      |DDD-T29     | 120   | Jeju      | 2026-09-12 | 4              | novo café         |Atividade não encontrada|true                 |

    @DDD-T30
    Exemplos:
      |nomeCenario | valor | atividade | data       | insulinaRapida | observacao        |mensagemEsperada         |aplicouInsulinaRapida|
      |DDD-T30     | null  | Almoço    | 2026-09-12 | 6              | novo carboidratos |Valor de glicose inválido|true                 |

    @DDD-T31
    Exemplos:
      |nomeCenario | valor | atividade | data       | insulinaRapida | observacao        |mensagemEsperada    |aplicouInsulinaRapida|  
      |DDD-T31     |       | Dormir    | 2026-09-12 | 2              | novo dormir       |Valor é obrigatório |true                 |

    @DDD-T32
    Exemplos:
      |nomeCenario | valor | atividade | data       | insulinaRapida | observacao        |mensagemEsperada       |aplicouInsulinaRapida|
      |DDD-T32     |  234  |           | 2026-09-12 | 0              | novo dormir       |Atividade é obrigatória|true                 |

    @DDD-T34
    Exemplos:
      |nomeCenario | valor  | atividade | data       | insulinaRapida | observacao        |mensagemEsperada                                |aplicouInsulinaRapida|
      |DDD-T34     |   314  |  Janta    | 2026-09-12 |                | novo dormir       |Informe a quantidade de insulina rápida aplicada|true                 |


  @DDD-T12 @regressivo
  Cenário: DDD-T12 - Não deve cadastrar glicose sem estar autenticado
    Dado que não estou autenticado
    Quando envio uma requisição para cadastrar um registro de glicose válido
    Então a resposta deve ter o status 401

  @DDD-T13 @regressivo
  Esquema do Cenário: DDD-T13 - Editar um registro de glicose existente
    Dado que eu tenho um registro de glicose previamente cadastrado
    Quando envio uma requisição para editar esse registro com valor "<valor>", atividade "<atividade>", data "<data>", aplicouInsulinaRapida "<aplicouInsulinaRapida>", insulina rápida <insulinaRapida> e observação "<observacao>"
    Então a resposta deve ter o status 200
    E a resposta deve conter o campo "registro.valor" com o valor "<valor>"
    E a resposta deve conter o campo "registro.observacao" com o valor "<observacao>"
    E a resposta deve conter o campo "registro.aplicou_insulina_rapida" com o valor "<aplicouInsulinaRapida>"

    Exemplos:
      | valor | atividade| data       | insulinaRapida | observacao        | aplicouInsulinaRapida |
      | 134   | Jejum    | 2026-09-12 | 4              | Editado automatiza | true                  |
      | 210   | Janta    | 2026-09-12 | 8              | Ajuste automatizad | false                 |

  # @DDD-T12 @smoke
  # Esquema do Cenário: DDD-T12 - Editar um registro de glicose existente
  #   Dado que eu tenho um registro de glicose previamente cadastrado
  #   Quando envio uma requisição para editar esse registro com valor <valor>, atividade "<atividade>", data "<data>", insulina rápida <insulinaRapida> e observação "<observacao>"
  #   Então a resposta deve ter o status 200
  #   E a resposta deve conter o campo "valor" com o valor "<valor>"

  #   Exemplos:
  #     | valor | atividade | data       | insulinaRapida | observacao            |
  #     | 134   | Jejum     | 2026-09-12 | 4               | Editado automatizado |
  #     | 210   | Atividade | 2026-09-12 | 8               | Ajuste automatizado  |

  @DDD-T14 @regressivo
  Cenário: DDD-T14 - Listar os registros de glicose do usuário autenticado
    Dado que eu tenho um registro de glicose previamente cadastrado
    Quando envio uma requisição para listar meus registros de glicose
    Então a resposta deve ter o status 200
    E a lista de glicose retornada deve conter o registro cadastrado

  @DDD-T15 @regressivo
  Cenário: DDD-T15 - Excluir um registro de glicose existente
    Dado que eu tenho um registro de glicose previamente cadastrado
    Quando envio uma requisição para excluir esse registro
    Então a resposta deve ter o status 200 ou 204
    E a lista de glicose retornada não deve mais conter o registro excluído
