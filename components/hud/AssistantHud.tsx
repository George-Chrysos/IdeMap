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
          className="group hud-panel flex items-center gap-3 px-3.5 py-2 rounded-lg border border-white/10 text-slate-100 shadow-[0_12px_40px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.08)] bg-[#101415] hover:border-white/20 transition-all cursor-pointer"
        >
          <span className="w-7 h-7 rounded bg-[#E6A734]/15 border border-[#E6A734]/30 flex items-center justify-center text-[#E6A734] shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
          </span>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="font-fraunces text-xs sm:text-sm font-semibold tracking-wide text-white">
                IdeMap Co-Pilot
              </span>
              {pendingActions.length > 0 && (
                <span className="px-1.5 py-0.2 text-[9px] font-mono font-bold rounded bg-[#E6A734] text-[#080A0A] shadow-sm">
                  {pendingActions.length}
                </span>
              )}
            </div>
            <p className="text-[10px] text-[#869299] font-mono truncate max-w-[150px]">
              {focusPlanetName} // Online
            </p>
          </div>
        </button>
      )}

      {/* Expanded Floating HUD Drawer */}
      {isOpen && (
        <div
          className={`hud-panel ${
            isExpanded
              ? "w-[94vw] sm:w-[680px] md:w-[780px] lg:w-[860px] h-[85vh]"
              : "w-[360px] sm:w-[420px] md:w-[450px] h-[560px] sm:h-[620px] max-h-[82vh]"
          } rounded-xl border border-white/10 shadow-[0_24px_70px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.08)] bg-[#101415] flex flex-col overflow-hidden text-slate-100 transition-all duration-300 fade-up`}
        >
          {/* Executive Header Bar (Clean 44px) */}
          <div className="py-2 px-3.5 sm:px-4 border-b border-white/10 flex items-center justify-between bg-[#121719] flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-[#E6A734] shrink-0" />
              <h3 className="font-fraunces text-sm font-semibold text-white tracking-wide shrink-0">
                IdeMap Co-Pilot
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[#869299] truncate max-w-[130px] sm:max-w-[170px] flex items-center gap-1">
                <span className="truncate">{focusPlanetName}</span>
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[#E6A734] font-mono">
                {preferN8n ? "N8N" : "AI"}
              </span>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-7 h-7 rounded text-[#869299] hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
                title={isExpanded ? "Collapse Window" : "Expand Window"}
              >
                {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded text-[#869299] hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
                title="Minimize Co-Pilot"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs (3 Streamlined Modes) */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0A0D0E] border-b border-white/10 text-xs font-semibold flex-shrink-0">
            <button
              onClick={() => setActiveTab("chat")}
              className={`px-3 py-1.5 rounded font-mono text-xs flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "chat"
                  ? "bg-[#E6A734] text-[#080A0A] font-bold shadow-sm"
                  : "text-[#869299] hover:text-white hover:bg-white/5"
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Chat & Co-Pilot</span>
              {pendingActions.length > 0 && (
                <span className="w-4 h-4 rounded bg-[#080A0A] text-[#E6A734] text-[10px] font-bold inline-flex items-center justify-center ml-0.5">
                  {pendingActions.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("briefings")}
              className={`px-3 py-1.5 rounded font-mono text-xs flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "briefings"
                  ? "bg-[#E6A734] text-[#080A0A] font-bold shadow-sm"
                  : "text-[#869299] hover:text-white hover:bg-white/5"
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>AM / PM Briefings</span>
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`px-3 py-1.5 rounded font-mono text-xs flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === "settings"
                  ? "bg-[#E6A734] text-[#080A0A] font-bold shadow-sm"
                  : "text-[#869299] hover:text-white hover:bg-white/5"
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>AI Engine</span>
            </button>
          </div>

          {/* Status Banner */}
          {statusBanner && (
            <div className="px-4 py-1.5 bg-[#E6A734]/15 border-b border-[#E6A734]/30 text-xs font-mono text-[#E6A734] flex items-center justify-between font-medium">
              <span>{statusBanner}</span>
            </div>
          )}

          {/* TAB 1: CHAT & CO-PILOT */}
          {activeTab === "chat" && (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 hud-scroll">
                
                {/* Pending Actions Notification Banner */}
                {pendingActions.length > 0 && (
                  <div className="p-3 rounded-lg bg-[#0E1214] border border-[#E6A734]/40 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#E6A734] flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5" />
                        <span>Action Proposal ({pendingActions.length})</span>
                      </span>
                      <span className="text-[10px] font-mono text-[#869299]">Pending Confirmation</span>
                    </div>

                    {pendingActions.slice(0, 2).map((act) => (
                      <div key={act.id} className="p-2.5 rounded bg-black/40 border border-white/10 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-fraunces text-xs sm:text-sm font-semibold text-white truncate">
                            {act.title}
                          </h4>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#E6A734]/20 text-[#E6A734] shrink-0 font-medium">
                            {act.action_type.replace("_", " ")}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#869299] line-clamp-2">
                          {act.description}
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => handleResolveAction(act, "confirm")}
                            className="flex-1 py-1.5 px-3 rounded bg-[#E6A734] hover:brightness-110 text-[#080A0A] font-mono font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-all shadow-sm"
                          >
                            <Check className="w-3.5 h-3.5" /> Confirm & Apply
                          </button>
                          <button
                            onClick={() => handleResolveAction(act, "dismiss")}
                            className="py-1.5 px-2.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs flex items-center justify-center cursor-pointer transition-colors"
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
                  <div className="p-4 sm:p-5 rounded-lg bg-[#0E1213] border border-white/10 text-xs sm:text-sm text-slate-300 space-y-2.5">
                    <div className="flex items-center gap-2 text-[#E6A734]">
                      <Sparkles className="w-4 h-4" />
                      <p className="font-fraunces text-sm font-semibold text-white">Astrodynamic Co-Pilot</p>
                    </div>
                    <p className="text-xs text-[#869299] leading-relaxed">
                      Awaiting query. Ready to inspect planetary orbits, strain flags, and task velocity across your frontiers.
                    </p>
                    <div className="pt-1 flex items-center gap-2">
                      <button
                        onClick={openDailyCheckinModal}
                        className="text-xs font-mono px-3 py-1.5 rounded bg-[#E6A734]/15 border border-[#E6A734]/35 text-[#E6A734] hover:bg-[#E6A734]/25 transition-all flex items-center gap-1.5 cursor-pointer font-medium"
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
                        className={`max-w-[88%] rounded-lg px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap select-text ${
                          m.role === "user"
                            ? "bg-[#182022] border border-white/15 text-[#F5F7F8] shadow-sm"
                            : "bg-[#0E1213] border border-white/10 text-[#F5F7F8] shadow-sm"
                        }`}
                      >
                        {m.content}
                      </div>

                      {/* Collapsible Supabase Data Sources */}
                      {m.tool_traces && m.tool_traces.length > 0 && (
                        <details className="mt-1.5 group max-w-[88%]">
                          <summary className="inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded bg-[#080A0A] border border-white/15 text-[#E6A734] font-mono cursor-pointer hover:bg-white/5 transition-colors list-none">
                            <Database className="w-3 h-3" />
                            <span>{m.tool_traces.length} Supabase Sources Synced</span>
                            <span className="text-[9px] group-open:rotate-180 transition-transform">▼</span>
                          </summary>
                          <div className="mt-1.5 flex flex-wrap gap-1 p-2 rounded bg-[#080A0A] border border-white/10">
                            {m.tool_traces.map((tr, i) => (
                              <span
                                key={i}
                                title={tr.reason}
                                className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[#869299]"
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
                  <div className="text-xs font-mono text-[#E6A734] flex items-center gap-2 px-1">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Reading sector telemetry...</span>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Horizontal Quick-Prompt Strip (Positioned Directly Above Input) */}
              <div className="px-3 py-1.5 bg-[#0A0D0E] border-t border-white/10 flex items-center gap-1.5 overflow-x-auto hud-scroll whitespace-nowrap flex-shrink-0">
                <a
                  href="/console"
                  className="text-[11px] font-mono px-2.5 py-1 rounded border border-emerald-400/30 bg-emerald-400/10 text-emerald-300 hover:text-white hover:bg-emerald-400/20 shrink-0 cursor-pointer transition-all font-medium flex items-center gap-1"
                  title="Open Biophilic Frosted Glass Console"
                >
                  <span>✨ Glass Console</span>
                  <ArrowUpRight className="w-3 h-3" />
                </a>
                {[
                  "What should I focus on?",
                  "Check sector strain",
                  "Analyze XP velocity",
                  "Open Daily Check-In 🌙",
                ].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => sendMessage(prompt)}
                    className="text-[11px] font-mono px-2.5 py-1 rounded border border-white/10 bg-white/[0.02] text-[#869299] hover:text-white hover:bg-white/5 hover:border-white/20 shrink-0 cursor-pointer transition-all font-medium"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              {/* Ergonomic Input Bar */}
              <div className="p-2.5 sm:p-3 bg-[#0E1213] border-t border-white/10 flex items-center gap-2 flex-shrink-0">
                <input
                  type="text"
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") sendMessage();
                  }}
                  placeholder="Enter command or query sector..."
                  className="flex-1 bg-[#080A0A] border border-white/10 focus:border-[#E6A734] rounded px-3.5 py-2 text-xs sm:text-sm text-white placeholder:text-[#869299]/60 focus:outline-none transition-all shadow-inner font-mono"
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={isLoading || !inputQuery.trim()}
                  className="p-2 sm:p-2.5 rounded bg-[#E6A734] hover:brightness-110 disabled:opacity-40 text-[#080A0A] font-bold cursor-pointer transition-all shadow-sm"
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
                  className="p-3 rounded-lg bg-[#0E1213] hover:bg-[#141A1C] border border-white/10 text-left cursor-pointer transition-all shadow-sm group"
                >
                  <div className="flex items-center gap-1.5 text-[#E6A734] font-mono text-xs font-semibold">
                    <Sun className="w-4 h-4" /> Morning Plan
                  </div>
                  <p className="text-[10px] text-[#869299] mt-1">
                    Synthesize today from last night&apos;s pulse
                  </p>
                </button>
                <button
                  onClick={() => handleGenerateBriefing("night")}
                  disabled={isLoading}
                  className="p-3 rounded-lg bg-[#0E1213] hover:bg-[#141A1C] border border-white/10 text-left cursor-pointer transition-all shadow-sm group"
                >
                  <div className="flex items-center gap-1.5 text-slate-300 font-mono text-xs font-semibold">
                    <Moon className="w-4 h-4" /> Night Debrief
                  </div>
                  <p className="text-[10px] text-[#869299] mt-1">
                    Review wins & tomorrow&apos;s strategy
                  </p>
                </button>
              </div>

              {briefings.length === 0 ? (
                <div className="p-5 rounded-lg bg-[#0E1213] border border-white/10 text-center space-y-2">
                  <p className="font-fraunces text-sm text-slate-300 font-semibold">
                    No Briefings generated for today yet.
                  </p>
                  <p className="text-xs text-[#869299]">
                    Click <b>Morning Plan</b> or <b>Night Debrief</b> above to synthesize from Supabase.
                  </p>
                </div>
              ) : (
                briefings.map((b) => (
                  <div
                    key={b.id}
                    className="p-4 rounded-lg bg-[#0E1213] border border-white/10 space-y-2.5 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-fraunces text-xs sm:text-sm font-semibold text-white">
                        {b.title}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-[#869299]">
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
                            className="p-2.5 rounded bg-[#080A0A] border border-white/10 space-y-1"
                          >
                            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#E6A734]">
                              {sec.badge}
                            </span>
                            <h5 className="font-fraunces text-xs font-semibold text-white">
                              {sec.title}
                            </h5>
                            <p className="text-[11px] text-[#869299] leading-relaxed">
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
              <div className="p-3.5 rounded-lg bg-[#0E1213] border border-white/10 space-y-1.5">
                <p className="font-mono text-xs font-semibold text-[#E6A734] uppercase tracking-wider">
                  ⚡ Autonomous Dual-Engine Architecture
                </p>
                <p className="text-[11px] text-[#869299] leading-relaxed">
                  When no API key is entered, IdeMap operates on a <b>deterministic Supabase heuristic engine</b> that queries your normalized database JSONs. Adding an OpenRouter or Google Gemini key unlocks generative conversational reasoning.
                </p>
              </div>

              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 rounded-lg bg-[#0E1213] border border-white/10 cursor-pointer hover:border-white/20 transition-all">
                  <div>
                    <p className="text-xs font-semibold text-white">
                      Route via Local n8n Container
                    </p>
                    <p className="text-[10px] text-[#869299]">
                      Webhook at http://localhost:5678/webhook/idemap-assistant (falls back cleanly if offline)
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferN8n}
                    onChange={(e) => setPreferN8n(e.target.checked)}
                    className="w-4 h-4 accent-[#E6A734]"
                  />
                </label>

                <div>
                  <label className="block text-xs font-mono text-[#869299] mb-1">
                    OpenRouter API Key (Optional)
                  </label>
                  <input
                    type="password"
                    value={openRouterKey}
                    onChange={(e) => setOpenRouterKey(e.target.value)}
                    placeholder="sk-or-v1-..."
                    className="w-full bg-[#080A0A] border border-white/10 focus:border-[#E6A734] rounded px-3 py-2 text-xs text-white focus:outline-none transition-all shadow-inner font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-[#869299] mb-1">
                    OpenRouter Model
                  </label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full bg-[#080A0A] border border-white/10 focus:border-[#E6A734] rounded px-3 py-2 text-xs text-white focus:outline-none transition-all font-mono"
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
                  <label className="block text-xs font-mono text-[#869299] mb-1">
                    Google AI Studio / Gemini API Key (Optional)
                  </label>
                  <input
                    type="password"
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full bg-[#080A0A] border border-white/10 focus:border-[#E6A734] rounded px-3 py-2 text-xs text-white focus:outline-none transition-all shadow-inner font-mono"
                  />
                </div>

                <button
                  onClick={saveSettings}
                  className="w-full py-2.5 px-4 rounded font-mono bg-[#E6A734] hover:brightness-110 text-[#080A0A] font-bold text-xs cursor-pointer transition-all shadow-sm"
                >
                  Commit Engine Settings
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
