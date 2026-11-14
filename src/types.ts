// Types for Tally

export type Language = "en" | "es" | "mixed";

export interface Concern {
  quote: string;
  category: string;
  urgency: "today" | "this_week" | "none";
  reason: string;
  level?: "danger_now" | "today" | "fyi";
  quote_en?: string;
}

export interface ParsedUpdate {
  transcript: string;
  language: Language;
  volunteer_name: string;
  site: string;
  site_canonical?: string;
  date: string; // YYYY-MM-DD
  hours: number;
  activities: string[];
  concerns: Concern[];
  highlight?: string;
}

export interface TimingInfo {
  transcribe_ms: number;
  extract_ms: number;
  tts_ms: number;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  reason?: string;
  existingTimestamp?: string;
  existingHours?: number;
  existingSite?: string;
}

export interface UpdateRecord {
  id: number;
  volunteer_name: string;
  site: string;
  date: string;
  hours: number;
  activities: string; // JSON string
  transcript: string;
  language: string;
  concerns: string; // JSON string of Concern[]
  counted: boolean;
  duplicate_reason: string | null;
  created_at: string; // ISO timestamp
  approved: boolean;
  approved_by: string | null;
  approved_at: string | null;
  fixed_by: string | null;
  fixed_at: string | null;
  duplicate_at?: string | null;
  handled_by?: string | null;
  handled_at?: string | null;
  highlight?: string | null;
  reported_hours?: number | null;
  proof_code?: string | null;
}

export interface UpdateResult {
  id: number;
  counted: boolean;
  duplicate_reason: string | null;
  hours: number;
  site: string;
  concerns: Concern[];
  transcript: string;
  language: Language;
  activities: string[];
  status_label: "Counted" | "Needs hours" | "Duplicate";
  timings: TimingInfo;
  speak_url: string | null;
}
