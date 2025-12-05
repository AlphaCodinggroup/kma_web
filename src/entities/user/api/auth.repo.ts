import type { Session } from "../model/sessions";

export interface AuthRepo {
  login(input: { username: string; password: string }): Promise<Session>;
  logout(): Promise<void>;
  getSession(): Promise<Session>;
}
