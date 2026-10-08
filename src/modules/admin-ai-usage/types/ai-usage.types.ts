export type AiUsageSortBy = "totalTokens" | "estimatedCost" | "totalRequests" | "businessName" | "lastUsedAt";
export type SortOrder = "asc" | "desc";

export type AiUsageListQuery = {
  month?: number;
  year?: number;
  search?: string;
  page: number;
  pageSize: number;
  sortBy: AiUsageSortBy;
  sortOrder: SortOrder;
};

export type ClientAiUsageSummary = {
  clientId: string;
  businessName: string;
  owner: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  totalRequests: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
  topModel: string | null;
  lastUsedAt: string | null;
};

export type AiUsageTotals = {
  totalRequests: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  totalEstimatedCost: number;
  activeClientsCount: number;
};

export type AiUsageListResult = {
  items: ClientAiUsageSummary[];
  summary: AiUsageTotals;
  total: number;
  page: number;
  pageSize: number;
  selectedMonth: number | null;
  selectedYear: number;
};
