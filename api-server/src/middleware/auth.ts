import type { RequestHandler } from "express";
import type { Role } from "../lib/jwt";
import { verifyAccessToken } from "../lib/jwt";

export const requireAuth: RequestHandler = async (req, res, next) => {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required", code: "AUTH_REQUIRED" });
    return;
  }
  const token = h.slice(7).trim();
  if (!token) {
    res.status(401).json({ error: "Authentication required", code: "AUTH_REQUIRED" });
    return;
  }
  try {
    const payload = await verifyAccessToken(token);
    req.auth = { username: payload.sub, role: payload.role };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token", code: "AUTH_INVALID" });
  }
};

export function requireRole(...allowed: Role[]): RequestHandler {
  return (req, res, next) => {
    if (!req.auth) {
      res.status(401).json({ error: "Authentication required", code: "AUTH_REQUIRED" });
      return;
    }
    if (!allowed.includes(req.auth.role)) {
      res.status(403).json({
        error: "You do not have permission for this action",
        code: "FORBIDDEN",
        requiredRoles: allowed,
      });
      return;
    }
    next();
  };
}

/** Admin-only operations (e.g. fleet dashboard, full session list). */
export const requireAdmin: RequestHandler[] = [requireAuth, requireRole("admin")];
