
import { apiRequest } from "./api";

import type {
  User,
  LoginData,
  RegisterData,
  AuthResponse,
} from "@/app/types/auth";

export async function registerUser(
  data: RegisterData
): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/auth/register/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function loginUser(
  data: LoginData
): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/auth/login/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function logoutUser(): Promise<{ message: string }> {
  return apiRequest<{ message: string }>("/auth/logout/", {
    method: "POST",
  });
}

export async function getCurrentUser(): Promise<User> {
  return apiRequest<User>("/auth/me/");
}

export async function refreshAccessToken(): Promise<{
  message: string;
}> {
  return apiRequest<{ message: string }>("/auth/refresh/", {
    method: "POST",
  });
}
