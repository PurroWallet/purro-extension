import { GluexRequest, GluexResponse, GluexQuoteResult } from '../types/gluex-api';
import { ENDPOINTS } from './endpoints';

//this is for testing purpose
const GLUEX_API_KEY = '32dsEDbbQ5Fz9Dy4P9uPIVTnLZ7Byju4';

export const getQuote = async (
  request: GluexRequest
): Promise<GluexQuoteResult> => {
  const response = await fetch(`${ENDPOINTS.GLUEX}/quote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': GLUEX_API_KEY,
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    let message = `GlueX quote error: ${response.status} ${response.statusText}`;
    try {
      const errorBody = await response.json();
      if (errorBody && (errorBody.message || errorBody.error)) {
        message = `GlueX quote error: ${errorBody.message || errorBody.error}`;
      }
    } catch {
      // ignore json parsing error, keep default message
    }
    throw new Error(message);
  }

  const data = (await response.json()) as GluexResponse;
  
  // Check if the response has the expected structure
  if (data.statusCode !== 200 || !data.result) {
    throw new Error(`GlueX quote error: Invalid response structure`);
  }
  
  return data.result;
};
