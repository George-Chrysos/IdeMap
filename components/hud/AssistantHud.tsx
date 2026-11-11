"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Sparkles,
  Send,
  Check,
  X,
  Sun,
  Moon,
  Database,
  Settings,
  ChevronDown,
  RefreshCw,
  Zap,
  Layers,
  Maximize2,
  Minimize2,
  MessageSquare,
  ArrowUpRight,
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

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  tool_traces?: ToolTrace[];
  created_at?: string;
}

const DEFAULT_UNIVERSE_ID = "a1361b3c-32f2-4fed-a637-200ac9ecb861";

export default function AssistantHud() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "briefings" | "settings">("chat");

  // Orbital context synced from atlas.html
  const [universeId, setUniverseId] = useState<string>(DEFAULT_UNIVERSE_ID);
  const [focusPlanetId, setFocusPlanetId] = useState<string | null>(null);
  const [focusPlanetName, setFocusPlanetName] = useState<string>("⚡ Jester (Life Core)");

  // Assistant state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingActions, setPendingActions] = useState<ProposedAction[]>([]);
  const [briefings, setBriefings] = useState<BriefingRow[]>([]);
  const [inputQuery, setInputQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

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

  const openDailyCheckinModal = () => {
    const iframe = document.querySelector("iframe");
    iframe?.contentWindow?.postMessage(
      { type: "IDEMAP_OPEN_MODAL", modal: "todayCheckinModal", tab: "checkin" },
      "*"
    );
  };

  const sendMessage = async (textOverride?: string) => {
    const query = (textOverride ?? inputQuery).trim();
    if (!query || isLoading) return;

    if (query === "Open Daily Check-In 🌙") {
      openDailyCheckinModal();
      return;
    }

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
    <div className="fixed bottom-4 left-4 z-50 font-sans select-none pointer-events-auto">
      {/* Floating Launcher Pill (Closed State) */}
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
                IdeMap Architect
              </span>
              {pendingActions.length > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-400 text-[#0D0F0E] shadow-sm">
                  {pendingActions.length} Action{pendingActions.length === 1 ? "" : "s"}
                </span>
              )}
            </div>
            <p className="text-[10px] sm:text-[11px] text-teal-300/90 font-medium">
              {focusPlanetName} · Co-Pilot
            </p>
          </div>
        </button>
      )}

      {/* Expanded Floating HUD Drawer */}
      {isOpen && (
        <div
          className={`hud-panel glass-surface ${
            isExpanded
              ? "w-[94vw] sm:w-[680px] md:w-[780px] lg:w-[860px] h-[85vh]"
              : "w-[360px] sm:w-[420px] md:w-[450px] h-[560px] sm:h-[620px] max-h-[82vh]"
          } rounded-2xl sm:rounded-3xl border border-teal-400/35 shadow-[0_24px_70px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-3xl flex flex-col overflow-hidden text-slate-100 transition-all duration-300 fade-up`}
        >
          {/* Executive Header Bar (Clean 44px) */}
          <div className="py-2.5 px-4 sm:px-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-teal-500/10 via-transparent to-amber-500/10 flex-shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse shrink-0" />
              <h3 className="font-fraunces text-sm sm:text-base font-semibold text-white tracking-wide shrink-0">
                IdeMap Architect
              </h3>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-300 truncate max-w-[130px] sm:max-w-[180px] flex items-center gap-1">
                <span className="text-amber-300 font-medium">⚡</span>
                <span className="truncate">{focusPlanetName}</span>
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-400/15 border border-teal-400/30 text-teal-200 font-mono">
                {preferN8n ? "n8n" : "AI"}
              </span>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
                title={isExpanded ? "Collapse Window" : "Expand Window"}
              >
                {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
                title="Minimize Assistant HUD"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs (3 Streamlined Modes) */}
          <div className="flex items-center gap-2 px-3 py-2 bg-[#090C0D]/90 border-b border-white/10 text-xs font-semibold flex-shrink-0">
            <button
              onClick={() => setActiveTab("chat")}
              className={`px-3.5 py-1.5 rounded-full flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "chat"
                  ? "bg-teal-400/20 text-teal-200 border border-teal-400/50 shadow-[0_0_12px_rgba(45,212,191,0.2)]"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Chat & Co-Pilot</span>
              {pendingActions.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-400 text-[#0D0F0E] text-[10px] font-bold inline-flex items-center justify-center ml-0.5">
                  {pendingActions.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("briefings")}
              className={`px-3.5 py-1.5 rounded-full flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "briefings"
                  ? "bg-amber-400/20 text-amber-200 border border-amber-400/50 shadow-[0_0_12px_rgba(229,169,60,0.2)]"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>AM / PM Briefings</span>
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`px-3.5 py-1.5 rounded-full flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "settings"
                  ? "bg-white/15 text-white border border-white/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>AI Engine</span>
            </button>
          </div>

          {/* Status Banner */}
          {statusBanner && (
            <div className="px-4 py-2 bg-teal-400/15 border-b border-teal-400/30 text-xs text-teal-200 flex items-center justify-between font-medium">
              <span>{statusBanner}</span>
            </div>
          )}

          {/* TAB 1: CHAT & CO-PILOT */}
          {activeTab === "chat" && (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 hud-scroll">
                
                {/* Pending Actions Notification Banner */}
                {pendingActions.length > 0 && (
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500/15 via-[#0E1214] to-transparent border border-amber-400/40 space-y-2.5 shadow-md">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5" />
                        <span>Action Proposal ({pendingActions.length})</span>
                      </span>
                      <span className="text-[10px] text-amber-200/80">Pending Confirmation</span>
                    </div>

                    {pendingActions.slice(0, 2).map((act) => (
                      <div key={act.id} className="p-2.5 rounded-xl bg-black/40 border border-white/10 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-fraunces text-xs sm:text-sm font-semibold text-white truncate">
                            {act.title}
                          </h4>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-200 shrink-0 font-medium">
                            {act.action_type.replace("_", " ")}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 line-clamp-2">
                          {act.description}
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => handleResolveAction(act, "confirm")}
                            className="flex-1 py-1.5 px-3 rounded-lg bg-[#E5A93C] hover:bg-amber-300 text-[#0D0F0E] font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-all shadow-sm"
                          >
                            <Check className="w-3.5 h-3.5" /> Confirm & Apply
                          </button>
                          <button
                            onClick={() => handleResolveAction(act, "dismiss")}
                            className="py-1.5 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs flex items-center justify-center cursor-pointer transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Empty State Card */}
                {messages.length === 0 ? (
                  <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.025] border border-white/10 text-xs sm:text-sm text-slate-300 space-y-2.5">
                    <div className="flex items-center gap-2 text-teal-300">
                      <Sparkles className="w-4 h-4" />
                      <p className="font-fraunces text-sm font-semibold">Orbital Intelligence Online</p>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Ask anything about your planetary frontiers, mission priorities, strain flags, or XP momentum. I query your live Supabase database and queue actions directly to your solar system.
                    </p>
                    <div className="pt-1 flex items-center gap-2">
                      <button
                        onClick={openDailyCheckinModal}
                        className="text-xs px-3 py-1.5 rounded-xl bg-teal-400/15 border border-teal-400/35 text-teal-200 hover:bg-teal-400/25 transition-all flex items-center gap-1.5 cursor-pointer font-medium"
                      >
                        <span>🌙 Open Daily Check-In</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
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
                        className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap select-text ${
                          m.role === "user"
                            ? "bg-gradient-to-br from-teal-500/25 to-teal-600/15 border border-teal-400/40 text-slate-100 shadow-sm"
                            : "bg-[#0D1113]/90 border border-white/10 text-slate-200 shadow-sm"
                        }`}
                      >
                        {m.content}
                      </div>

                      {/* Collapsible Supabase Data Sources */}
                      {m.tool_traces && m.tool_traces.length > 0 && (
                        <details className="mt-1.5 group max-w-[88%]">
                          <summary className="inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full bg-teal-950/70 border border-teal-400/25 text-teal-300 font-mono cursor-pointer hover:bg-teal-950 transition-colors list-none">
                            <Database className="w-3 h-3" />
                            <span>{m.tool_traces.length} Supabase Sources Synced</span>
                            <span className="text-[9px] group-open:rotate-180 transition-transform">▼</span>
                          </summary>
                          <div className="mt-1.5 flex flex-wrap gap-1 p-2 rounded-xl bg-[#090C0D] border border-white/10">
                            {m.tool_traces.map((tr, i) => (
                              <span
                                key={i}
                                title={tr.reason}
                                className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-teal-200"
                              >
                                {tr.table} ({tr.rowsFetched} rows)
                              </span>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  ))
                )}

                {isLoading && (
                  <div className="text-xs text-teal-300 flex items-center gap-2 px-1">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Querying Supabase telemetry...</span>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Horizontal Quick-Prompt Strip (Positioned Directly Above Input) */}
              <div className="px-3 py-1.5 bg-[#090C0D] border-t border-white/10 flex items-center gap-1.5 overflow-x-auto hud-scroll whitespace-nowrap flex-shrink-0">
                {[
                  "What should I focus on?",
                  "Check sector strain",
                  "Analyze XP velocity",
                  "Open Daily Check-In 🌙",
                ].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => sendMessage(prompt)}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-white/5 hover:bg-teal-400/20 border border-white/10 text-slate-300 hover:text-teal-200 shrink-0 cursor-pointer transition-all font-medium"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              {/* Ergonomic Input Bar */}
              <div className="p-2.5 sm:p-3 bg-[#0B0E0F] border-t border-white/10 flex items-center gap-2 flex-shrink-0">
                <input
                  type="text"
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") sendMessage();
                  }}
                  placeholder="Ask your Life Architect or propose a task..."
                  className="flex-1 bg-[#121719] border border-white/15 focus:border-teal-400 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none transition-all shadow-inner"
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={isLoading || !inputQuery.trim()}
                  className="p-2 sm:p-2.5 rounded-xl bg-teal-400 hover:bg-teal-300 disabled:opacity-40 text-[#0D0F0E] font-bold cursor-pointer transition-all shadow-[0_0_12px_rgba(45,212,191,0.25)]"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: AM / PM BRIEFINGS */}
          {activeTab === "briefings" && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4 hud-scroll">
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => handleGenerateBriefing("morning")}
                  disabled={isLoading}
                  className="p-3 rounded-2xl bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/40 text-left cursor-pointer transition-all shadow-md group"
                >
                  <div className="flex items-center gap-1.5 text-amber-300 text-xs font-semibold">
                    <Sun className="w-4 h-4" /> Morning Plan
                  </div>
                  <p className="text-[10px] text-slate-300 mt-1">
                    Calibrate today from last night&apos;s pulse
                  </p>
                </button>
                <button
                  onClick={() => handleGenerateBriefing("night")}
                  disabled={isLoading}
                  className="p-3 rounded-2xl bg-teal-400/15 hover:bg-teal-400/25 border border-teal-400/40 text-left cursor-pointer transition-all shadow-md group"
                >
                  <div className="flex items-center gap-1.5 text-teal-300 text-xs font-semibold">
                    <Moon className="w-4 h-4" /> Night Debrief
                  </div>
                  <p className="text-[10px] text-slate-300 mt-1">
                    Review wins & tomorrow&apos;s strategy
                  </p>
                </button>
              </div>

              {briefings.length === 0 ? (
                <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 text-center space-y-2">
                  <p className="font-fraunces text-sm text-slate-300 font-semibold">
                    No Briefings generated for today yet.
                  </p>
                  <p className="text-xs text-slate-400">
                    Click <b>Morning Plan</b> or <b>Night Debrief</b> above to synthesize from Supabase.
                  </p>
                </div>
              ) : (
                briefings.map((b) => (
                  <div
                    key={b.id}
                    className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5 shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-fraunces text-xs sm:text-sm font-semibold text-white">
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
                            <h5 className="font-fraunces text-xs font-semibold text-white">
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

          {/* TAB 3: CONFIG & API KEYS */}
          {activeTab === "settings" && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 hud-scroll">
              <div className="p-3.5 rounded-2xl bg-teal-400/10 border border-teal-400/30 space-y-1.5">
                <p className="font-fraunces text-xs font-semibold text-teal-200">
                  ⚡ Autonomous Dual-Engine Architecture
                </p>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  When no API key is entered, IdeMap operates on a <b>deterministic Supabase heuristic engine</b> that queries your normalized database JSONs. Adding an OpenRouter or Google Gemini key unlocks generative conversational reasoning.
                </p>
              </div>

              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] border border-white/10 cursor-pointer hover:border-teal-400/30 transition-all">
                  <div>
                    <p className="text-xs font-semibold text-white">
                      Route via Local n8n Container
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Webhook at http://localhost:5678/webhook/idemap-assistant (falls back cleanly if offline)
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
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    OpenRouter API Key (Optional)
                  </label>
                  <input
                    type="password"
                    value={openRouterKey}
                    onChange={(e) => setOpenRouterKey(e.target.value)}
                    placeholder="sk-or-v1-..."
                    className="w-full bg-[#121719] border border-white/15 focus:border-teal-400 rounded-xl px-3 py-2 text-xs text-white focus:outline-none transition-all shadow-inner"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    OpenRouter Model
                  </label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full bg-[#121719] border border-white/15 focus:border-teal-400 rounded-xl px-3 py-2 text-xs text-white focus:outline-none transition-all"
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
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Google AI Studio / Gemini API Key (Optional)
                  </label>
                  <input
                    type="password"
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full bg-[#121719] border border-white/15 focus:border-teal-400 rounded-xl px-3 py-2 text-xs text-white focus:outline-none transition-all shadow-inner"
                  />
                </div>

                <button
                  onClick={saveSettings}
                  className="w-full py-2.5 px-4 rounded-xl bg-teal-400 hover:bg-teal-300 text-[#0D0F0E] font-bold text-xs cursor-pointer transition-all shadow-[0_0_12px_rgba(45,212,191,0.25)]"
                >
                  Save Configuration
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
