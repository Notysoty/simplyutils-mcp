// Pure tool logic. No network calls and no AI: every result is computed locally.
import { createHash, randomInt, randomUUID } from "node:crypto";
import vm from "node:vm";
import QRCode from "qrcode";
import { UNITS, convertUnit, type Category } from "./units.js";

export const SITE = "https://simplyutils.com";
export const toolUrl = (slug: string) => `${SITE}/tool/${slug}`;

const MAX_TEXT_BYTES = 100_000;
function limitText(text: string, label = "text") {
  if (Buffer.byteLength(text, "utf8") > MAX_TEXT_BYTES) throw new Error(`The ${label} is larger than 100 KB. Use a smaller input.`);
}

// 1. JSON
export function formatJson(json: string, indent: "2" | "4" | "tab" | "minify" = "2", sortKeys = false) {
  limitText(json, "JSON");
  let value: unknown;
  try { value = JSON.parse(json); }
  catch (error) { throw new Error(`Invalid JSON: ${(error as Error).message}`); }
  if (sortKeys) value = sortDeep(value);
  const space = indent === "minify" ? undefined : indent === "tab" ? "\t" : Number(indent);
  return JSON.stringify(value, null, space);
}
function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value as object).sort().map(key => [key, sortDeep((value as Record<string, unknown>)[key])]));
  }
  return value;
}

// 2. QR code
export async function qrCode(text: string, errorCorrection: "L" | "M" | "Q" | "H" = "M", foreground = "#000000", background = "#ffffff") {
  if (!text) throw new Error("Enter the text or link to encode.");
  if (Buffer.byteLength(text, "utf8") > 800) throw new Error("QR content is limited to 800 UTF-8 bytes so the code stays easy to scan.");
  for (const color of [foreground, background]) if (!/^#[\da-f]{6}$/i.test(color)) throw new Error("Use six-digit hex colors such as #000000.");
  const options = { errorCorrectionLevel: errorCorrection, margin: 4, color: { dark: foreground, light: background } };
  const [svg, png] = await Promise.all([
    QRCode.toString(text, { ...options, type: "svg" }),
    QRCode.toBuffer(text, { ...options, type: "png", width: 512 }),
  ]);
  return { svg, pngBase64: png.toString("base64") };
}

// 3. Units
export const unitCategories = Object.keys(UNITS) as Category[];
export function unitList() {
  return unitCategories.map(category => `${category}: ${UNITS[category].units.map(unit => unit.symbol).join(", ")}`).join("; ");
}
function unitSymbol(category: Category, unit: string) {
  const wanted = unit.trim().toLowerCase();
  const match = UNITS[category].units.find(candidate =>
    candidate.symbol.toLowerCase() === wanted || candidate.label.toLowerCase() === wanted || candidate.label.toLowerCase() + "s" === wanted);
  if (!match) throw new Error(`Unknown ${category} unit "${unit}". Use one of: ${UNITS[category].units.map(u => u.symbol).join(", ")}.`);
  return match;
}
export function convertUnits(value: string, category: Category, from: string, to: string) {
  const source = unitSymbol(category, from), target = unitSymbol(category, to);
  const result = convertUnit(value, category, source.symbol, target.symbol);
  return { result, text: `${value} ${source.symbol} = ${result} ${target.symbol}` };
}

// 4. Passwords
const SETS = { uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ", lowercase: "abcdefghijklmnopqrstuvwxyz", numbers: "0123456789", symbols: "!@#$%^&*()-_=+[]{};:,.?/" };
export function generatePasswords(length = 16, count = 1, sets: { uppercase?: boolean; lowercase?: boolean; numbers?: boolean; symbols?: boolean } = {}) {
  const chosen = (Object.keys(SETS) as (keyof typeof SETS)[]).filter(key => sets[key] ?? true);
  if (!chosen.length) throw new Error("Choose at least one character set.");
  if (length < chosen.length) throw new Error("The length must allow one character from each chosen set.");
  const pool = chosen.map(key => SETS[key]).join("");
  return Array.from({ length: count }, () => {
    // One character from each chosen set, the rest from the whole pool, then shuffle.
    const chars = chosen.map(key => SETS[key][randomInt(SETS[key].length)]);
    while (chars.length < length) chars.push(pool[randomInt(pool.length)]);
    for (let i = chars.length - 1; i > 0; i--) { const j = randomInt(i + 1); [chars[i], chars[j]] = [chars[j], chars[i]]; }
    return chars.join("");
  });
}

// 5. UUIDs
export const generateUuids = (count = 1) => Array.from({ length: count }, () => randomUUID());

// 6. Hashes
export function hashText(text: string, algorithm: "md5" | "sha1" | "sha256" | "sha384" | "sha512" = "sha256") {
  limitText(text);
  return createHash(algorithm).update(text, "utf8").digest("hex");
}

// 7. Base64
export function base64(text: string, mode: "encode" | "decode", urlSafe = false) {
  limitText(text);
  if (mode === "encode") {
    const encoded = Buffer.from(text, "utf8").toString("base64");
    return urlSafe ? encoded.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") : encoded;
  }
  const clean = text.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(clean) || clean.replace(/=+$/, "").length % 4 === 1) throw new Error("This is not valid Base64.");
  const bytes = Buffer.from(clean, "base64");
  const decoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  return decoded;
}

// 8. Regex, run with a time limit so a slow pattern cannot block the server.
export function testRegex(pattern: string, flags: string, text: string) {
  limitText(text);
  if (pattern.length > 2000) throw new Error("The pattern is longer than 2,000 characters.");
  if (!/^[dgimsuyv]*$/.test(flags) || new Set(flags).size !== flags.length) throw new Error("Use JavaScript regex flags: d, g, i, m, s, u, v, y.");
  let regex: RegExp;
  try { regex = new RegExp(pattern, flags.includes("g") ? flags : flags + "g"); }
  catch (error) { throw new Error(`Invalid pattern: ${(error as Error).message}`); }
  const context = { regex, text, out: [] as { match: string; index: number; groups: (string | null)[]; named?: Record<string, string> }[] };
  try {
    vm.runInNewContext(`
      for (const m of text.matchAll(regex)) {
        out.push({ match: m[0], index: m.index, groups: m.slice(1).map(g => g === undefined ? null : g), named: m.groups ? { ...m.groups } : undefined });
        if (out.length >= 200) break;
      }`, context, { timeout: 500 });
  } catch (error) {
    if (/timed out/i.test(String(error))) throw new Error("The pattern took longer than 0.5 seconds (likely catastrophic backtracking). Simplify it.");
    throw error;
  }
  return context.out;
}

// 9. Timestamps
export function convertTimestamp(value: string, timeZone = "UTC") {
  const text = value.trim();
  let date: Date;
  if (/^-?\d+(\.\d+)?$/.test(text)) {
    const number = Number(text);
    // 13+ digits are milliseconds; shorter values are seconds.
    date = new Date(Math.abs(number) >= 1e12 ? number : number * 1000);
  } else {
    date = new Date(text);
  }
  if (Number.isNaN(date.getTime())) throw new Error("Enter a Unix timestamp (seconds or milliseconds) or a date such as 2026-10-27T09:30:00Z.");
  let local: string;
  try { local = new Intl.DateTimeFormat("en-US", { timeZone, dateStyle: "full", timeStyle: "long" }).format(date); }
  catch { throw new Error(`Unknown time zone "${timeZone}". Use an IANA name such as America/New_York.`); }
  return { unixSeconds: Math.floor(date.getTime() / 1000), unixMilliseconds: date.getTime(), iso: date.toISOString(), utc: date.toUTCString(), local, timeZone };
}

// 10. Word count
export function countWords(text: string) {
  limitText(text);
  const words = text.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) ?? [];
  const sentences = text.split(/[.!?]+(?=\s|$)/).filter(part => /[\p{L}\p{N}]/u.test(part)).length;
  const paragraphs = text.split(/\n\s*\n/).filter(part => part.trim()).length;
  return {
    words: words.length,
    characters: [...text].length,
    charactersWithoutSpaces: [...text.replace(/\s/g, "")].length,
    sentences,
    paragraphs,
    readingTimeMinutes: Math.max(words.length ? 1 : 0, Math.round(words.length / 238)),
  };
}
