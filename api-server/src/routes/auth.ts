import { Router, type IRouter } from "express";
import { z } from "zod";
import { findUserByUsername } from "../lib/database";
import { verifyPassword } from "../lib/password";
import { signAccessToken } from "../lib/jwt";
import { requireAuth } from "../middleware/auth";

const router: IRouter = Router();

const loginBodySchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = loginBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { username, password } = parsed.data;
  const normalized = username.trim().toLowerCase();
  const user = findUserByUsername(normalized);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    res.status(401).json({ error: "Invalid username or password", code: "LOGIN_FAILED" });
    return;
  }

  const token = await signAccessToken({ sub: user.username, role: user.role });
  res.json({
    token,
    user: { username: user.username, role: user.role },
  });
});

router.get("/auth/me", requireAuth, (req, res): void => {
  res.json({
    username: req.auth!.username,
    role: req.auth!.role,
  });
});

export default router;
