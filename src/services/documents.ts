import { validateFile } from "../domain/rules";
import { AppError } from "../domain/models";
import { supabase } from "../lib/supabase";
import type { Repository } from "../repositories/data";
export async function extractText(file: File) {
  validateFile(file);
  const ext = file.name.split(".").pop()?.toLowerCase();
  let text = "",
    pages: number | null = null;
  const buffer = await file.arrayBuffer();
  if (ext === "txt")
    text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  if (ext === "docx") {
    // Bound advertised uncompressed ZIP sizes before handing an archive to Mammoth.
    const view = new DataView(buffer);
    let inflated = 0;
    for (let offset = 0; offset + 46 <= buffer.byteLength; offset++) {
      if (view.getUint32(offset, true) === 0x02014b50) {
        inflated += view.getUint32(offset + 24, true);
        if (inflated > 32 * 1024 * 1024) throw new AppError("invalidFile");
      }
    }
    const { default: mammoth } = await import("mammoth/mammoth.browser");
    text = (await mammoth.extractRawText({ arrayBuffer: buffer })).value;
  }
  if (ext === "pdf") {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();
    const loadingTask = pdfjs.getDocument({ data: buffer });
    const pdf = await loadingTask.promise;
    pages = pdf.numPages;
    if (pages > 500) {
      await loadingTask.destroy();
      throw new AppError("invalidFile");
    }
    try {
      for (let i = 1; i <= pages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items
          .map((x) => ("str" in x ? x.str : ""))
          .join(" ");
        if (pageText.trim()) text += `\n[${i}]\n` + pageText;
        if (text.length > 500000) throw new AppError("invalidFile");
      }
    } finally {
      await loadingTask.destroy();
    }
  }
  const readable = text.replace(/^\[\d+\]$/gm, "").trim();
  if (!readable || readable.length < 3) throw new AppError("emptyFile");
  if (text.length > 500000) throw new AppError("invalidFile");
  const hash = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", buffer)),
  )
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return {
    text,
    word_count: readable.split(/\s+/u).length,
    detected_title:
      readable
        .split(/\r?\n/)
        .find((line) => line.trim())
        ?.slice(0, 180) || file.name,
    character_count: readable.length,
    page_count: pages,
    hash,
  };
}
export class DocumentService {
  constructor(private repo: Repository) {}
  async upload(file: File, userId: string, onProgress: (n: number) => void) {
    if (!supabase) throw new AppError("configError");
    onProgress(10);
    const info = await extractText(file);
    onProgress(40);
    if ((await this.repo.list("documents")).some((d) => d.hash === info.hash))
      throw new AppError("duplicate");
    const path = `${userId}/${crypto.randomUUID()}.${file.name.split(".").pop()?.toLowerCase()}`;
    const { error } = await supabase.storage
      .from("documents")
      .upload(path, file, { upsert: false });
    if (error) throw error;
    onProgress(80);
    try {
      const record = await this.repo.save("documents", {
        user_id: userId,
        name: file.name,
        path,
        size: file.size,
        mime_type: file.type,
        ...info,
      });
      onProgress(100);
      return record;
    } catch (e) {
      await supabase.storage.from("documents").remove([path]);
      throw e;
    }
  }
  async download(path: string) {
    if (!supabase) throw new AppError("configError");
    const { data, error } = await supabase.storage
      .from("documents")
      .createSignedUrl(path, 60);
    if (error) throw error;
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }
  async remove(id: string, path: string) {
    if (!supabase) throw new AppError("configError");
    const { error } = await supabase.storage.from("documents").remove([path]);
    if (error) throw error;
    await this.repo.remove("documents", id);
  }
}
