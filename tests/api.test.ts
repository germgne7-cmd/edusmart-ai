// @vitest-environment node
import { it, expect, afterEach, vi } from "vitest";
import handler from "../netlify/functions/ai";
afterEach(() => vi.unstubAllEnvs());
it("rejects non-POST requests", async () => {
  const r = await handler(new Request("https://example.com/api/ai"), {} as any);
  expect(r.status).toBe(405);
});
it("reports missing server configuration", async () => {
  vi.stubEnv("SUPABASE_URL", "");
  const r = await handler(
    new Request("https://example.com/api/ai", { method: "POST" }),
    {} as any,
  );
  expect(r.status).toBe(503);
  expect(await r.json()).toEqual({ error: "configuration" });
});
it("requires bearer authentication", async () => {
  vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_ANON_KEY", "public-test-key");
  const r = await handler(
    new Request("https://example.com/api/ai", { method: "POST" }),
    {} as any,
  );
  expect(r.status).toBe(401);
});
it("does not cache private responses", async () => {
  const r = await handler(new Request("https://example.com/api/ai"), {} as any);
  expect(r.headers.get("cache-control")).toBe("no-store");
});
