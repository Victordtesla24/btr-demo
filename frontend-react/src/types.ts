// TypeScript types matching backend Pydantic models

export interface ApproxTob {
  mode: 'unknown' | 'approx';
  center?: string | null;
  window_hours?: number | null;
}

export interface TimeRangeOverride {
  start: string;
  end: string;
}

export interface PhysicalTraits {
  height?: string;
  build?: string;
  complexion?: string;
}

export interface MarriageEvent {
  date: string;
  spouse_name?: string;
}

export interface ChildrenEvent {
  count: number;
  dates: string[];
}

export interface LifeEvents {
  marriage?: MarriageEvent;
  children?: ChildrenEvent;
  career?: string[];
}

export interface BTRRequest {
  dob: string;
  pob_text: string;
  tz_offset_hours: number;
  approx_tob: ApproxTob;
  time_range_override?: TimeRangeOverride | null;
  optional_traits?: PhysicalTraits | null;
  optional_events?: LifeEvents | null;
}

export interface SpecialLagnas {
  bhava_lagna: number;
  hora_lagna: number;
  ghati_lagna: number;
  varnada_lagna: number;
}

export interface Nisheka {
  nisheka_lagna_deg: number;
  gestation_months: number;
  is_realistic: boolean;
  gestation_score: number;
}

export interface PhysicalTraitsScore {
  height?: number | null;
  build?: number | null;
  complexion?: number | null;
  overall?: number | null;
}

export interface LifeEventsScore {
  marriage?: number | null;
  children?: number | null;
  career?: number | null;
  overall?: number | null;
}

export interface VerificationScores {
  degree_match: number;
  gulika_alignment: number;
  moon_alignment: number;
  combined_verification: number;
}

export interface BTRCandidate {
  time_local: string;
  lagna_deg: number;
  pranapada_deg: number;
  delta_pp_deg: number;
  passes_trine_rule: boolean;
  verification_scores: VerificationScores;
  special_lagnas?: SpecialLagnas | null;
  nisheka?: Nisheka | null;
  composite_score?: number | null;
  physical_traits_scores?: PhysicalTraitsScore | null;
  life_events_scores?: LifeEventsScore | null;
}

export interface SearchConfig {
  step_minutes: number;
  time_window_used: {
    start_local: string;
    end_local: string;
  };
}

export interface Geocode {
  lat: number;
  lon: number;
  formatted: string;
}

export interface BTRResponse {
  engine_version: string;
  geocode: Geocode;
  search_config: SearchConfig;
  candidates: BTRCandidate[];
  best_candidate: BTRCandidate | null;
  notes?: string | null;
}

