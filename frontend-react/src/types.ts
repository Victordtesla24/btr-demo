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
  height?: string; // Legacy band (SHORT/MEDIUM/TALL)
  height_cm?: number;
  height_feet?: number;
  height_inches?: number;
  height_band?: 'SHORT' | 'MEDIUM' | 'TALL';
  build?: string; // Legacy band
  build_band?: 'SLIM' | 'MEDIUM' | 'ATHLETIC' | 'HEAVY';
  body_frame?: string;
  complexion?: string; // Legacy band
  complexion_tone?: 'FAIR' | 'WHEATISH' | 'REDDISH' | 'DARK' | 'DULL_GREEN';
  notes?: string;
}

export interface MarriageEvent {
  date: string;
  spouse_name?: string;
  place?: string;
  notes?: string;
}

export interface ChildEvent {
  date: string;
  gender?: string;
  notes?: string;
}

export interface CareerEvent {
  date: string;
  role?: string;
  description?: string;
}

export interface MajorEvent {
  date: string;
  title: string;
  description?: string;
}

export interface Geocode {
  lat: number;
  lon: number;
  formatted: string;
  tz_offset_hours?: number | null;
  timezone_name?: string | null;
}

export interface LifeEvents {
  marriage?: MarriageEvent; // Legacy single marriage
  marriages?: MarriageEvent[];
  children?: ChildEvent[];
  career?: CareerEvent[];
  major?: MajorEvent[];
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
  major?: number | null;
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
   purification_anchor?: string | null;
   bphs_score?: number | null;
   shodhana_delta_palas?: number | null;
  verification_scores: VerificationScores;
  special_lagnas?: SpecialLagnas | null;
  nisheka?: Nisheka | null;
  composite_score?: number | null;
  physical_traits_scores?: PhysicalTraitsScore | null;
  life_events_scores?: LifeEventsScore | null;
}

export interface RejectedCandidate {
  time_local: string;
  lagna_deg: number;
  pranapada_deg: number;
  passes_trine_rule: boolean;
  passes_purification: boolean;
  non_human_classification?: string | null;
  rejection_reason?: string | null;
}

export interface RejectionSummary {
  reason_counts: Record<string, number>;
  window?: { start?: string; end?: string };
  nearest?: {
    padekyata_delta_deg?: number | null;
    moon_delta_deg?: number | null;
    gulika_delta_deg?: number | null;
  };
  suggestions?: string[];
  suggested_questions?: SuggestedQuestion[];
  input_completeness_score?: number;
  missing_categories?: string[];
}

export interface SearchConfig {
  step_minutes: number;
  time_window_used: {
    start_local: string;
    end_local: string;
  };
  tz_offset_hours_used?: number;
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
  rejections?: RejectedCandidate[] | null;
  notes?: string | null;
}

export interface SuggestedQuestion {
  field: string;
  priority: number;
  message: string;
  hint?: string;
}

export interface NoCandidateErrorDetail {
  code?: string;
  message: string;
  rejection_summary?: RejectionSummary;
  search_window?: { start?: string; end?: string };
  tz_offset_hours_used?: number;
  suggested_questions?: SuggestedQuestion[];
}
