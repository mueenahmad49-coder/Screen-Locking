
export type UserRole = "ADMIN" | "PARTICIPANT";

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  date_joined: string;
}

export interface RegisterData {
  email: string;
  first_name: string;
  last_name: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  message: string;
  user: User;
}

export interface ApiError {
  detail?: string;
  message?: string;
  error?: string;
}
