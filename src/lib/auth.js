import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = "7d";

export async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

/**
 * Pulls the bearer token out of a Next.js Request, verifies it, and
 * optionally enforces that the caller's role is in `allowedRoles`.
 * Returns { ok: true, payload } or { ok: false, status, message }.
 */
export function requireAuth(request, allowedRoles = null) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return { ok: false, status: 401, message: "Missing bearer token" };
  }

  const payload = verifyToken(token);
  if (!payload) {
    return { ok: false, status: 401, message: "Invalid or expired token" };
  }

  if (allowedRoles && !allowedRoles.includes(payload.role)) {
    return { ok: false, status: 403, message: "Insufficient role permissions" };
  }

  return { ok: true, payload };
}
