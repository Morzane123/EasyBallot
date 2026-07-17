import { Link } from 'react-router-dom'
import { VoteIcon, ArrowRightIcon } from '../components/SvgIcons'

export default function Home() {
  return (
    <div className="container" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '80vh',
      textAlign: 'center',
      gap: '16px',
    }}>
      <div style={{ color: 'var(--primary)', marginBottom: '8px' }}>
        <VoteIcon size={48} />
      </div>
      <h1 style={{ fontSize: '32px', fontWeight: 700 }}>EasyBallot</h1>
      <p style={{ fontSize: '16px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
        简约投票平台
      </p>
      <Link
        to="/doc"
        className="btn btn-outline"
        style={{ marginTop: '8px' }}
      >
        隐私政策
        <ArrowRightIcon size={16} />
      </Link>
    </div>
  )
}
