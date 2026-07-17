import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api.ts';

interface Option {
  _id: string;
  label: string;
  image_url?: string;
  video_url?: string;
}

interface VoteItem {
  _id: string;
  title: string;
  options: Option[];
}

interface VoteDetail {
  _id: string;
  name: string;
  items: VoteItem[];
  ballotCount: number;
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
        setError('Failed to load vote details.');
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
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `vote-${id}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('Failed to export vote.');
    }
  };

  if (loading) {
    return (
      <div className="container">
        <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
      </div>
    );
  }

  if (error || !vote) {
    return (
      <div className="container">
        <div className="error-msg">{error || 'Vote not found.'}</div>
        <Link to="/admin" className="btn-secondary">
          <ArrowLeftIcon />
          Back to Votes
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
            Back
          </Link>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>{vote.name}</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              {vote.ballotCount ?? 0} ballots
            </p>
          </div>
        </div>
        <button onClick={handleExport} className="btn-primary">
          <DownloadIcon />
          Export Results
        </button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {vote.items.map((item, idx) => (
          <div key={item._id} className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 12 }}>
              Item {idx + 1}: {item.title}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {item.options.map((opt, oIdx) => (
                <div
                  key={opt._id}
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
                      [Image]
                    </span>
                  )}
                  {opt.video_url && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      [Video]
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
