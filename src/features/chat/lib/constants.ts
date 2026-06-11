import type { ChatMessage } from "../types";

export const EMPTY_MESSAGES: ChatMessage[] = [];

export const DEFAULT_PAGINATION = {
  currentPage: 0,
  totalPages: 1,
  totalMessages: 0,
} as const;
