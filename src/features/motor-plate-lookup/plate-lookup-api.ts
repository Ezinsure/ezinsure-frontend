import type { PlateLookupQuery, PlateLookupResult } from './types';
import { normalizePlateNumber, parsePlateLookupResponse } from './normalize';

export async function fetchPlateLookup(
  token: string,
  query: PlateLookupQuery,
): Promise<PlateLookupResult> {
  const plateNumber = normalizePlateNumber(query.plateNumber);
  if (!plateNumber) {
    throw new Error('Enter a plate number to search');
  }
  if (!query.startDate || !query.endDate) {
    throw new Error('Select a start and end date');
  }

  const search = new URLSearchParams({
    plateNumber,
    startDate: query.startDate,
    endDate: query.endDate,
  });

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/getMotorPlateLookup?${search.toString()}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    let message = `Failed to load plate history (${response.status})`;
    try {
      const errorBody = await response.json();
      message = String(errorBody.message ?? errorBody.error ?? message);
    } catch {
      try {
        const text = await response.text();
        if (text.trim()) message = text;
      } catch {
        // keep default message
      }
    }
    throw new Error(message);
  }

  const payload = await response.json();
  return parsePlateLookupResponse(payload, {
    plateNumber,
    startDate: query.startDate,
    endDate: query.endDate,
  });
}
