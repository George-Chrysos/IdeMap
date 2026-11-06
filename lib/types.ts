// ============================================================
// IdeMap — Core TypeScript Interfaces
// ============================================================

export type StrainFlag = "financial" | "psychological";

export type TimelineEventType =
  | "created"
  | "renamed"
  | "health_override"
  | "strain_flagged"
  | "strain_cleared"
  | "task_done"
  | "task_added"
  | "note_added"
  | "level_up";

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  payload: string;
  timestamp: string; // ISO
}

export interface Note {
  id: string;
  content: string;
  createdAt: string; // ISO
  planetId: string;
}

export interface Task {
  id: string;
  title: string;
  dueDate?: string; // ISO date string
  difficulty: 1 | 2 | 3 | 4 | 5;
  completed: boolean;
  completedAt?: string; // ISO
  planetId: string;
}

export interface Planet {
  id: string;
  name: string;
  icon: string; // lucide-react icon name
  color: string; // hex accent
  parentId: string | null;
  childrenIds: string[];
  // Health
  healthOverride: number | null; // null = auto-computed
  strainFlags: { financial: boolean; psychological: boolean };
  // Level
  level: number; // monotonically increasing
  xp: number; // accumulated XP
  // Data
  tasks: Task[];
  notes: Note[];
  timeline: TimelineEvent[];
  createdAt: string; // ISO
}

export interface Universe {
  id: string;
  name: string; // e.g. "Life"
  planetIds: string[]; // top-level planet ids
  planets: Record<string, Planet>;
  createdAt: string;
}

// ---- Computed view types (not persisted) ----

export interface OrbitalPosition {
  planetId: string;
  x: number; // px offset from center
  y: number;
  angle: number; // deg
}

export interface FocusedView {
  focusPlanetId: string;
  parentPlanetId: string | null;
  childrenIds: string[];
  orbitalPositions: OrbitalPosition[];
}

export interface ComputedPlanetHealth {
  score: number; // 0–100
  color: "green" | "amber" | "red";
  isOverridden: boolean;
  strainActive: boolean;
}
