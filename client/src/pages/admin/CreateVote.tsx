import { useState, useRef, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../api.ts';

interface OptionInput {
  id: string;
  label: string;
  image_url: string;
  video_url: string;
}

interface VoteItemInput {
  id: string;
  title: string;
  options: OptionInput[];
}

interface UploadState {
  key: string;
  progress: number;
  status: 'uploading' | 'done' | 'error';
}

const QINIU_UPLOAD_URL = 'https://upload.qiniup.com';

function xhrUpload(
  token: string,
  key: string,
  file: File,
  onProgress: (pct: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('token', token);
    formData.append('key', key);
    formData.append('file', file);

    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        resolve(xhr.responseText);
      } else {
        reject(new Error('上传失败: ' + xhr.status));
      }
    };

    xhr.onerror = () => reject(new Error('网络错误'));
    xhr.open('POST', QINIU_UPLOAD_URL);
    xhr.send(formData);
  });
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
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

function UploadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `new_${idCounter}`;
}

function createOption(): OptionInput {
  return { id: nextId(), label: '', image_url: '', video_url: '' };
}

function createItem(): VoteItemInput {
  return { id: nextId(), title: '', options: [createOption(), createOption()] };
}

export default function CreateVote() {
  const [name, setName] = useState('');
  const [items, setItems] = useState<VoteItemInput[]>([createItem()]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadStates, setUploadStates] = useState<UploadState[]>([]);
  const imageInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const videoInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const navigate = useNavigate();

  const getUploadState = (key: string) => uploadStates.find(s => s.key === key);

  const addItem = () => {
    setItems((prev) => [...prev, createItem()]);
  };

  const removeItem = (itemId: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((it) => it.id !== itemId));
  };

  const updateItemTitle = (itemId: string, title: string) => {
    setItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, title } : it))
    );
  };

  const addOption = (itemId: string) => {
    setItems((prev) =>
      prev.map((it) =>
        it.id === itemId ? { ...it, options: [...it.options, createOption()] } : it
      )
    );
  };

  const removeOption = (itemId: string, optionId: string) => {
    setItems((prev) =>
      prev.map((it) =>
        it.id === itemId
          ? { ...it, options: it.options.filter((o) => o.id !== optionId) }
          : it
      )
    );
  };

  const updateOption = (
    itemId: string,
    optionId: string,
    field: keyof OptionInput,
    value: string
  ) => {
    setItems((prev) =>
      prev.map((it) =>
        it.id === itemId
          ? {
              ...it,
              options: it.options.map((o) =>
                o.id === optionId ? { ...o, [field]: value } : o
              ),
            }
          : it
      )
    );
  };

  const triggerFileInput = (type: 'image' | 'video', refKey: string) => {
    const refs = type === 'image' ? imageInputRefs : videoInputRefs;
    const input = refs.current.get(refKey);
    if (input) input.click();
  };

  const uploadFile = async (
    file: File,
    itemId: string,
    optionId: string,
    field: 'image_url' | 'video_url',
    refKey: string
  ) => {
    const initState: UploadState = { key: refKey, progress: 0, status: 'uploading' };
    setUploadStates(prev => [...prev.filter(s => s.key !== refKey), initState]);

    try {
      const tokenRes = await api.get('/upload/token');
      const { token, domain } = tokenRes.data;
      const ext = file.name.split('.').pop() || 'jpg';
      const uploadKey = `easyballot/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      await xhrUpload(token, uploadKey, file, (progress) => {
        setUploadStates(prev =>
          prev.map(s => s.key === refKey ? { ...s, progress } : s)
        );
      });

      const fileUrl = `https://${domain}/${uploadKey}`;
      updateOption(itemId, optionId, field, fileUrl);

      setUploadStates(prev =>
        prev.map(s => s.key === refKey ? { ...s, status: 'done', progress: 100 } : s)
      );
    } catch {
      setError('上传失败，请重试');
      setUploadStates(prev =>
        prev.map(s => s.key === refKey ? { ...s, status: 'error' } : s)
      );
    }
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    itemId: string,
    optionId: string,
    field: 'image_url' | 'video_url',
    refKey: string
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file, itemId, optionId, field, refKey);
    }
    e.target.value = '';
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('请输入投票名称');
      return;
    }
    for (const item of items) {
      if (!item.title.trim()) {
        setError('所有投票项都必须填写标题');
        return;
      }
      if (item.options.length < 2) {
        setError('每个投票项至少需要 2 个选项');
        return;
      }
      for (const opt of item.options) {
        if (!opt.label.trim()) {
          setError('所有选项都必须填写名称');
          return;
        }
      }
    }

    const payload = {
      name: name.trim(),
      items: items.map((item) => ({
        title: item.title.trim(),
        options: item.options.map((opt) => ({
          label: opt.label.trim(),
          image_url: opt.image_url || undefined,
          video_url: opt.video_url || undefined,
        })),
      })),
    };

    setSubmitting(true);
    try {
      await api.post('/admin/votes', payload);
      navigate('/admin');
    } catch {
      setError('创建投票失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container">
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <Link to="/admin" className="btn-secondary">
          <ArrowLeftIcon />
          返回
        </Link>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>创建新投票</h1>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="vote-name">投票名称</label>
            <input
              id="vote-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入投票名称"
              required
            />
          </div>
        </div>

        {items.map((item, iIdx) => (
          <div key={item.id} className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>投票项 {iIdx + 1}</h3>
              {items.length > 1 && (
                <button type="button" onClick={() => removeItem(item.id)} className="btn-danger btn-sm">
                  <TrashIcon />
                  删除投票项
                </button>
              )}
            </div>

            <div className="form-group">
              <label htmlFor={`item-title-${item.id}`}>标题</label>
              <input
                id={`item-title-${item.id}`}
                type="text"
                value={item.title}
                onChange={(e) => updateItemTitle(item.id, e.target.value)}
                placeholder="请输入投票项标题"
                required
              />
            </div>

            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontWeight: 500, fontSize: '0.95rem' }}>选项</span>
                <button type="button" onClick={() => addOption(item.id)} className="btn-secondary btn-sm">
                  <PlusIcon />
                  添加选项
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {item.options.map((opt, oIdx) => (
                  <div
                    key={opt.id}
                    style={{
                      background: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius)',
                      padding: 14,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>
                        选项 {String.fromCharCode(65 + oIdx)}
                      </span>
                      {item.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOption(item.id, opt.id)}
                          className="btn-danger btn-sm"
                        >
                          <TrashIcon />
                        </button>
                      )}
                    </div>

                    <div className="form-group">
                      <label htmlFor={`opt-label-${item.id}-${opt.id}`}>选项名称</label>
                      <input
                        id={`opt-label-${item.id}-${opt.id}`}
                        type="text"
                        value={opt.label}
                        onChange={(e) =>
                          updateOption(item.id, opt.id, 'label', e.target.value)
                        }
                        placeholder="请输入选项名称"
                        required
                      />
                    </div>

                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <label
                          htmlFor={`img-url-${item.id}-${opt.id}`}
                          style={{ display: 'block', marginBottom: 4, fontWeight: 500, fontSize: '0.85rem' }}
                        >
                          图片链接
                        </label>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <input
                            id={`img-url-${item.id}-${opt.id}`}
                            type="url"
                            value={opt.image_url}
                            onChange={(e) =>
                              updateOption(item.id, opt.id, 'image_url', e.target.value)
                            }
                            placeholder="https://..."
                            style={{ flex: 1 }}
                          />
                          <button
                            type="button"
                            onClick={() => triggerFileInput('image', `img-${item.id}-${opt.id}`)}
                            className="btn-secondary btn-sm"
                            disabled={getUploadState(`img-${item.id}-${opt.id}`)?.status === 'uploading'}
                            title="上传图片"
                          >
                            <UploadIcon />
                            {getUploadState(`img-${item.id}-${opt.id}`)?.status === 'uploading'
                              ? getUploadState(`img-${item.id}-${opt.id}`)?.progress + '%'
                              : ''}
                          </button>
                          <input
                            ref={(el) => {
                              const map = imageInputRefs.current;
                              const key = `img-${item.id}-${opt.id}`;
                              if (el) map.set(key, el);
                              else map.delete(key);
                            }}
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={(e) =>
                              handleFileChange(e, item.id, opt.id, 'image_url', `img-${item.id}-${opt.id}`)
                            }
                          />
                        </div>
                      </div>

                      <div style={{ flex: 1, minWidth: 200 }}>
                        <label
                          htmlFor={`vid-url-${item.id}-${opt.id}`}
                          style={{ display: 'block', marginBottom: 4, fontWeight: 500, fontSize: '0.85rem' }}
                        >
                          视频链接
                        </label>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <input
                            id={`vid-url-${item.id}-${opt.id}`}
                            type="url"
                            value={opt.video_url}
                            onChange={(e) =>
                              updateOption(item.id, opt.id, 'video_url', e.target.value)
                            }
                            placeholder="https://..."
                            style={{ flex: 1 }}
                          />
                          <button
                            type="button"
                            onClick={() => triggerFileInput('video', `vid-${item.id}-${opt.id}`)}
                            className="btn-secondary btn-sm"
                            disabled={getUploadState(`vid-${item.id}-${opt.id}`)?.status === 'uploading'}
                            title="上传视频"
                          >
                            <UploadIcon />
                            {getUploadState(`vid-${item.id}-${opt.id}`)?.status === 'uploading'
                              ? getUploadState(`vid-${item.id}-${opt.id}`)?.progress + '%'
                              : ''}
                          </button>
                          <input
                            ref={(el) => {
                              const map = videoInputRefs.current;
                              const key = `vid-${item.id}-${opt.id}`;
                              if (el) map.set(key, el);
                              else map.delete(key);
                            }}
                            type="file"
                            accept="video/*"
                            style={{ display: 'none' }}
                            onChange={(e) =>
                              handleFileChange(e, item.id, opt.id, 'video_url', `vid-${item.id}-${opt.id}`)
                            }
                          />
                        </div>
                      </div>
                    </div>

                    {opt.image_url && (
                      <div style={{ marginTop: 8, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        图片: {opt.image_url.length > 60
                          ? opt.image_url.slice(0, 60) + '...'
                          : opt.image_url}
                      </div>
                    )}
                    {opt.video_url && (
                      <div style={{ marginTop: 4, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        视频: {opt.video_url.length > 60
                          ? opt.video_url.slice(0, 60) + '...'
                          : opt.video_url}
                      </div>
                    )}

                    {(getUploadState(`img-${item.id}-${opt.id}`)?.status === 'uploading' || getUploadState(`vid-${item.id}-${opt.id}`)?.status === 'uploading') && (
                      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {getUploadState(`img-${item.id}-${opt.id}`)?.status === 'uploading' && (
                          <div className="upload-progress">
                            <span>图片上传中 {getUploadState(`img-${item.id}-${opt.id}`)?.progress}%</span>
                            <div className="progress-bar" style={{ flex: 1 }}>
                              <div className="progress-bar-fill" style={{ width: getUploadState(`img-${item.id}-${opt.id}`)?.progress + '%' }} />
                            </div>
                          </div>
                        )}
                        {getUploadState(`vid-${item.id}-${opt.id}`)?.status === 'uploading' && (
                          <div className="upload-progress">
                            <span>视频上传中 {getUploadState(`vid-${item.id}-${opt.id}`)?.progress}%</span>
                            <div className="progress-bar" style={{ flex: 1 }}>
                              <div className="progress-bar-fill" style={{ width: getUploadState(`vid-${item.id}-${opt.id}`)?.progress + '%' }} />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <button type="button" onClick={addItem} className="btn-secondary">
            <PlusIcon />
            添加投票项
          </button>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? '创建中...' : '创建投票'}
          </button>
        </div>
      </form>
    </div>
  );
}
