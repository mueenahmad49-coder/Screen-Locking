
import { apiRequest } from "./api";
import type { Registration } from "@/app/types/contests";

export async function getRegistrations(): Promise<Registration[]> {
  const response = await apiRequest<
    Registration[] | { results: Registration[] }
  >("/registrations/");

  return Array.isArray(response) ? response : response.results;
}

export async function registerForContest(
  contestId: number
): Promise<Registration> {
  return apiRequest<Registration>("/registrations/", {
    method: "POST",
    body: JSON.stringify({ contest: contestId }),
  });
}
