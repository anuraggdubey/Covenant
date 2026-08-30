import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const directory = dirname(fileURLToPath(import.meta.url));
const argumentsByName = Object.fromEntries(process.argv.slice(2).map((entry) => {
  const [name, ...value] = entry.split("=");
  return [name, value.join("=")];
}));

assert.ok(argumentsByName["--spy"], "Pass --spy=<SPY Regression.csv>");
assert.ok(argumentsByName["--qqq"], "Pass --qqq=<QQQ_stock_data.csv>");

const startDate = "2019-01-02";
const endDate = "2023-12-27";

function normalizeDate(value) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const [month, day, year] = value.split("/").map(Number);
  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

async function prepare(inputPath, dateColumn, priceColumn, outputName) {
  const text = await readFile(resolve(inputPath), "utf8");
  const [headerLine, ...lines] = text.trim().split(/\r?\n/);
  const headers = headerLine.split(",");
  const dateIndex = headers.indexOf(dateColumn);
  const priceIndex = headers.indexOf(priceColumn);
  assert.ok(dateIndex >= 0 && priceIndex >= 0, `${outputName} source headers are incompatible`);

  const rows = lines.map((line) => {
    const values = line.split(",");
    return { date: normalizeDate(values[dateIndex]), adjustedClose: Number(values[priceIndex]) };
  }).filter((row) => row.date >= startDate && row.date <= endDate);

  assert.ok(rows.length >= 1000, `${outputName} has insufficient common-period sessions`);
  assert.ok(rows.every((row) => Number.isFinite(row.adjustedClose) && row.adjustedClose > 0));
  assert.ok(rows.every((row, index) => index === 0 || row.date > rows[index - 1].date));

  const output = ["date,adjustedClose", ...rows.map((row) => `${row.date},${row.adjustedClose}`)].join("\n") + "\n";
  await writeFile(join(directory, "data", outputName), output, "utf8");
  console.log(`${outputName}: ${rows.length} sessions, ${rows[0].date} through ${rows.at(-1).date}`);
}

await prepare(argumentsByName["--spy"], "Date", "Adj Close", "spy-cc0-daily.csv");
await prepare(argumentsByName["--qqq"], "", "adjclose", "qqq-cc0-daily.csv");
