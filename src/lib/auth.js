import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { parse, serialize } from 'cookie';

const COOKIE_NAME = 'dj_session';
const SESSION_TTL = 60 * 60 * 24 * 7;

function jwtSecret() {
  return process.env.JWT_SECRET || 'dev-only-change-me';
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function createSessionCookie(user) {
  const token = jwt.sign({ sub: user.id, email: user.email }, jwtSecret(), {
    expiresIn: SESSION_TTL,
  });

  return serialize(COOKIE_NAME, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_TTL,
  });
}

export function clearSessionCookie() {
  return serialize(COOKIE_NAME, '', {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
  });
}

export function getSessionUser(req) {
  const cookies = parse(req.headers.cookie || '');
  const token = cookies[COOKIE_NAME];
  if (!token) return null;

  try {
    const payload = jwt.verify(token, jwtSecret());
    return { id: Number(payload.sub), email: payload.email };
  } catch {
    return null;
  }
}
