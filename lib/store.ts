// ============================================================
// IdeMap — Zustand Global Store
// ============================================================
"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Universe, Planet, Task, Note, TimelineEvent } from "./types";
import { buildSeedUniverse } from "./seed";
import { nanoid } from "./nanoid";
import { taskXP } from "./health";

function now() {
  return new Date().toISOString();
}

function makeEvent(type: TimelineEvent["type"], payload: string): TimelineEvent {
  return { id: nanoid(), type, payload, timestamp: now() };
}

interface IdeMapState {
  universe: Universe;
  focusPlanetId: string | null; // null = Universe "Life" core focused
  soundEnabled: boolean;

  // Actions
  setFocusPlanet: (id: string | null) => void;
  toggleSound: () => void;
  resetDemo: () => void;

  addPlanet: (name: string, icon: string, color: string, parentId: string | null) => string;
  renamePlanet: (id: string, name: string) => void;
  deletePlanet: (id: string) => void;

  setHealthOverride: (planetId: string, value: number | null) => void;
  toggleStrain: (planetId: string, flag: "financial" | "psychological") => void;

  addTask: (planetId: string, title: string, difficulty: Task["difficulty"], dueDate?: string) => void;
  completeTask: (planetId: string, taskId: string) => void;
  deleteTask: (planetId: string, taskId: string) => void;

  addNote: (planetId: string, content: string) => void;
}

export const useIdeMapStore = create<IdeMapState>()(
  persist(
    (set) => ({
      universe: buildSeedUniverse(),
      focusPlanetId: null,
      soundEnabled: false,

      setFocusPlanet: (id) => set({ focusPlanetId: id }),
      toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
      resetDemo: () => set({ universe: buildSeedUniverse(), focusPlanetId: null }),

      addPlanet: (name, icon, color, parentId) => {
        const id = `planet-${nanoid()}`;
        const planet: Planet = {
          id,
          name,
          icon,
          color,
          parentId,
          childrenIds: [],
          healthOverride: null,
          strainFlags: { financial: false, psychological: false },
          level: 1.0,
          xp: 0,
          tasks: [],
          notes: [],
          timeline: [makeEvent("created", `${name} forged into orbit`)],
          createdAt: now(),
        };
        set((s) => {
          const planets = { ...s.universe.planets, [id]: planet };
          let planetIds = s.universe.planetIds;
          if (parentId === null) {
            planetIds = [...planetIds, id];
          } else if (planets[parentId]) {
            planets[parentId] = {
              ...planets[parentId],
              childrenIds: [...planets[parentId].childrenIds, id],
              timeline: [
                ...planets[parentId].timeline,
                makeEvent("created", `Child satellite ${name} launched into orbit`),
              ],
            };
          }
          return { universe: { ...s.universe, planetIds, planets } };
        });
        return id;
      },

      renamePlanet: (id, name) =>
        set((s) => {
          const planet = s.universe.planets[id];
          if (!planet) return s;
          return {
            universe: {
              ...s.universe,
              planets: {
                ...s.universe.planets,
                [id]: {
                  ...planet,
                  name,
                  timeline: [...planet.timeline, makeEvent("renamed", `Renamed to ${name}`)],
                },
              },
            },
          };
        }),

      deletePlanet: (id) =>
        set((s) => {
          const planet = s.universe.planets[id];
          if (!planet) return s;
          const planets = { ...s.universe.planets };
          if (planet.parentId && planets[planet.parentId]) {
            planets[planet.parentId] = {
              ...planets[planet.parentId],
              childrenIds: planets[planet.parentId].childrenIds.filter((c) => c !== id),
            };
          }
          delete planets[id];
          const planetIds = s.universe.planetIds.filter((pid) => pid !== id);
          return {
            focusPlanetId: s.focusPlanetId === id ? planet.parentId : s.focusPlanetId,
            universe: { ...s.universe, planetIds, planets },
          };
        }),

      setHealthOverride: (planetId, value) =>
        set((s) => {
          const planet = s.universe.planets[planetId];
          if (!planet) return s;
          return {
            universe: {
              ...s.universe,
              planets: {
                ...s.universe.planets,
                [planetId]: {
                  ...planet,
                  healthOverride: value,
                  timeline: [
                    ...planet.timeline,
                    makeEvent(
                      "health_override",
                      value !== null ? `Health manually set to ${value}` : "Health override cleared"
                    ),
                  ],
                },
              },
            },
          };
        }),

      toggleStrain: (planetId, flag) =>
        set((s) => {
          const planet = s.universe.planets[planetId];
          if (!planet) return s;
          const newVal = !planet.strainFlags[flag];
          return {
            universe: {
              ...s.universe,
              planets: {
                ...s.universe.planets,
                [planetId]: {
                  ...planet,
                  strainFlags: { ...planet.strainFlags, [flag]: newVal },
                  timeline: [
                    ...planet.timeline,
                    makeEvent(
                      newVal ? "strain_flagged" : "strain_cleared",
                      `${flag === "financial" ? "Financial" : "Psychological"} strain ${
                        newVal ? "flagged (-25 health)" : "cleared"
                      }`
                    ),
                  ],
                },
              },
            },
          };
        }),

      addTask: (planetId, title, difficulty, dueDate) =>
        set((s) => {
          const planet = s.universe.planets[planetId];
          if (!planet) return s;
          const task: Task = {
            id: nanoid(),
            title,
            difficulty,
            dueDate,
            completed: false,
            planetId,
          };
          return {
            universe: {
              ...s.universe,
              planets: {
                ...s.universe.planets,
                [planetId]: {
                  ...planet,
                  tasks: [...planet.tasks, task],
                  timeline: [
                    ...planet.timeline,
                    makeEvent("task_added", `Task added: ${title}`),
                  ],
                },
              },
            },
          };
        }),

      completeTask: (planetId, taskId) =>
        set((s) => {
          const planet = s.universe.planets[planetId];
          if (!planet) return s;
          const task = planet.tasks.find((t) => t.id === taskId);
          if (!task || task.completed) return s;
          const xpGain = taskXP(task.difficulty);
          const newXP = planet.xp + xpGain;
          const newLevel = Number(
            Math.max(planet.level, 1 + Math.round((newXP / 80) * 10) / 10).toFixed(1)
          );
          const leveledUp = newLevel > planet.level;
          return {
            universe: {
              ...s.universe,
              planets: {
                ...s.universe.planets,
                [planetId]: {
                  ...planet,
                  xp: newXP,
                  level: newLevel,
                  tasks: planet.tasks.map((t) =>
                    t.id === taskId ? { ...t, completed: true, completedAt: now() } : t
                  ),
                  timeline: [
                    ...planet.timeline,
                    makeEvent("task_done", `Task completed: ${task.title} (+${xpGain} XP)`),
                    ...(leveledUp
                      ? [makeEvent("level_up", `Ascended to Level ${newLevel}`)]
                      : []),
                  ],
                },
              },
            },
          };
        }),

      deleteTask: (planetId, taskId) =>
        set((s) => {
          const planet = s.universe.planets[planetId];
          if (!planet) return s;
          return {
            universe: {
              ...s.universe,
              planets: {
                ...s.universe.planets,
                [planetId]: {
                  ...planet,
                  tasks: planet.tasks.filter((t) => t.id !== taskId),
                },
              },
            },
          };
        }),

      addNote: (planetId, content) =>
        set((s) => {
          const planet = s.universe.planets[planetId];
          if (!planet) return s;
          const note: Note = {
            id: nanoid(),
            content,
            createdAt: now(),
            planetId,
          };
          return {
            universe: {
              ...s.universe,
              planets: {
                ...s.universe.planets,
                [planetId]: {
                  ...planet,
                  notes: [...planet.notes, note],
                  timeline: [
                    ...planet.timeline,
                    makeEvent("note_added", `Note attached: "${content.slice(0, 32)}${content.length > 32 ? "…" : ""}"`),
                  ],
                },
              },
            },
          };
        }),
    }),
    {
      name: "idemap-store-v3",
      version: 3,
      migrate: () => ({
        universe: buildSeedUniverse(),
        focusPlanetId: null,
        soundEnabled: false,
      }),
    }
  )
);
