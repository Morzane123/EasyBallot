import { useSearchParams } from 'react-router-dom'
import { ShieldIcon, LockIcon } from '../components/SvgIcons'

export default function PrivacyPolicy() {
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'

  function handleAccept() {
    document.cookie = 'privacy_accepted=true; path=/; max-age=' + 365 * 24 * 60 * 60 + '; SameSite=Lax'
    window.location.href = redirect
  }

  return (
    <div className="container" style={{ maxWidth: '720px', paddingTop: '48px', paddingBottom: '48px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
        <ShieldIcon size={28} />
        <h1 style={{ fontSize: '24px', fontWeight: 600 }}>隐私政策</h1>
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <p style={{ marginBottom: '12px' }}>
          本投票系统由以下单位开发维护：
        </p>
        <ul style={{ paddingLeft: '20px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <li>北域工作室（<a href="https://beiyu.xuanjian.top" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>beiyu.xuanjian.top</a>）</li>
          <li>张津瑞（<a href="https://github.com/Morzane123" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>https://github.com/Morzane123</a>）</li>
        </ul>
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>我们收集的信息</h2>
        <p style={{ marginBottom: '12px', color: 'var(--text-secondary)' }}>
          为保障投票公正性，我们需要收集以下设备特征信息用于去重验证：
        </p>
        <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px', color: 'var(--text-secondary)' }}>
          <li>浏览器类型及版本</li>
          <li>操作系统类型及版本</li>
          <li>屏幕分辨率</li>
          <li>语言设置</li>
          <li>时区信息</li>
          <li>Canvas 指纹</li>
          <li>Audio 音频指纹</li>
          <li>WebGL 渲染信息</li>
        </ul>
      </div>

      <div className="card" style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          <LockIcon size={20} />
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>数据处理说明</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              数据处理目的：仅用于投票去重验证，不会与任何第三方共享，数据加密存储。
            </p>
          </div>
        </div>
      </div>

      <button
        className="btn btn-primary"
        onClick={handleAccept}
        style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '16px' }}
      >
        同意
      </button>
    </div>
  )
}
