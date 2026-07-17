import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import FingerprintJS from '@fingerprintjs/fingerprintjs'
import { CheckIcon, HomeIcon } from '../components/SvgIcons'
import VideoPlayer from '../components/VideoPlayer'

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()\[\]\\\/+^])/g, '\\$1') + '=([^;]*)'))
  return match ? decodeURIComponent(match[1]) : null
}

interface VoteOption {
  id: string
  vote_item_id: string
  label: string
  sort_order: number
  image_url?: string
  video_url?: string
}

interface VoteItem {
  id: string
  vote_id: string
  title: string
  sort_order: number
  image_url?: string
  video_url?: string
  options: VoteOption[]
}

interface VoteData {
  id: string
  name: string
  created_at: string
  items: VoteItem[]
}

interface VoteResult {
  voterNumber: number
  verificationCode: string
}

export default function VotePage() {
  const { id } = useParams<{ id: string }>()
  const [vote, setVote] = useState<VoteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [choices, setChoices] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<VoteResult | null>(null)
  const [deviceFingerprint, setDeviceFingerprint] = useState('')

  const getFingerprint = useCallback(async () => {
    try {
      const fp = await FingerprintJS.load()
      const result = await fp.get()
      setDeviceFingerprint(result.visitorId)
    } catch {
      setError('设备指纹获取失败，请刷新页面重试')
    }
  }, [])

  useEffect(() => {
    if (!getCookie('privacy_accepted')) {
      window.location.href = '/doc?redirect=/' + (id || '')
      return
    }

    async function fetchVote() {
      try {
        const res = await axios.get('/api/votes/' + id)
        setVote(res.data)
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.data?.error) {
          setError(err.response.data.error)
        } else {
          setError('加载投票数据失败')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchVote()
    getFingerprint()
  }, [id, getFingerprint])

  function handleSelect(itemId: string, optionId: string) {
    setChoices((prev) => ({ ...prev, [itemId]: optionId }))
  }

  async function handleSubmit() {
    if (!deviceFingerprint) {
      setError('设备指纹获取失败，请刷新页面重试')
      return
    }

    const allSelected = vote?.items.every((item) => choices[item.id])
    if (!allSelected) {
      setError('请完成所有投票项的选择')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const res = await axios.post('/api/votes/' + id + '/submit', {
        deviceFingerprint,
        choices,
      })
      setResult(res.data)
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        setError(err.response.data.error)
      } else {
        setError('提交投票失败，请稍后重试')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', paddingTop: '80px' }}>
        <p style={{ color: 'var(--text-secondary)' }}>加载中...</p>
      </div>
    )
  }

  if (error && !vote) {
    return (
      <div className="container" style={{ textAlign: 'center', paddingTop: '80px' }}>
        <p className="error-msg">{error}</p>
        <Link to="/" className="btn btn-outline" style={{ marginTop: '16px' }}>
          返回首页
        </Link>
      </div>
    )
  }

  if (result) {
    return (
      <div className="container" style={{ maxWidth: '520px', paddingTop: '48px' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px', color: 'var(--success)' }}>
            <CheckIcon size={48} />
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '24px', color: 'var(--success)' }}>
            投票成功
          </h1>

          <div style={{ marginBottom: '20px' }}>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>您的投票编号</p>
            <p style={{ fontSize: '40px', fontWeight: 700, color: 'var(--primary)', lineHeight: 1.2 }}>
              {result.voterNumber}
            </p>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>核对码</p>
            <p style={{
              fontSize: '28px',
              fontWeight: 600,
              fontFamily: 'monospace',
              letterSpacing: '4px',
              color: 'var(--text)',
              lineHeight: 1.3,
            }}>
              {result.verificationCode}
            </p>
          </div>

          <div style={{
            background: 'rgba(245,158,11,0.1)',
            border: '1px solid rgba(245,158,11,0.3)',
            borderRadius: 'var(--radius)',
            padding: '12px 16px',
            marginBottom: '24px',
          }}>
            <p style={{ fontSize: '13px', color: 'var(--warning)', lineHeight: 1.6 }}>
              请截图保存以上信息，用于后续公示表格核对。核对码和编号请勿外泄。
            </p>
          </div>

          <Link to="/" className="btn btn-primary" style={{ justifyContent: 'center', width: '100%' }}>
            <HomeIcon size={18} />
            返回首页
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container" style={{ maxWidth: '720px', paddingTop: '32px', paddingBottom: '48px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '8px' }}>{vote?.name}</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '32px' }}>
        请为每个投票项选择一个选项
      </p>

      {vote?.items.map((item, idx) => (
        <div key={item.id} className="card" style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
            {idx + 1}. {item.title}
          </h3>

          {item.image_url && (
            <img
              src={item.image_url}
              alt={item.title}
              style={{
                width: '100%',
                maxHeight: '300px',
                objectFit: 'cover',
                borderRadius: 'var(--radius)',
                marginBottom: '16px',
              }}
            />
          )}

          {item.video_url && (
            <div style={{ marginBottom: '16px' }}>
              <VideoPlayer src={item.video_url} />
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {item.options.map((option) => (
              <label
                key={option.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '12px 16px',
                  border: choices[item.id] === option.id
                    ? '2px solid var(--primary)'
                    : '2px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  cursor: 'pointer',
                  background: choices[item.id] === option.id
                    ? 'rgba(0,74,173,0.04)'
                    : 'transparent',
                  transition: 'all 0.15s ease',
                }}
              >
                <input
                  type="radio"
                  name={'item-' + item.id}
                  value={option.id}
                  checked={choices[item.id] === option.id}
                  onChange={() => handleSelect(item.id, option.id)}
                  style={{
                    width: '18px',
                    height: '18px',
                    marginTop: '2px',
                    accentColor: 'var(--primary)',
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '15px' }}>{option.label}</span>
                  {option.image_url && (
                    <img
                      src={option.image_url}
                      alt={option.label}
                      style={{
                        width: '100%',
                        maxHeight: '200px',
                        objectFit: 'cover',
                        borderRadius: 'var(--radius)',
                        marginTop: '8px',
                      }}
                    />
                  )}
                  {option.video_url && (
                    <div style={{ marginTop: '8px' }}>
                      <VideoPlayer src={option.video_url} style={{ maxHeight: '300px' }} />
                    </div>
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>
      ))}

      {error && <p className="error-msg" style={{ marginBottom: '16px' }}>{error}</p>}

      <button
        className="btn btn-primary"
        onClick={handleSubmit}
        disabled={submitting}
        style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '16px', marginTop: '8px' }}
      >
        {submitting ? '提交中...' : '提交投票'}
      </button>
    </div>
  )
}
