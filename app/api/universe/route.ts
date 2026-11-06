import { NextResponse } from "next/server";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://fzynqetgqohgeqsdnttm.supabase.co";
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_h5qp70G8q8wVfI9QrFa7mw_hiflEA4i";

function headers() {
  return {
    "Content-Type": "application/json",
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id") || "default";
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/universe_states?id=eq.${encodeURIComponent(id)}&select=id,state,updated_at`,
      { headers: headers(), cache: "no-store" }
    );
    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { ok: false, error: errText },
        { status: res.status }
      );
    }
    const rows = await res.json();
    const row = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    return NextResponse.json({
      ok: true,
      state: row?.state ?? null,
      updatedAt: row?.updated_at ?? null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const id = typeof body?.id === "string" && body.id ? body.id : "default";
    const state = body?.state;
    if (!state || typeof state !== "object") {
      return NextResponse.json(
        { ok: false, error: "Missing state payload" },
        { status: 400 }
      );
    }
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/sync_universe_state`,
      {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ p_universe_id: id, p_state: state }),
        cache: "no-store",
      }
    );
    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { ok: false, error: errText },
        { status: res.status }
      );
    }
    const data = await res.json();
    return NextResponse.json({ ok: true, result: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
