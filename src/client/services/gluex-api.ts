import {
  GluexRequest,
  GluexResponse,
  GluexQuoteResult,
  GluexTokensResponse,
  GlueXTokensRequest,
  GluexTokenType,
} from '../types/gluex-api';
import { ENDPOINTS } from './endpoints';

//this is for testing purpose
const GLUEX_API_KEY = '32dsEDbbQ5Fz9Dy4P9uPIVTnLZ7Byju4';

export const getQuote = async (
  request: GluexRequest
): Promise<GluexQuoteResult> => {
  const response = await fetch(`${ENDPOINTS.GLUEX}/v1/quote`, {
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

export const fetchGraphQL = async (
  request: GlueXTokensRequest
): Promise<GluexTokensResponse> => {
  const response = await fetch(`${ENDPOINTS.TOKENS_GLUEX}/graphql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      query: request.query,
      variables: request.variables,
      operationName: request.operationName,
    }),
  });

  const data = await response.json();
  // Optional: Uncomment for debugging API calls
  // console.log('GlueX API response:', { query: request.query, data });
  return data;
};

export const getTokens = async (
  chain: string,
  limit: number = 20,
  offset: number = 0
): Promise<GluexTokensResponse> => {
  const query = `query Tokens($chain: String!, $limit: Int = 20, $offset: Int = 0) {
                  tokens(chain: $chain, limit: $limit, offset: $offset) {
                    items {
                      tokenAddress
                      symbol
                      name
                      decimals
                      type
                      priority
                      branding {
                        logoUri
                      }
                    }
                    total
                    hasMore
                  }
                }`;

  const response = await fetchGraphQL({
    query,
    variables: { chain, limit, offset },
    // operationName: 'Tokens',
  });
  return response;
};

export const getTokensByType = async (
  chain: string,
  tokenType: GluexTokenType,
  limit: number = 20,
  offset: number = 0
): Promise<GluexTokensResponse> => {
  const query = `query TokensByType(
                  $chain: String!
                  $tokenType: String!
                  $limit: Int = 20
                  $offset: Int = 0
                ) {
                  tokensByType(
                    chain: $chain
                    tokenType: $tokenType
                    limit: $limit
                    offset: $offset
                  ) {
                    items {
                      tokenAddress
                      symbol
                      name
                      decimals
                      type
                      priority
                      branding {
                        logoUri
                      }
                    }
                    total
                    hasMore
                  }
                }`;

  const response = await fetchGraphQL({
    query,
    variables: { chain, tokenType, limit, offset },
  });
  return response;
};

export const searchTokens = async (
  chain: string,
  pattern: string,
  limit: number = 20,
  offset: number = 0
): Promise<GluexTokensResponse> => {
  const query = `query SearchTokens(
                  $chain: String!
                  $pattern: String! # case insensitive substring
                  $limit: Int = 20
                  $offset: Int = 0
                ) {
                  searchTokens(
                    chain: $chain
                    pattern: $pattern
                    limit: $limit
                    offset: $offset
                  ) {
                    items {
                      tokenAddress
                      symbol
                      name
                      decimals
                      type
                      priority
                      branding {
                        logoUri
                      }
                    }
                    total
                    hasMore
                  }
                }`;

  const response = await fetchGraphQL({
    query,
    variables: { chain, pattern, limit, offset },
  });
  return response;
};
