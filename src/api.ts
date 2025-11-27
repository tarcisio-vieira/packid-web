const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export type User = {
  name: string;
  email: string;
};

export async function fetchCurrentUser(): Promise<User | null> {
  const resp = await fetch(`${API_URL}/me`, {
    credentials: "include",
  });

  if (resp.status === 401) {
    return null;
  }

  if (!resp.ok) {
    throw new Error("Failed to fetch current user.");
  }

  return resp.json();
}

export function getLoginUrl(): string {
  return `${API_URL}/oauth2/authorization/google`;
}

export function getLogoutUrl(): string {
  return `${API_URL}/logout`;
}
