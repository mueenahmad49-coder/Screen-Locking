

import { apiRequest } from "./api";
import type { Contest, ContestData } from "@/app/types/contests";

export async function getContests(): Promise<Contest[]> {
  const response = await apiRequest<Contest[] | { results: Contest[] }>(
    "/contests/"
  );

  return Array.isArray(response) ? response : response.results;
}

export async function createContest(data: ContestData): Promise<Contest> {
  return apiRequest<Contest>("/contests/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateContest(
  id: number,
  data: Partial<ContestData>
): Promise<Contest> {
  return apiRequest<Contest>(`/contests/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteContest(id: number): Promise<void> {
  await apiRequest<unknown>(`/contests/${id}/`, {
    method: "DELETE",
  });
}
