import cors from "cors";
import express from "express";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import multer from "multer";
import readXlsxFile from "read-excel-file/node";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { del, get, put } from "@vercel/blob";
import { handleUpload } from "@vercel/blob/client";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3001);
const DATA_DIR = path.join(__dirname, "data");
const UPLOAD_DIR = process.env.VERCEL ? os.tmpdir() : path.join(__dirname, "uploads");
const DB_FILE = path.join(DATA_DIR, "acordos.json");
const DB_BLOB_PATH = process.env.DB_BLOB_PATH || "data/acordos.json";
const G5_USERS = new Set(["jvc", "jvr", "sys"]);

if (!process.env.VERCEL) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const upload = multer({
  dest: UPLOAD_DIR,
  limits: { fileSize: 25 * 1024 * 1024 },
});

const app = express();
app.use(cors());
app.use(express.json());

function emptyDb() {
  return { updatedAt: null, agreements: [] };
}

function useBlobStorage() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function blobOptions(extra = {}) {
  return { token: process.env.BLOB_READ_WRITE_TOKEN, ...extra };
}

function privateBlobOptions(extra = {}) {
  return blobOptions({ access: "private", ...extra });
}

function isMissingBlobError(error) {
  const status = error?.status || error?.statusCode || error?.response?.status;
  return status === 404 || /not found|404/i.test(String(error?.message || ""));
}

async function readStreamText(stream) {
  if (!stream) return "";
  if (typeof stream.getReader === "function") {
    return new Response(stream).text();
  }

  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function readDb() {
  if (useBlobStorage()) {
    try {
      const blob = await get(DB_BLOB_PATH, privateBlobOptions());
      const text = await readStreamText(blob.stream);
      return text ? JSON.parse(text) : emptyDb();
    } catch (error) {
      if (isMissingBlobError(error)) return emptyDb();
      throw error;
    }
  }

  if (!fs.existsSync(DB_FILE)) {
    return emptyDb();
  }

  return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}

async function writeDb(db) {
  if (useBlobStorage()) {
    await put(DB_BLOB_PATH, JSON.stringify(db), blobOptions({
      access: "private",
      allowOverwrite: true,
      contentType: "application/json",
    }));
    return;
  }

  if (process.env.VERCEL) {
    throw new Error("Configure BLOB_READ_WRITE_TOKEN na Vercel para gravar os acordos.");
  }

  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf8");
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizeHeader(header) {
  return normalizeText(header).replace(/[^a-z0-9]/g, "");
}

function getValue(row, aliases) {
  const entries = Object.entries(row);
  const normalizedAliases = aliases.map(normalizeHeader);
  const found = entries.find(([key]) => normalizedAliases.includes(normalizeHeader(key)));
  return found ? found[1] : "";
}

function excelDateToIso(value) {
  if (!value) return "";

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  const text = String(value).trim();
  const brMatch = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?$/);
  if (brMatch) {
    const [, rawDay, rawMonth, rawYear] = brMatch;
    const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
    return `${year}-${rawMonth.padStart(2, "0")}-${rawDay.padStart(2, "0")}`;
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

function parseCurrency(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return value;

  const onlyNumber = String(value)
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");
  const parsed = Number(onlyNumber);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseBoolean(value) {
  return ["true", "sim", "1", "yes"].includes(normalizeText(value));
}

function getAgreementTags(user) {
  return G5_USERS.has(normalizeText(user)) ? ["G5"] : [];
}

function todayIso() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isOverdueAgreement(agreement, referenceDate = todayIso()) {
  return (
    agreement.dueDate &&
    agreement.dueDate < referenceDate &&
    agreement.status !== "Cancelado" &&
    agreement.status !== "Recebido" &&
    !agreement.receiptDate
  );
}

function withEffectiveStatus(agreement, referenceDate = todayIso()) {
  const effectiveStatus = isOverdueAgreement(agreement, referenceDate) ? "Vencido" : agreement.status;
  return { ...agreement, originalStatus: agreement.status, effectiveStatus, status: effectiveStatus };
}

function decodeTextFile(filePath) {
  const buffer = fs.readFileSync(filePath);
  const utf8 = buffer.toString("utf8");

  if (!utf8.includes("\uFFFD")) return utf8;

  try {
    return new TextDecoder("windows-1252").decode(buffer);
  } catch {
    return buffer.toString("latin1");
  }
}

function getCellPrimitive(value) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value;
  return String(value);
}

async function writeStreamToFile(stream, filePath) {
  const source = typeof stream?.getReader === "function" ? Readable.fromWeb(stream) : stream;
  await pipeline(source, fs.createWriteStream(filePath));
}

async function parseSpreadsheet(filePath, originalName) {
  const extension = path.extname(originalName).toLowerCase();

  if (extension === ".csv") {
    const content = decodeTextFile(filePath);
    return { sheetName: "CSV", rows: tableToRows(parseCsv(content, detectCsvDelimiter(content))) };
  }

  if (extension !== ".xlsx") {
    throw new Error("Formato não suportado. Envie um arquivo .xlsx ou .csv.");
  }

  const table = await readXlsxFile(filePath);
  return { sheetName: "Primeira aba", rows: tableToRows(table) };
}

function tableToRows(table) {
  if (!table.length) return [];

  const headers = makeUniqueHeaders(table[0].map((value) => String(getCellPrimitive(value)).trim()));
  const rows = [];

  table.slice(1).forEach((row) => {
    const record = {};
    let hasValue = false;
    headers.forEach((header, index) => {
      if (!header) return;
      const value = getCellPrimitive(row[index]);
      if (value !== "") hasValue = true;
      record[header] = value;
    });

    if (hasValue) rows.push(record);
  });

  return rows;
}

function makeUniqueHeaders(headers) {
  const seen = new Map();

  return headers.map((header) => {
    if (!header) return "";

    const key = normalizeHeader(header);
    const count = seen.get(key) || 0;
    seen.set(key, count + 1);

    return count === 0 ? header : `${header}__${count + 1}`;
  });
}

function detectCsvDelimiter(content) {
  const firstLine = content.split(/\r?\n/).find((line) => line.trim()) || "";
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;

  if (tabCount > commaCount && tabCount > semicolonCount) return "\t";
  return semicolonCount > commaCount ? ";" : ",";
}

function parseCsv(content, delimiter) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const nextChar = content[index + 1];

    if (char === '"' && quoted && nextChar === '"') {
      cell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === delimiter && !quoted) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && nextChar === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => String(value).trim() !== "")) rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell);
  if (row.some((value) => String(value).trim() !== "")) rows.push(row);

  return rows;
}

function buildAgreement(row) {
  const agreementId = String(
    getValue(row, ["Acordo", "ID Acordo", "Numero Acordo", "Número Acordo", "Nº Acordo"])
  ).trim();

  if (!agreementId) return null;

  const parcelId = String(getValue(row, ["Parcela", "ID Parcela", "Codigo Parcela"])).trim();
  const installment = String(getValue(row, ["Numero Parcela", "Número Parcela", "Nº Parcela", "Num Parcela"])).trim();
  const personName = String(
    getValue(row, ["Proprietario", "Proprietário", "Nome", "Cliente", "Devedor", "Morador", "Sacado", "Pagador"])
  ).trim();
  const condominium = String(
    getValue(row, ["Condominio", "Condomínio", "Empreendimento", "Condominio Nome"])
  ).trim();
  const unit = String(getValue(row, ["Unidade"])).trim();
  const admUnit = String(getValue(row, ["ADM Unidade", "Adm Unidade"])).trim();
  const legal = parseBoolean(getValue(row, ["Juridico", "Jurídico"]));
  const correctionStatus = String(getValue(row, ["Status Correcao", "Status Correção"])).trim();
  const agreementDate = excelDateToIso(
    getValue(row, [
      "Data",
      "Data Acordo",
      "Data do Acordo",
      "Data Firmacao",
      "Data Firmação",
      "Data de Firmacao",
      "Data de Firmação",
      "Firmacao",
      "Firmação",
    ])
  );
  const dueDate = excelDateToIso(
    getValue(row, ["Vencimento", "Data Vencimento", "Data de Vencimento", "Dt Vencimento"])
  );
  const receiptDate = excelDateToIso(getValue(row, ["Recebimento", "Data Recebimento", "Data de Recebimento"]));
  const value = parseCurrency(getValue(row, ["Valor", "Valor Parcela", "Valor do Acordo", "Total"]));
  const updatedValue = parseCurrency(getValue(row, ["Valor Atualizado"]));
  const receivedValue = parseCurrency(getValue(row, ["Valor Recebido"]));
  const agreementUpdatedValue = parseCurrency(getValue(row, ["Valor Atualz Acordo", "Valor Atualizado Acordo"]));
  const fine = parseCurrency(getValue(row, ["Multa"]));
  const interest = parseCurrency(getValue(row, ["Juros"]));
  const fees = parseCurrency(getValue(row, ["Honorarios", "Honorários"]));
  const totalAgreementValue = parseCurrency(getValue(row, ["Valor Total"]));
  const installmentCount = String(getValue(row, ["Qtde Parcelas", "Quantidade Parcelas"])).trim();
  const canceled = parseBoolean(getValue(row, ["Cancelado"]));
  const finalized = parseBoolean(getValue(row, ["Finalizado"]));
  const administrator = String(getValue(row, ["Administradora"])).trim();
  const office = String(getValue(row, ["Escritorio", "Escritório"])).trim();
  const user = String(getValue(row, ["Usuario", "User"])).trim();
  const tags = getAgreementTags(user);
  const isAgreementActive = parseBoolean(getValue(row, ["Acordo__2"]));

  let status = "Em aberto";
  if (canceled) status = "Cancelado";
  else if (receiptDate || receivedValue) status = "Recebido";
  else if (finalized) status = "Finalizado";

  return {
    id: `${agreementId}::${installment || parcelId || "acordo"}`,
    agreementId,
    installment,
    installmentNumber: installment,
    parcelId,
    personName,
    condominium,
    unit,
    admUnit,
    legal,
    correctionStatus,
    agreementDate,
    dueDate,
    receiptDate,
    value,
    updatedValue,
    receivedValue,
    agreementUpdatedValue,
    fine,
    interest,
    fees,
    totalAgreementValue,
    installmentCount,
    canceled,
    finalized,
    isAgreementActive,
    administrator,
    office,
    user,
    tags,
    status,
    importedAt: new Date().toISOString(),
  };
}

function applyFilters(agreements, query) {
  const condominium = normalizeText(query.condominium);
  const status = normalizeText(query.status);
  const team = normalizeText(query.team);
  const search = normalizeText(query.search);
  const dueFrom = query.dueFrom || "";
  const dueTo = query.dueTo || "";

  return agreements.filter((agreement) => {
    if (condominium && normalizeText(agreement.condominium) !== condominium) {
      return false;
    }

    if (status && normalizeText(agreement.effectiveStatus || agreement.status) !== status) {
      return false;
    }

    if (team && !(agreement.tags || []).some((tag) => normalizeText(tag) === team)) {
      return false;
    }

    if (dueFrom && (!agreement.dueDate || agreement.dueDate < dueFrom)) {
      return false;
    }

    if (dueTo && (!agreement.dueDate || agreement.dueDate > dueTo)) {
      return false;
    }

    if (search) {
      const haystack = normalizeText(
        [
          agreement.personName,
          agreement.agreementId,
          agreement.installment,
          agreement.parcelId,
          agreement.condominium,
          agreement.unit,
          agreement.admUnit,
          agreement.administrator,
          agreement.user,
          agreement.status,
          agreement.effectiveStatus,
          agreement.correctionStatus,
          ...(agreement.tags || []),
        ].join(" ")
      );
      if (!haystack.includes(search)) return false;
    }

    return true;
  });
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/agreements", async (req, res) => {
  try {
    const db = await readDb();
    const referenceDate = todayIso();
    const enrichedAgreements = db.agreements.map((agreement) => withEffectiveStatus(agreement, referenceDate));
    const agreements = applyFilters(enrichedAgreements, req.query);
    const condominiums = [...new Set(enrichedAgreements.map((item) => item.condominium).filter(Boolean))].sort(
      (a, b) => a.localeCompare(b, "pt-BR")
    );
    const statuses = [...new Set(enrichedAgreements.map((item) => item.status).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, "pt-BR")
    );
    const teams = [...new Set(enrichedAgreements.flatMap((item) => item.tags || []).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, "pt-BR")
    );

    res.json({
      updatedAt: db.updatedAt,
      total: db.agreements.length,
      filtered: agreements.length,
      condominiums,
      statuses,
      teams,
      agreements,
    });
  } catch (error) {
    res.status(500).json({ error: "Não foi possível carregar os acordos.", detail: error.message });
  }
});

app.delete("/api/agreements", async (_req, res) => {
  try {
    const db = await readDb();
    const deleted = db.agreements.length;

    await writeDb({ updatedAt: new Date().toISOString(), agreements: [] });

    res.json({ deleted, total: 0 });
  } catch (error) {
    res.status(500).json({ error: "Não foi possível excluir os acordos.", detail: error.message });
  }
});

app.post("/api/blob-upload", async (req, res) => {
  try {
    const jsonResponse = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith("imports/")) {
          throw new Error("Caminho de upload inválido.");
        }

        return {
          allowedContentTypes: [
            "text/csv",
            "application/csv",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/octet-stream",
          ],
          maximumSizeInBytes: 50 * 1024 * 1024,
          addRandomSuffix: false,
        };
      },
    });

    res.json(jsonResponse);
  } catch (error) {
    res.status(400).json({ error: "Não foi possível autorizar o upload.", detail: error.message });
  }
});

app.post("/api/import-from-blob", async (req, res) => {
  const { pathname, originalName } = req.body || {};

  if (!pathname || !originalName) {
    return res.status(400).json({ error: "Arquivo do Blob não informado." });
  }

  const tempFilePath = path.join(os.tmpdir(), `import-${crypto.randomUUID()}${path.extname(originalName)}`);

  try {
    const blob = await get(pathname, privateBlobOptions());
    await writeStreamToFile(blob.stream, tempFilePath);
    const result = await importAgreementsFromFile(tempFilePath, originalName);

    await del(pathname, privateBlobOptions()).catch(() => {});

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Não foi possível importar a planilha.", detail: error.message });
  } finally {
    fs.unlink(tempFilePath, () => {});
  }
});

app.post("/api/import", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Envie uma planilha no campo 'file'." });
  }

  try {
    res.json(await importAgreementsFromFile(req.file.path, req.file.originalname));
  } catch (error) {
    res.status(500).json({ error: "Não foi possível importar a planilha.", detail: error.message });
  } finally {
    fs.unlink(req.file.path, () => {});
  }
});

if (process.env.NODE_ENV !== "test" && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`API da carteira de acordos em http://127.0.0.1:${PORT}`);
  });
}

async function importAgreementsFromFile(filePath, originalName) {
  const { sheetName, rows } = await parseSpreadsheet(filePath, originalName);
  const imported = rows.map(buildAgreement).filter(Boolean);

  const db = await readDb();
  const byId = new Map(db.agreements.map((agreement) => [agreement.id, agreement]));
  let created = 0;
  let updated = 0;

  imported.forEach((agreement) => {
    if (byId.has(agreement.id)) {
      updated += 1;
    } else {
      created += 1;
    }
    const nextAgreement = { ...byId.get(agreement.id), ...agreement };
    delete nextAgreement.raw;
    byId.set(agreement.id, nextAgreement);
  });

  const agreements = [...byId.values()].sort((a, b) => {
    const dateCompare = String(a.dueDate).localeCompare(String(b.dueDate));
    if (dateCompare !== 0) return dateCompare;
    return String(a.agreementId).localeCompare(String(b.agreementId), "pt-BR", { numeric: true });
  });

  await writeDb({ updatedAt: new Date().toISOString(), agreements });

  return {
    sheetName,
    rows: rows.length,
    imported: imported.length,
    created,
    updated,
    total: agreements.length,
  };
}

export default app;
