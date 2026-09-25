-- RELIABILITY MASTER — projection relationnelle du GameState (PostgreSQL)
-- Le prototype persiste un document JSON versionné ; ce schéma sert de cible pour un backend multi-joueurs.

-- ============================================================ Référentiel (contenu)
CREATE TABLE plants (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, site TEXT, country TEXT, region TEXT, sector TEXT,
  currency TEXT DEFAULT 'FCFA', labor_rate NUMERIC, technicians INT, hours_per_tech NUMERIC,
  monthly_budget NUMERIC, holding_rate NUMERIC, initial_data_quality NUMERIC
);
CREATE TABLE lines (plant_id TEXT REFERENCES plants, id TEXT, name TEXT, rate NUMERIC, unit TEXT, margin_per_unit NUMERIC, PRIMARY KEY (plant_id, id));
CREATE TABLE equipment (
  plant_id TEXT REFERENCES plants, tag TEXT, name TEXT, type TEXT, line_id TEXT, criticality CHAR(1),
  loss_rate NUMERIC, redundant BOOLEAN, run_hours NUMERIC, age_years INT, manufacturer TEXT,
  PRIMARY KEY (plant_id, tag)
);
CREATE TABLE spare_parts (
  plant_id TEXT REFERENCES plants, id TEXT, ref TEXT, name TEXT, unit_cost NUMERIC, lead_days INT,
  express_days INT, express_premium NUMERIC, critical BOOLEAN, duplicate_of TEXT, obsolete BOOLEAN, local BOOLEAN,
  PRIMARY KEY (plant_id, id)
);
CREATE TABLE failure_modes (
  plant_id TEXT, tag TEXT, id TEXT, name TEXT, mechanism TEXT, beta NUMERIC, eta NUMERIC, pf NUMERIC,
  detection TEXT[], mttr NUMERIC, labor_hours NUMERIC, part_id TEXT, part_qty INT, secondary_damage NUMERIC,
  hse BOOLEAN, hidden BOOLEAN,
  PRIMARY KEY (plant_id, tag, id), FOREIGN KEY (plant_id, tag) REFERENCES equipment
);
CREATE TABLE latent_defects (plant_id TEXT REFERENCES plants, id TEXT, label TEXT, eta_factor NUMERIC, modes TEXT[], resolved_by TEXT, PRIMARY KEY (plant_id, id));
CREATE TABLE missions (id TEXT PRIMARY KEY, module TEXT, title TEXT, tier INT, min_level INT, xp INT, skills TEXT[], briefing JSONB, debate JSONB);

-- ============================================================ Joueur & progression
CREATE TABLE players (
  id UUID PRIMARY KEY, name TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT now(),
  level INT DEFAULT 1, xp INT DEFAULT 0
);
CREATE TABLE player_skills (player_id UUID REFERENCES players, skill TEXT, value NUMERIC CHECK (value BETWEEN 0 AND 100), PRIMARY KEY (player_id, skill));
CREATE TABLE player_errors (player_id UUID REFERENCES players, tag TEXT, occurrences INT, PRIMARY KEY (player_id, tag));
CREATE TABLE certifications (player_id UUID REFERENCES players, cert TEXT, obtained_at TIMESTAMPTZ DEFAULT now(), PRIMARY KEY (player_id, cert));
CREATE TABLE badges (player_id UUID REFERENCES players, label TEXT, PRIMARY KEY (player_id, label));
CREATE TABLE promotions (player_id UUID REFERENCES players, level INT, sim_month INT, at TIMESTAMPTZ, PRIMARY KEY (player_id, level));
CREATE TABLE mission_results (
  id BIGSERIAL PRIMARY KEY, player_id UUID REFERENCES players, mission_id TEXT REFERENCES missions,
  score INT, xp INT, sim_month INT, completed_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE step_results (
  mission_result_id BIGINT REFERENCES mission_results, step_id TEXT, score INT, attempts INT, hints INT,
  skills TEXT[], error_tags TEXT[], PRIMARY KEY (mission_result_id, step_id)
);
CREATE TABLE reasoning_log (id BIGSERIAL PRIMARY KEY, player_id UUID REFERENCES players, mission_id TEXT, step_id TEXT, text TEXT, at TIMESTAMPTZ DEFAULT now());

-- ============================================================ État de l'usine simulée
CREATE TABLE plant_states (
  id BIGSERIAL PRIMARY KEY, player_id UUID REFERENCES players, plant_id TEXT REFERENCES plants,
  is_takeover BOOLEAN DEFAULT false, month INT, seed BIGINT, backlog_hours NUMERIC, technicians INT,
  data_quality NUMERIC, direction_trust NUMERIC, safety_index NUMERIC, team_morale NUMERIC,
  rca_opened INT, rca_closed INT, pending_spend NUMERIC, unlocks TEXT[], projects TEXT[]
);
CREATE TABLE mode_states (
  plant_state_id BIGINT REFERENCES plant_states, mode_key TEXT, age NUMERIC,
  strategy TEXT CHECK (strategy IN ('RTF','PM','CBM','PDM')), pm_interval NUMERIC, insp_interval NUMERIC,
  PRIMARY KEY (plant_state_id, mode_key)
);
CREATE TABLE resolved_defects (plant_state_id BIGINT REFERENCES plant_states, defect_id TEXT, resolved_month INT, PRIMARY KEY (plant_state_id, defect_id));
CREATE TABLE stock_levels (plant_state_id BIGINT REFERENCES plant_states, part_id TEXT, qty INT, min_qty INT, max_qty INT, last_movement_month INT, PRIMARY KEY (plant_state_id, part_id));
CREATE TABLE purchase_orders (id BIGSERIAL PRIMARY KEY, plant_state_id BIGINT REFERENCES plant_states, part_id TEXT, qty INT, arrival_month INT, express BOOLEAN);
CREATE TABLE modifiers (plant_state_id BIGINT REFERENCES plant_states, id TEXT, label TEXT, until_month INT, factors JSONB, PRIMARY KEY (plant_state_id, id));

-- Base REX : une ligne par intervention (panne, intervention planifiée, préventif, défaillance induite)
CREATE TABLE failure_events (
  id BIGSERIAL PRIMARY KEY, plant_state_id BIGINT REFERENCES plant_states, month INT, tag TEXT, mode_id TEXT,
  kind TEXT CHECK (kind IN ('panne','intervention-planifiee','preventif','induite')),
  downtime NUMERIC, wait_parts NUMERIC, cost NUMERIC, loss NUMERIC, coded_cause TEXT, repeat BOOLEAN
);
CREATE INDEX ON failure_events (plant_state_id, tag, mode_id, month);

CREATE TABLE monthly_kpis (plant_state_id BIGINT REFERENCES plant_states, month INT, kpi JSONB, PRIMARY KEY (plant_state_id, month));
CREATE TABLE journal_entries (id BIGSERIAL PRIMARY KEY, plant_state_id BIGINT REFERENCES plant_states, month INT, kind TEXT, text TEXT);
