import { supabase } from "../lib/supabase";
import { AppError } from "../domain/models";
export async function aiRequest(
  action: string,
  payload: Record<string, unknown>,
) {
  if (!supabase) throw new AppError("aiError");
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new AppError("accessDenied");
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${data.session.access_token}`,
    },
    body: JSON.stringify({ action, ...payload }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new AppError(
      data.error === "configuration"
        ? "aiError"
        : data.error === "unauthorized"
          ? "accessDenied"
          : "error",
    );
  }
  return res.json();
}
