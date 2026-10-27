import { test } from "node:test";
import assert from "node:assert/strict";
import * as tools from "../src/tools.js";

test("formats, minifies and sorts JSON; reports invalid JSON", () => {
  assert.equal(tools.formatJson('{"b":1,"a":[1,2]}', "2", true), '{\n  "a": [\n    1,\n    2\n  ],\n  "b": 1\n}');
  assert.equal(tools.formatJson('{ "a" : 1 }', "minify"), '{"a":1}');
  assert.throws(() => tools.formatJson("{bad}"), /Invalid JSON/);
});

test("makes a QR code PNG and SVG and enforces limits", async () => {
  const { svg, pngBase64 } = await tools.qrCode("https://simplyutils.com");
  assert.match(svg, /^<svg/);
  assert.equal(Buffer.from(pngBase64, "base64").subarray(1, 4).toString(), "PNG");
  await assert.rejects(tools.qrCode("x".repeat(801)), /800/);
  await assert.rejects(tools.qrCode("hi", "M", "black"), /hex/);
});

test("converts units by symbol or name, like the website", () => {
  assert.equal(tools.convertUnits("5", "length", "mile", "km").result, "8.04672");
  assert.equal(tools.convertUnits("100", "temperature", "°C", "°F").result, "212");
  assert.throws(() => tools.convertUnits("1", "length", "parsec", "m"), /Unknown length unit/);
});

test("passwords include every chosen set and respect length", () => {
  for (const password of tools.generatePasswords(12, 20, { symbols: false })) {
    assert.equal(password.length, 12);
    assert.match(password, /[A-Z]/); assert.match(password, /[a-z]/); assert.match(password, /\d/);
    assert.doesNotMatch(password, /[^A-Za-z0-9]/);
  }
});

test("UUIDs, hashes and Base64", () => {
  assert.match(tools.generateUuids(1)[0], /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.equal(tools.hashText("abc", "sha256"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  assert.equal(tools.base64("héllo ✓", "encode"), "aMOpbGxvIOKckw==");
  assert.equal(tools.base64("aMOpbGxvIOKckw", "decode"), "héllo ✓");
  assert.throws(() => tools.base64("***", "decode"), /not valid Base64/);
});

test("regex matches with groups, and slow patterns are stopped", () => {
  const matches = tools.testRegex("(\\d+)-(?<unit>[a-z]+)", "g", "5-kg and 10-lb");
  assert.deepEqual(matches.map(m => [m.match, m.index, m.named?.unit]), [["5-kg", 0, "kg"], ["10-lb", 9, "lb"]]);
  assert.throws(() => tools.testRegex("(a+)+$", "", "a".repeat(40) + "!"), /0.5 seconds/);
  assert.throws(() => tools.testRegex("a", "gx", "a"), /flags/);
});

test("timestamps in seconds, milliseconds and dates", () => {
  assert.equal(tools.convertTimestamp("1767225600").iso, "2026-01-01T00:00:00.000Z");
  assert.equal(tools.convertTimestamp("1767225600000").unixSeconds, 1767225600);
  assert.equal(tools.convertTimestamp("2026-01-01T00:00:00Z").unixSeconds, 1767225600);
  // No zone given: read as UTC whatever the server's own time zone is.
  assert.equal(tools.convertTimestamp("2026-01-01T00:00").unixSeconds, 1767225600);
  assert.equal(tools.convertTimestamp("2026-01-01 00:00:00").unixSeconds, 1767225600);
  assert.throws(() => tools.convertTimestamp("not a date"), /Unix timestamp/);
  assert.throws(() => tools.convertTimestamp("1767225600", "Mars/Base"), /time zone/);
});

test("counts words, sentences and paragraphs", () => {
  const r = tools.countWords("Hello world. It's a test!\n\nSecond paragraph here.");
  assert.equal(r.words, 8);
  assert.equal(r.sentences, 3);
  assert.equal(r.paragraphs, 2);
});
