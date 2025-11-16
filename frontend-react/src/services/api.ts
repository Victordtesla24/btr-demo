import type { BTRRequest, BTRResponse, Geocode } from '../types';

const API_BASE = '/api';

export async function geocodePlace(place: string): Promise<Geocode> {
  const response = await fetch(`${API_BASE}/geocode?q=${encodeURIComponent(place)}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Geocoding failed');
  }
  return response.json();
}

export async function calculateBTR(request: BTRRequest): Promise<BTRResponse> {
  const response = await fetch(`${API_BASE}/btr`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

        if (!response.ok) {
          let errorMessage = 'BTR calculation failed';
          try {
            const error = await response.json();
            if (error.detail) {
              if (Array.isArray(error.detail)) {
                errorMessage = error.detail.map((err: { loc?: string[]; msg?: string }) => 
                  `${err.loc?.join('.') || 'unknown'}: ${err.msg || 'error'}`).join('; ');
              } else {
                errorMessage = error.detail;
              }
            }
          } catch {
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          }
          throw new Error(errorMessage);
        }

  return response.json();
}

