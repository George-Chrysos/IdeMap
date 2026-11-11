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
          className="group flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-[#0F1315]/95 border border-teal-400/40 text-slate-100 shadow-[0_12px_40px_rgba(0,0,0,0.75),0_0_20px_rgba(45,212,191,0.18)] hover:border-teal-300 hover:scale-[1.02] transition-all cursor-pointer backdrop-blur-xl"
        >
          <span className="w-7 h-7 rounded-full bg-teal-400/20 border border-teal-400/50 flex items-center justify-center text-teal-300">
            <Sparkles className="w-4 h-4" />
          </span>
          <div className="text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold tracking-wide text-white">
                AI Orbital Architect
              </span>
              {pendingActions.length > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-400 text-[#0D0F0E]">
                  {pendingActions.length} Action{pendingActions.length === 1 ? "" : "s"}
                </span>
              )}
            </div>
            <p className="text-[10px] text-teal-300/90">
              {focusPlanetName} · Trio & Briefings
            </p>
          </div>
        </button>
      )}

      {/* Expanded Floating HUD Drawer */}
      {isOpen && (
        <div className="w-[370px] sm:w-[500px] md:w-[580px] lg:w-[680px] xl:w-[760px] h-[640px] sm:h-[720px] lg:h-[820px] max-h-[90vh] rounded-2xl sm:rounded-3xl bg-[#0D1113]/95 border border-teal-400/35 shadow-[0_24px_70px_rgba(0,0,0,0.85),0_0_35px_rgba(45,212,191,0.12)] backdrop-blur-2xl flex flex-col overflow-hidden text-slate-100">
          {/* Header */}
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-teal-500/10 via-transparent to-amber-500/10">
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-teal-400/20 border border-teal-400/40 flex items-center justify-center text-teal-300 shrink-0">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs sm:text-sm lg:text-base font-semibold uppercase tracking-wider text-teal-300 truncate">
                    IdeMap AI Architect
                  </h3>
                  <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-teal-400/15 border border-teal-400/30 text-teal-200">
                    {preferN8n ? "n8n Flow" : "Hybrid Agent"}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                  Target: <span className="text-slate-200 font-medium">{focusPlanetName}</span>
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 sm:p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Minimize Assistant HUD"
            >
              <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="grid grid-cols-4 gap-1 p-1.5 sm:p-2 bg-[#090C0D] border-b border-white/10 text-[11px] sm:text-xs font-medium">
            <button
              onClick={() => setActiveTab("chat")}
              className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
                activeTab === "chat"
                  ? "bg-teal-400/20 text-teal-200 border border-teal-400/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Assistant</span>
              {pendingActions.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-400 text-[#0D0F0E] text-[10px] font-bold inline-flex items-center justify-center">
                  {pendingActions.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("briefings")}
              className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
                activeTab === "briefings"
                  ? "bg-amber-400/20 text-amber-200 border border-amber-400/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>AM / PM</span>
            </button>
            <button
              onClick={() => setActiveTab("metrics")}
              className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
                activeTab === "metrics"
                  ? "bg-teal-400/20 text-teal-200 border border-teal-400/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>3-Metrics</span>
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer ${
                activeTab === "settings"
                  ? "bg-white/15 text-white border border-white/30"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>n8n/AI</span>
            </button>
          </div>

          {/* Status Banner */}
          {statusBanner && (
            <div className="px-3 py-1.5 bg-teal-400/15 border-b border-teal-400/30 text-[11px] text-teal-200 flex items-center justify-between">
              <span>{statusBanner}</span>
            </div>
          )}

          {/* TAB 1: CHAT & PROPOSED HUD ACTIONS */}
          {activeTab === "chat" && (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
                {/* Quick Prompt Suggestions */}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "What should I focus on today?",
                    "Analyze my 3-metrics & XP trends",
                    "Propose a mission for Signal",
                    "Check sectors for strain",
                  ].map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => sendMessage(prompt)}
                      className="text-[11px] px-2.5 py-1 rounded-full bg-white/[0.04] hover:bg-teal-400/15 border border-white/10 hover:border-teal-400/40 text-slate-300 hover:text-teal-200 transition-all cursor-pointer"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>

                {/* Pending HUD Action Confirmation Cards */}
                {pendingActions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-300 flex items-center gap-1">
                      <Layers className="w-3 h-3" /> Pending HUD Action Proposals (Confirm to Execute)
                    </p>
                    {pendingActions.map((act) => (
                      <div
                        key={act.id}
                        className="p-3 rounded-xl bg-amber-400/[0.09] border border-amber-400/40 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-200 font-semibold uppercase">
                              ⚡ {act.action_type.replace("_", " ")}
                            </span>
                            <h4 className="text-xs font-semibold text-white mt-1">
                              {act.title}
                            </h4>
                            <p className="text-[11px] text-slate-300 mt-0.5">
                              {act.description}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => handleResolveAction(act, "confirm")}
                            className="flex-1 py-1.5 px-3 rounded-lg bg-[#E5A93C] hover:bg-amber-400 text-[#0D0F0E] font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-sm"
                          >
                            <Check className="w-3.5 h-3.5" /> Confirm & Apply
                          </button>
                          <button
                            onClick={() => handleResolveAction(act, "dismiss")}
                            className="py-1.5 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" /> Dismiss
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Chat Messages */}
                {messages.length === 0 ? (
                  <div className="p-4 rounded-xl bg-white/[0.025] border border-white/10 text-xs text-slate-300 space-y-1.5">
                    <p className="font-semibold text-teal-300">
                      🛰️ Connected to Normalized Supabase Life OS
                    </p>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
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
                        className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap select-text ${
                          m.role === "user"
                            ? "bg-teal-500/20 border border-teal-400/40 text-white"
                            : "bg-white/[0.04] border border-white/10 text-slate-200"
                        }`}
                      >
                        {m.content}
                      </div>

                      {/* Dynamic Supabase JSON Tool Traces */}
                      {m.tool_traces && m.tool_traces.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1 max-w-[92%]">
                          {m.tool_traces.map((tr, i) => (
                            <span
                              key={i}
                              title={tr.reason}
                              className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-teal-950/70 border border-teal-400/25 text-teal-300"
                            >
                              <Database className="w-2.5 h-2.5" />
                              {tr.table} ({tr.rowsFetched} JSON{tr.rowsFetched === 1 ? "" : "s"})
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}

                {isLoading && (
                  <div className="text-xs text-teal-300 flex items-center gap-2 px-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Querying Supabase JSONs & synthesizing...</span>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input Bar */}
              <div className="p-3 border-t border-white/10 bg-[#090C0D] flex items-center gap-2">
                <input
                  type="text"
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") sendMessage();
                  }}
                  placeholder="Ask your Life Architect or propose a task..."
                  className="flex-1 bg-[#121719] border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-400"
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={isLoading || !inputQuery.trim()}
                  className="p-2 rounded-xl bg-teal-400 hover:bg-teal-300 disabled:opacity-40 text-[#0D0F0E] font-semibold cursor-pointer transition-all"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: ASYNCHRONOUS MORNING & NIGHT BRIEFINGS */}
          {activeTab === "briefings" && (
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleGenerateBriefing("morning")}
                  disabled={isLoading}
                  className="p-2.5 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/40 text-left cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-1.5 text-amber-300 text-xs font-semibold">
                    <Sun className="w-4 h-4" /> Morning Plan
                  </div>
                  <p className="text-[10px] text-slate-300 mt-0.5">
                    Calibrate today from last night&apos;s Trio
                  </p>
                </button>
                <button
                  onClick={() => handleGenerateBriefing("night")}
                  disabled={isLoading}
                  className="p-2.5 rounded-xl bg-teal-400/15 hover:bg-teal-400/25 border border-teal-400/40 text-left cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-1.5 text-teal-300 text-xs font-semibold">
                    <Moon className="w-4 h-4" /> Night Debrief
                  </div>
                  <p className="text-[10px] text-slate-300 mt-0.5">
                    Review wins & strategy for tomorrow
                  </p>
                </button>
              </div>

              {briefings.length === 0 ? (
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 text-center space-y-2">
                  <p className="text-xs text-slate-300 font-medium">
                    No Morning or Night Briefings generated for today yet.
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Click <b>Morning Plan</b> or <b>Night Debrief</b> above (or let the n8n 07:00 AM / 10:00 PM cron trigger them automatically).
                  </p>
                </div>
              ) : (
                briefings.map((b) => (
                  <div
                    key={b.id}
                    className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white">
                        {b.title}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                        {b.briefing_date}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed select-text">
                      {b.summary}
                    </p>
                    {Array.isArray(b.sections) && b.sections.length > 0 && (
                      <div className="space-y-2 pt-1">
                        {b.sections.map((sec, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-xl bg-[#090C0D]/90 border border-white/10 space-y-1"
                          >
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-teal-300">
                              {sec.badge}
                            </span>
                            <h5 className="text-xs font-semibold text-white">
                              {sec.title}
                            </h5>
                            <p className="text-[11px] text-slate-300 leading-relaxed">
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
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5">
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
                  <div className="p-3.5 sm:p-5 rounded-2xl bg-gradient-to-br from-teal-500/10 via-[#090C0D] to-amber-500/10 border border-teal-400/35 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] sm:text-xs lg:text-sm font-semibold uppercase tracking-wider text-teal-300">
                        📊 7-Day Trio Averages
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-[10px] sm:text-xs font-bold text-amber-200">
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
                          className="p-2.5 sm:p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-1.5"
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

              <div className="p-3.5 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3.5 sm:space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm lg:text-base font-semibold uppercase tracking-wider text-teal-300">
                    🌙 Night Trio Metric Check-In (1–5)
                  </span>
                </div>

                {/* Active Trio Indicator */}
                <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-teal-400/10 border border-teal-400/30">
                  <span className="text-xs sm:text-sm font-semibold text-teal-200">
                    🔮 Clarity · 👑 Sovereignty · ⚡ Vitality
                  </span>
                  <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-teal-400/20 text-teal-300 font-medium">
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
                          className={`py-2 sm:py-3 rounded-xl text-xs sm:text-base font-bold border transition-all cursor-pointer ${
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
                <div className="space-y-1">
                  <label className="block text-[11px] sm:text-xs text-slate-400">
                    Evening Note & Reflection (feeds tomorrow&apos;s Morning Plan)
                  </label>
                  <textarea
                    rows={3}
                    value={reflection}
                    onChange={(e) => setReflection(e.target.value)}
                    placeholder="What gave or drained energy today?"
                    className="w-full bg-[#121719] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-400"
                  />
                </div>

                <button
                  onClick={handleSaveMetrics}
                  disabled={savingMetrics}
                  className="w-full py-3 sm:py-3.5 px-4 rounded-xl bg-[#E5A93C] hover:bg-amber-400 text-[#0D0F0E] font-bold text-xs sm:text-sm cursor-pointer transition-all shadow-md"
                >
                  {savingMetrics
                    ? "Saving & Computing Strategy..."
                    : "💾 Save Night Trio & Build Tomorrow Strategy"}
                </button>
              </div>

              {/* Historical 3-Metric Log */}
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  📊 Recent Trio History ({metricsHistory.length} Days)
                </p>
                {metricsHistory.map((row) => (
                  <div
                    key={row.date}
                    className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white">{row.date}</span>
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="px-2 py-0.5 rounded-full bg-teal-400/15 text-teal-200">
                          {row.label_1}: <b>{row.score_1}</b>
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-200">
                          {row.label_2}: <b>{row.score_2}</b>
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-purple-400/15 text-purple-200">
                          {row.label_3}: <b>{row.score_3}</b>
                        </span>
                      </div>
                    </div>
                    {row.reflection && (
                      <p className="text-[11px] text-slate-400 italic">
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
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
              <div className="p-3 rounded-xl bg-teal-400/10 border border-teal-400/30 space-y-1.5">
                <p className="text-xs font-semibold text-teal-200">
                  ⚡ Dual-Engine Architecture Active
                </p>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Your normalized Supabase schema (10 tables) and local Docker n8n workflows (`n8n/workflows/*.json`) are ready. Add your OpenRouter key or Google AI Pro key below.
                </p>
              </div>

              <div className="space-y-2.5">
                <label className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/10 cursor-pointer">
                  <div>
                    <p className="text-xs font-semibold text-white">
                      Route via Local n8n Container
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Forwards to http://localhost:5678/webhook/idemap-assistant (auto-falls back if container is stopped)
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
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    OpenRouter API Key (Optional — uses OpenRouter credits)
                  </label>
                  <input
                    type="password"
                    value={openRouterKey}
                    onChange={(e) => setOpenRouterKey(e.target.value)}
                    placeholder="sk-or-v1-..."
                    className="w-full bg-[#121719] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    OpenRouter Model
                  </label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full bg-[#121719] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-400"
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
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    Google AI Studio / Gemini API Key (Optional)
                  </label>
                  <input
                    type="password"
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full bg-[#121719] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-400"
                  />
                </div>

                <button
                  onClick={saveSettings}
                  className="w-full py-2 px-4 rounded-xl bg-teal-400 hover:bg-teal-300 text-[#0D0F0E] font-semibold text-xs cursor-pointer transition-all"
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
