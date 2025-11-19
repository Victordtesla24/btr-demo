import type { BTRRequest, BTRResponse, Geocode, NoCandidateErrorDetail, RejectionSummary, SuggestedQuestion } from '../types';
import { logClientEvent } from '../utils/clientLogger';

const API_BASE = '/api';
const DEFAULT_TIMEOUT_MS = 60_000;
const GEOCODE_TIMEOUT_MS = 15_000;

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function geocodePlace(place: string): Promise<Geocode> {
  logClientEvent('info', 'Geocoding request', { place });
  const response = await fetchWithTimeout(`${API_BASE}/geocode?q=${encodeURIComponent(place)}`, {}, GEOCODE_TIMEOUT_MS);
  if (!response.ok) {
    const error = await response.json();
    logClientEvent('error', 'Geocoding failed', { place, status: response.status, detail: error.detail ?? 'unknown' });
    throw new Error(error.detail || 'Geocoding failed');
  }
  const payload = await response.json();
  logClientEvent('info', 'Geocoding success', { place, lat: payload.lat, lon: payload.lon });
  return payload;
}

export async function calculateBTR(request: BTRRequest): Promise<BTRResponse> {
  const requestMeta = {
    dob: request.dob,
    pob_text: request.pob_text,
    approx_mode: request.approx_tob?.mode,
    has_traits: Boolean(request.optional_traits),
    has_events: Boolean(request.optional_events),
  };
  logClientEvent('info', 'BTR calculation started', requestMeta);
  const response = await fetchWithTimeout(
    `${API_BASE}/btr`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    },
    DEFAULT_TIMEOUT_MS
  );

  if (!response.ok) {
    let errorMessage = 'BTR calculation failed';
    let rejectionSummary: RejectionSummary | undefined;
    let searchWindow: { start?: string; end?: string } | undefined;
    let suggestedQuestions: SuggestedQuestion[] | undefined;
    let errorCode: string | undefined;
    try {
      const error = await response.json();
      const detail: NoCandidateErrorDetail | string | Array<{ loc?: string[]; msg?: string }> = error.detail;
      if (detail) {
        if (Array.isArray(detail)) {
          errorMessage = detail
            .map((err) => `${err.loc?.join('.') || 'unknown'}: ${err.msg || 'error'}`)
            .join('; ');
        } else if (typeof detail === 'string') {
          errorMessage = detail;
        } else if (typeof detail === 'object' && detail !== null) {
          errorMessage = detail.message || errorMessage;
          rejectionSummary = detail.rejection_summary;
          searchWindow = detail.search_window;
          suggestedQuestions = detail.suggested_questions;
          errorCode = detail.code;
        }
      }
    } catch {
      errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    }
    logClientEvent('error', 'BTR calculation failed', { ...requestMeta, status: response.status, message: errorMessage });
    const err = new Error(errorMessage) as Error & {
      code?: string;
      rejectionSummary?: RejectionSummary;
      searchWindow?: { start?: string; end?: string };
      suggestedQuestions?: SuggestedQuestion[];
      status?: number;
    };
    err.code = errorCode;
    err.rejectionSummary = rejectionSummary;
    err.searchWindow = searchWindow;
    err.suggestedQuestions = suggestedQuestions;
    err.status = response.status;
    throw err;
  }

  const payload = await response.json();
  logClientEvent('info', 'BTR calculation completed', { ...requestMeta, candidates: payload?.candidates?.length ?? 0 });
  return payload;
}
