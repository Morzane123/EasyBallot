import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import PrivacyPolicy from './pages/PrivacyPolicy'
import VotePage from './pages/VotePage'
import AdminLogin from './pages/admin/AdminLogin'
import AdminDashboard from './pages/admin/AdminDashboard'
import CreateVote from './pages/admin/CreateVote'
import VoteDetail from './pages/admin/VoteDetail'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('admin_token')
  if (!token) {
    return <Navigate to="/admin/login" replace />
  }
  return <>{children}</>
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/doc" element={<PrivacyPolicy />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/create" element={<ProtectedRoute><CreateVote /></ProtectedRoute>} />
      <Route path="/admin/votes/:id" element={<ProtectedRoute><VoteDetail /></ProtectedRoute>} />
      <Route path="/:id" element={<VotePage />} />
    </Routes>
  )
}

export default App
