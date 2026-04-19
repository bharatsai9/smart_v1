import * as jose from "jose";

export type Role = "admin" | "user";

function getSecret(): Uint8Array {
  const raw = process.env.JWT_SECRET?.trim() || "dev-only-change-JWT_SECRET-in-production";
  return new TextEncoder().encode(raw);
}

export async function signAccessToken(claims: { sub: string; role: Role }): Promise<string> {
  return new jose.SignJWT({ role: claims.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(getSecret());
}

export async function verifyAccessToken(token: string): Promise<{ sub: string; role: Role }> {
  const { payload } = await jose.jwtVerify(token, getSecret());
  const role = payload.role as string;
  if (role !== "admin" && role !== "user") {
    throw new Error("Invalid token role");
  }
  const sub = payload.sub;
  if (!sub) throw new Error("Invalid token subject");
  return { sub: String(sub), role };
}
