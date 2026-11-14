// Types for Tally

export interface Concern {
  quote: string;
  category: string;
  urgency: "today" | "this_week" | "none";
  reason: string;
}

export interface ParsedUpdate {
  transcript: string;
  language: "en" | "es" | "mixed";
  volunteer_name: string;
  site: string;
  date: string; // YYYY-MM-DD
  hours: number;
  activities: string[];
  concerns: Concern[];
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
}
