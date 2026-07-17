import { Router, Request, Response } from 'express';
import { adminAuth } from '../middleware/auth';
import qiniu from 'qiniu';

const router = Router();

// Get Qiniu upload token
router.get('/token', adminAuth, (_req: Request, res: Response) => {
  const accessKey = process.env.QINIU_ACCESS_KEY;
  const secretKey = process.env.QINIU_SECRET_KEY;
  const bucket = process.env.QINIU_BUCKET;

  if (!accessKey || !secretKey || !bucket) {
    res.status(500).json({ error: '七牛云配置未完成' });
    return;
  }

  const mac = new qiniu.auth.digest.Mac(accessKey, secretKey);
  const options: qiniu.rs.PutPolicyOptions = {
    scope: bucket,
    expires: 3600,
  };
  const putPolicy = new qiniu.rs.PutPolicy(options);
  const token = putPolicy.uploadToken(mac);

  const domain = process.env.QINIU_DOMAIN || '';

  res.json({ token, domain });
});

export default router;
