// ─────────────────────────────────────────────────────────────
// VIGIL API Client — All backend communication centralized
// ─────────────────────────────────────────────────────────────

const API_BASE = "http://localhost:8000";

// ── TypeScript Interfaces ─────────────────────────────────────

export interface SystemStatus {
  status: string;
  subsystems: {
    edge_ollama_gemma4: string;
    rag_vector_db: string;
    chromadb_document_count: number;
    forensic_vault: string;
    reports_count: number;
  };
}

export interface ReportSummary {
  report_id: string;
  timestamp_utc: string;
  location: string;
  decision: "ESCALATE" | "HOLD_FOR_REVIEW" | "SUPPRESS";
  confidence: number;
  operator_message: string;
  sha256_hash: string;
}

export interface SceneTokens {
  sensor_summary: string;
  anomaly_score: number;
  preliminary_intent: string;
}

export interface ReasoningSteps {
  step1: string;
  step2: string;
  step3: string;
  step4: string;
  step5: string;
}

export interface ReportDetail extends ReportSummary {
  scene_tokens: SceneTokens;
  reasoning_steps: ReasoningSteps;
  signature_hex: string;
}

export interface TriggerPayload {
  event_id: string;
  timestamp: string;
  location: string;
  motion_detected: boolean;
  door_state: string;
  people_count: number;
  camera_feed_summary: string;
  acoustic_tokens?: string;
}

export interface VerifyResponse {
  report_id: string;
  cryptographic_verification: "SUCCESS" | "FAILED";
  sha256_hash: string;
  tampered: boolean;
}

export interface QueryResponse {
  query: string;
  answer: string;
}

// ── Mock event data for the simulator dropdown ────────────────

export const MOCK_EVENTS: { label: string; payload: TriggerPayload }[] = [
  {
    label: "Normal Transit Flow",
    payload: {
      event_id: "EVT-001",
      timestamp: "08:45",
      location: "Main Lobby Corridor",
      motion_detected: true,
      door_state: "normal",
      people_count: 12,
      camera_feed_summary:
        "Regular morning commuters entering through main gate with valid ID badges. No unusual behavior detected.",
      acoustic_tokens: "[AUDIO: LOW_AMBIENT_CHATTER]"
    },
  },
  {
    label: "Restricted Zone Intrusion",
    payload: {
      event_id: "EVT-002",
      timestamp: "03:15",
      location: "Server Room B3",
      motion_detected: true,
      door_state: "forced",
      people_count: 2,
      camera_feed_summary:
        "Two individuals in dark clothing tampering with server rack door locks.",
      acoustic_tokens: "[AUDIO: METALLIC_SCRAPING]"
    },
  },
  {
    label: "Scheduled Cleaning",
    payload: {
      event_id: "EVT-003",
      timestamp: "22:00",
      location: "Office Wing 4A",
      motion_detected: true,
      door_state: "normal",
      people_count: 3,
      camera_feed_summary:
        "Three uniformed cleaning staff with cleaning carts performing scheduled nightly cleaning.",
      acoustic_tokens: "[AUDIO: WATER_SPLASHING]"
    },
  },
  {
    label: "Emergency Exit Gate 5 Alarm",
    payload: {
      event_id: "EVT-004",
      timestamp: "14:30",
      location: "Emergency Exit Gate 5",
      motion_detected: true,
      door_state: "forced",
      people_count: 1,
      camera_feed_summary:
        "Individual pushed open emergency exit gate triggering alarm. Person appears to be running from inside the building.",
      acoustic_tokens: "[AUDIO: PERSISTENT_DOOR_BANGING]"
    },
  },
];

// ── API Functions ─────────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`API Error ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

export async function getSystemStatus(): Promise<SystemStatus> {
  return apiFetch<SystemStatus>("/api/status");
}

export async function getReports(): Promise<ReportSummary[]> {
  return apiFetch<ReportSummary[]>("/api/reports");
}

export async function getReportDetail(reportId: string): Promise<ReportDetail> {
  return apiFetch<ReportDetail>(`/api/reports/${reportId}`);
}

export async function triggerSensor(payload: TriggerPayload): Promise<ReportDetail> {
  return apiFetch<ReportDetail>("/api/trigger/sensor", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function verifyReport(reportId: string): Promise<VerifyResponse> {
  return apiFetch<VerifyResponse>(`/api/verify/${reportId}`);
}

export async function queryReports(question: string): Promise<QueryResponse> {
  return apiFetch<QueryResponse>("/api/query", {
    method: "POST",
    body: JSON.stringify({ question }),
  });
}
