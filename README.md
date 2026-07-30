# Carteira de Acordos

Aplicação Vite + React + Node para importar uma planilha de acordos, atualizar registros existentes e filtrar a carteira por condomínio, vencimento, nome, acordo ou parcela.

## Como rodar

```bash
npm install
npm run dev
```

Frontend: `http://127.0.0.1:5173`

API: `http://127.0.0.1:3001`

## Importação

O importador aceita arquivos `.xlsx` e `.csv`, lê a primeira aba da planilha e usa a coluna `Acordo` como identificador principal. Quando existir coluna de parcela, a chave interna passa a ser `Acordo + Parcela`, permitindo manter as parcelas do mesmo acordo separadas.

Colunas reconhecidas automaticamente:

- Acordo: `Acordo`, `ID Acordo`, `Numero Acordo`, `Número Acordo`, `Nº Acordo`
- Parcela: `Parcela`, `Numero Parcela`, `Número Parcela`, `Nº Parcela`, `Num Parcela`
- Nome: `Nome`, `Cliente`, `Devedor`, `Morador`, `Sacado`, `Pagador`
- Condomínio: `Condominio`, `Condomínio`, `Empreendimento`, `Condominio Nome`
- Vencimento: `Vencimento`, `Data Vencimento`, `Data de Vencimento`, `Dt Vencimento`
- Valor: `Valor`, `Valor Parcela`, `Valor do Acordo`, `Total`
- Status: `Status`, `Situação`, `Situacao`

Os dados ficam salvos em `server/data/acordos.json`.
