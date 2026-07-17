import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db';
import { rateLimit } from '../middleware/rateLimit';

const router = Router();

// Get public vote info
router.get('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const vote = db.prepare('SELECT id, name, created_at FROM votes WHERE id = ?').get(req.params.id);
  if (!vote) {
    res.status(404).json({ error: '投票项目不存在' });
    return;
  }

  const items = db.prepare('SELECT * FROM vote_items WHERE vote_id = ? ORDER BY sort_order').all(req.params.id) as any[];
  const itemsWithOptions = items.map((item: any) => {
    const options = db.prepare('SELECT * FROM options WHERE vote_item_id = ? ORDER BY sort_order').all(item.id);
    return { ...item, options };
  });

  res.json({ ...vote, items: itemsWithOptions });
});

// Submit vote
router.post('/:id/submit', rateLimit, (req: Request, res: Response) => {
  const { deviceFingerprint, choices } = req.body;
  const voteId = req.params.id;

  if (!deviceFingerprint) {
    res.status(400).json({ error: '设备指纹获取失败，请刷新页面重试' });
    return;
  }

  if (!choices || typeof choices !== 'object') {
    res.status(400).json({ error: '请完成所有投票项的选择' });
    return;
  }

  const db = getDb();

  // Check if this device already voted
  const existing = db.prepare(
    'SELECT id FROM ballots WHERE vote_id = ? AND device_fingerprint = ?'
  ).get(voteId, deviceFingerprint);

  if (existing) {
    res.status(400).json({ error: '该设备已经投过票了' });
    return;
  }

  // Generate voter number
  const countResult = db.prepare(
    'SELECT COUNT(*) as count FROM ballots WHERE vote_id = ?'
  ).get(voteId) as any;
  const voterNumber = (countResult.count || 0) + 1;

  // Generate verification code (6 chars)
  const verificationCode = uuidv4().slice(0, 6).toUpperCase();

  const ip = req.ip || req.socket.remoteAddress || '';

  db.prepare(`
    INSERT INTO ballots (id, vote_id, device_fingerprint, voter_number, verification_code, choices, ip_address)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(uuidv4(), voteId, deviceFingerprint, voterNumber, verificationCode, JSON.stringify(choices), ip);

  res.json({
    voterNumber,
    verificationCode,
  });
});

export default router;
