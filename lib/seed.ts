// ============================================================
// IdeMap — Seed Data Bootstrap (Matching Preview Specifications)
// ============================================================

import type { Universe, Planet, Task } from "./types";
import { nanoid } from "./nanoid";

function now() {
  return new Date().toISOString();
}

function futureDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split("T")[0];
}

function makePlanet(
  overrides: Partial<Planet> & Pick<Planet, "id" | "name" | "icon" | "color">
): Planet {
  return {
    parentId: null,
    childrenIds: [],
    healthOverride: null,
    strainFlags: { financial: false, psychological: false },
    level: 1.0,
    xp: 0,
    tasks: [],
    notes: [],
    timeline: [
      {
        id: nanoid(),
        type: "created",
        payload: `${overrides.name} sector mapped into orbit`,
        timestamp: now(),
      },
    ],
    createdAt: now(),
    ...overrides,
  };
}

function makeTask(
  overrides: Partial<Task> & Pick<Task, "title" | "planetId" | "difficulty">
): Task {
  return {
    id: nanoid(),
    completed: false,
    dueDate: futureDate(3),
    ...overrides,
  };
}

export function buildSeedUniverse(): Universe {
  const lifeId = "life";
  const cultivationId = "planet-cultivation";
  const homeId = "planet-home";
  const deloitteId = "planet-deloitte";
  const signalId = "planet-signal";
  const bestPlayId = "planet-bestplay";
  const romanticId = "planet-romantic";
  const socialId = "planet-social";
  const trainingId = "planet-training";
  const readingId = "planet-reading";

  const training = makePlanet({
    id: trainingId,
    name: "Training",
    icon: "🏋️",
    color: "#C04A4A",
    parentId: cultivationId,
    level: 2.0,
    xp: 100,
    tasks: [
      makeTask({
        title: "Zone 2 aerobic run — 5 km",
        difficulty: 2,
        dueDate: futureDate(1),
        planetId: trainingId,
      }),
    ],
    notes: [
      {
        id: nanoid(),
        content: "Maintain 145 BPM ceiling on recovery days; progressive overload on compound lifts.",
        createdAt: now(),
        planetId: trainingId,
      },
    ],
  });

  const reading = makePlanet({
    id: readingId,
    name: "Reading",
    icon: "📖",
    color: "#7A853B",
    parentId: cultivationId,
    level: 1.0,
    xp: 20,
    tasks: [
      makeTask({
        title: "Read 25 pages before sleep",
        difficulty: 1,
        dueDate: futureDate(1),
        planetId: readingId,
      }),
    ],
    notes: [
      {
        id: nanoid(),
        content: "Synthesize highlights into atomic evergreen notes every Sunday.",
        createdAt: now(),
        planetId: readingId,
      },
    ],
  });

  const cultivation = makePlanet({
    id: cultivationId,
    name: "Cultivation",
    icon: "🌱",
    color: "#3B7A57",
    level: 1.5,
    xp: 60,
    childrenIds: [trainingId, readingId],
    notes: [
      {
        id: nanoid(),
        content: "Core compounding sector: physical conditioning and continuous deep study.",
        createdAt: now(),
        planetId: cultivationId,
      },
    ],
  });

  const home = makePlanet({
    id: homeId,
    name: "Home",
    icon: "🏠",
    color: "#4A6FA5",
    level: 1.4,
    xp: 40,
    tasks: [
      makeTask({
        title: "Weekly farmers market & pantry restock",
        difficulty: 1,
        dueDate: futureDate(2),
        planetId: homeId,
      }),
    ],
  });

  const deloitte = makePlanet({
    id: deloitteId,
    name: "Deloitte",
    icon: "💼",
    color: "#6B4A8A",
    level: 2.2,
    xp: 120,
    tasks: [
      makeTask({
        title: "Finalize Q4 executive architecture deck",
        difficulty: 4,
        dueDate: futureDate(2),
        planetId: deloitteId,
      }),
    ],
  });

  const signal = makePlanet({
    id: signalId,
    name: "Signal",
    icon: "📡",
    color: "#2D7A8A",
    level: 1.6,
    xp: 60,
    tasks: [
      makeTask({
        title: "Ship telemetry pipeline v2 spec",
        difficulty: 3,
        dueDate: futureDate(3),
        planetId: signalId,
      }),
    ],
  });

  const bestPlay = makePlanet({
    id: bestPlayId,
    name: "Best Play",
    icon: "🎮",
    color: "#8A6B2D",
    level: 1.3,
    xp: 30,
    tasks: [
      makeTask({
        title: "Match film breakdown & tactical review",
        difficulty: 2,
        dueDate: futureDate(5),
        planetId: bestPlayId,
      }),
    ],
  });

  const romantic = makePlanet({
    id: romanticId,
    name: "Romantic",
    icon: "❤️",
    color: "#8A2D5A",
    level: 1.8,
    xp: 80,
    tasks: [
      makeTask({
        title: "Reserve Friday candlelit dinner spot",
        difficulty: 2,
        dueDate: futureDate(3),
        planetId: romanticId,
      }),
    ],
  });

  const social = makePlanet({
    id: socialId,
    name: "Social",
    icon: "👥",
    color: "#2D5A8A",
    level: 1.2,
    xp: 20,
    tasks: [
      makeTask({
        title: "Host small dinner gathering with close friends",
        difficulty: 2,
        dueDate: futureDate(6),
        planetId: socialId,
      }),
    ],
  });

  const planets: Record<string, Planet> = {
    [cultivationId]: cultivation,
    [homeId]: home,
    [deloitteId]: deloitte,
    [signalId]: signal,
    [bestPlayId]: bestPlay,
    [romanticId]: romantic,
    [socialId]: social,
    [trainingId]: training,
    [readingId]: reading,
  };

  return {
    id: lifeId,
    name: "Life",
    planetIds: [
      cultivationId,
      homeId,
      deloitteId,
      signalId,
      bestPlayId,
      romanticId,
      socialId,
    ],
    planets,
    createdAt: now(),
  };
}
