// @vitest-environment node
import { it, expect } from "vitest";
import { File as NodeFile } from "node:buffer";
import { readFileSync } from "node:fs";
import { extractText } from "../src/services/documents";
function file(name: string) {
  return new NodeFile(
    [readFileSync("tests/fixtures/" + name)],
    name,
  ) as unknown as File;
}
it("extracts multilingual TXT and stable SHA-256", async () => {
  const r = await extractText(file("lecture.txt"));
  expect(r.text).toContain("Білім");
  expect(r.word_count).toBeGreaterThan(5);
  expect(r.hash).toHaveLength(64);
  expect(r.hash).toBe((await extractText(file("lecture.txt"))).hash);
});
it("extracts DOCX XML through Mammoth", async () => {
  const r = await extractText(file("lecture.docx"));
  expect(r.text).toContain("Architecture separates");
  expect(r.word_count).toBe(5);
});
it("rejects whitespace-only documents", async () => {
  await expect(
    extractText(new NodeFile(["   "], "empty.txt") as unknown as File),
  ).rejects.toThrow("emptyFile");
});
it("rejects invalid DOCX contents", async () => {
  await expect(
    extractText(new NodeFile(["invalid zip"], "bad.docx") as unknown as File),
  ).rejects.toThrow();
});

it("rejects oversized advertised DOCX decompression before parsing", async () => {
  const bytes = new Uint8Array(50);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 0x02014b50, true);
  view.setUint32(24, 40 * 1024 * 1024, true);
  await expect(
    extractText(new NodeFile([bytes], "bomb.docx") as unknown as File),
  ).rejects.toThrow("invalidFile");
});
