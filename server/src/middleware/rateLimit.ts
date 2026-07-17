import { Request, Response, NextFunction } from 'express';

const ipVoteTimestamps = new Map<string, number>();
const COOLDOWN_MS = 60_000;

export function rateLimit(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const lastVote = ipVoteTimestamps.get(ip);
  const now = Date.now();

  if (lastVote && now - lastVote < COOLDOWN_MS) {
    const remaining = Math.ceil((COOLDOWN_MS - (now - lastVote)) / 1000);
    res.status(429).json({
      error: `投票过于频繁，请 ${remaining} 秒后再试`,
    });
    return;
  }

  ipVoteTimestamps.set(ip, now);
  next();
}
