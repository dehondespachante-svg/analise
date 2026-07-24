# SGDW — Schema Completo e Guia de Integração

> **Gerado automaticamente em 21/07/2026** via consulta direta ao banco Firebird `\\servidor\SGDW\Dados\SGDW.GDB`  
> **Firebird 2.5** · Charset `ISO8859_2` · Usuário `sysdba`  
> **LEITURA APENAS** — Nenhum dado foi modificado. Este documento é referência para implementação futura no app web.

---

## Referência de Tipos Firebird

| TIPO | Nome SQL | Descrição |
|------|----------|-----------|
| 7 | SMALLINT | Inteiro curto (2 bytes), usado p/ flags (0/1) |
| 8 | INTEGER | Inteiro (4 bytes), chaves e contadores |
| 12 | DATE | Data (sem hora) |
| 13 | TIME | Hora |
| 14 | CHAR | String comprimento fixo |
| 16 | NUMERIC/DECIMAL | Numérico com precisão (escala negativa = casas decimais) |
| 35 | TIMESTAMP | Data + hora |
| 37 | VARCHAR | String comprimento variável |
| 261 | BLOB | Blob/texto longo |

---

## Tabelas e Schemas Completos

### TBORDSE — Ordens de Serviço (68 campos)

> **Chave**: `ORDNUMER` (INTEGER NOT NULL PK)  
> **Campos NOT NULL obrigatórios no INSERT**: `ORDNUMER`, `CLINUMER`, `VEINUMER`, `SOSNUMER`, `ORDCANC`

| Campo | Tipo | Tam | Nulo | Descrição |
|-------|------|-----|------|-----------|
| `ORDNUMER` | INTEGER | 4 | NOT NULL | **PK** — Número da OS |
| `CLINUMER` | INTEGER | 4 | **NOT NULL** | **⚠ FK→TBCLIEN** — Cliente principal da OS (diferente de ORDORIGE!) |
| `VEINUMER` | INTEGER | 4 | NOT NULL | **FK→TBVEICU** — Veículo |
| `SOSNUMER` | INTEGER | 4 | NOT NULL | **FK→TBSERVI** — Tipo de serviço |
| `ORDDTEMI` | DATE | 4 | sim | Data emissão |
| `ORDDTFEC` | DATE | 4 | sim | Data fechamento (**preenchida automaticamente pelo trigger TBCAIXA**) |
| `ORDDTREC` | DATE | 4 | sim | Data recebimento (**automático pelo trigger**) |
| `ORDDTPAG` | DATE | 4 | sim | Data pagamento (**automático pelo trigger**) |
| `ORDDTCAN` | DATE | 4 | sim | Data cancelamento |
| `ORDDTALT` | DATE | 4 | sim | Data alteração |
| `ORDCANC` | SMALLINT | 2 | NOT NULL | 0=ativa, 1=cancelada |
| `ORDTMP` | INTEGER | 4 | sim | **Status:** 2=ativa/processável pelo trigger de caixa. NULL=desktop padrão |
| `ORDORIGE` | INTEGER | 4 | sim | FK→TBCLIEN — Origem/empresa (frota). Pode ser diferente de CLINUMER |
| `ORDVALOR` | NUMERIC(10,2) | 8 | sim | Valor base/NF da OS |
| `ORDVLTOT` | NUMERIC(10,2) | 8 | sim | Total calculado (atualizado pelo trigger) |
| `ORDVLDES` | NUMERIC(10,2) | 8 | sim | Desconto |
| `ORDVLADI` | NUMERIC(10,2) | 8 | sim | Adicional |
| `ORDVLACR` | NUMERIC(10,2) | 8 | sim | Acréscimo |
| `ORDVLPAG` | NUMERIC(10,2) | 8 | sim | Valor pago (campo legado) |
| `ORDVLPAGO` | NUMERIC(10,2) | 8 | sim | Valor pago (atualizado pelo trigger) |
| `ORDVLAPA` | NUMERIC(10,2) | 8 | sim | Valor a pagar (atualizado pelo trigger) |
| `ORDVLREC` | NUMERIC(10,2) | 8 | sim | Valor recebido (atualizado pelo trigger) |
| `ORDVLARE` | NUMERIC(10,2) | 8 | sim | Valor a receber (atualizado pelo trigger) |
| `ORDVLCUSTO` | NUMERIC(15,2) | 8 | sim | Custo da OS |
| `ORDVALORHO` | NUMERIC(10,2) | 8 | sim | Valor honorários (campo HO) |
| `ORDVLDESHO` | NUMERIC(10,2) | 8 | sim | Desconto HO |
| `ORDVLACRHO` | NUMERIC(10,2) | 8 | sim | Acréscimo HO |
| `ORDVLADIHO` | NUMERIC(10,2) | 8 | sim | Adicional HO |
| `ORDVALORHOCO` | NUMERIC(10,2) | 8 | sim | Valor HO cobrança |
| `ORDVLDESHOCO` | NUMERIC(10,2) | 8 | sim | Desconto HO cobrança |
| `ORDVLACRHOCO` | NUMERIC(10,2) | 8 | sim | Acréscimo HO cobrança |
| `ORDVLADIHOCO` | NUMERIC(10,2) | 8 | sim | Adicional HO cobrança |
| `ORDEXERC` | INTEGER | 4 | sim | **Exercício/Ano** — Importante! Campo "Exercício" da OS |
| `ORDREFIN` | VARCHAR | 300 | sim | Referência financiamento |
| `ORDUFORIG` | VARCHAR | 2 | sim | UF de origem |
| `ORDMUORIG` | INTEGER | 4 | sim | Município de origem (FK→TBMUNIC) |
| `ORDMOCAN` | VARCHAR | 200 | sim | Motivo cancelamento |
| `ORDUSCAN` | INTEGER | 4 | sim | Usuário que cancelou (FK→TBUSUARI) |
| `ORDSINISTRO` | NUMERIC | 8 | sim | Sinistro |
| `ORDBANCO` | VARCHAR | 100 | sim | Banco |
| `ORDLOTE` | VARCHAR | 20 | sim | Lote |
| `ORDLEILAO` | DATE | 4 | sim | Data leilão |
| `ORDLEICAD` | VARCHAR | 30 | sim | Cad. leilão |
| `ORDECRVFICHANRO` | VARCHAR | 30 | sim | Ficha ECRV número |
| `ORDECRVFICHAANO` | INTEGER | 4 | sim | Ficha ECRV ano |
| `ORDNROLOTE` | NUMERIC | 8 | sim | Nro lote |
| `ORDSERSP` | INTEGER | 4 | sim | Serviço SP |
| `ORDDPVATZKM` | SMALLINT | 2 | sim | DPVAT zero km |
| `ORDORCAMENTO` | INTEGER | 4 | sim | Orçamento |
| `ORDPROCEFIMFLAG` | SMALLINT | 2 | sim | Flag processo fim |
| `ORDPROCEFIMDTHR` | TIMESTAMP | 8 | sim | Data/hora processo fim |
| `ORDUFATUACAO` | VARCHAR | 2 | sim | UF atuação |
| `CTRLOSQTDE` | INTEGER | 4 | sim | Controle quantidade |
| `CLITERCE` | INTEGER | 4 | sim | Cliente terceiro (FK→TBCLIEN) |
| `CONNUMER` | INTEGER | 4 | sim | Contrato número |
| `CONVCODIGO` | INTEGER | 4 | sim | Convênio código |
| `CONVDOCNRO` | VARCHAR | 30 | sim | Convênio doc número |
| `CONVDOCDAT` | DATE | 4 | sim | Convênio doc data |
| `CONVAUTNRO` | INTEGER | 4 | sim | Convênio aut número |
| `CONVAUTDAT` | DATE | 4 | sim | Convênio aut data |
| `LANCTOOBRIGACAO` | VARCHAR | 20 | sim | Lançamento obrigação 1 |
| `LANCTOOBRIGACAO2` | VARCHAR | 20 | sim | Lançamento obrigação 2 |
| `LANCTOOBRIGVLR` | NUMERIC(10,2) | 8 | sim | Valor obrigação 1 |
| `LANCTOOBRIGVLR2` | NUMERIC(10,2) | 8 | sim | Valor obrigação 2 |
| `BOLSEUNUMERO` | VARCHAR | 20 | sim | Boleto número |
| `ORDTPCOBRA` | INTEGER | 4 | sim | Tipo cobrança |
| `ORDNROPIV` | VARCHAR | 30 | sim | Número PIV |
| `ORDATENDE` | INTEGER | 4 | sim | Atendente (FK→TBUSUARI) |
| `ORDVENDEDOR` | INTEGER | 4 | sim | Vendedor (FK→TBUSUARI) |
| `USUNUMER` | INTEGER | 4 | sim | Usuário criador (FK→TBUSUARI) |
| `CONDICAO` | INTEGER | 4 | sim | Condição |
| `ORDARQMRTSTA` | SMALLINT | 2 | sim | Status arquivo MRT |
| `ORDARQMRTDTH` | TIMESTAMP | 8 | sim | Data/hora arquivo MRT |
| `CREATED_AT` | TIMESTAMP | 8 | sim | Criação |
| `UPDATED_AT` | TIMESTAMP | 8 | sim | Última atualização |

#### ⚠ Alerta Crítico: CLINUMER vs ORDORIGE

A amostra real do banco mostra OS com valores diferentes:
```
ORDNUMER=108053  CLINUMER=56099  ORDORIGE=1191
```

- **`CLINUMER`** = cliente principal (dono do veículo / responsável)
- **`ORDORIGE`** = empresa/frota de origem (pode ser diferente)

O INSERT atual em `criarOsSgdw` usa apenas `ORDORIGE` mas **não inclui `CLINUMER`** que é `NOT NULL`. Há duas possibilidades:
1. Existe um trigger `BEFORE INSERT` em TBORDSE que copia `ORDORIGE → CLINUMER` automaticamente
2. O INSERT falha silenciosamente (verificar em produção)

**Ação necessária**: Testar criação de OS e verificar se CLINUMER fica preenchido. Se não, adicionar `CLINUMER` ao INSERT com o mesmo valor de `ORDORIGE` para clientes individuais.

#### ORDTMP — Comportamento Confirmado

O trigger `tbcaixa_aiud_tbordse` verifica:
```sql
if (COALESCE(ordtmp, 0) <> 2) then EXIT;
```

OSs criadas pelo **desktop** têm `ORDTMP = NULL` (0 via COALESCE = trigger não processa).  
OSs criadas pelo **app web** têm `ORDTMP = 2` = trigger de caixa atualiza os campos financeiros automaticamente.

**Conclusão**: `ORDTMP = 2` no app web é funcional e faz os campos ORDVLTOT/ORDVLREC/ORDVLPAGO serem atualizados automaticamente via trigger quando lançamentos de caixa forem feitos.

---

### TBCLIEN — Clientes (62 campos)

> **Chave**: `CLINUMER` (INTEGER NOT NULL PK)  
> **Geração de novo CLINUMER**: usar `EXECUTE PROCEDURE PNUMERADOR(X, Y, 'CLIENTES', 1)` ou sequência Firebird

| Campo | Tipo | Tam | Nulo | Descrição |
|-------|------|-----|------|-----------|
| `CLINUMER` | INTEGER | 4 | NOT NULL | **PK** |
| `CLINOMES` | VARCHAR | 100 | sim | Nome / Razão Social |
| `CLINOMES_SA` | VARCHAR | 100 | sim | Nome sem acentos (gerado automaticamente) |
| `CLICPFCG` | VARCHAR | 14 | sim | **CPF ou CNPJ** |
| `CLIIDENT` | VARCHAR | 15 | sim | **RG / IE** |
| `CLIDTNAS` | DATE | 4 | sim | Data nascimento |
| `CLICIVIL` | INTEGER | 4 | sim | Estado civil: 1=Solteiro, 2=Casado, 3=Viúvo, 4=Divorciado, 5=Outros |
| `CLISEXOS` | SMALLINT | 2 | sim | Sexo: 1=Masc, 2=Fem, 3=Não inf. |
| `CLINACIO` | INTEGER | 4 | sim | Nacionalidade: 1=Brasileiro, 2=Estrangeiro, 3=Naturalizado |
| `CLINATUR` | INTEGER | 4 | sim | Naturalidade — FK→TBMUNIC |
| `CLIORGAO` | VARCHAR | 10 | sim | Órgão emissor RG |
| `CLIUFIDE` | VARCHAR | 2 | sim | UF emissão RG |
| `CLIDTEXP` | DATE | 4 | sim | Data expedição RG |
| `CLIOBSER` | VARCHAR | 100 | sim | Observação geral |
| `CLIHISTO` | VARCHAR | 150 | sim | Histórico |
| `CLIPROFI` | VARCHAR | 40 | sim | Profissão |
| `CLINOEMP` | VARCHAR | 60 | sim | Nome empresa empregadora |
| `CLINOPAI` | VARCHAR | 60 | sim | Nome do pai |
| `CLINOMAE` | VARCHAR | 60 | sim | Nome da mãe |
| `CLICONJUGE` | VARCHAR | 60 | sim | Nome do cônjuge |
| `CLICARGO` | VARCHAR | 30 | sim | Cargo |
| `CLISETOR` | VARCHAR | 30 | sim | Setor |
| `CLIESCOL` | INTEGER | 4 | sim | Escolaridade: 1=1ºGrau Inc, 2=1ºGrau Comp, 3=2ºGrau Inc, 4=2ºGrau Comp, 5=3ºGrau Inc, 6=3ºGrau Comp |
| `CLILOGIN` | VARCHAR | 60 | sim | Login do cliente |
| `CLISENHA` | VARCHAR | 60 | sim | Senha do cliente |
| `CLICLASS` | VARCHAR | 2 | sim | Classificação |
| `CLICLASS_ID` | INTEGER | 4 | sim | ID de classificação |
| `CLIATIVO` | SMALLINT | 2 | NOT NULL | 1=ativo, 0=inativo |
| `CLIORIGE` | SMALLINT | 2 | sim | 1=é uma origem (empresa/frota) |
| `CLIEXCLU` | SMALLINT | 2 | sim | 1=excluído |
| `CLIMOBLO` | VARCHAR | 80 | sim | Motivo bloqueio |
| `CLIDTCAD` | DATE | 4 | sim | Data cadastro |
| `CLIENVCO` | SMALLINT | 2 | sim | Enviar correspondência (carta) |
| `CLIENVCOEMA` | SMALLINT | 2 | sim | Enviar correspondência (e-mail) |
| `CLIENVCOSMS` | SMALLINT | 2 | sim | Enviar correspondência (SMS) |
| `CLILINKORI` | INTEGER | 4 | sim | Cliente linkado a uma origem |
| `CLIRESPOLEGAL` | VARCHAR | 100 | sim | Responsável legal |
| `CLIVLADI` | NUMERIC(15,2) | 8 | sim | Valor adicional |
| `CLICTACONTAB` | INTEGER | 4 | sim | Conta contábil |
| `CLIENDQUADRA` | VARCHAR | 25 | sim | Quadra (endereço) |
| `CLIENDLOTE` | VARCHAR | 25 | sim | Lote (endereço) |
| `CLICNDINSS` | VARCHAR | 30 | sim | CND INSS |
| `CLICNDINSSDATA` | DATE | 4 | sim | Data CND INSS |
| `CLILEILAO` | SMALLINT | 2 | sim | Leilão obrigatório |
| `CLIRECIBOCLIENTE` | SMALLINT | 2 | sim | Recibo OS ao cliente |
| `CLINRDIASREC` | INTEGER | 4 | sim | Nr dias recibo |
| `CLIRTBSS` | VARCHAR | 20 | sim | RT-BSS |
| `CLIRTISS` | SMALLINT | 2 | sim | ISS flag retenção |
| `CLIVLISS` | NUMERIC(7,2) | 4 | sim | ISS alíquota |
| `CLIVENORIGEM` | INTEGER | 4 | sim | Vendedor origem |
| `CLIVENDEDOR` | SMALLINT | 2 | sim | Flag vendedor |
| `CLI_ORIGEM_CONTROLADA` | SMALLINT | 2 | sim | Origem controlada |
| `CLIORIBLOQ` | SMALLINT | 2 | sim | Origem bloqueada |
| `CLIPERPAGSEMREC` | SMALLINT | 2 | sim | Permite pag sem recebimento |
| `CLIORICOMISSNENTREGUE` | SMALLINT | 2 | sim | Comissão não entregue |
| `CLICFDEPFJ` | SMALLINT | 2 | sim | Flag CPF/CNPJ |
| `CLIMDESKAPITIC` | SMALLINT | 2 | sim | Movidesk ativo |
| `CLIMDESKCLIENID` | VARCHAR | 200 | sim | Movidesk ID |
| `CLIURLLOGOTIPO` | VARCHAR | 1024 | sim | URL logotipo |
| `CLISIMPLES` | SMALLINT | 2 | sim | Simples nacional |
| `CLIBRADESCO` | SMALLINT | 2 | sim | Bradesco flag |
| `CLIPIXTIPO` | SMALLINT | 2 | sim | PIX tipo |
| `CLIPIXCHAVE` | VARCHAR | 255 | sim | PIX chave |
| `CLINFSEMITENTE` | INTEGER | 4 | sim | NFS emitente |
| `CLIEXCFLAGLGPD` | SMALLINT | 2 | sim | LGPD exclusão flag |
| `CLIEXCDATALGPD` | TIMESTAMP | 8 | sim | LGPD exclusão data |
| `CLIDADOSLGPD` | BLOB | — | sim | LGPD dados |
| `DESNOMES` | VARCHAR | 60 | sim | Nome despachante vinculado |
| `DESENDER` | INTEGER | 4 | sim | **FK→TBENDER** (endereço despachante) |
| `USUNUMER` | INTEGER | 4 | sim | FK→TBUSUARI |
| **`CLIENDER`** | INTEGER | 4 | sim | **FK→TBENDER** (endereço principal) |
| **`CLIENDCO`** | INTEGER | 4 | sim | **FK→TBENDER** (correspondência) |
| **`CLIENDEM`** | INTEGER | 4 | sim | **FK→TBENDER** (endereço empresa) |
| `CLIBOOKNRO` | INTEGER | 4 | sim | Book número |
| `CLIBOOKORI` | VARCHAR | 1024 | sim | Book ORI |
| `CLIBOOKCOMCON` | VARCHAR | 1024 | sim | Book comcon |
| `CLIBOOKCOMPER` | VARCHAR | 1024 | sim | Book comper |
| `CLIBOOKCOMRES` | VARCHAR | 1024 | sim | Book comres |
| `CLIEXTIPP` | vários | — | sim | Campos extras IPI/ICMS |
| `CLIUNICO` / `CLIUNISE` | VARCHAR | 30 | sim | Único/Unise |
| `CREATED_AT` | TIMESTAMP | 8 | sim | Criação |
| `UPDATED_AT` | TIMESTAMP | 8 | sim | Atualização |

#### ⚠ Telefones — NÃO EXISTEM no banco

Não há tabela `TBTELEFON`, `TBFONE` ou `TBCONTATO`. Os campos de telefone da modal (Fone Res., Fone Com., Celular) **não têm correspondência no Firebird**. São campos decorativos na UI atual e não podem ser persistidos sem alterar o schema.

---

### TBENDER — Endereços (12 campos)

> Usada via FK de TBCLIEN (CLIENDER, CLIENDCO, CLIENDEM, DESENDER)  
> **Chave**: `ENDNUMER` (INTEGER NOT NULL PK)

| Campo | Tipo | Tam | Nulo | Descrição |
|-------|------|-----|------|-----------|
| `ENDNUMER` | INTEGER | 4 | NOT NULL | **PK** |
| `MUNNUMER` | INTEGER | 4 | sim | **FK→TBMUNIC** — Município |
| `ENDENDER` | VARCHAR | 60 | sim | Logradouro (rua/av) |
| `ENDNREND` | VARCHAR | 6 | sim | Número |
| `ENDBAIRR` | VARCHAR | 60 | sim | Bairro |
| `ENDNRCEP` | VARCHAR | 8 | sim | CEP |
| `ENDCOMPL` | VARCHAR | 30 | sim | Complemento |
| `ENDCXPOS` | VARCHAR | 15 | sim | Caixa postal |
| `ENDEMAIL` | VARCHAR | 1024 | sim | E-mail |
| `ENDSITES` | VARCHAR | 60 | sim | Website |
| `CREATED_AT` | TIMESTAMP | 8 | sim | — |
| `UPDATED_AT` | TIMESTAMP | 8 | sim | — |

---

### TBVEICU — Veículos (88 campos)

> **Chave**: `VEINUMER` (INTEGER NOT NULL PK)  
> **Geração automática**: `gen_id(genveiculo, 1)` via `EXECUTE PROCEDURE INCLUIVEICULO(0, ...)`

| Campo | Tipo | Tam | Nulo | Descrição |
|-------|------|-----|------|-----------|
| `VEINUMER` | INTEGER | 4 | NOT NULL | **PK** — Auto via gen_id |
| `VEIPLACA` | VARCHAR | 7 | sim | Placa |
| `VEICHASS` | VARCHAR | 21 | sim | Chassi (17 chars padrão + espaços) |
| `VEIRENAV` | VARCHAR | 12 | sim | RENAVAM |
| `MARNUMER` | VARCHAR | 7 | sim | **FK→TBMARCA** — Marca/Modelo |
| `VEINOMAN` | VARCHAR | 100 | sim | Nome anterior |
| `VEICPFAN` | VARCHAR | 14 | sim | CPF/CNPJ anterior |
| `VEIRGAN` | VARCHAR | 15 | sim | RG anterior |
| `VEIPROAT` | INTEGER | 4 | sim | **FK→TBCLIEN** — Proprietário atual |
| `VEIDESTI` | INTEGER | 4 | sim | **FK→TBCLIEN** — Destinatário |
| `VEIPROAT2` | INTEGER | 4 | sim | **FK→TBCLIEN** — Proprietário anterior 2 |
| `VEIORIGE` | INTEGER | 4 | sim | **FK→TBCLIEN** — Origem/empresa |
| `VEIANOFA` | INTEGER | 4 | sim | Ano fabricação |
| `VEIANOMO` | INTEGER | 4 | sim | Ano modelo |
| `VEIFABRI` | INTEGER | 4 | sim | Fabricação: 1=Nacional, 2=Importado |
| `VEIESPEC` | INTEGER | 4 | sim | Espécie: 1=Passageiro, 2=Carga, 3=Misto, 4=Corrida, 5=Tração, 6=Especial, 7=Coleção, 9=S/Registro |
| `VEICORES` | INTEGER | 4 | sim | Cor: 1=Amarela, 2=Azul, 3=Bege, 4=Branca, 5=Cinza, 6=Dourada, 7=Grená, 8=Laranja, 9=Marrom, 10=Prata, 11=Preta, 12=Rosa, 13=Roxa, 14=Verde, 15=Vermelha, 16=Fantasia, 99=S/Registro |
| `VEITIPOS` | INTEGER | 4 | sim | Tipo: 2=Ciclomotor, 3=Motoneta, 4=Motocicleta, 5=Triciclo, 6=Automóvel, 7=Microônibus, 8=Ônibus, 10=Reboque, 11=Semi-Reboque, 13=Camioneta, 14=Caminhão, 15=Caminhão Trator, 18=Trator Rodas, 19=Trator Esteiras, 20=Trator Misto, 21=Quadriciclo, 22=Chassi/Plataforma, 23=Caminhonete, 24=Side-Car, 25=Utilitário, 26=Motor-Casa, 99=S/Registro |
| `VEICOMBU` | INTEGER | 4 | sim | Combustível: 1=Álcool, 2=Gasolina, 3=Diesel, 4=Gasogênio, 5=Gás Metano, 6=Elétrico/Fonte Int., 7=Elétrico/Fonte Ext., 8=Gasolina/GNC, 9=Álcool/GNC, 10=Diesel/GNC, 12=Álcool/GNV, 13=Gasolina/GNV, 14=Diesel/GNV, 15=GNV, 16=Álcool/Gasolina (Flex), 17=Gasolina/Álcool/GNV, 18=Gasolina/Elétrico, 19=Gasolina/Álcool/Elétrico, 99=S/Registro |
| `VEICATEG` | INTEGER | 4 | sim | Categoria: 1=Particular, 2=Aluguel, 3=Oficial, 4=Experiência, 5=Aprendiz, 6=Fabricante, 7=MD, 8=CC, 9=OI, 10=S/Registro |
| `VEIRESTR` | INTEGER | 4 | sim | Restrição: 1=Arrendamento, 2=Reserva de Domínio, 3=Alienação Fiduciária, 4=Rest. Judicial, 5=Rest. Administrativa, 6=Roubo/Furto, 7=Ben. Tributário, 8=Baixa p/ Ord. Jud., 9=Penhor, 10=S/Restrição |
| `VEIPOTEN` | INTEGER | 4 | sim | Potência CV |
| `VEICILIN` | INTEGER | 4 | sim | Cilindradas |
| `VEILOTAC` | INTEGER | 4 | sim | Lotação |
| `VEIEIXOS` | INTEGER | 4 | sim | Eixos |
| `CARNUMER` | INTEGER | 4 | sim | **FK→TBCARRO** — Carroceria |
| `VEICARGA` | NUMERIC(10,2) | 8 | sim | Capacidade de carga (ton) |
| `VEICMTRA` | NUMERIC(10,2) | 8 | sim | CMT |
| `VEIPBTOT` | NUMERIC(10,2) | 8 | sim | PBT |
| `VEINRCRV` | VARCHAR | 15 | sim | Número CRV |
| `MUNNUMER` | INTEGER | 4 | sim | **FK→TBMUNIC** — Município |
| `VEIENTID` | INTEGER | 4 | sim | **FK→TBENTID** — Entidade |
| `VEIDTAQU` | DATE | 4 | sim | Data aquisição |
| `VEIDTAQU` campo carroceria = `VEIDTAQC` | DATE | 4 | sim | Data aquisição carroceria |
| `VEIDTNFI` | DATE | 4 | sim | Data nota fiscal |
| `VEIPREFI` | VARCHAR | 20 | sim | Prefixo |
| `VEIVALOR` | NUMERIC(10,2) | 8 | sim | Valor aquisição (NF) |
| `VEILOGOS` | VARCHAR | 60 | sim | Logos/obs |
| `VEINRMOT` | VARCHAR | 21 | sim | Número motor |
| `VEICHARE` | SMALLINT | 2 | sim | Chassi remarcado: 0=não, 1=sim |
| `VEICHAAL` | SMALLINT | 2 | sim | Chassi alterado: 0=não, 1=sim |
| `VEIATIVO` | SMALLINT | 2 | NOT NULL | 1=ativo |
| `VEIEXCLU` | SMALLINT | 2 | sim | 1=excluído |
| `VEIEMPRE` | SMALLINT | 2 | sim | 1=de empresa |
| `VEIZEROK` | SMALLINT | 2 | sim | 1=zero km |
| `VEIENVCO` | SMALLINT | 2 | sim | Enviar correspondência |
| `VEIEMCIR` | SMALLINT | 2 | sim | Em circulação |
| `VEIDATA` | DATE | 4 | sim | Data gravação |
| `VEIOBSER` | BLOB | — | sim | Observação (blob texto) |
| `VEIHISTO` | BLOB | — | sim | Histórico (blob texto) |
| `VEIDEBITOS` | BLOB | — | sim | Débitos (blob texto) |
| `VEIDEBDATA` | TIMESTAMP | 8 | sim | Data consulta débitos |
| `VEIVANTT` | DATE | 4 | sim | ANTT data |
| `VEIVDNIT` | DATE | 4 | sim | DNIT data |
| `VEIVDAER` | DATE | 4 | sim | DAER data |
| `VEIVCONT` | DATE | 4 | sim | DT controle |
| `VEIVECSV` | DATE | 4 | sim | DT CSV |
| `VEIVBLIN` | DATE | 4 | sim | DT blindagem |
| `VEIVAETS` | DATE | 4 | sim | DT AETS |
| `VEIINEMP` | INTEGER | 4 | sim | IMETRO ID |
| `VEIINMET` | VARCHAR | 20 | sim | IMETRO número |
| `VEIINEMI` | DATE | 4 | sim | IMETRO emissão |
| `VEIINVEN` | DATE | 4 | sim | IMETRO vencimento |
| `VEISTATUS` | INTEGER | 4 | sim | Status |
| `VEISITUACAO` | INTEGER | 4 | sim | Situação |
| `VEIMOBLO` | VARCHAR | 80 | sim | Motivo bloqueio |
| `VEIMOEXC` | VARCHAR | 200 | sim | Motivo exclusão |
| `VEIUSEXC` | INTEGER | 4 | sim | Usuário exclusão |
| `VEIDTEXC` | DATE | 4 | sim | Data exclusão |
| `VEIFROTA` | VARCHAR | 30 | sim | Frota |
| `VEITERRI` | VARCHAR | 30 | sim | Território |
| `VEIREGIO` | VARCHAR | 40 | sim | Região |
| `VEIKM` | INTEGER | 4 | sim | Quilometragem |
| `VEIDTKM` | TIMESTAMP | 8 | sim | Data KM |
| `VEICHAVE` | VARCHAR | 50 | sim | Chave |
| `VEINROPIV` | VARCHAR | 30 | sim | Número PIV |
| `VEIATPV` | VARCHAR | 50 | sim | ATPV |
| `VEICODCLA` | VARCHAR | 50 | sim | Código classificação |
| `VEICODPAIS` | INTEGER | 4 | sim | Código país |
| `VEIVENDEDOR` | VARCHAR | 65 | sim | Nome vendedor |
| `VEIDTDOS` | VARCHAR | 12 | sim | Data dossier |
| `VEIHRDOS` | VARCHAR | 12 | sim | Hora dossier |
| `VEIANFAC` | INTEGER | 4 | sim | Ano fab. carroceria |
| `VEIANMOC` | INTEGER | 4 | sim | Ano mod. carroceria |
| `LOGTELA` | VARCHAR | 255 | sim | Log tela |
| `USUNUMER` | INTEGER | 4 | sim | FK→TBUSUARI |
| `CREATED_AT` | TIMESTAMP | 8 | sim | — |
| `UPDATED_AT` | TIMESTAMP | 8 | sim | — |

---

### TBSERVI — Serviços (4 campos)

| Campo | Tipo | Tam | Nulo | Descrição |
|-------|------|-----|------|-----------|
| `SERNUMER` | INTEGER | 4 | NOT NULL | **PK** |
| `SERDESCR` | VARCHAR | 60 | sim | Descrição do serviço |
| `CREATED_AT` | TIMESTAMP | 8 | sim | — |
| `UPDATED_AT` | TIMESTAMP | 8 | sim | — |

---

### TBCAIXA — Lançamentos Financeiros (45 campos)

| Campo | Tipo | Tam | Nulo | Descrição |
|-------|------|-----|------|-----------|
| `CAIXA` | INTEGER | 4 | NOT NULL | **PK** |
| `CDVENDA` | INTEGER | 4 | sim | **FK→TBORDSE.ORDNUMER** |
| `TPVENDA` | INTEGER | 4 | sim | Tipo: **13=OS**, outros=outros módulos |
| `ORIGEM` | INTEGER | 4 | sim | **FK→TBCLIEN** |
| `VEINUMER` | INTEGER | 4 | sim | **FK→TBVEICU** |
| `TPLANCTO` | VARCHAR | 1 | sim | Tipo lançamento: **'D'=Débito, 'C'=Crédito** |
| `DTLANCTO` | TIMESTAMP | 8 | sim | Data/hora lançamento |
| `DTVENCTO` | DATE | 4 | sim | Data vencimento |
| `ORDDTEMI` | DATE | 4 | sim | Data emissão da OS vinculada |
| `ORDORIGEM` | INTEGER | 4 | sim | Origem da OS |
| `VALOR` | NUMERIC(10,2) | 8 | sim | Valor |
| `GRUPOCONTA` | VARCHAR | 1 | sim | Grupo: **'1'=Receber, '2'=Pagar** |
| `ESTORNO` | SMALLINT | 2 | sim | **0=normal, 1=estornado** |
| `APRAZO` | SMALLINT | 2 | sim | **-1=quitado**, outros=aberto |
| `QUITADO` | SMALLINT | 2 | sim | Flag quitado |
| `CDPLANOCONTA` | INTEGER | 4 | sim | **FK→TBPLANOCONTA** |
| `CDHISTORICO` | INTEGER | 4 | sim | Código histórico |
| `CDBANCO` | INTEGER | 4 | sim | Banco |
| `MOVCAIXAFISICO` | INTEGER | 4 | sim | Movimento caixa físico |
| `NRDOCTOBANCO` | VARCHAR | 55 | sim | Nr documento banco |
| `NRCUPOM` | INTEGER | 4 | sim | Nr cupom |
| `NRNOTA` | INTEGER | 4 | sim | Nr nota |
| `NRDOCTO` | VARCHAR | 21 | sim | Nr documento |
| `NRPARCELA` | INTEGER | 4 | sim | Nr parcela |
| `NRREDETEF` | INTEGER | 4 | sim | Nr rede TEF |
| `CDFATURA` | INTEGER | 4 | sim | Código fatura |
| `TPFATURA` | INTEGER | 4 | sim | Tipo fatura |
| `ITODESCR` | VARCHAR | 150 | sim | Descrição lançamento |
| `HISTOCOMPLE` | VARCHAR | 1024 | sim | Histórico complementar |
| `FLAGLANCTO` | CHAR | 1 | sim | Flag lançamento |
| `CUSTO` | NUMERIC(15,2) | 8 | sim | Custo |
| `EMPRESA` | INTEGER | 4 | sim | Empresa |
| `LANCTOORIGINAL` | INTEGER | 4 | sim | Lançamento original |
| `TIPOORIGEM` | INTEGER | 4 | sim | Tipo origem |
| `USUNUMER` | INTEGER | 4 | sim | FK→TBUSUARI |
| `CDUSUINC` | INTEGER | 4 | sim | Usuário inclusão |
| `DTHRINC` | TIMESTAMP | 8 | sim | Data/hora inclusão |
| `ESTACAO` | INTEGER | 4 | sim | Estação de trabalho |
| `ARQLOTE` | VARCHAR | 30 | sim | Arquivo lote |
| `CAIREFIN` | INTEGER | 4 | sim | Referência financeira |
| `CDHISTOFATBAI` | INTEGER | 4 | sim | Histórico fatura baixa |
| `CXATMP` | INTEGER | 4 | sim | Caixa temporário |
| `CXALIBPAG` | SMALLINT | 2 | sim | Liberado pagamento |
| `CXAUSULIBPAG` | VARCHAR | 500 | sim | Usuário liberação pagamento |
| `USUAUTESTCOD` | INTEGER | 4 | sim | Usuário autenticação código |
| `USUAUTESTNOM` | VARCHAR | 60 | sim | Usuário autenticação nome |
| `CREATED_AT` | TIMESTAMP | 8 | sim | — |
| `UPDATED_AT` | TIMESTAMP | 8 | sim | — |

#### Lógica do trigger TBCAIXA → TBORDSE

O trigger `tbcaixa_aiud_tbordse` (AFTER INSERT OR UPDATE OR DELETE) processa cada lançamento de caixa vinculado a uma OS com `ORDTMP = 2`:

- **ORDVLTOT** = `ORDVALOR - ORDVLDES - ORDVLADI + ORDVLACR`
- **ORDVLPAGO** = soma TBCAIXA onde `GRUPOCONTA='2', TPLANCTO='D', ESTORNO=0` (exceto cdPlanoConta=520)
- **ORDVLAPA** = soma TBCAIXA onde `GRUPOCONTA='2', TPLANCTO='C', ESTORNO=0`
- **ORDVLREC** = soma TBCAIXA onde `GRUPOCONTA='1', TPLANCTO='C', ESTORNO=0, CDPLANOCONTA=50`
- **ORDVLARE** = soma TBCAIXA onde `GRUPOCONTA='1', TPLANCTO='D', ESTORNO=0, CDPLANOCONTA=50`

---

### TBMUNIC — Municípios (9 campos)

| Campo | Tipo | Tam | Descrição |
|-------|------|-----|-----------|
| `MUNNUMER` | INTEGER | 4 | **PK** |
| `MUNDESCR` | VARCHAR | 45 | Nome do município |
| `ESTSIGLA` | VARCHAR | 2 | UF (ex: SC, SP) |
| `MUNNRCEP` | VARCHAR | 8 | CEP base |
| `MUNIBGE` | INTEGER | 4 | Código IBGE |
| `MUNDENATRAN` | VARCHAR | 4 | Código DETRAN |
| `MUNRENDIMENTO` | INTEGER | 4 | Rendimento |
| `CREATED_AT` | TIMESTAMP | 8 | — |
| `UPDATED_AT` | TIMESTAMP | 8 | — |

---

### TBMARCA — Marcas/Modelos de Veículos (5 campos)

| Campo | Tipo | Tam | Descrição |
|-------|------|-----|-----------|
| `MARNUMER` | VARCHAR | 7 | **PK** (string! ex: "059") |
| `MARDESCR` | VARCHAR | 30 | Descrição (ex: "HONDA/CG 125") |
| `MARATWEB` | SMALLINT | 2 | Ativo na web |
| `CREATED_AT` | TIMESTAMP | 8 | — |
| `UPDATED_AT` | TIMESTAMP | 8 | — |

> **Atenção**: `MARNUMER` é VARCHAR, não INTEGER.

---

### TBCARRO — Carrocerias (5 campos)

| Campo | Tipo | Tam | Descrição |
|-------|------|-----|-----------|
| `CARNUMER` | INTEGER | 4 | **PK** |
| `CARDESCR` | VARCHAR | 100 | Descrição da carroceria |
| `CARCATEG` | INTEGER | 4 | Categoria |
| `CREATED_AT` | TIMESTAMP | 8 | — |
| `UPDATED_AT` | TIMESTAMP | 8 | — |

---

### TBENTID — Entidades/Órgãos (12 campos)

| Campo | Tipo | Tam | Descrição |
|-------|------|-----|-----------|
| `ENTNUMER` | INTEGER | 4 | **PK** |
| `ENTNOMES` | VARCHAR | 60 | Nome |
| `ENTSIGLA` | VARCHAR | 20 | Sigla |
| `ENTCOMPE` | VARCHAR | 4 | Competência |
| `ENTATIVO` | SMALLINT | 2 | Ativo |
| `ENTCPFCG` | VARCHAR | 14 | CPF/CNPJ |
| `ENTCONTA` | INTEGER | 4 | Conta |
| `ENTNOMME` | VARCHAR | 60 | Nome membro |
| `ENTCIF` | VARCHAR | 30 | CIF |
| `ENTCODSP` | INTEGER | 4 | Código SP |
| `CREATED_AT` | TIMESTAMP | 8 | — |
| `UPDATED_AT` | TIMESTAMP | 8 | — |

---

### TBPLANOCONTA — Plano de Contas (13 campos)

| Campo | Tipo | Tam | Descrição |
|-------|------|-----|-----------|
| `PLANOCONTA` | INTEGER | 4 | **PK** |
| `CDCONTA` | VARCHAR | 14 | Código conta |
| `NMCONTA` | VARCHAR | 60 | Nome da conta |
| `CDHISTORICO` | INTEGER | 4 | Código histórico |
| `NIVEL_01..05` | VARCHAR | 1-4 | Níveis hierárquicos |
| `VISIVEL` | VARCHAR | 1 | Visível |
| `EMPRESA` | INTEGER | 4 | Empresa |
| `CONTRAPARTIDA` | INTEGER | 4 | Conta contrapartida |
| `CDBANCO` | INTEGER | 4 | Banco |
| `ADMINISTRADORACC` | INTEGER | 4 | Administradora CC |
| `PLAATIVO` | SMALLINT | 2 | Ativo |
| `PLAMOSTRASALDO` | SMALLINT | 2 | Mostra saldo |
| `NATUREZA` | SMALLINT | 2 | Natureza |
| `RELATORIO` | SMALLINT | 2 | No relatório |
| `APELIDO` | VARCHAR | 20 | Apelido |
| `ALTERARVLR` | SMALLINT | 2 | Permitir alterar valor |
| `CREATED_AT / UPDATED_AT` | TIMESTAMP | 8 | — |

---

### TBNUMERADOR — Sequenciador (6 campos)

> Usado pelo `PNUMERADOR` para controlar sequências de números.

| Campo | Tipo | Tam | Descrição |
|-------|------|-----|-----------|
| `NUMCODIG` | INTEGER | 4 | Código do tipo de documento (PK parte 1) |
| `NUMORIGE` | INTEGER | 4 | Origem/empresa (PK parte 2) |
| `NUMDESCR` | VARCHAR | 100 | Descrição |
| `NUMVALOR` | INTEGER | 4 | Valor atual (próximo = NUMVALOR + 1) |
| `CREATED_AT` | TIMESTAMP | 8 | — |
| `UPDATED_AT` | TIMESTAMP | 8 | — |

---

### TBORIGEMVEICULO — Histórico de Proprietários (25 campos)

> Registro de entrada/saída de veículos (usado no módulo de leilão/compra/venda)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `CDVEICULO` | INTEGER NOT NULL | **FK→TBVEICU** (PK) |
| `DTENTRADA` / `DTSAIDA` | DATE | Datas |
| `HRENTRADA` / `HRSAIDA` | TIME | Horas |
| `CDVENDEDORENT` / `CDVENDEDORSAI` | INTEGER | FK→TBUSUARI vendedor |
| `CDCLIENTEENT` / `CDCLIENTESAI` | INTEGER | FK→TBCLIEN |
| `HISTOENT` / `HISTOSAI` | BLOB | Históricos |
| `VLDEBITOENT` / `VLDEBITOSAI` | NUMERIC | Valores |
| `VLAVISTAENT` / `VLAVISTASAI` | NUMERIC | À vista |
| `VLSIMULADOENT` / `VLSIMULADOSAI` | NUMERIC | Simulados |
| `HISTODEBENT` / `HISTODEBSAI` | BLOB | Histórico débito |
| `MUNICIPIOENT` / `MUNICIPIOSAI` | INTEGER | FK→TBMUNIC |
| `LOJISTA` | INTEGER | FK→TBCLIEN (lojista) |
| `DTVALPROC` | DATE | Data validade processamento |
| `CREATED_AT` / `UPDATED_AT` | TIMESTAMP | — |

---

## SQLs Prontos para Integração

### Busca Completa de Cliente por CLINUMER

```sql
SELECT
  CLI.CLINUMER,
  TRIM(CLI.CLINOMES)   AS NOME,
  CLI.CLICPFCG         AS CPF_CNPJ,
  CLI.CLIIDENT         AS RG_IE,
  CLI.CLIDTNAS         AS DT_NASCIMENTO,
  CLI.CLICIVIL         AS ESTADO_CIVIL,
  CLI.CLISEXOS         AS SEXO,
  CLI.CLIPROFI         AS PROFISSAO,
  CLI.CLINOEMP         AS EMPRESA,
  CLI.CLIOBSER         AS OBSERVACAO,
  CLI.CLIATIVO         AS ATIVO,
  CLI.CLIDTCAD         AS DT_CADASTRO,
  EDD.ENDENDER         AS LOGRADOURO,
  EDD.ENDNREND         AS NUMERO,
  EDD.ENDBAIRR         AS BAIRRO,
  EDD.ENDNRCEP         AS CEP,
  EDD.ENDCOMPL         AS COMPLEMENTO,
  EDD.ENDEMAIL         AS EMAIL,
  MUN.MUNDESCR         AS MUNICIPIO,
  MUN.ESTSIGLA         AS UF
FROM TBCLIEN CLI
LEFT JOIN TBENDER EDD ON EDD.ENDNUMER = CLI.CLIENDER
LEFT JOIN TBMUNIC MUN ON MUN.MUNNUMER = EDD.MUNNUMER
WHERE CLI.CLINUMER = ?
```

### Busca Completa de Veículo por Placa

```sql
SELECT
  VEI.VEINUMER,
  TRIM(VEI.VEIPLACA)   AS PLACA,
  TRIM(VEI.VEICHASS)   AS CHASSI,
  TRIM(VEI.VEIRENAV)   AS RENAVAM,
  VEI.VEIANOFA         AS ANO_FABRICACAO,
  VEI.VEIANOMO         AS ANO_MODELO,
  VEI.VEIFABRI         AS FABRICACAO,
  VEI.VEIESPEC         AS ESPECIE,
  VEI.VEICORES         AS COR,
  VEI.VEITIPOS         AS TIPO,
  VEI.VEICOMBU         AS COMBUSTIVEL,
  VEI.VEICATEG         AS CATEGORIA,
  VEI.VEIRESTR         AS RESTRICAO,
  TRIM(VEI.VEINRCRV)   AS NR_CRV,
  VEI.VEIDTAQU         AS DT_AQUISICAO,
  VEI.VEIVALOR         AS VALOR_NF,
  VEI.VEIZEROK         AS ZERO_KM,
  VEI.VEIATIVO         AS ATIVO,
  TRIM(VEI.VEINRMOT)   AS NR_MOTOR,
  TRIM(MAR.MARDESCR)   AS MARCA_MODELO,
  TRIM(CLI.CLINOMES)   AS PROPRIETARIO_ATUAL,
  MUN.MUNDESCR         AS MUNICIPIO,
  MUN.ESTSIGLA         AS UF
FROM TBVEICU VEI
LEFT JOIN TBMARCA MAR ON MAR.MARNUMER = VEI.MARNUMER
LEFT JOIN TBCLIEN CLI ON CLI.CLINUMER = VEI.VEIPROAT
LEFT JOIN TBMUNIC MUN ON MUN.MUNNUMER = VEI.MUNNUMER
WHERE TRIM(VEI.VEIPLACA) = ?
```

### INSERT Correto de Nova OS

```sql
INSERT INTO TBORDSE (
  ORDNUMER,    -- próximo número (via MAX ou PNUMERADOR)
  CLINUMER,    -- ⚠ OBRIGATÓRIO NOT NULL = mesmo valor de ORDORIGE para cliente individual
  ORDDTEMI,    -- data emissão 'YYYY-MM-DD'
  ORDORIGE,    -- FK→TBCLIEN (cliente/origem)
  SOSNUMER,    -- FK→TBSERVI (serviço)
  VEINUMER,    -- FK→TBVEICU (veículo)
  ORDVALOR,    -- valor base
  ORDVLTOT,    -- total = valor + acréscimo - desconto
  ORDVLDES,    -- desconto
  ORDVLADI,    -- adicional (0)
  ORDVLACR,    -- acréscimo
  ORDCANC,     -- 0 = ativa
  ORDTMP,      -- 2 = app web (trigger de caixa irá atualizar campos financeiros)
  ORDVLREC,    -- 0 (será atualizado pelo trigger)
  ORDVLARE,    -- total (será recalculado pelo trigger)
  ORDVLPAGO,   -- 0
  ORDVLAPA,    -- 0
  ORDEXERC,    -- ano exercício (ex: 2026)
  USUNUMER     -- usuário (opcional)
) VALUES (
  ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 0, 2, 0, ?, 0, 0, ?, ?
)
```

> **Diferença do INSERT atual**: adicionar `CLINUMER` (obrigatório) e `ORDEXERC` (exercício).

### Criar Novo Veículo (seguro, sem race condition)

```sql
EXECUTE PROCEDURE INCLUIVEICULO(
  0,          -- PVEINUMER=0 → gen_id(genveiculo,1) automático
  :placa,     -- PVEIPLACA VARCHAR(7)
  :chassi,    -- PVEICHASS VARCHAR(21)
  :renavam,   -- PVEIRENAV VARCHAR(12)
  :marnumer,  -- PMARNUMER VARCHAR(7) FK→TBMARCA
  null,       -- PVEINOMAN (nome anterior)
  null,       -- PVEICPFAN (CPF anterior)
  null,       -- PVEIRGAN (RG anterior)
  :proat,     -- PVEIPROAT (proprietário atual FK→TBCLIEN)
  null,       -- PVEIDESTI
  :anofa,     -- PVEIANOFA
  :anomo,     -- PVEIANOMO
  :fabri,     -- PVEIFABRI (1=Nacional, 2=Importado)
  :espec,     -- PVEIESPEC (espécie)
  :cores,     -- PVEICORES (cor)
  :tipos,     -- PVEITIPOS (tipo)
  :combu,     -- PVEICOMBU (combustível)
  :categ,     -- PVEICATEG (categoria)
  null,       -- PVEIPOTEN
  null,       -- PVEICILIN
  null,       -- PVEILOTAC
  null,       -- PCARNUMER
  null,       -- PVEICARGA
  null,       -- PVEICMTRA
  null,       -- PVEIPBTOT
  :restr,     -- PVEIRESTR (restrição)
  null,       -- PVEIENTID
  :nrcrv,     -- PVEINRCRV VARCHAR(10)
  null,       -- MUNNUMER
  null,       -- PVEIDTAQU
  null,       -- PVEIPREFI
  :valor,     -- PVEIVALOR (valor NF)
  :orige,     -- PVEIORIGE (origem FK→TBCLIEN)
  null,       -- PVEILOGOS
  :nrmot,     -- PVEINRMOT (nr motor)
  0,          -- PVEICHARE (chassi remarcado)
  1,          -- PVEIATIVO (ativo)
  0,          -- PVEICHAAL (chassi alterado)
  CURRENT_DATE, -- PVEIDATA
  :zerok,     -- PVEIZEROK (0=não, 1=sim zero km)
  null,       -- PVEIEIXOS
  null,       -- USUNUMER
  0           -- PVEIENVCO
)
```

Retorna `RETORNO` = novo `VEINUMER` gerado.

### Criar Novo Cliente

```sql
-- Passo 1: Criar endereço (se necessário)
INSERT INTO TBENDER (MUNNUMER, ENDENDER, ENDNREND, ENDBAIRR, ENDNRCEP, ENDCOMPL, ENDEMAIL)
VALUES (?, ?, ?, ?, ?, ?, ?)
-- pegar ENDNUMER gerado (via MAX(ENDNUMER) ou generator)

-- Passo 2: Criar cliente
INSERT INTO TBCLIEN (
  CLINUMER,   -- próximo via MAX(CLINUMER)+1 ou PNUMERADOR
  CLINOMES,   -- nome completo
  CLICPFCG,   -- CPF/CNPJ (14 chars sem máscara)
  CLIIDENT,   -- RG/IE (15 chars)
  CLIATIVO,   -- 1
  CLIORIGE,   -- 0=cliente normal, 1=origem/empresa
  CLIDTCAD,   -- CURRENT_DATE
  CLIENDER,   -- endNUMER do passo 1 (se endereço fornecido)
  USUNUMER    -- usuário
) VALUES (?, ?, ?, ?, 1, 0, CURRENT_DATE, ?, ?)
```

### Buscar Próxima OS (forma segura)

```sql
-- Opção 1: MAX+1 (simples, baixo risco para uso single-user)
SELECT MAX(ORDNUMER) + 1 AS PROXIMO FROM TBORDSE

-- Opção 2: Via PNUMERADOR (atômico, usa TBNUMERADOR)
-- Primeiro verificar qual NUMCODIG=OS na empresa (NUMORIGE=4309)
SELECT NUMCODIG, NUMDESCR, NUMVALOR FROM TBNUMERADOR WHERE NUMORIGE = 4309
-- Depois executar:
EXECUTE PROCEDURE PNUMERADOR(:numcodig, 4309, 'OS', 1)
-- Retorna PVALOR = próximo número (já incrementado)
```

### Cancelar OS

```sql
UPDATE TBORDSE SET
  ORDCANC = 1,
  ORDDTCAN = CURRENT_DATE,
  ORDMOCAN = ?,   -- motivo
  ORDUSCAN = ?    -- usuário
WHERE ORDNUMER = ?
```

### Buscar Marcas/Modelos para Select

```sql
SELECT TRIM(MARNUMER) AS CODIGO, TRIM(MARDESCR) AS DESCRICAO
FROM TBMARCA
WHERE MARATWEB = 1 OR MARATWEB IS NULL
ORDER BY MARDESCR
```

### Buscar Serviços para Select

```sql
SELECT SERNUMER, TRIM(SERDESCR) AS DESCRICAO
FROM TBSERVI
ORDER BY SERNUMER
```

### Buscar Municípios por nome (para autocomplete)

```sql
SELECT FIRST 20 MUNNUMER, TRIM(MUNDESCR) AS MUNICIPIO, TRIM(ESTSIGLA) AS UF
FROM TBMUNIC
WHERE TRIM(MUNDESCR) CONTAINING ?
ORDER BY MUNDESCR
```

---

## Status Atual da Integração Web

### ✅ Funcionando Corretamente

| Funcionalidade | Arquivo | Observação |
|---|---|---|
| Listar OS com filtros | `client.ts:buscarOsSgdw` | OK |
| KPI financeiro OS | `client.ts:buscarKpiOsSgdw` | OK |
| Cancelar/Reativar OS | `client.ts:cancelarOsSgdw` | OK |
| Listar Clientes | `client.ts:buscarClientesSgdw` | OK |
| Buscar cliente por nome | `client.ts:buscarClientesPorNomeSgdw` | OK |
| Listar Veículos | `client.ts:buscarVeiculosSgdw` | OK |
| Buscar veículo por placa | `client.ts:buscarVeiculoPorPlacaSgdw` | Retorna só PLACA+RENAVAM |
| Listar Serviços | `client.ts:buscarServicosSgdw` | OK |
| Listar Caixa | `client.ts:buscarCaixaSgdw` | OK |
| KPI Caixa | `client.ts:buscarKpiCaixaSgdw` | OK |
| Listar Empresas | `client.ts:buscarEmpresasSgdw` | OK |
| Veículos por Empresa | `client.ts:buscarVeiculosEmpresaSgdw` | OK |
| OS por Veículo | `client.ts:buscarOsVeiculoSgdw` | OK |
| Planilha Empresa/Mês | `client.ts:buscarOsEmpresaMesSgdw` | OK |
| Export Excel empresa | `app/sgdw/empresa/[clinumer]/page.tsx` | OK |
| Criar OS (core) | `client.ts:criarOsSgdw` | Core OK, ver alertas abaixo |

### ⚠ Incompleto ou com Ressalvas

| Item | Problema | Solução |
|---|---|---|
| **CLINUMER no INSERT** | `criarOsSgdw` não inclui `CLINUMER` (NOT NULL). Pode haver trigger que copia de ORDORIGE. | Adicionar `CLINUMER = :clinumer` no INSERT (mesmo valor de ORDORIGE para clientes individuais) |
| **ORDEXERC no INSERT** | Campo "Exercício" existe em TBORDSE mas não é enviado | Adicionar `ORDEXERC = :exercicio` (INTEGER, ex: 2026) |
| **Dados completos do veículo** | `buscarVeiculoPorPlacaSgdw` retorna só VEINUMER/PLACA/RENAVAM | Expandir SELECT para incluir VEIANOFA, VEIANOMO, VEICORES, VEICOMBU, VEITIPOS, VEIESPEC, VEINRCRV, MARDESCR, etc. |
| **Dados completos do cliente** | Ao selecionar cliente no Nova OS, não carrega CPF/endereço | Adicionar query `buscarClientePorNumeroSgdw` com JOIN TBENDER |
| **Obs da OS** | O campo `obs` é passado mas não está no INSERT (TBORDSE não tem campo de observação óbvio — verificar se existe `ORDREFIN` ou outra coluna) | Verificar campo correto com schema. Candidato: `ORDREFIN` (VARCHAR 300) |
| **Criar novo veículo** | Não implementado no app web | Implementar chamada a `EXECUTE PROCEDURE INCLUIVEICULO` |
| **Criar novo cliente** | Não implementado no app web | INSERT TBENDER + INSERT TBCLIEN |
| **Telefones** | **Não existem em nenhuma tabela Firebird** | Não há coluna para persistir telefones. Armazenar em Firebase ou ignorar |
| **OS Number Safety** | `MAX(ORDNUMER)+1` tem race condition teórica | Usar `EXECUTE PROCEDURE PNUMERADOR` para produção multi-usuário |

### ❌ Não Implementado (futuras funcionalidades)

| Funcionalidade | Tabelas Envolvidas | Complexidade |
|---|---|---|
| Cadastrar novo cliente | TBCLIEN + TBENDER | Média |
| Editar cliente | TBCLIEN + TBENDER (UPDATE) | Média |
| Cadastrar novo veículo | `EXECUTE PROCEDURE INCLUIVEICULO` | Alta |
| Editar veículo | UPDATE TBVEICU | Média |
| Lançar recebimento (caixa) | INSERT TBCAIXA com GRUPOCONTA='1', TPLANCTO='D', CDPLANOCONTA=50 | Alta |
| Lançar pagamento (caixa) | INSERT TBCAIXA com GRUPOCONTA='2' | Alta |
| Histórico de proprietários | TBORIGEMVEICULO + `EXECUTE PROCEDURE GRAVAORIGEMVEICULO` | Alta |
| Emissão de boleto | TBCAIXA + integração bancária | Muito alta |

---

## Estrutura do Banco de Dados Físico

| Arquivo | Tamanho | Uso |
|---|---|---|
| `\\servidor\SGDW\Dados\SGDW.GDB` | 3.3 GB | **Banco principal** (toda a operação) |
| `\\servidor\SGDW\Dados\SGDWDOC.GDB` | 674 MB | Documentos/NFS-e |
| `\\servidor\SGDW\Dados\SGDWLOG.GDB` | 609 MB | Logs de auditoria |
| `\\servidor\SGDW\Dados\SGDWTMP.GDB` | 1.3 MB | Temporários |
| `\\servidor\SGDW\Dados\SGDWWHATS.GDB` | 82 MB | Integração WhatsApp |

**Conexão** (uso interno apenas):
- Driver: Interbase/Firebird 2.5
- Charset: ISO8859_2
- User: sysdba / masterkey
- Path local no servidor: `c:\sgdw\Dados\sgdw.gdb`

**Acesso do app web**: via `/api/sgdw-relay` (relay HTTP local que conecta ao Firebird)

---

## Convenções do Banco

### Prefixos de Campos

| Prefixo | Tabela |
|---------|--------|
| `ORD` | TBORDSE (OS) |
| `CLI` | TBCLIEN (clientes) |
| `VEI` | TBVEICU (veículos) |
| `SER` | TBSERVI (serviços) |
| `MAR` | TBMARCA (marcas) |
| `MUN` | TBMUNIC (municípios) |
| `END` | TBENDER (endereços) |
| `CAR` | TBCARRO (carrocerias) |
| `ENT` | TBENTID (entidades) |
| `NUM` | TBNUMERADOR |
| `USU` | TBUSUARI |
| `PLA` / `NM` | TBPLANOCONTA |

### Campos Padrão Presentes em Todas as Tabelas

```
CREATED_AT  TIMESTAMP  — preenchido por trigger ao inserir
UPDATED_AT  TIMESTAMP  — preenchido por trigger ao atualizar
```

### Generators (Sequências Firebird) Conhecidos

| Generator | Uso |
|-----------|-----|
| `genveiculo` | Gera VEINUMER para novos veículos (`gen_id(genveiculo, 1)`) |

---

*Documento gerado por consulta direta ao banco via API relay. Nenhum dado foi modificado.*
