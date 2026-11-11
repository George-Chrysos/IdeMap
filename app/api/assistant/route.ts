import { NextResponse } from "next/server";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://fzynqetgqohgeqsdnttm.supabase.co";
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_h5qp70G8q8wVfI9QrFa7mw_hiflEA4i";
const DEFAULT_UNIVERSE_ID = "a1361b3c-32f2-4fed-a637-200ac9ecb861";
const N8N_BASE_URL = process.env.N8N_WEBHOOK_BASE_URL || "http://localhost:5678";

function sbHeaders(extra?: Record<string, string>) {
  return {
    "Content-Type": "application/json",
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    ...extra,
  };
}

export interface ToolTrace {
  tool: string;
  table: string;
  reason: string;
  rowsFetched: number;
}

export interface PlanetSummary {
  id: string;
  name: string;
  icon: string;
  color: string;
  parent_id: string | null;
  children_ids: string[];
  xp: number;
  fin_strain: boolean;
  psy_strain: boolean;
  solar_shields: number;
  open_tasks: number;
  overdue_tasks: number;
  done_tasks: number;
}

export interface TaskSummary {
  id: string;
  planet_id: string;
  planet_name: string;
  title: string;
  diff: number;
  due: string | null;
  recur: string;
  streak: number;
  done: boolean;
  is_overdue: boolean;
}

export interface DailyMetricRow {
  date: string;
  trio_key: string;
  label_1: string;
  score_1: number;
  label_2: string;
  score_2: number;
  label_3: string;
  score_3: number;
  reflection: string;
  completed_tasks_count: number;
  xp_earned_today: number;
}

export interface ProposedActionRow {
  id: string;
  action_type:
    | "create_task"
    | "complete_task"
    | "reschedule_task"
    | "toggle_strain"
    | "create_planet"
    | "add_note"
    | "award_xp";
  target_planet_id: string | null;
  target_task_id: string | null;
  title: string;
  description: string;
  payload: Record<string, unknown>;
  status: "pending" | "executed" | "dismissed";
  created_at: string;
}

export interface UniverseSnapshot {
  universe_id: string;
  today: string;
  focused_planet_id: string | null;
  planets: PlanetSummary[];
  tasks: TaskSummary[];
  daily_metrics: DailyMetricRow[];
  recent_events: Array<{
    id: string;
    planet_id: string | null;
    event_type: string;
    text: string;
    occurred_at: string;
  }>;
  pending_actions: ProposedActionRow[];
}

async function fetchUniverseSnapshot(
  universeId: string,
  focusPlanetId: string | null = null
): Promise<UniverseSnapshot> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_universe_ai_snapshot`, {
    method: "POST",
    headers: sbHeaders(),
    body: JSON.stringify({
      p_universe_id: universeId || DEFAULT_UNIVERSE_ID,
      p_planet_id: focusPlanetId || null,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch snapshot: ${await res.text()}`);
  }
  return (await res.json()) as UniverseSnapshot;
}

async function insertProposedAction(params: {
  universeId: string;
  action_type: ProposedActionRow["action_type"];
  target_planet_id: string | null;
  target_task_id?: string | null;
  title: string;
  description: string;
  payload: Record<string, unknown>;
  source?: string;
}): Promise<ProposedActionRow | null> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/proposed_actions`, {
    method: "POST",
    headers: sbHeaders({ Prefer: "return=representation" }),
    body: JSON.stringify({
      universe_id: params.universeId,
      action_type: params.action_type,
      target_planet_id: params.target_planet_id,
      target_task_id: params.target_task_id || null,
      title: params.title,
      description: params.description,
      payload: params.payload,
      status: "pending",
      source: params.source || "assistant",
    }),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const rows = await res.json();
  return Array.isArray(rows) && rows[0] ? (rows[0] as ProposedActionRow) : null;
}

async function callLLMWithTools(options: {
  systemPrompt: string;
  userPrompt: string;
  openRouterKey?: string;
  geminiKey?: string;
  model?: string;
}): Promise<{ text: string; provider: string } | null> {
  const orKey = options.openRouterKey || process.env.OPENROUTER_API_KEY || "";
  const gemKey =
    options.geminiKey ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    "";

  if (orKey) {
    try {
      const model = options.model || "google/gemini-2.5-flash";
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${orKey}`,
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "IdeMap Life OS",
        },
        body: JSON.stringify({
          model,
          temperature: 0.35,
          messages: [
            { role: "system", content: options.systemPrompt },
            { role: "user", content: options.userPrompt },
          ],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content;
        if (text) return { text, provider: `OpenRouter (${model})` };
      }
    } catch {
      // Fall through to Gemini or built-in engine
    }
  }

  if (gemKey) {
    try {
      const gemModel = "gemini-2.5-flash";
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${gemModel}:generateContent?key=${encodeURIComponent(gemKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: options.systemPrompt }] },
            contents: [{ role: "user", parts: [{ text: options.userPrompt }] }],
            generationConfig: { temperature: 0.35 },
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return { text, provider: `Google AI Pro (${gemModel})` };
      }
    } catch {
      // Fall through to built-in engine
    }
  }

  return null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const universeId = searchParams.get("universeId") || DEFAULT_UNIVERSE_ID;
    const focusPlanetId = searchParams.get("focusPlanetId") || null;

    const [snapshot, messagesRes, briefingsRes] = await Promise.all([
      fetchUniverseSnapshot(universeId, null),
      fetch(
        `${SUPABASE_URL}/rest/v1/assistant_messages?universe_id=eq.${encodeURIComponent(universeId)}&order=created_at.asc&limit=40`,
        { headers: sbHeaders(), cache: "no-store" }
      ),
      fetch(
        `${SUPABASE_URL}/rest/v1/briefings?universe_id=eq.${encodeURIComponent(universeId)}&order=briefing_date.desc,created_at.desc&limit=6`,
        { headers: sbHeaders(), cache: "no-store" }
      ),
    ]);

    const messages = messagesRes.ok ? await messagesRes.json() : [];
    const briefings = briefingsRes.ok ? await briefingsRes.json() : [];

    return NextResponse.json({
      ok: true,
      universeId,
      focusPlanetId,
      snapshot,
      messages,
      briefings,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const intent: string = body?.intent || "chat";
    const universeId: string = body?.universeId || DEFAULT_UNIVERSE_ID;
    const focusPlanetId: string | null = body?.focusPlanetId || null;
    const openRouterKey: string | undefined = body?.openRouterKey;
    const geminiKey: string | undefined = body?.geminiKey;
    const model: string | undefined = body?.model;
    const preferN8n: boolean = Boolean(body?.preferN8n);

    // ========================================================================
    // INTENT 1: SAVE DAILY 3-METRIC NIGHT CHECK-IN
    // ========================================================================
    if (intent === "save_metrics") {
      const trioKey = body?.trioKey || "clarity_sovereignty_vitality";
      const label1 = body?.label1 || "Clarity";
      const label2 = body?.label2 || "Sovereignty";
      const label3 = body?.label3 || "Vitality";
      const score1 = Math.min(5, Math.max(1, Number(body?.score1) || 3));
      const score2 = Math.min(5, Math.max(1, Number(body?.score2) || 3));
      const score3 = Math.min(5, Math.max(1, Number(body?.score3) || 3));
      const reflection = String(body?.reflection || "").trim();
      const today = new Date().toISOString().split("T")[0];

      const snapshot = await fetchUniverseSnapshot(universeId, null);
      const doneTasksCount = snapshot.tasks.filter((t) => t.done).length;
      const totalXP = snapshot.planets.reduce((acc, p) => acc + (p.xp || 0), 0);

      const upsertRes = await fetch(
        `${SUPABASE_URL}/rest/v1/daily_metrics?on_conflict=universe_id,check_in_date`,
        {
          method: "POST",
          headers: sbHeaders({
            Prefer: "resolution=merge-duplicates,return=representation",
          }),
          body: JSON.stringify({
            universe_id: universeId,
            check_in_date: today,
            trio_key: trioKey,
            label_1: label1,
            label_2: label2,
            label_3: label3,
            score_1: score1,
            score_2: score2,
            score_3: score3,
            reflection,
            completed_tasks_count: doneTasksCount,
            xp_earned_today: totalXP,
            updated_at: new Date().toISOString(),
          }),
          cache: "no-store",
        }
      );

      const savedRows = upsertRes.ok ? await upsertRes.json() : [];

      // Log timeline event
      await fetch(`${SUPABASE_URL}/rest/v1/timeline_events`, {
        method: "POST",
        headers: sbHeaders({ Prefer: "resolution=merge-duplicates" }),
        body: JSON.stringify({
          id: `ev-metrics-${today}-life`,
          universe_id: universeId,
          planet_id: null,
          event_type: "checkin",
          text: `🌙 Trio Check-In: ${label1} ${score1}/5 · ${label2} ${score2}/5 · ${label3} ${score3}/5`,
          event_at: Date.now(),
          occurred_at: new Date().toISOString(),
        }),
      });

      const updatedSnapshot = await fetchUniverseSnapshot(universeId, null);
      return NextResponse.json({
        ok: true,
        metric: Array.isArray(savedRows) ? savedRows[0] : null,
        snapshot: updatedSnapshot,
      });
    }

    // ========================================================================
    // INTENT 2: GENERATE MORNING OR NIGHT BRIEFING (WITH DYNAMIC QUERIES)
    // ========================================================================
    if (intent === "generate_briefing") {
      const briefingType: "morning" | "night" =
        body?.briefingType === "night" ? "night" : "morning";
      const snapshot = await fetchUniverseSnapshot(universeId, null);
      const today = snapshot.today;

      // Optional: Try n8n briefing webhook if preferN8n is enabled
      if (preferN8n) {
        const webhookPath =
          briefingType === "morning"
            ? "idemap-morning-briefing"
            : "idemap-night-review";
        try {
          const n8nRes = await fetch(`${N8N_BASE_URL}/webhook/${webhookPath}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ universeId }),
            signal: AbortSignal.timeout(8000),
          });
          if (n8nRes.ok) {
            const n8nData = await n8nRes.json();
            const freshBriefingsRes = await fetch(
              `${SUPABASE_URL}/rest/v1/briefings?universe_id=eq.${encodeURIComponent(universeId)}&order=briefing_date.desc,created_at.desc&limit=6`,
              { headers: sbHeaders(), cache: "no-store" }
            );
            return NextResponse.json({
              ok: true,
              source: "n8n",
              briefing: n8nData?.briefing?.[0] || n8nData,
              briefings: freshBriefingsRes.ok ? await freshBriefingsRes.json() : [],
              snapshot: await fetchUniverseSnapshot(universeId, null),
            });
          }
        } catch {
          // Fall back cleanly to built-in briefing synthesis
        }
      }

      const latestMetric = snapshot.daily_metrics[0] || {
        label_1: "Clarity",
        score_1: 4,
        label_2: "Sovereignty",
        score_2: 4,
        label_3: "Vitality",
        score_3: 3,
        reflection: "Steady orbital progression.",
      };

      const openTasks = snapshot.tasks.filter((t) => !t.done);
      const doneTasks = snapshot.tasks.filter((t) => t.done);
      const strainedPlanets = snapshot.planets.filter(
        (p) => p.fin_strain || p.psy_strain
      );
      const bossTask =
        openTasks.sort((a, b) => b.diff - a.diff)[0] || null;
      const stabilizerTasks = openTasks
        .filter((t) => t.id !== bossTask?.id)
        .slice(0, 2);

      let summaryText = "";
      let sections: Array<{ badge: string; title: string; body: string }> = [];
      const createdProposals: ProposedActionRow[] = [];

      if (briefingType === "morning") {
        const llmResp = await callLLMWithTools({
          systemPrompt:
            "You are the IdeMap Morning Briefing Strategist. Write a concise, motivating 3-sentence executive summary for today's Morning Plan based on last night's 3-metric scores and open tasks.",
          userPrompt: `Last night metrics: ${latestMetric.label_1}=${latestMetric.score_1}/5, ${latestMetric.label_2}=${latestMetric.score_2}/5, ${latestMetric.label_3}=${latestMetric.score_3}/5. Reflection: "${latestMetric.reflection}". Open tasks: ${openTasks.map((t) => `${t.title} (${t.planet_name}, diff ${t.diff})`).join("; ")}.`,
          openRouterKey,
          geminiKey,
          model,
        });

        const avgScore = (
          (latestMetric.score_1 + latestMetric.score_2 + latestMetric.score_3) /
          3
        ).toFixed(1);

        summaryText =
          llmResp?.text ||
          `Calibrated from last night's ${avgScore}/5 trio check-in (${latestMetric.label_1} ${latestMetric.score_1}/5 · ${latestMetric.label_2} ${latestMetric.score_2}/5 · ${latestMetric.label_3} ${latestMetric.score_3}/5). Focus on ${bossTask ? `“${bossTask.title}” on ${bossTask.planet_name}` : "your core orbital frontier"} first while keeping energy balanced.`;

        sections = [
          {
            badge: "🧬 Trio Calibration",
            title: `${latestMetric.label_1} ${latestMetric.score_1}/5 · ${latestMetric.label_2} ${latestMetric.score_2}/5 · ${latestMetric.label_3} ${latestMetric.score_3}/5`,
            body:
              latestMetric.score_3 <= 2
                ? `Your ${latestMetric.label_3} was low (${latestMetric.score_3}/5) last night. Cap high-difficulty missions to 1 today and prioritize recovery.`
                : `Strong baseline from last night${latestMetric.reflection ? ` (“${latestMetric.reflection}”)` : ""}. Ideal window for a high-leverage mission before noon.`,
          },
          {
            badge: "🎯 Primary Boss Mission",
            title: bossTask
              ? `${bossTask.title} (${bossTask.planet_name} · Diff ${bossTask.diff})`
              : "Chart Your Primary Mission",
            body: bossTask
              ? `Completing this mission unlocks top orbital momentum on ${bossTask.planet_name}.`
              : "All high-difficulty missions are clear! Launch a new milestone task.",
          },
          {
            badge: "🛰️ Orbit Stabilizers",
            title:
              stabilizerTasks.length > 0
                ? stabilizerTasks.map((t) => `${t.title} (${t.planet_name})`).join(" + ")
                : "Maintain Clear Orbits",
            body:
              stabilizerTasks.length > 0
                ? "Complete these two quick wins to trigger the 3-Sector Orbital Alignment (+25% XP multiplier)."
                : "Complete tasks across 3 root planets today for a 1.25× XP alignment bonus.",
          },
        ];

        // Propose an actionable button if a planet lacks today's stabilizer task
        const cultivationPlanet =
          snapshot.planets.find((p) =>
            p.name.toLowerCase().includes("cultiv")
          ) || snapshot.planets[0];
        if (cultivationPlanet && snapshot.pending_actions.length === 0) {
          const prop = await insertProposedAction({
            universeId,
            action_type: "create_task",
            target_planet_id: cultivationPlanet.id,
            title: `Add Morning Stabilizer on ${cultivationPlanet.name}`,
            description: `Create “20m Morning Mobility & Deep Breath” (Diff 2) on ${cultivationPlanet.icon} ${cultivationPlanet.name} to boost ${latestMetric.label_3}.`,
            payload: {
              planetId: cultivationPlanet.id,
              planetName: cultivationPlanet.name,
              title: "20m Morning Mobility & Deep Breath",
              diff: 2,
              due: today,
            },
            source: "morning_briefing",
          });
          if (prop) createdProposals.push(prop);
        }
      } else {
        // Night Briefing
        const llmResp = await callLLMWithTools({
          systemPrompt:
            "You are the IdeMap Night Debrief Strategist. Write a calm, insightful 3-sentence evening review of what was completed today and the proposed strategy for tomorrow.",
          userPrompt: `Completed tasks (${doneTasks.length}): ${doneTasks.map((t) => `${t.title} (${t.planet_name})`).join("; ") || "None logged yet"}. Latest 3-metrics: ${latestMetric.label_1}=${latestMetric.score_1}/5, ${latestMetric.label_2}=${latestMetric.score_2}/5, ${latestMetric.label_3}=${latestMetric.score_3}/5. Remaining open tasks (${openTasks.length}): ${openTasks.slice(0, 5).map((t) => `${t.title} (${t.planet_name})`).join("; ")}.`,
          openRouterKey,
          geminiKey,
          model,
        });

        summaryText =
          llmResp?.text ||
          `You have ${doneTasks.length} completed mission${doneTasks.length === 1 ? "" : "s"} logged across your universe and ${openTasks.length} active mission${openTasks.length === 1 ? "" : "s"} in orbit. Tomorrow's strategy centers on ${bossTask ? `“${bossTask.title}” (${bossTask.planet_name})` : "expanding your highest-XP frontier"} while protecting your ${latestMetric.label_3}.`;

        sections = [
          {
            badge: "✅ Completed Today & Momentum",
            title: `${doneTasks.length} Mission${doneTasks.length === 1 ? "" : "s"} Completed · ${snapshot.planets.reduce((a, p) => a + p.xp, 0)} Total Universe XP`,
            body:
              doneTasks.length > 0
                ? `Completed highlights: ${doneTasks.slice(0, 4).map((t) => `“${t.title}” (${t.planet_name})`).join(", ")}.`
                : "No missions marked done yet today — check off any finished tasks or log your 3-Metric Trio to lock in tonight's baseline.",
          },
          {
            badge: "📊 3-Metric Correlation Insight",
            title: `${latestMetric.label_1} ${latestMetric.score_1}/5 · ${latestMetric.label_2} ${latestMetric.score_2}/5 · ${latestMetric.label_3} ${latestMetric.score_3}/5`,
            body:
              strainedPlanets.length > 0
                ? `${strainedPlanets.length} planet(s) have active strain flags (${strainedPlanets.map((p) => p.name).join(", ")}). Completing 1 task there tomorrow activates the 48h Strain Shield (-12% strain drag).`
                : "Zero active strain flags across all planets — your orbital equilibrium is clean.",
          },
          {
            badge: "🚀 Proposed Strategy for Tomorrow",
            title: bossTask
              ? `Lead tomorrow with “${bossTask.title}” on ${bossTask.planet_name}`
              : "Prepare Tomorrow's Top 3 Orbits",
            body: `1) Anchor tomorrow morning with ${bossTask ? `“${bossTask.title}”` : "1 deep work block"}. 2) Pair with ${stabilizerTasks[0] ? `“${stabilizerTasks[0].title}”` : "a quick health stabilizer"} in the afternoon.`,
          },
        ];
      }

      const briefingTitle =
        briefingType === "morning"
          ? "☀️ Morning Proposal Plan"
          : "🌙 Night Review & Tomorrow Strategy";

      await fetch(
        `${SUPABASE_URL}/rest/v1/briefings?on_conflict=universe_id,briefing_date,briefing_type`,
        {
          method: "POST",
          headers: sbHeaders({
            Prefer: "resolution=merge-duplicates,return=representation",
          }),
          body: JSON.stringify({
            universe_id: universeId,
            briefing_date: today,
            briefing_type: briefingType,
            title: briefingTitle,
            summary: summaryText,
            sections,
            metrics_snapshot: latestMetric,
            is_read: false,
          }),
          cache: "no-store",
        }
      );

      const [freshBriefingsRes, freshSnapshot] = await Promise.all([
        fetch(
          `${SUPABASE_URL}/rest/v1/briefings?universe_id=eq.${encodeURIComponent(universeId)}&order=briefing_date.desc,created_at.desc&limit=6`,
          { headers: sbHeaders(), cache: "no-store" }
        ),
        fetchUniverseSnapshot(universeId, null),
      ]);

      return NextResponse.json({
        ok: true,
        briefings: freshBriefingsRes.ok ? await freshBriefingsRes.json() : [],
        proposedActions: createdProposals,
        snapshot: freshSnapshot,
      });
    }

    // ========================================================================
    // INTENT 3: RESOLVE A PROPOSED HUD ACTION (CONFIRM OR DISMISS)
    // ========================================================================
    if (intent === "resolve_action") {
      const actionId: string = body?.actionId;
      const decision: "confirm" | "dismiss" =
        body?.decision === "dismiss" ? "dismiss" : "confirm";

      const getRes = await fetch(
        `${SUPABASE_URL}/rest/v1/proposed_actions?id=eq.${encodeURIComponent(actionId)}&select=*`,
        { headers: sbHeaders(), cache: "no-store" }
      );
      const rows = getRes.ok ? await getRes.json() : [];
      const action: ProposedActionRow | null =
        Array.isArray(rows) && rows[0] ? rows[0] : null;

      if (!action) {
        return NextResponse.json(
          { ok: false, error: "Action proposal not found" },
          { status: 404 }
        );
      }

      if (decision === "confirm") {
        const payload = action.payload || {};
        const today = new Date().toISOString().split("T")[0];

        if (action.action_type === "create_task" && action.target_planet_id) {
          const newTaskId =
            (payload.taskId as string) ||
            `t-ai-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
          await fetch(`${SUPABASE_URL}/rest/v1/tasks`, {
            method: "POST",
            headers: sbHeaders({ Prefer: "resolution=merge-duplicates" }),
            body: JSON.stringify({
              id: newTaskId,
              universe_id: universeId,
              planet_id: action.target_planet_id,
              title: String(payload.title || action.title),
              diff: Number(payload.diff) || 2,
              due: payload.due !== undefined ? String(payload.due) : today,
              recur: String(payload.recur || ""),
              streak: 0,
              done: false,
              xp_awarded: 0,
              is_archived: false,
            }),
          });
          action.payload = { ...payload, taskId: newTaskId };
        } else if (
          action.action_type === "complete_task" &&
          action.target_task_id
        ) {
          await fetch(
            `${SUPABASE_URL}/rest/v1/tasks?universe_id=eq.${encodeURIComponent(universeId)}&id=eq.${encodeURIComponent(action.target_task_id)}`,
            {
              method: "PATCH",
              headers: sbHeaders(),
              body: JSON.stringify({
                done: true,
                done_at: Date.now(),
                updated_at: new Date().toISOString(),
              }),
            }
          );
        } else if (
          action.action_type === "reschedule_task" &&
          action.target_task_id
        ) {
          await fetch(
            `${SUPABASE_URL}/rest/v1/tasks?universe_id=eq.${encodeURIComponent(universeId)}&id=eq.${encodeURIComponent(action.target_task_id)}`,
            {
              method: "PATCH",
              headers: sbHeaders(),
              body: JSON.stringify({
                due: String(payload.due || today),
                updated_at: new Date().toISOString(),
              }),
            }
          );
        } else if (
          action.action_type === "toggle_strain" &&
          action.target_planet_id
        ) {
          const kind = payload.strainKind === "fin" ? "fin_strain" : "psy_strain";
          await fetch(
            `${SUPABASE_URL}/rest/v1/planets?universe_id=eq.${encodeURIComponent(universeId)}&id=eq.${encodeURIComponent(action.target_planet_id)}`,
            {
              method: "PATCH",
              headers: sbHeaders(),
              body: JSON.stringify({
                [kind]: Boolean(payload.value),
                updated_at: new Date().toISOString(),
              }),
            }
          );
        }
      }

      await fetch(
        `${SUPABASE_URL}/rest/v1/proposed_actions?id=eq.${encodeURIComponent(actionId)}`,
        {
          method: "PATCH",
          headers: sbHeaders(),
          body: JSON.stringify({
            status: decision === "confirm" ? "executed" : "dismissed",
            executed_at: new Date().toISOString(),
          }),
        }
      );

      const snapshot = await fetchUniverseSnapshot(universeId, null);
      return NextResponse.json({
        ok: true,
        decision,
        executedAction: action,
        snapshot,
      });
    }

    // ========================================================================
    // INTENT 4: CHAT WITH DYNAMIC SUPABASE MULTI-JSON QUERYING
    // ========================================================================
    const userMessage = String(body?.message || "").trim();
    if (!userMessage) {
      return NextResponse.json(
        { ok: false, error: "Empty message" },
        { status: 400 }
      );
    }

    // 1. Save User Message to Supabase `assistant_messages`
    await fetch(`${SUPABASE_URL}/rest/v1/assistant_messages`, {
      method: "POST",
      headers: sbHeaders(),
      body: JSON.stringify({
        universe_id: universeId,
        role: "user",
        content: userMessage,
        focus_planet_id: focusPlanetId,
      }),
    });

    const toolTraces: ToolTrace[] = [];

    // 2. If n8n mode is active & reachable, forward to n8n Webhook first
    if (preferN8n) {
      try {
        const n8nRes = await fetch(`${N8N_BASE_URL}/webhook/idemap-assistant`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            universeId,
            focusPlanetId,
            message: userMessage,
          }),
          signal: AbortSignal.timeout(9000),
        });
        if (n8nRes.ok) {
          const n8nData = await n8nRes.json();
          if (n8nData?.reply) {
            toolTraces.push({
              tool: "n8n_agent_workflow",
              table: "rpc/get_universe_ai_snapshot + tools",
              reason: "Executed via local n8n AI Agent workflow container",
              rowsFetched: 1,
            });
            await fetch(`${SUPABASE_URL}/rest/v1/assistant_messages`, {
              method: "POST",
              headers: sbHeaders(),
              body: JSON.stringify({
                universe_id: universeId,
                role: "assistant",
                content: n8nData.reply,
                focus_planet_id: focusPlanetId,
                tool_traces: toolTraces,
              }),
            });
            const snapshot = await fetchUniverseSnapshot(universeId, null);
            return NextResponse.json({
              ok: true,
              source: "n8n",
              reply: n8nData.reply,
              toolTraces,
              snapshot,
            });
          }
        }
      } catch {
        // Fall through to built-in dynamic Supabase tool engine
      }
    }

    // 3. Step 1 of Dynamic Retrieval: Pull High-Level Universe Snapshot JSON
    const snapshot = await fetchUniverseSnapshot(universeId, null);
    toolTraces.push({
      tool: "get_universe_ai_snapshot",
      table: "public.planets + public.tasks",
      reason: "Initial high-level universe telemetry & orbital state JSON",
      rowsFetched: snapshot.planets.length,
    });

    const qLower = userMessage.toLowerCase();

    // 4. Step 2 of Dynamic Retrieval: Inspect query & fetch additional granular JSONs from Supabase
    let matchingPlanet =
      (focusPlanetId
        ? snapshot.planets.find((p) => p.id === focusPlanetId)
        : null) ||
      snapshot.planets.find((p) => qLower.includes(p.name.toLowerCase()));

    let extraPlanetTasksJson: unknown[] = [];
    if (
      matchingPlanet ||
      qLower.includes("task") ||
      qLower.includes("mission") ||
      qLower.includes("overdue") ||
      qLower.includes("focus") ||
      qLower.includes("plan")
    ) {
      const targetFilter = matchingPlanet
        ? `&planet_id=eq.${encodeURIComponent(matchingPlanet.id)}`
        : "";
      const tasksRes = await fetch(
        `${SUPABASE_URL}/rest/v1/tasks?universe_id=eq.${encodeURIComponent(universeId)}&is_archived=eq.false${targetFilter}&select=id,planet_id,title,diff,due,recur,streak,done,xp_awarded`,
        { headers: sbHeaders(), cache: "no-store" }
      );
      if (tasksRes.ok) {
        extraPlanetTasksJson = await tasksRes.json();
        toolTraces.push({
          tool: "query_planet_tasks_json",
          table: "public.tasks",
          reason: matchingPlanet
            ? `Fetched granular task JSON for sector "${matchingPlanet.name}"`
            : "Queried active missions across all sectors for prioritization",
          rowsFetched: extraPlanetTasksJson.length,
        });
      }
    }

    let extraMetricsJson: unknown[] = [];
    if (
      qLower.includes("metric") ||
      qLower.includes("mind") ||
      qLower.includes("heart") ||
      qLower.includes("body") ||
      qLower.includes("clarity") ||
      qLower.includes("sovereignty") ||
      qLower.includes("vitality") ||
      qLower.includes("health") ||
      qLower.includes("strain") ||
      qLower.includes("trend") ||
      qLower.includes("night") ||
      qLower.includes("morning")
    ) {
      const metricsRes = await fetch(
        `${SUPABASE_URL}/rest/v1/daily_metrics?universe_id=eq.${encodeURIComponent(universeId)}&order=check_in_date.desc&limit=14`,
        { headers: sbHeaders(), cache: "no-store" }
      );
      if (metricsRes.ok) {
        extraMetricsJson = await metricsRes.json();
        toolTraces.push({
          tool: "query_daily_metrics_json",
          table: "public.daily_metrics",
          reason: "Fetched 14-day Trio Metric history (1-5 scores & reflections)",
          rowsFetched: extraMetricsJson.length,
        });
      }
    }

    let extraTimelineJson: unknown[] = [];
    if (
      qLower.includes("history") ||
      qLower.includes("timeline") ||
      qLower.includes("completed") ||
      qLower.includes("did i") ||
      qLower.includes("progress") ||
      qLower.includes("level")
    ) {
      const timelineRes = await fetch(
        `${SUPABASE_URL}/rest/v1/timeline_events?universe_id=eq.${encodeURIComponent(universeId)}&order=event_at.desc&limit=20`,
        { headers: sbHeaders(), cache: "no-store" }
      );
      if (timelineRes.ok) {
        extraTimelineJson = await timelineRes.json();
        toolTraces.push({
          tool: "query_timeline_events_json",
          table: "public.timeline_events",
          reason: "Fetched recent orbital activity & level-up event logs",
          rowsFetched: extraTimelineJson.length,
        });
      }
    }

    // 5. Propose Actionable HUD Button Confirmation if user asks to add/create/schedule/complete something
    const newProposals: ProposedActionRow[] = [];
    const today = snapshot.today;
    const defaultTargetPlanet =
      matchingPlanet ||
      snapshot.planets.find((p) => p.name.toLowerCase().includes("bussiness") || p.name.toLowerCase().includes("business")) ||
      snapshot.planets[0];

    if (
      defaultTargetPlanet &&
      (qLower.includes("add") ||
        qLower.includes("create") ||
        qLower.includes("propose") ||
        qLower.includes("schedule") ||
        qLower.includes("plan") ||
        qLower.includes("what should i do"))
    ) {
      // Extract quoted task title if present, or synthesize smart task for the target planet
      const quotedMatch = userMessage.match(/[“"']([^“"']+)[”"']/);
      const suggestedTitle = quotedMatch
        ? quotedMatch[1]
        : `Deep Focus Sprint: ${defaultTargetPlanet.name} Milestone`;

      const proposal = await insertProposedAction({
        universeId,
        action_type: "create_task",
        target_planet_id: defaultTargetPlanet.id,
        title: `Create Mission on ${defaultTargetPlanet.icon} ${defaultTargetPlanet.name}`,
        description: `Add “${suggestedTitle}” (Difficulty 3 · Due ${today}) to ${defaultTargetPlanet.name}`,
        payload: {
          planetId: defaultTargetPlanet.id,
          planetName: defaultTargetPlanet.name,
          title: suggestedTitle,
          diff: 3,
          due: today,
        },
        source: "assistant",
      });
      if (proposal) {
        newProposals.push(proposal);
        toolTraces.push({
          tool: "propose_hud_action",
          table: "public.proposed_actions",
          reason: `Queued confirmation button for "${suggestedTitle}" on ${defaultTargetPlanet.name}`,
          rowsFetched: 1,
        });
      }
    }

    // 6. Generate AI Reply (OpenRouter / Google Gemini if key available, else smart data-driven synthesis)
    const systemPrompt = `You are the IdeMap Life OS Personal Assistant & Orbital Architect.
You have dynamically queried the user's normalized Supabase database tables.
Respond concisely (3-6 sentences or clean bullet points) with specific insights referencing their real planet names, tasks, XP, strain flags, and 3-metric scores (1-5 scale).
If a proposed HUD action was queued, mention that they can click [Confirm & Apply] below to execute it immediately.`;

    const contextPayload = JSON.stringify(
      {
        userQuery: userMessage,
        focusedPlanet: matchingPlanet?.name || "All Sectors (Life Core)",
        planets: snapshot.planets,
        openTasks: snapshot.tasks.filter((t) => !t.done),
        completedTasks: snapshot.tasks.filter((t) => t.done),
        dailyMetricsHistory: snapshot.daily_metrics,
        recentEvents: extraTimelineJson.slice(0, 8),
        queuedHudProposals: newProposals.map((p) => p.description),
      },
      null,
      2
    );

    const llmResult = await callLLMWithTools({
      systemPrompt,
      userPrompt: contextPayload,
      openRouterKey,
      geminiKey,
      model,
    });

    let replyText = llmResult?.text || "";
    if (!replyText) {
      const openTasks = snapshot.tasks.filter((t) => !t.done);
      const doneTasks = snapshot.tasks.filter((t) => t.done);
      const latestMetric = snapshot.daily_metrics[0];
      const topPlanet = [...snapshot.planets].sort((a, b) => b.xp - a.xp)[0];
      const targetDesc = matchingPlanet
        ? `**${matchingPlanet.icon} ${matchingPlanet.name}** (${matchingPlanet.xp} XP, ${matchingPlanet.open_tasks} open mission${matchingPlanet.open_tasks === 1 ? "" : "s"})`
        : `your **${snapshot.planets.length} active orbital sectors** (led by **${topPlanet?.icon || "🪐"} ${topPlanet?.name || "Business"}** at ${topPlanet?.xp || 0} XP)`;

      const metricLine = latestMetric
        ? `Your latest 3-metric check-in logged **${latestMetric.label_1} ${latestMetric.score_1}/5 · ${latestMetric.label_2} ${latestMetric.score_2}/5 · ${latestMetric.label_3} ${latestMetric.score_3}/5**${latestMetric.reflection ? ` (*“${latestMetric.reflection}”*)` : ""}.`
        : "Log tonight's 3-Metric Trio in the **3-Metrics** tab to start correlating energy with XP velocity.";

      const taskFocus = matchingPlanet
        ? openTasks.filter((t) => t.planet_id === matchingPlanet.id)
        : openTasks;

      const nextTaskLine =
        taskFocus.length > 0
          ? `Highest-leverage open mission right now: **“${taskFocus[0].title}”** on **${taskFocus[0].planet_name}** (Diff ${taskFocus[0].diff}) — completing it awards XP and boosts sector health.`
          : `All missions in this sector are currently complete (${doneTasks.length} total wins logged across your universe)!`;

      const proposalLine =
        newProposals.length > 0
          ? `\n\n⚡ I have queued a proposed action card below (**${newProposals[0].description}**) — click **Confirm & Apply** in the HUD to execute it.`
          : "";

      replyText = `I queried your normalized Supabase tables across ${targetDesc}.\n\n• **Orbital Telemetry**: ${nextTaskLine}\n• **Trio Metric Pulse**: ${metricLine}${proposalLine}`;
    }

    // 7. Persist Assistant Reply to `assistant_messages`
    await fetch(`${SUPABASE_URL}/rest/v1/assistant_messages`, {
      method: "POST",
      headers: sbHeaders(),
      body: JSON.stringify({
        universe_id: universeId,
        role: "assistant",
        content: replyText,
        focus_planet_id: focusPlanetId,
        tool_traces: toolTraces,
        proposed_action_ids: newProposals.map((p) => p.id),
      }),
    });

    const updatedSnapshot = await fetchUniverseSnapshot(universeId, null);

    return NextResponse.json({
      ok: true,
      source: llmResult?.provider || "Supabase Dynamic Agent",
      reply: replyText,
      toolTraces,
      proposedActions: newProposals,
      snapshot: updatedSnapshot,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
