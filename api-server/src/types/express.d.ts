import type { Role } from "../lib/jwt";

declare global {
  namespace Express {
    interface Request {
      auth?: { username: string; role: Role };
    }
  }
}

export {};
