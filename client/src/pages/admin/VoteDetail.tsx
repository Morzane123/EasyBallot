import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api.ts';

interface Option {
  id: string;
  label: string;
  image_url?: string;
  video_url?: string;
}

interface VoteItem {
  id: string;
  title: string;
  options: Option[];
}

interface VoteDetail {
  id: string;
  name: string;
  items: VoteItem[];
  ballot_count: number;
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

export default function VoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [vote, setVote] = useState<VoteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchVote = async () => {
      try {
        const res = await api.get(`/admin/votes/${id}`);
        setVote(res.data);
      } catch {
        setError('加载投票详情失败');
      } finally {
        setLoading(false);
      }
    };
    fetchVote();
  }, [id]);

  const handleExport = async () => {
    if (!id) return;
    try {
      const res = await api.get(`/admin/votes/${id}/export`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${vote?.name || id}-投票结果.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      setError('导出失败');
    }
  };

  if (loading) {
    return (
      <div className="container">
        <p style={{ color: 'var(--text-secondary)' }}>加载中...</p>
      </div>
    );
  }

  if (error || !vote) {
    return (
      <div className="container">
        <div className="error-msg">{error || '投票项目不存在'}</div>
        <Link to="/admin" className="btn-secondary">
          <ArrowLeftIcon />
          返回投票列表
        </Link>
      </div>
    );
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link to="/admin" className="btn-secondary">
            <ArrowLeftIcon />
            返回
          </Link>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>{vote.name}</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              {vote.ballot_count ?? 0} 票
            </p>
          </div>
        </div>
        <button onClick={handleExport} className="btn-primary">
          <DownloadIcon />
          导出结果
        </button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {vote.items.map((item, idx) => (
          <div key={item.id} className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 12 }}>
              投票项 {idx + 1}: {item.title}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {item.options.map((opt, oIdx) => (
                <div
                  key={opt.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 12px',
                    background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius)',
                  }}
                >
                  <span style={{ fontWeight: 500, minWidth: 24 }}>
                    {String.fromCharCode(65 + oIdx)}.
                  </span>
                  <span style={{ flex: 1 }}>{opt.label}</span>
                  {opt.image_url && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      [图片]
                    </span>
                  )}
                  {opt.video_url && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      [视频]
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
