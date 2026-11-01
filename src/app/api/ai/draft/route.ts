/* AI copy drafts for the hero section. Signed-in sellers only, with an hourly allowance.
   Turned on by setting ANTHROPIC_API_KEY on the server; AI_COPY_MODEL optionally picks the model. */
import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { hasSupabase } from "@/lib/supabase/env";
import { supabaseServer } from "@/lib/supabase/server";
import {
  DRAFT_SCHEMA,
  DRAFT_SYSTEM,
  readDraft,
  readDraftInput,
} from "@/lib/ai-copy";

export const runtime = "nodejs";
export const maxDuration = 60;

const enabled = () => hasSupabase && !!process.env.ANTHROPIC_API_KEY;
const fail = (error: string, status: number) =>
  NextResponse.json({ ok: false, error }, { status });

export async function GET() {
  return NextResponse.json({ enabled: enabled() });
}

export async function POST(req: Request) {
  if (!enabled()) return fail("AI drafts are not set up.", 503);
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin)
    return fail("Invalid origin.", 403);
  if (Number(req.headers.get("content-length") || 0) > 4000)
    return fail("Too long.", 413);
  let input;
  try {
    input = readDraftInput(await req.json());
  } catch {
    return fail("Bad request.", 400);
  }
  if (!input) return fail("Describe your product first.", 400);

  const sb = await supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return fail("Please log in again.", 401);
  const { data: allowed, error: limitError } = await sb.rpc("claim_ai_draft", {
    p_limit: 10,
  });
  if (limitError)
    return fail(
      limitError.code === "PGRST202"
        ? "Database setup needs updating before AI drafts. See the README."
        : "Could not start a draft.",
      503,
    );
  if (!allowed)
    return fail("You have used this hour's 10 drafts. Try again later.", 429);

  try {
    const client = new Anthropic({ timeout: 45_000, maxRetries: 1 });
    const response = await client.beta.messages.create({
      model: process.env.AI_COPY_MODEL || "claude-opus-5-5",
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: DRAFT_SCHEMA as any },
      },
      system: DRAFT_SYSTEM,
      messages: [{ role: "user", content: JSON.stringify(input) }],
    });
    if (response.stop_reason === "refusal")
      return fail(
        "AI could not write this one. Try describing the product differently.",
        422,
      );
    const text = response.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("");
    const draft =
      response.stop_reason === "max_tokens" ? null : readDraft(text);
    if (!draft) return fail("The draft came back incomplete. Try again.", 502);
    return NextResponse.json({ ok: true, draft });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError)
      return fail("AI is busy. Try again in a minute.", 503);
    if (e instanceof Anthropic.AuthenticationError)
      return fail("AI key is not valid. Ask your admin.", 503);
    if (e instanceof Anthropic.APIError)
      return fail("AI is unavailable right now.", 503);
    return fail("AI is unavailable right now.", 503);
  }
}
