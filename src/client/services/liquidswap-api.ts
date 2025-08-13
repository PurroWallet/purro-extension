import {
  FetchBalancesRequest,
  FetchBalancesResponse,
  FetchTokenRequest,
  FetchTokenResponse,
  SwapRouteV2Request,
  SwapRouteV2Response,
} from "../types/liquiswap-api";
import { ENDPOINTS } from "./endpoints";

export const routeFinding = async (
  request: SwapRouteV2Request
): Promise<SwapRouteV2Response> => {
  const params = new URLSearchParams();
  if (request.amountIn) params.set("amountIn", request.amountIn.toString());
  else if (request.amountOut)
    params.set("amountOut", request.amountOut.toString());
  else throw new Error("Amount in or amount out is required");

  params.set("tokenIn", request.tokenIn);
  params.set("tokenOut", request.tokenOut);

  if (request.multiHop) params.set("multiHop", request.multiHop.toString());

  if (request.slippage) params.set("slippage", request.slippage.toString());

  if (request.unwrapWHYPE)
    params.set("unwrapWHYPE", request.unwrapWHYPE.toString());

  if (request.excludeDexes) params.set("excludeDexes", request.excludeDexes);

  if (request.feeBps) params.set("feeBps", request.feeBps.toString());

  if (request.feeRecipient) params.set("feeRecipient", request.feeRecipient);

  const response = await fetch(
    `${ENDPOINTS.LIQUID_SWAP}/v2/route?${params.toString()}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  const data = await response.json();
  if (!data.success) throw new Error(data.error);
  return data;
};

export const fetchTokens = async (
  request: FetchTokenRequest
): Promise<FetchTokenResponse> => {
  const params = new URLSearchParams();
  if (request.limit) params.set("limit", request.limit.toString());
  if (request.search) params.set("search", request.search);
  if (request.metadata) params.set("metadata", request.metadata.toString());

  const response = await fetch(
    `${ENDPOINTS.LIQUID_SWAP}/tokens?${params.toString()}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  return response.json();
};

export const fetchBalances = async (
  request: FetchBalancesRequest
): Promise<FetchBalancesResponse> => {
  const params = new URLSearchParams();
  params.set("wallet", request.wallet);
  if (request.limit) params.set("limit", request.limit.toString());

  const response = await fetch(
    `${ENDPOINTS.LIQUID_SWAP}/tokens/balances?${params.toString()}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  return response.json();
};

export const getTokenLogo = (tokenSymbol: string) => {};
