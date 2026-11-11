-- ============================================================================
-- Migration: Normalize Life OS Schema & AI Personal Assistant Tables
-- Project: IdeMap (fzynqetgqohgeqsdnttm)
-- ============================================================================

-- 1. Enhance public.planets with normalized columns from state
ALTER TABLE public.planets
  ADD COLUMN IF NOT EXISTS aura_skin text NOT NULL DEFAULT 'classic',
  ADD COLUMN IF NOT EXISTS solar_shields integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shield_healthy_days integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS health_override integer NULL,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_tasks_universe_planet ON public.tasks(universe_id, planet_id);

-- 2. Create normalized public.notes table
CREATE TABLE IF NOT EXISTS public.notes (
  id text NOT NULL,
  universe_id text NOT NULL DEFAULT 'default' REFERENCES public.universe_states(id) ON DELETE CASCADE,
  planet_id text NULL,
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (universe_id, id)
);

CREATE INDEX IF NOT EXISTS idx_notes_universe_planet ON public.notes(universe_id, planet_id);

-- 3. Create normalized public.timeline_events table
CREATE TABLE IF NOT EXISTS public.timeline_events (
  id text NOT NULL,
  universe_id text NOT NULL DEFAULT 'default' REFERENCES public.universe_states(id) ON DELETE CASCADE,
  planet_id text NULL,
  event_type text NOT NULL DEFAULT 'info',
  text text NOT NULL,
  event_at bigint NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (universe_id, id)
);

CREATE INDEX IF NOT EXISTS idx_timeline_universe_planet ON public.timeline_events(universe_id, planet_id, event_at DESC);

-- 4. Create public.daily_metrics (Trio 1-5 Daily Night Check-In)
CREATE TABLE IF NOT EXISTS public.daily_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  universe_id text NOT NULL DEFAULT 'default' REFERENCES public.universe_states(id) ON DELETE CASCADE,
  check_in_date date NOT NULL DEFAULT CURRENT_DATE,
  trio_key text NOT NULL DEFAULT 'clarity_sovereignty_vitality',
  label_1 text NOT NULL DEFAULT 'Clarity',
  label_2 text NOT NULL DEFAULT 'Sovereignty',
  label_3 text NOT NULL DEFAULT 'Vitality',
  score_1 smallint NOT NULL CHECK (score_1 BETWEEN 1 AND 5),
  score_2 smallint NOT NULL CHECK (score_2 BETWEEN 1 AND 5),
  score_3 smallint NOT NULL CHECK (score_3 BETWEEN 1 AND 5),
  reflection text NOT NULL DEFAULT '',
  completed_tasks_count integer NOT NULL DEFAULT 0,
  xp_earned_today integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (universe_id, check_in_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_metrics_universe_date ON public.daily_metrics(universe_id, check_in_date DESC);

-- 5. Create public.proposed_actions (HUD Button-Confirmed AI Actions)
CREATE TABLE IF NOT EXISTS public.proposed_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  universe_id text NOT NULL DEFAULT 'default' REFERENCES public.universe_states(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN ('create_task', 'complete_task', 'reschedule_task', 'toggle_strain', 'create_planet', 'add_note', 'award_xp')),
  target_planet_id text NULL,
  target_task_id text NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'executed', 'dismissed')),
  source text NOT NULL DEFAULT 'assistant',
  created_at timestamptz NOT NULL DEFAULT now(),
  executed_at timestamptz NULL
);

CREATE INDEX IF NOT EXISTS idx_proposed_actions_universe_status ON public.proposed_actions(universe_id, status, created_at DESC);

-- 6. Create public.briefings (Morning Plan & Night Review)
CREATE TABLE IF NOT EXISTS public.briefings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  universe_id text NOT NULL DEFAULT 'default' REFERENCES public.universe_states(id) ON DELETE CASCADE,
  briefing_date date NOT NULL DEFAULT CURRENT_DATE,
  briefing_type text NOT NULL CHECK (briefing_type IN ('morning', 'night')),
  title text NOT NULL,
  summary text NOT NULL,
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  metrics_snapshot jsonb NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (universe_id, briefing_date, briefing_type)
);

CREATE INDEX IF NOT EXISTS idx_briefings_universe_date ON public.briefings(universe_id, briefing_date DESC);

-- 7. Create public.assistant_messages (Chat HUD History)
CREATE TABLE IF NOT EXISTS public.assistant_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  universe_id text NOT NULL DEFAULT 'default' REFERENCES public.universe_states(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  focus_planet_id text NULL,
  tool_traces jsonb NOT NULL DEFAULT '[]'::jsonb,
  proposed_action_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assistant_messages_universe_created ON public.assistant_messages(universe_id, created_at ASC);

-- 8. Enable Row Level Security & Grants
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposed_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.briefings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_messages ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.notes,
  public.timeline_events,
  public.daily_metrics,
  public.proposed_actions,
  public.briefings,
  public.assistant_messages,
  public.planets,
  public.tasks,
  public.universe_states
TO anon, authenticated;

-- 9. Backfill normalized data from universe_states and planets
UPDATE public.planets p
SET
  aura_skin = COALESCE(u.state->'planets'->p.id->>'auraSkin', 'classic'),
  solar_shields = COALESCE((u.state->'planets'->p.id->>'solarShields')::integer, 0),
  shield_healthy_days = COALESCE((u.state->'planets'->p.id->>'shieldHealthyDays')::integer, 0)
FROM public.universe_states u
WHERE u.id = p.universe_id
  AND u.state ? 'planets'
  AND (u.state->'planets') ? p.id;
