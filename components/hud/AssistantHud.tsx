"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Sparkles,
  Send,
  Check,
  X,
  Sun,
  Moon,
  Activity,
  Database,
  Settings,
  ChevronDown,
  RefreshCw,
  Zap,
  Layers,
} from "lucide-react";

interface ToolTrace {
  tool: string;
  table: string;
  reason: string;
  rowsFetched: number;
}

interface ProposedAction {
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

interface BriefingSection {
  badge: string;
  title: string;
  body: string;
}

interface BriefingRow {
  id: string;
  briefing_date: string;
  briefing_type: "morning" | "night";
  title: string;
  summary: string;
  sections: BriefingSection[];
  created_at: string;
}

interface DailyMetricRow {
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

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  tool_traces?: ToolTrace[];
  created_at?: string;
}

const TRIO_DEF = {
  key: "clarity_sovereignty_vitality",
  name: "Clarity · Sovereignty · Vitality",
  labels: ["Clarity", "Sovereignty", "Vitality"] as const,
  icons: ["🔮", "👑", "⚡"] as const,
  colors: ["#2DD4BF", "#E5A93C", "#C084FC"] as const,
};

const DEFAULT_UNIVERSE_ID = "a1361b3c-32f2-4fed-a637-200ac9ecb861";

export default function AssistantHud() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "chat" | "briefings" | "metrics" | "settings"
  >("chat");

  // Orbital context synced from atlas.html
  const [universeId, setUniverseId] = useState<string>(DEFAULT_UNIVERSE_ID);
  const [focusPlanetId, setFocusPlanetId] = useState<string | null>(null);
  const [focusPlanetName, setFocusPlanetName] = useState<string>("⚡ Jester (Life Core)");

  // Assistant state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingActions, setPendingActions] = useState<ProposedAction[]>([]);
  const [briefings, setBriefings] = useState<BriefingRow[]>([]);
  const [metricsHistory, setMetricsHistory] = useState<DailyMetricRow[]>([]);
  const [inputQuery, setInputQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // 3-Metric Night Check-in state
  const [score1, setScore1] = useState(4);
  const [score2, setScore2] = useState(4);
  const [score3, setScore3] = useState(3);
  const [reflection, setReflection] = useState("");
  const [savingMetrics, setSavingMetrics] = useState(false);

  // Engine & API Keys
  const [preferN8n, setPreferN8n] = useState(false);
  const [openRouterKey, setOpenRouterKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [selectedModel, setSelectedModel] = useState("google/gemini-2.5-flash");

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Load saved keys from localStorage
  useEffect(() => {
    try {
      const savedOr = localStorage.getItem("idemap_openrouter_key") || "";
      const savedGem = localStorage.getItem("idemap_gemini_key") || "";
      const savedN8n = localStorage.getItem("idemap_prefer_n8n") === "true";
      if (savedOr) setOpenRouterKey(savedOr);
      if (savedGem) setGeminiKey(savedGem);
      setPreferN8n(savedN8n);
    } catch {
      // ignore storage errors
    }
  }, []);

  // Listen for context updates from atlas.html iframe
  useEffect(() => {
    const handleMessage = (ev: MessageEvent) => {
      const data = ev.data;
      if (!data || typeof data !== "object") return;
      if (data.type === "IDEMAP_CONTEXT") {
        if (data.universeId && data.universeId !== "default") {
          setUniverseId(data.universeId);
        }
        setFocusPlanetId(data.focusPlanetId || null);
        if (data.focusPlanetName) {
          setFocusPlanetName(data.focusPlanetName);
        }
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const fetchAssistantData = useCallback(async (uid: string) => {
    try {
      const res = await fetch(
        `/api/assistant?universeId=${encodeURIComponent(uid)}`,
        { cache: "no-store" }
      );
      if (!res.ok) return;
      const data = await res.json();
      if (data?.ok) {
        if (Array.isArray(data.messages)) setMessages(data.messages);
        if (Array.isArray(data.briefings)) setBriefings(data.briefings);
        if (data.snapshot) {
          setPendingActions(data.snapshot.pending_actions || []);
          setMetricsHistory(data.snapshot.daily_metrics || []);
        }
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchAssistantData(universeId);
  }, [universeId, fetchAssistantData]);

  useEffect(() => {
    if (isOpen && activeTab === "chat") {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, activeTab]);

  const sendMessage = async (textOverride?: string) => {
    const query = (textOverride ?? inputQuery).trim();
    if (!query || isLoading) return;

    const optimisticUserMsg: ChatMessage = {
      id: `local-${Date.now()}`,
      role: "user",
      content: query,
    };
    setMessages((prev) => [...prev, optimisticUserMsg]);
    if (!textOverride) setInputQuery("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: "chat",
          universeId,
          focusPlanetId,
          message: query,
          preferN8n,
          openRouterKey,
          geminiKey,
          model: selectedModel,
        }),
      });
      const data = await res.json();
      if (data?.ok) {
        const assistantMsg: ChatMessage = {
          id: `asst-${Date.now()}`,
          role: "assistant",
          content: data.reply,
          tool_traces: data.toolTraces || [],
        };
        setMessages((prev) => [...prev, assistantMsg]);
        if (data.snapshot) {
          setPendingActions(data.snapshot.pending_actions || []);
          setMetricsHistory(data.snapshot.daily_metrics || []);
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: "Could not reach the assistant endpoint. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolveAction = async (
    action: ProposedAction,
    decision: "confirm" | "dismiss"
  ) => {
    setStatusBanner(
      decision === "confirm"
        ? `Applying "${action.title}" to orbital canvas...`
        : "Dismissing proposal..."
    );
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: "resolve_action",
          universeId,
          actionId: action.id,
          decision,
        }),
      });
      const data = await res.json();
      if (data?.ok) {
        setPendingActions(data.snapshot?.pending_actions || []);
        if (decision === "confirm" && data.executedAction) {
          // Notify the atlas.html iframe so the live canvas updates immediately!
          const iframe = document.querySelector("iframe");
          iframe?.contentWindow?.postMessage(
            {
              type: "IDEMAP_APPLY_ACTION",
              action: data.executedAction,
            },
            "*"
          );
          setStatusBanner(`✓ Executed: ${action.title}`);
        } else {
          setStatusBanner("Proposal dismissed");
        }
      }
    } catch {
      setStatusBanner("Failed to resolve action");
    } finally {
      setTimeout(() => setStatusBanner(null), 3000);
    }
  };

  const handleGenerateBriefing = async (briefingType: "morning" | "night") => {
    setIsLoading(true);
    setStatusBanner(
      briefingType === "morning"
        ? "☀️ Generating Morning Proposal Plan from Supabase..."
        : "🌙 Synthesizing Night Review & Tomorrow Strategy..."
    );
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: "generate_briefing",
          universeId,
          briefingType,
          preferN8n,
          openRouterKey,
          geminiKey,
          model: selectedModel,
        }),
      });
      const data = await res.json();
      if (data?.ok) {
        if (Array.isArray(data.briefings)) setBriefings(data.briefings);
        if (data.snapshot) {
          setPendingActions(data.snapshot.pending_actions || []);
          setMetricsHistory(data.snapshot.daily_metrics || []);
        }
        setStatusBanner(
          briefingType === "morning"
            ? "☀️ Morning Plan ready!"
            : "🌙 Night Review ready!"
        );
      }
    } catch {
      setStatusBanner("Could not generate briefing");
    } finally {
      setIsLoading(false);
      setTimeout(() => setStatusBanner(null), 3000);
    }
  };

  const handleSaveMetrics = async () => {
    setSavingMetrics(true);
    setStatusBanner("💾 Saving 3-Metric Check-in & generating Night Strategy...");
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: "save_metrics",
          universeId,
          trioKey: TRIO_DEF.key,
          label1: TRIO_DEF.labels[0],
          label2: TRIO_DEF.labels[1],
          label3: TRIO_DEF.labels[2],
          score1,
          score2,
          score3,
          reflection,
        }),
      });
      const data = await res.json();
      if (data?.ok && data.snapshot) {
        setMetricsHistory(data.snapshot.daily_metrics || []);
        setReflection("");
        await handleGenerateBriefing("night");
        setActiveTab("briefings");
      }
    } catch {
      setStatusBanner("Failed to save metrics");
    } finally {
      setSavingMetrics(false);
      setTimeout(() => setStatusBanner(null), 3000);
    }
  };

  const saveSettings = () => {
    try {
      localStorage.setItem("idemap_openrouter_key", openRouterKey.trim());
      localStorage.setItem("idemap_gemini_key", geminiKey.trim());
      localStorage.setItem("idemap_prefer_n8n", String(preferN8n));
      setStatusBanner("✓ AI & n8n configuration saved");
      setTimeout(() => setStatusBanner(null), 2500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 font-sans select-none">
      {/* Floating Launcher Pill */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group hud-panel glass-surface flex items-center gap-3 px-4 py-2.5 rounded-full border border-teal-400/40 text-slate-100 shadow-[0_12px_40px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.15),0_0_20px_rgba(45,212,191,0.18)] hover:border-teal-300 hover:scale-[1.02] transition-all cursor-pointer backdrop-blur-2xl"
        >
          <span className="w-8 h-8 rounded-full bg-teal-400/20 border border-teal-400/50 flex items-center justify-center text-teal-300 shrink-0 shadow-[0_0_12px_rgba(45,212,191,0.3)]">
            <Sparkles className="w-4 h-4" />
          </span>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="font-fraunces text-xs sm:text-sm font-semibold tracking-wide text-white">
                AI Orbital Architect
              </span>
              {pendingActions.length > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-400 text-[#0D0F0E] shadow-sm">
                  {pendingActions.length} Action{pendingActions.length === 1 ? "" : "s"}
                </span>
              )}
            </div>
            <p className="text-[10px] sm:text-[11px] text-teal-300/90 font-medium">
              {focusPlanetName} · Trio & Briefings
            </p>
          </div>
        </button>
      )}

      {/* Expanded Floating HUD Drawer */}
      {isOpen && (
        <div className="hud-panel glass-surface w-[370px] sm:w-[500px] md:w-[580px] lg:w-[680px] xl:w-[760px] h-[640px] sm:h-[720px] lg:h-[820px] max-h-[90vh] rounded-2xl sm:rounded-3xl border border-teal-400/35 shadow-[0_24px_70px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-3xl flex flex-col overflow-hidden text-slate-100 fade-up">
          {/* Header */}
          <div className="px-5 sm:px-6 py-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-teal-500/10 via-transparent to-amber-500/10 flex-shrink-0">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-teal-400/20 border border-teal-400/50 flex items-center justify-center text-teal-300 shrink-0 shadow-[0_0_15px_rgba(45,212,191,0.25)]">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[10px] sm:text-xs uppercase tracking-widest text-teal-400 font-semibold truncate">
                    Autonomous Life OS
                  </p>
                  <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-teal-400/15 border border-teal-400/30 text-teal-200">
                    {preferN8n ? "n8n Flow" : "Hybrid Agent"}
                  </span>
                </div>
                <h3 className="font-fraunces text-base sm:text-lg lg:text-xl font-semibold text-white truncate mt-0.5">
                  Orbital AI Architect
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-400 truncate mt-0.5">
                  Target Sector: <span className="text-amber-300 font-medium">{focusPlanetName}</span>
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer flex items-center justify-center transition-colors shrink-0"
              title="Minimize Assistant HUD"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs (Aligned with atlas pill buttons) */}
          <div className="flex items-center gap-1.5 sm:gap-2 p-2 sm:p-2.5 bg-[#090C0D]/80 border-b border-white/10 text-xs sm:text-sm font-semibold overflow-x-auto hud-scroll flex-shrink-0">
            <button
              onClick={() => setActiveTab("chat")}
              className={`px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "chat"
                  ? "bg-teal-400/20 text-teal-200 border border-teal-400/50 shadow-[0_0_15px_rgba(45,212,191,0.2)]"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Assistant</span>
              {pendingActions.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-400 text-[#0D0F0E] text-[10px] font-bold inline-flex items-center justify-center ml-0.5">
                  {pendingActions.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("briefings")}
              className={`px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "briefings"
                  ? "bg-amber-400/20 text-amber-200 border border-amber-400/50 shadow-[0_0_15px_rgba(229,169,60,0.2)]"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>AM / PM Briefings</span>
            </button>
            <button
              onClick={() => setActiveTab("metrics")}
              className={`px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "metrics"
                  ? "bg-teal-400/20 text-teal-200 border border-teal-400/50 shadow-[0_0_15px_rgba(45,212,191,0.2)]"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>3-Metrics</span>
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "settings"
                  ? "bg-white/15 text-white border border-white/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>n8n / AI Keys</span>
            </button>
          </div>

          {/* Status Banner */}
          {statusBanner && (
            <div className="px-4 py-2 bg-teal-400/15 border-b border-teal-400/30 text-xs text-teal-200 flex items-center justify-between font-medium">
              <span>{statusBanner}</span>
            </div>
          )}

          {/* TAB 1: CHAT & PROPOSED HUD ACTIONS */}
          {activeTab === "chat" && (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 hud-scroll">
                {/* Quick Prompt Suggestions */}
                <div className="flex flex-wrap gap-2">
                  {[
                    "What should I focus on today?",
                    "Analyze my 3-metrics & XP trends",
                    "Propose a mission for Signal",
                    "Check sectors for strain",
                  ].map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => sendMessage(prompt)}
                      className="text-xs px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-teal-400/20 border border-white/10 hover:border-teal-400/40 text-slate-300 hover:text-teal-200 transition-all cursor-pointer font-medium"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>

                {/* Pending HUD Action Confirmation Cards */}
                {pendingActions.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" /> Pending HUD Action Proposals (Confirm to Execute)
                    </p>
                    {pendingActions.map((act) => (
                      <div
                        key={act.id}
                        className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-[#0E1214] to-teal-500/10 border border-amber-400/40 space-y-3 shadow-lg"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-200 font-semibold uppercase border border-amber-400/30">
                              ⚡ {act.action_type.replace("_", " ")}
                            </span>
                            <h4 className="font-fraunces text-sm sm:text-base font-semibold text-white mt-1.5">
                              {act.title}
                            </h4>
                            <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                              {act.description}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5 pt-1">
                          <button
                            onClick={() => handleResolveAction(act, "confirm")}
                            className="flex-1 py-2 sm:py-2.5 px-4 rounded-xl bg-[#E5A93C] hover:bg-amber-300 text-[#0D0F0E] font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-md"
                          >
                            <Check className="w-4 h-4" /> Confirm & Apply to Canvas
                          </button>
                          <button
                            onClick={() => handleResolveAction(act, "dismiss")}
                            className="py-2 sm:py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs sm:text-sm flex items-center justify-center gap-1 cursor-pointer transition-colors"
                          >
                            <X className="w-4 h-4" /> Dismiss
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Chat Messages */}
                {messages.length === 0 ? (
                  <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.025] border border-white/10 text-xs sm:text-sm text-slate-300 space-y-2">
                    <p className="font-fraunces text-sm sm:text-base font-semibold text-teal-300">
                      🛰️ Connected to Normalized Supabase Life OS
                    </p>
                    <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                      Ask anything about your planets, missions, strain flags, or 3-metric history. I dynamically query Supabase JSONs based on your question and queue actionable buttons right on your HUD.
                    </p>
                  </div>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex flex-col ${
                        m.role === "user" ? "items-end" : "items-start"
                      }`}
                    >
                      <div
                        className={`max-w-[90%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap select-text ${
                          m.role === "user"
                            ? "bg-gradient-to-br from-teal-500/25 to-teal-600/15 border border-teal-400/40 text-slate-100 shadow-sm"
                            : "bg-[#0D1113]/90 border border-white/10 text-slate-200 shadow-sm"
                        }`}
                      >
                        {m.content}
                      </div>

                      {/* Dynamic Supabase JSON Tool Traces */}
                      {m.tool_traces && m.tool_traces.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1.5 max-w-[92%]">
                          {m.tool_traces.map((tr, i) => (
                            <span
                              key={i}
                              title={tr.reason}
                              className="inline-flex items-center gap-1 text-[10px] sm:text-xs px-2.5 py-1 rounded-full bg-teal-950/70 border border-teal-400/30 text-teal-300 font-mono"
                            >
                              <Database className="w-3 h-3" />
                              {tr.table} ({tr.rowsFetched} JSON{tr.rowsFetched === 1 ? "" : "s"})
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}

                {isLoading && (
                  <div className="text-xs sm:text-sm text-teal-300 flex items-center gap-2 px-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Querying Supabase JSONs & synthesizing...</span>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input Bar */}
              <div className="p-3.5 sm:p-4 border-t border-white/10 bg-[#090C0D] flex items-center gap-2.5">
                <input
                  type="text"
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") sendMessage();
                  }}
                  placeholder="Ask your Life Architect or propose a task..."
                  className="flex-1 bg-[#121719] border border-white/15 focus:border-teal-400 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none transition-all shadow-inner"
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={isLoading || !inputQuery.trim()}
                  className="p-2.5 sm:p-3 rounded-xl bg-teal-400 hover:bg-teal-300 disabled:opacity-40 text-[#0D0F0E] font-bold cursor-pointer transition-all shadow-[0_0_15px_rgba(45,212,191,0.25)]"
                >
                  <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: ASYNCHRONOUS MORNING & NIGHT BRIEFINGS */}
          {activeTab === "briefings" && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 hud-scroll">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <button
                  onClick={() => handleGenerateBriefing("morning")}
                  disabled={isLoading}
                  className="p-3.5 sm:p-4 rounded-2xl bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/40 text-left cursor-pointer transition-all shadow-md group"
                >
                  <div className="flex items-center gap-2 text-amber-300 text-xs sm:text-sm font-semibold">
                    <Sun className="w-4 h-4 sm:w-5 sm:h-5" /> Morning Plan
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-300 mt-1">
                    Calibrate today from last night&apos;s Trio
                  </p>
                </button>
                <button
                  onClick={() => handleGenerateBriefing("night")}
                  disabled={isLoading}
                  className="p-3.5 sm:p-4 rounded-2xl bg-teal-400/15 hover:bg-teal-400/25 border border-teal-400/40 text-left cursor-pointer transition-all shadow-md group"
                >
                  <div className="flex items-center gap-2 text-teal-300 text-xs sm:text-sm font-semibold">
                    <Moon className="w-4 h-4 sm:w-5 sm:h-5" /> Night Debrief
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-300 mt-1">
                    Review wins & strategy for tomorrow
                  </p>
                </button>
              </div>

              {briefings.length === 0 ? (
                <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 text-center space-y-2">
                  <p className="font-fraunces text-sm sm:text-base text-slate-300 font-semibold">
                    No Morning or Night Briefings generated for today yet.
                  </p>
                  <p className="text-xs sm:text-sm text-slate-400">
                    Click <b>Morning Plan</b> or <b>Night Debrief</b> above (or let the n8n 07:00 AM / 10:00 PM cron trigger them automatically).
                  </p>
                </div>
              ) : (
                briefings.map((b) => (
                  <div
                    key={b.id}
                    className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3 shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-fraunces text-sm sm:text-base font-semibold text-white">
                        {b.title}
                      </span>
                      <span className="text-[10px] sm:text-xs px-2.5 py-1 rounded-full bg-white/10 text-slate-300 font-medium">
                        {b.briefing_date}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed select-text">
                      {b.summary}
                    </p>
                    {Array.isArray(b.sections) && b.sections.length > 0 && (
                      <div className="space-y-2.5 pt-1">
                        {b.sections.map((sec, idx) => (
                          <div
                            key={idx}
                            className="p-3 sm:p-3.5 rounded-xl bg-[#090C0D]/90 border border-white/10 space-y-1"
                          >
                            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-teal-300">
                              {sec.badge}
                            </span>
                            <h5 className="font-fraunces text-xs sm:text-sm font-semibold text-white">
                              {sec.title}
                            </h5>
                            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                              {sec.body}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: DAILY NIGHT 3-METRIC TRACKER (1-5 SCALE) + 7-DAY AVERAGES DASHBOARD */}
          {activeTab === "metrics" && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 hud-scroll">
              {/* 7-Day Averages Dashboard */}
              {(() => {
                const last7 = metricsHistory.slice(0, 7);
                const count = last7.length || 1;
                const avg1 = (
                  last7.reduce((a, r) => a + (Number(r.score_1) || 0), 0) / count
                ).toFixed(1);
                const avg2 = (
                  last7.reduce((a, r) => a + (Number(r.score_2) || 0), 0) / count
                ).toFixed(1);
                const avg3 = (
                  last7.reduce((a, r) => a + (Number(r.score_3) || 0), 0) / count
                ).toFixed(1);
                const comp = (
                  (Number(avg1) + Number(avg2) + Number(avg3)) /
                  3
                ).toFixed(1);
                return (
                  <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-teal-500/10 via-[#090C0D] to-amber-500/10 border border-teal-400/35 space-y-3.5 shadow-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-fraunces text-xs sm:text-sm lg:text-base font-semibold uppercase tracking-wider text-teal-300">
                        📊 7-Day Trio Averages
                      </span>
                      <span className="px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-xs sm:text-sm font-bold text-amber-200">
                        Composite {comp} / 5.0
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
                      {[
                        {
                          lbl: TRIO_DEF.labels[0],
                          icon: TRIO_DEF.icons[0],
                          avg: avg1,
                          bar: "bg-teal-400",
                        },
                        {
                          lbl: TRIO_DEF.labels[1],
                          icon: TRIO_DEF.icons[1],
                          avg: avg2,
                          bar: "bg-amber-400",
                        },
                        {
                          lbl: TRIO_DEF.labels[2],
                          icon: TRIO_DEF.icons[2],
                          avg: avg3,
                          bar: "bg-purple-400",
                        },
                      ].map((c) => (
                        <div
                          key={c.lbl}
                          className="p-3 sm:p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-1.5 shadow-sm"
                        >
                          <div className="flex items-center justify-between text-xs sm:text-sm">
                            <span className="text-slate-300 truncate font-medium">
                              {c.icon} {c.lbl}
                            </span>
                            <span className="font-bold text-white text-sm sm:text-base">{c.avg}</span>
                          </div>
                          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${c.bar}`}
                              style={{
                                width: `${Math.min(100, Math.round((Number(c.avg) / 5) * 100))}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4 shadow-md">
                <div className="flex items-center justify-between">
                  <span className="font-fraunces text-sm sm:text-base font-semibold text-teal-300">
                    🌙 Night Trio Metric Check-In (1–5)
                  </span>
                </div>

                {/* Active Trio Indicator */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-teal-400/10 border border-teal-400/30">
                  <span className="text-xs sm:text-sm font-semibold text-teal-200">
                    🔮 Clarity · 👑 Sovereignty · ⚡ Vitality
                  </span>
                  <span className="text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full bg-teal-400/20 text-teal-300 font-semibold">
                    Standard Life Trio
                  </span>
                </div>

                {/* 1-5 Rating Bars for Each of the 3 Metrics */}
                {[
                  {
                    label: TRIO_DEF.labels[0],
                    icon: TRIO_DEF.icons[0],
                    val: score1,
                    setVal: setScore1,
                  },
                  {
                    label: TRIO_DEF.labels[1],
                    icon: TRIO_DEF.icons[1],
                    val: score2,
                    setVal: setScore2,
                  },
                  {
                    label: TRIO_DEF.labels[2],
                    icon: TRIO_DEF.icons[2],
                    val: score3,
                    setVal: setScore3,
                  },
                ].map((m) => (
                  <div key={m.label} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="font-semibold text-slate-200">
                        {m.icon} {m.label}
                      </span>
                      <span className="font-bold text-teal-300 text-xs sm:text-sm">{m.val} / 5</span>
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                      {[1, 2, 3, 4, 5].map((num) => (
                        <button
                          key={num}
                          onClick={() => m.setVal(num)}
                          className={`py-2.5 sm:py-3 rounded-xl text-xs sm:text-base font-bold border transition-all cursor-pointer ${
                            m.val >= num
                              ? "bg-teal-400/30 border-teal-400 text-teal-100 shadow-sm"
                              : "bg-white/5 border-white/10 text-slate-500 hover:text-slate-300"
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Evening Reflection */}
                <div className="space-y-1.5">
                  <label className="block text-xs sm:text-sm text-slate-400 font-medium">
                    Evening Note & Reflection (feeds tomorrow&apos;s Morning Plan)
                  </label>
                  <textarea
                    rows={3}
                    value={reflection}
                    onChange={(e) => setReflection(e.target.value)}
                    placeholder="What gave or drained energy today?"
                    className="w-full bg-[#121719] border border-white/15 focus:border-teal-400 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none transition-all shadow-inner"
                  />
                </div>

                <button
                  onClick={handleSaveMetrics}
                  disabled={savingMetrics}
                  className="w-full py-3 sm:py-3.5 px-4 rounded-xl bg-[#E5A93C] hover:bg-amber-300 text-[#0D0F0E] font-bold text-xs sm:text-sm cursor-pointer transition-all shadow-md"
                >
                  {savingMetrics
                    ? "Saving & Computing Strategy..."
                    : "💾 Save Night Trio & Build Tomorrow Strategy"}
                </button>
              </div>

              {/* Historical 3-Metric Log */}
              <div className="space-y-2.5">
                <p className="font-fraunces text-xs sm:text-sm font-semibold uppercase tracking-wider text-slate-300">
                  📊 Recent Trio History ({metricsHistory.length} Days)
                </p>
                {metricsHistory.map((row) => (
                  <div
                    key={row.date}
                    className="p-3 sm:p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-1.5 shadow-sm"
                  >
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="font-semibold text-white">{row.date}</span>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="px-2.5 py-0.5 rounded-full bg-teal-400/15 text-teal-200 border border-teal-400/30">
                          {row.label_1}: <b>{row.score_1}</b>
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-400/15 text-amber-200 border border-amber-400/30">
                          {row.label_2}: <b>{row.score_2}</b>
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-purple-400/15 text-purple-200 border border-purple-400/30">
                          {row.label_3}: <b>{row.score_3}</b>
                        </span>
                      </div>
                    </div>
                    {row.reflection && (
                      <p className="text-xs sm:text-sm text-slate-400 italic">
                        “{row.reflection}”
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: N8N & AI PROVIDER SETTINGS */}
          {activeTab === "settings" && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 hud-scroll">
              <div className="p-4 rounded-2xl bg-teal-400/10 border border-teal-400/30 space-y-2">
                <p className="font-fraunces text-xs sm:text-sm font-semibold text-teal-200">
                  ⚡ Autonomous Dual-Engine Architecture
                </p>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Your normalized Supabase tables and local Docker n8n workflows (`n8n/workflows/*.json`) are active. When no external API key is entered, IdeMap runs on a <b>built-in Supabase heuristic engine</b> that directly analyzes your live database JSONs. Adding an OpenRouter or Gemini key enables deep generative reasoning.
                </p>
              </div>

              <div className="space-y-3.5">
                <label className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 cursor-pointer hover:border-teal-400/30 transition-all">
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-white">
                      Route via Local n8n Container
                    </p>
                    <p className="text-[11px] sm:text-xs text-slate-400">
                      Forwards to http://localhost:5678/webhook/idemap-assistant (auto-falls back if container is offline)
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferN8n}
                    onChange={(e) => setPreferN8n(e.target.checked)}
                    className="w-4 h-4 accent-teal-400"
                  />
                </label>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1.5">
                    OpenRouter API Key (Optional — uses OpenRouter credits)
                  </label>
                  <input
                    type="password"
                    value={openRouterKey}
                    onChange={(e) => setOpenRouterKey(e.target.value)}
                    placeholder="sk-or-v1-..."
                    className="w-full bg-[#121719] border border-white/15 focus:border-teal-400 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none transition-all shadow-inner"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1.5">
                    OpenRouter Model
                  </label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full bg-[#121719] border border-white/15 focus:border-teal-400 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none transition-all"
                  >
                    <option value="google/gemini-2.5-flash">
                      google/gemini-2.5-flash (Fast & Low Cost)
                    </option>
                    <option value="google/gemini-2.5-pro">
                      google/gemini-2.5-pro (Deep Reasoning)
                    </option>
                    <option value="anthropic/claude-3.5-sonnet">
                      anthropic/claude-3.5-sonnet
                    </option>
                    <option value="openai/gpt-4o-mini">openai/gpt-4o-mini</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1.5">
                    Google AI Studio / Gemini API Key (Optional)
                  </label>
                  <input
                    type="password"
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full bg-[#121719] border border-white/15 focus:border-teal-400 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none transition-all shadow-inner"
                  />
                </div>

                <button
                  onClick={saveSettings}
                  className="w-full py-3 px-4 rounded-xl bg-teal-400 hover:bg-teal-300 text-[#0D0F0E] font-bold text-xs sm:text-sm cursor-pointer transition-all shadow-[0_0_15px_rgba(45,212,191,0.25)]"
                >
                  Save AI & n8n Configuration
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
