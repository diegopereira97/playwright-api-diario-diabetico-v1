# language: pt
Funcionalidade: Autenticação e cadastro de usuário
  Como usuário da aplicação
  Eu quero me cadastrar, autenticar e consultar meus dados
  Para acessar as funcionalidades protegidas da API

  @DDD-T01 @regressivo
  Esquema do Cenário: DDD-T01-Registrar um novo usuário com sucesso
    Quando envio uma requisição de registro com nome "<nomeCompleto>", data de nascimento "<dataNascimento>", senha "<senha>" e aceite de termos "<aceiteTermos>"
    Então a resposta deve ter o status 201
    E a resposta deve conter o campo "user_id"

    Exemplos:
      | nomeCompleto         | dataNascimento | senha         | aceiteTermos |
      | Usuario Automacao QA |     1990-01-01 | SenhaForte123 | true         |

  @regressivo
  Esquema do Cenário: "<nomeCenario>"
    Quando envio uma requisição de registro com nome "<nomeCompleto>", data de nascimento "<dataNascimento>", senha "<senha>" e aceite de termos "<aceiteTermos>"
    Então a resposta deve ter o status 400
    E a resposta deve conter a mensagem de erro apropriada "<mensagemEsperada>"

    @DDD-T02
    Exemplos:
      | nomeCenario | nomeCompleto | dataNascimento | senha         | aceiteTermos | mensagemEsperada                              |
      | DDD-T02     | U            |     1990-01-01 | SenhaForte123 | true         | Nome deve ter pelo menos 6 caracteres válidos |

    @DDD-T03
    Exemplos:
      | nomeCenario | nomeCompleto     | dataNascimento | senha         | aceiteTermos | mensagemEsperada                         |
      | DDD-T03     | teste123 test456 |     1990-01-01 | SenhaForte123 | true         | Nome deve conter apenas letras e espaços |

    @DDD-T04
    Exemplos:
      | nomeCenario | nomeCompleto | dataNascimento | senha         | aceiteTermos | mensagemEsperada |
      | DDD-T04     |              |     1990-01-01 | SenhaForte123 | true         | Dados inválidos  |

    @DDD-T05
    Exemplos:
      | nomeCenario | nomeCompleto             | dataNascimento | senha         | aceiteTermos | mensagemEsperada                         |
      | DDD-T05     | testeqa validando @#$@#$ |     1990-01-01 | SenhaForte123 | true         | Nome deve conter apenas letras e espaços |
   # | DDD-T05    | com mais de sescenta caracteres testando para validar validando | 1990-01-01     | Senha@123      | true         | teste                                         |

    @DDD-T06
    Exemplos:
      | nomeCenario | nomeCompleto  | dataNascimento | senha         | aceiteTermos | mensagemEsperada                             |
      | DDD-T06     | Usuario Teste |       90-01-01 | SenhaForte123 | true         | Data de nascimento inválida (use YYYY-MM-DD) |

    @DDD-T07
    Exemplos:
      | nomeCenario | nomeCompleto  | dataNascimento | senha     | aceiteTermos | mensagemEsperada                             |
      | DDD-T07     | Usuario Teste |     1990-02-31 | Senha@123 | true         | Data de nascimento inválida (use YYYY-MM-DD) |

    @DDD-T08
    Exemplos:
      | nomeCenario | nomeCompleto  | dataNascimento | senha     | aceiteTermos | mensagemEsperada                                |
      | DDD-T08     | Usuario Teste |     2027-03-20 | Senha@123 | true         | Data de nascimento não pode ser uma data futura |

    @DDD-T09
    Exemplos:
      | nomeCenario | nomeCompleto  | dataNascimento | senha     | aceiteTermos | mensagemEsperada                 |
      | DDD-T09     | Usuario Teste |     2015-01-25 | Senha@123 | true         | Usuário deve ter mais de 18 anos |

    @DDD-T10
    Exemplos:
      | nomeCenario | nomeCompleto  | dataNascimento | senha     | aceiteTermos | mensagemEsperada                 |
      | DDD-T10     | Usuario Teste |     1920-01-25 | Senha@123 | true         | Idade máxima permitida é 90 anos |

    @DDD-T11
    Exemplos:
      | nomeCenario | nomeCompleto  | dataNascimento | senha | aceiteTermos | mensagemEsperada                        |
      | DDD-T11     | Usuario Teste |     1990-01-01 |     3 | true         | A senha deve ter no mínimo 8 caracteres |

    @DDD-T12
    Exemplos:
      | nomeCenario | nomeCompleto  | dataNascimento | senha | aceiteTermos | mensagemEsperada                        |
      | DDD-T12     | Usuario Teste |     1990-01-01 | teste | true         | A senha deve ter no mínimo 8 caracteres |

    @DDD-T13
    Exemplos:
      | nomeCenario | nomeCompleto  | dataNascimento | senha    | aceiteTermos | mensagemEsperada                     |
      | DDD-T13     | Usuario Teste |     1990-01-01 | 12345678 | true         | A senha deve conter letras e números |

    @DDD-T14
    Exemplos:
      | nomeCenario | nomeCompleto  | dataNascimento | senha | aceiteTermos | mensagemEsperada               |
      | DDD-T14     | Usuario Teste |     1990-01-01 |       | true         | Email e senha são obrigatórios |
  # | DDD-T15  | Usuario Teste                                                   | 1990-01-01     | /$%3234sdf     | true         | teste       |

    @DDD-T16
    Exemplos:
      | nomeCenario | nomeCompleto | dataNascimento | senha     | aceiteTermos | mensagemEsperada               |
      | DDD-T16     | nomeCompleto |     1990-01-01 | Senha@123 | false        | É necessário aceitar os termos |

    @DDD-T17
    Exemplos:
      | nomeCenario | nomeCompleto | dataNascimento | senha     | aceiteTermos | mensagemEsperada               |
      | DDD-T17     | nomeCompleto |     1990-01-01 | Senha@123 | teste        | É necessário aceitar os termos |

    @DDD-T18
    Exemplos:
      | nomeCenario | nomeCompleto | dataNascimento | senha     | aceiteTermos | mensagemEsperada               |
      | DDD-T18     | nomeCompleto |     1990-01-01 | Senha@123 |              | É necessário aceitar os termos |

  @DDD-T19 @regressivo
  Cenário: DDD-T19-Realizar login com um usuário existente
    Dado que existe um usuário de teste cadastrado
    Quando envio uma requisição de login com email e senha válidos
    Então a resposta deve ter o status 200
    E a resposta deve conter um token de acesso

  @DDD-T20 @regressivo
  Esquema do Cenário: DDD-T20-Tentar login com credenciais inválidas
    Quando envio uma requisição de login com email "<email>" e senha "<senha>"
    Então a resposta deve ter o status 401

    Exemplos:
      | email                 | senha          |
      | naoexiste@exemplo.com | qualquerSenha1 |

  @DDD-T21 @regressivo
  Cenário: DDD-T21-Solicitar recuperação de senha para um e-mail existente
    Quando envio uma requisição de "esqueci minha senha" para o e-mail do usuário de teste
    Então a resposta deve ter o status 200

  @DDD-T22 @regressivo
  Cenário: DDD-T22-Consultar dados do usuário autenticado
    Dado que estou autenticado como o usuário de teste
    Quando consulto meus dados de usuário autenticado
    Então a resposta deve ter o status 200
    E a resposta deve conter o campo "user.email"

  @DDD-T23 @regressivo
  Cenário: DDD-T23-Consultar dados do usuário autenticado com token inválido
    Quando consulto meus dados de usuário autenticado com um token inválido
    Então a resposta deve ter o status 401

  @DDD-T24 @regressivo
  Cenário: DDD-T24-Consultar dados do usuário sem informar token
    Quando consulto meus dados de usuário sem informar o token de autenticação
    Então a resposta deve ter o status 401
