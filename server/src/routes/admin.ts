import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db';
import { generateToken, adminAuth } from '../middleware/auth';
import ExcelJS from 'exceljs';

const router = Router();

// Login
router.post('/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  const adminUser = process.env.ADMIN_USERNAME || 'admin';
  const adminPass = process.env.ADMIN_PASSWORD;

  if (!adminPass) {
    res.status(500).json({ error: '管理员密码未配置' });
    return;
  }

  if (username === adminUser && password === adminPass) {
    const token = generateToken();
    res.json({ token });
  } else {
    res.status(401).json({ error: '用户名或密码错误' });
  }
});

// Get all votes
router.get('/votes', adminAuth, (_req: Request, res: Response) => {
  const db = getDb();
  const votes = db.prepare(`
    SELECT v.*, COUNT(DISTINCT b.id) as ballot_count
    FROM votes v
    LEFT JOIN ballots b ON b.vote_id = v.id
    GROUP BY v.id
    ORDER BY v.created_at DESC
  `).all();
  res.json(votes);
});

// Create vote
router.post('/votes', adminAuth, (req: Request, res: Response) => {
  const { name, items } = req.body;
  if (!name || !items || !Array.isArray(items)) {
    res.status(400).json({ error: '请填写投票名称和投票项' });
    return;
  }

  const db = getDb();
  const voteId = uuidv4();

  const insertVote = db.prepare('INSERT INTO votes (id, name) VALUES (?, ?)');
  const insertItem = db.prepare('INSERT INTO vote_items (id, vote_id, title, sort_order) VALUES (?, ?, ?, ?)');
  const insertOption = db.prepare('INSERT INTO options (id, vote_item_id, label, image_url, video_url, sort_order) VALUES (?, ?, ?, ?, ?, ?)');

  const transaction = db.transaction(() => {
    insertVote.run(voteId, name);
    items.forEach((item: any, i: number) => {
      const itemId = uuidv4();
      insertItem.run(itemId, voteId, item.title, i);
      if (item.options && Array.isArray(item.options)) {
        item.options.forEach((opt: any, j: number) => {
          insertOption.run(uuidv4(), itemId, opt.label, opt.image_url || null, opt.video_url || null, j);
        });
      }
    });
  });

  transaction();
  res.json({ id: voteId });
});

// Get vote detail
router.get('/votes/:id', adminAuth, (req: Request, res: Response) => {
  const db = getDb();
  const vote = db.prepare('SELECT * FROM votes WHERE id = ?').get(req.params.id);
  if (!vote) {
    res.status(404).json({ error: '投票项目不存在' });
    return;
  }

  const items = db.prepare('SELECT * FROM vote_items WHERE vote_id = ? ORDER BY sort_order').all(req.params.id) as any[];
  const itemsWithOptions = items.map((item: any) => {
    const options = db.prepare('SELECT * FROM options WHERE vote_item_id = ? ORDER BY sort_order').all(item.id);
    return { ...item, options };
  });

  res.json({ ...(vote as any), items: itemsWithOptions });
});

// Delete vote
router.delete('/votes/:id', adminAuth, (req: Request, res: Response) => {
  const db = getDb();
  db.prepare('DELETE FROM votes WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Export vote results as xlsx
router.get('/votes/:id/export', adminAuth, async (req: Request, res: Response) => {
  const db = getDb();
  const vote = db.prepare('SELECT * FROM votes WHERE id = ?').get(req.params.id) as any;
  if (!vote) {
    res.status(404).json({ error: '投票项目不存在' });
    return;
  }

  const voteItems = db.prepare('SELECT * FROM vote_items WHERE vote_id = ? ORDER BY sort_order').all(req.params.id) as any[];
  const ballots = db.prepare('SELECT * FROM ballots WHERE vote_id = ? ORDER BY voter_number').all(req.params.id) as any[];

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('投票结果');

  // Header
  const headers = ['投票者编号', '投票结果核对码', '投票时间', 'IP地址'];
  voteItems.forEach((item: any) => headers.push(item.title));
  sheet.addRow(headers);

  // Data rows
  ballots.forEach((ballot: any) => {
    const choices = JSON.parse(ballot.choices);
    const row = [ballot.voter_number, ballot.verification_code, ballot.created_at, ballot.ip_address || ''];
    voteItems.forEach((item: any) => {
      const optionId = choices[item.id];
      if (optionId) {
        const option = db.prepare('SELECT label FROM options WHERE id = ?').get(optionId) as any;
        row.push(option ? option.label : '');
      } else {
        row.push('');
      }
    });
    sheet.addRow(row);
  });

  // Summary section
  sheet.addRow([]);
  sheet.addRow(['=== 统计汇总 ===']);
  voteItems.forEach((item: any) => {
    const stats = db.prepare(`
      SELECT o.label, COUNT(b.id) as count
      FROM options o
      LEFT JOIN ballots b ON b.choices LIKE '%"' || o.vote_item_id || '"%' AND b.choices LIKE '%"' || o.id || '"%'
      WHERE o.vote_item_id = ?
      GROUP BY o.id
      ORDER BY o.sort_order
    `).all(item.id) as any[];

    sheet.addRow([`--- ${item.title} ---`]);
    stats.forEach((s: any) => {
      sheet.addRow([s.label, `${s.count} 票`]);
    });
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="vote-${vote.name}-results.xlsx"`);
  await workbook.xlsx.write(res);
  res.end();
});

export default router;
