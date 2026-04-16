import jwt from 'jsonwebtoken';

const ACCESS_SECRET  = process.env.JWT_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
const ACCESS_EXP     = process.env.JWT_EXPIRES_IN  ?? '15m';
const REFRESH_EXP    = process.env.JWT_REFRESH_EXPIRES_IN ?? '7d';

export function signAccess(payload: object)  { return jwt.sign(payload, ACCESS_SECRET,  { expiresIn: ACCESS_EXP  as any }); }
export function signRefresh(payload: object) { return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXP as any }); }
export function verifyAccess(token: string)  { return jwt.verify(token, ACCESS_SECRET); }
export function verifyRefresh(token: string) { return jwt.verify(token, REFRESH_SECRET); }

export function parseExpiry(expiry: string): number {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const value = parseInt(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return value * (multipliers[unit] ?? 1000);
}
