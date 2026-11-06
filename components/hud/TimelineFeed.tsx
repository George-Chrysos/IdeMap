// ============================================================
// IdeMap — Per-Planet Orbital Timeline Feed
// ============================================================
"use client";

import type { TimelineEvent } from "@/lib/types";
import {
  Plus,
  Edit,
  AlertTriangle,
  CheckCircle,
  FileText,
  ArrowUp,
  Zap,
  Flag,
  XCircle,
} from "lucide-react";

interface TimelineFeedProps {
  events: TimelineEvent[];
}

const EVENT_CONFIG: Record<
  TimelineEvent["type"],
  { icon: React.ReactNode; color: string }
> = {
  created: { icon: <Plus size={12} />, color: "#2DD4BF" },
  renamed: { icon: <Edit size={12} />, color: "#60A5FA" },
  health_override: { icon: <AlertTriangle size={12} />, color: "#F59E0B" },
  strain_flagged: { icon: <Flag size={12} />, color: "#EF4444" },
  strain_cleared: { icon: <XCircle size={12} />, color: "#2DD4BF" },
  task_done: { icon: <CheckCircle size={12} />, color: "#2DD4BF" },
  task_added: { icon: <Zap size={12} />, color: "#60A5FA" },
  note_added: { icon: <FileText size={12} />, color: "#A78BFA" },
  level_up: { icon: <ArrowUp size={12} />, color: "#F59E0B" },
};

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function TimelineFeed({ events }: TimelineFeedProps) {
  const sorted = [...events].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  if (sorted.length === 0) {
    return (
      <p className="text-sm text-slate-500 italic text-center py-6 font-outfit">
        No orbital events recorded yet.
      </p>
    );
  }

  return (
    <div className="relative flex flex-col gap-3 pl-2">
      {/* Vertical timeline spine */}
      <div className="absolute left-[15px] top-3 bottom-3 w-[1px] bg-teal-400/15" />

      {sorted.slice(0, 25).map((event) => {
        const cfg = EVENT_CONFIG[event.type] ?? EVENT_CONFIG.created;
        return (
          <div key={event.id} className="relative flex items-start gap-3.5 py-1">
            <div
              className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center border"
              style={{
                background: `${cfg.color}1a`,
                borderColor: `${cfg.color}44`,
                color: cfg.color,
              }}
            >
              {cfg.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-200 leading-snug font-outfit">
                {event.payload}
              </p>
              <p className="text-xs text-slate-500 mt-0.5 font-outfit">
                {formatTime(event.timestamp)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
