import { apiClient } from "@/lib/api-client";
import { parsePaginatedRandomCallHistory } from "../lib/parse-call-history";
import type { PaginatedRandomCallHistory, RandomCallFilter } from "../types";
import { videoRoutes } from "./routes";

const DEFAULT_LIMIT = 20;

export type FetchCallHistoryParams = {
  type: RandomCallFilter;
  currentPage: number;
  limit?: number;
};

export async function fetchRandomCallHistory({
  type,
  currentPage,
  limit = DEFAULT_LIMIT,
}: FetchCallHistoryParams): Promise<PaginatedRandomCallHistory> {
  const data = await apiClient.get<unknown>(videoRoutes.getCallHistory, {
    type,
    currentPage,
    limit,
  });

  return parsePaginatedRandomCallHistory(data, type);
}
