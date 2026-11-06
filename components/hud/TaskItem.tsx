// ============================================================
// IdeMap — Task Item Row
// ============================================================
"use client";

import { useState } from "react";
import { Trash2, Calendar, Zap, ArrowUpRight } from "lucide-react";
import { useIdeMapStore } from "@/lib/store";
import { playTaskComplete } from "@/lib/audio";
import { isTaskOverdue } from "@/lib/health";
import type { Task } from "@/lib/types";

interface TaskItemProps {
  task: Task;
  showPlanetBadge?: boolean;
}

const DIFFICULTY_LABELS: Record<number, string> = {
  1: "Easy · d1",
  2: "Normal · d2",
  3: "Hard · d3",
  4: "Expert · d4",
  5: "Mythic · d5",
};

const DIFFICULTY_COLORS: Record<number, string> = {
  1: "#2DD4BF",
  2: "#60A5FA",
  3: "#F59E0B",
  4: "#F87171",
  5: "#C084FC",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function TaskItem({
  task,
  showPlanetBadge = false,
}: TaskItemProps) {
  const { universe, completeTask, deleteTask, setFocusPlanet, soundEnabled } =
    useIdeMapStore();
  const [glowing, setGlowing] = useState(false);
  const overdue = isTaskOverdue(task.dueDate) && !task.completed;
  const taskPlanet = universe.planets[task.planetId];

  function handleComplete() {
    if (task.completed) return;
    setGlowing(true);
    setTimeout(() => setGlowing(false), 400);
    completeTask(task.planetId, task.id);
    if (soundEnabled) playTaskComplete();
  }

  return (
    <div
      className={`group flex items-start gap-3.5 py-3 px-3.5 rounded-xl border transition-all ${
        task.completed
          ? "opacity-45 bg-white/[0.015] border-white/5"
          : overdue
          ? "bg-red-500/10 border-red-500/30"
          : "bg-white/[0.03] border-white/10 hover:border-teal-400/35 hover:bg-white/[0.05]"
      } ${glowing ? "planet-glow-pulse" : ""}`}
    >
      {/* Tactile Completion Checkbox */}
      <button
        onClick={handleComplete}
        disabled={task.completed}
        className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-md border transition-all cursor-pointer flex items-center justify-center ${
          task.completed
            ? "bg-teal-400 border-teal-400"
            : overdue
            ? "border-red-400 hover:border-red-300 bg-red-500/10"
            : "border-slate-500 hover:border-teal-400 bg-black/40"
        }`}
        aria-label="Complete task"
      >
        {task.completed && (
          <svg viewBox="0 0 12 12" className="w-3.5 h-3.5" fill="none">
            <path
              d="M2 6l3 3 5-5"
              stroke="#0D0F0E"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      {/* Task Metadata */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm xl:text-[15px] leading-snug font-outfit ${
            task.completed
              ? "line-through text-slate-500"
              : "text-slate-100 font-medium"
          }`}
        >
          {task.title}
        </p>

        <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
          {showPlanetBadge && taskPlanet && (
            <button
              onClick={() => setFocusPlanet(taskPlanet.id)}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 hover:bg-teal-400/15 border border-white/10 text-xs text-slate-300 hover:text-teal-300 transition-colors cursor-pointer font-outfit"
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: taskPlanet.color }}
              />
              <span>{taskPlanet.name}</span>
              <ArrowUpRight size={10} />
            </button>
          )}

          {task.dueDate && (
            <span
              className={`flex items-center gap-1 text-xs font-outfit ${
                overdue ? "text-red-400 font-medium" : "text-slate-400"
              }`}
            >
              <Calendar size={11} />
              {formatDate(task.dueDate)}
              {overdue && " · Overdue"}
            </span>
          )}

          <span
            className="flex items-center gap-1 text-xs font-outfit font-medium"
            style={{ color: DIFFICULTY_COLORS[task.difficulty] }}
          >
            <Zap size={11} />
            {DIFFICULTY_LABELS[task.difficulty]}
          </span>
        </div>
      </div>

      {/* Delete Task */}
      <button
        onClick={() => deleteTask(task.planetId, task.id)}
        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
        aria-label="Delete task"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
