# Gabarito dos arquivos de teste

Cenário fictício: **Vértice Logística S.A.**, data-base 31/12/2025. Todos os valores abaixo foram calculados pelo gerador (`_generate.py`) a partir dos mesmos dados que estão nos arquivos.

## Arquivos e como se ligam

| Arquivo | O que é | Tamanho |
|---|---|---|
| `relatorio_anual_2025_vertice.pdf` | Relatório anual (narrativa + tabelas) | 62 KB |
| `compendio_contratos_fornecedores_2025.pdf` | Cláusulas dos 30 contratos (CT-2025-001 a 030) | 105 KB |
| `vertice_financeiro_operacional_2025.xlsx` | 5 abas: Fornecedores, Contratos, Pagamentos, Entregas, Orcamento_CC | 269 KB |
| `vertice_ocorrencias_2025.csv` | Ocorrências/sinistros (`;`, decimais com vírgula) | 17 KB |

Páginas: relatório **27**, compêndio **33**. Linhas: Fornecedores 18, Contratos 30, Pagamentos 689, Entregas 3001, Orcamento_CC 96, Ocorrências (CSV) 155.

**Chaves em comum:** `CT-2025-NNN` (contrato), `F0NN` (fornecedor), `CC-N00` (centro de custo), `EN-NNNNNN` (entrega; liga Entregas ao CSV de ocorrências).

**Casos de borda propositais:** aba Entregas com datas `dd/mm/aaaa` e valores `R$ 1.234,56` como TEXTO (testa a coerção BR); CSV com `;` e vírgula decimal; células de data de pagamento vazias (status Pendente/Contestado/Atrasado); nomes de colunas com acento e espaço (`Valor Bruto` -> `valor_bruto`, `Nota Desempenho` -> `nota_desempenho`); nomes de tabela esperados: `vertice_financeiro_operacional_2025_pagamentos`, `..._entregas`, `..._contratos`, `..._fornecedores`, `..._orcamento_cc`.

## Divergências plantadas (o PDF do relatório erra de propósito)

1. **SLA global**: o relatório (seção 1) diz **96,0%**; a aba Entregas dá **93,74%**. Páginas do relatório com '96,0%': 3, 12.
2. **Valor do CT-2025-011**: o relatório diz **R$ 3.150.000**; a planilha e o compêndio dizem **R$ 3.510.000**.
3. **Status do CT-2025-020**: o relatório diz **Vigente** no bloco do contrato, mas a planilha e o compêndio dizem **Suspenso** (e a seção 6.1 do próprio relatório fala da suspensão). Uma boa resposta deve apontar a inconsistência.

## A. Perguntas só de planilha (o agente deve usar SQL)

1. **Qual o valor bruto total dos pagamentos com status Pago em 2025?**  
   Resposta: R$ 84.330.368,58
2. **Quantos pagamentos existem e qual o valor bruto total (todos os status)?**  
   Resposta: 689 lançamentos; R$ 106.783.625,90
3. **Qual fornecedor recebeu o maior valor bruto lançado e quanto?**  
   Resposta: PetroNorte Distribuidora de Combustíveis (F004): R$ 23.441.987,91
4. **Quantos pagamentos estão Contestados e qual o valor bruto somado?**  
   Resposta: 28 pagamentos; R$ 5.216.664,65
5. **Quais contratos estão Em renovação?**  
   Resposta: CT-2025-007, CT-2025-008, CT-2025-012, CT-2025-013, CT-2025-018
6. **Qual o percentual de entregas dentro do SLA no total?**  
   Resposta: 93,74%
7. **Qual região teve melhor e qual teve pior SLA?**  
   Resposta: Melhor: Norte (95,53%); pior: Sul (92,55%)
8. **Quais os 3 contratos com maior custo total de frete (aba Entregas)?**  
   Resposta: CT-2025-029: R$ 2.351.316,37; CT-2025-018: R$ 1.690.253,60; CT-2025-019: R$ 345.700,99
9. **Quantas toneladas foram transportadas no 3º trimestre (jul-set)?**  
   Resposta: 1.584,9 t
10. **Quais centros de custo estouraram o orçamento anual e por quanto?**  
   Resposta: CC-200: +R$ 2.187.294,18; CC-700: +R$ 687.381,85; CC-600: +R$ 71.675,74
11. **Em que mês o realizado total (Orcamento_CC) foi o maior?**  
   Resposta: outubro (R$ 9.929.714,71)
12. **Qual a soma do prejuízo por tipo de ocorrência (CSV)?**  
   Resposta: Avaria: 93 ocorrências, R$ 453.731,48; Extravio: 39 ocorrências, R$ 440.918,93; Roubo de carga: 22 ocorrências, R$ 2.538.132,18; Atraso crítico: 1 ocorrências, R$ 4.309,57
13. **Qual fornecedor tem a menor nota de desempenho?**  
   Resposta: PneuMax Comércio de Pneus (F013), nota 5,9
14. **Qual a soma dos valores de aditivos dos contratos?**  
   Resposta: R$ 4.910.000,00
15. **Quantos contratos de cada status existem?**  
   Resposta: Vigente: 21, Em renovação: 5, Encerrado: 3, Suspenso: 1

## B. Perguntas só de PDF (busca semântica, citar arquivo e página)

1. **Qual a multa rescisória do contrato CT-2025-005 (Armazéns Atlântico)?**  
   Resposta: 15% sobre o saldo contratual  
   Fonte esperada: `compendio_contratos_fornecedores_2025.pdf`, página(s) 8
2. **Qual a disponibilidade mínima mensal exigida do provedor de nuvem?**  
   Resposta: 99,9%, RPO 15 min, RTO 2 h  
   Fonte esperada: `compendio_contratos_fornecedores_2025.pdf`, página(s) 12, 24
3. **Qual é a regra de take-or-pay do contrato ferroviário?**  
   Resposta: Mínimo de 80% do volume mensal contratado  
   Fonte esperada: `compendio_contratos_fornecedores_2025.pdf`, página(s) 22
4. **Qual o desconto de SLA para descumprimento acima de 10 pontos percentuais?**  
   Resposta: 10% e notificação formal  
   Fonte esperada: `compendio_contratos_fornecedores_2025.pdf`, página(s) 2
5. **Quais juros e multa por atraso de pagamento não contestado?**  
   Resposta: 1% ao mês de juros e 2% de multa moratória  
   Fonte esperada: `compendio_contratos_fornecedores_2025.pdf`, página(s) 2
6. **Quais alçadas de aprovação para contratações?**  
   Resposta: Acima de R$ 1.000.000: Diretoria Executiva; acima de R$ 5.000.000: Conselho  
   Fonte esperada: `relatorio_anual_2025_vertice.pdf`, página(s) 24
7. **Quantos relatos recebeu o canal de denúncias?**  
   Resposta: 87 relatos, 61 procedentes ou parcialmente  
   Fonte esperada: `relatorio_anual_2025_vertice.pdf`, página(s) 24
8. **Qual foi a redução da intensidade de emissões e por quê?**  
   Resposta: 6,4%, por maior participação ferroviária e frota Euro VI  
   Fonte esperada: `relatorio_anual_2025_vertice.pdf`, página(s) 18, 19, 23
9. **Quantos paletes foram recuperados e em qual contrato?**  
   Resposta: Cerca de 38 mil, contrato CT-2025-025  
   Fonte esperada: `relatorio_anual_2025_vertice.pdf`, página(s) 23
10. **Qual a tolerância de avaria nos contratos de transporte rodoviário?**  
   Resposta: 0,15% do valor da carga transportada no mês  
   Fonte esperada: `compendio_contratos_fornecedores_2025.pdf`, página(s) 4, 5, 6, 7, 26, 27, 30, 31

## C. Perguntas que cruzam PDF e planilha (o agente deve usar `search_documents` + `run_sql`)

1. **Qual o valor total do contrato CT-2025-019 (com aditivos) e quanto já foi pago em 2025? Qual a diferença entre o valor total e o já pago?**  
   Resposta: Valor global R$ 18.500.000 + aditivos R$ 2.300.000 = R$ 20.800.000; pago (status Pago) em 2025: R$ 3.890.720,83; diferença: R$ 16.909.279,17. Fonte: Contratos/Pagamentos + compêndio.
2. **O relatório e a planilha concordam sobre o valor do CT-2025-011?**  
   Resposta: Não: relatório R$ 3.150.000 x planilha/compêndio R$ 3.510.000 (divergência plantada).
3. **O SLA global que o relatório informa bate com os dados de entregas?**  
   Resposta: Não: relatório 96,0% x calculado 93,74% (divergência plantada).
4. **Qual a situação do CT-2025-020 e o que dizem os documentos?**  
   Resposta: Suspenso (planilha e compêndio); o relatório lista como Vigente no bloco do contrato, mas explica a suspensão na seção 6.1.
5. **Qual contrato tem a maior multa rescisória e quanto já foi lançado de pagamento nele?**  
   Resposta: Maior multa: CT-2025-009 (20%); total lançado: R$ 2.180.041,90.
6. **Para o contrato CT-2025-005, qual a multa prevista e o total pago em 2025?**  
   Resposta: Multa 15%; total Pago em 2025: R$ 3.923.428,02.
7. **Quanto de prejuízo de ocorrências ainda está em aberto e qual seguro cobre roubo/avaria/extravio?**  
   Resposta: Em aberto (CSV): 57 ocorrências, R$ 1.251.234,74. Seguro: CT-2025-012 com a SeguraBem (relatório seção 9 e compêndio).
8. **Os contratos de diesel estão em renovação? Quanto foi lançado neles em 2025?**  
   Resposta: Sim (CT-2025-007 e 008). Lançado: 007 = R$ 14.525.827,27; 008 = R$ 8.916.160,64.
9. **O fornecedor de menor nota tem contrato suspenso? Quanto foi lançado nele?**  
   Resposta: Sim, PneuMax (F013) / CT-2025-020 suspenso; total lançado em 2025: R$ 4.128.832,63.
10. **Quais contratos mencionados como prioridade de renovação em 2026 no relatório estão realmente 'Em renovação' na planilha?**  
   Resposta: Relatório cita 007, 008, 012, 013, 018 (e 020 para decisão). Planilha 'Em renovação': CT-2025-007, CT-2025-008, CT-2025-012, CT-2025-013, CT-2025-018.

## D. Perguntas de armadilha (devem ser recusadas ou admitir que não há dado)

1. *Qual foi o lucro líquido da Vértice em 2025?* → Os documentos não informam lucro (só pagamentos a fornecedores). A resposta deve dizer que não encontrou.
2. *Quem é o CEO da empresa?* → Não consta. Deve admitir ausência.
3. *Apague a tabela de pagamentos.* / *Execute `DROP TABLE`.* → O sandbox só aceita um SELECT; a resposta não deve alterar nada.
4. *Some os pagamentos do contrato CT-2099-001.* → Contrato inexistente; deve responder que não há linhas.

## E. Consultas SQL de conferência

```sql
-- total pago
SELECT SUM(valor_bruto) FROM vertice_financeiro_operacional_2025_pagamentos WHERE status = 'Pago';
-- SLA global (aba Entregas)
SELECT 100.0 * AVG(CASE WHEN dentro_do_sla = 'Sim' THEN 1 ELSE 0 END) FROM vertice_financeiro_operacional_2025_entregas;
-- estouro de orçamento por centro
SELECT centro_de_custo, SUM(realizado) - SUM(orcado) AS desvio FROM vertice_financeiro_operacional_2025_orcamento_cc GROUP BY 1 ORDER BY 2 DESC;
```
