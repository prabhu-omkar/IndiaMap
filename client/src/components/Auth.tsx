import { useState } from 'react'
import api from '../api'

export default function Auth({ onLogin }: { onLogin: (user: any, token: string) => void }) {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isLogin) {
        const res = await api.post('/auth/login', { email, password })
        onLogin(res.data.user, res.data.token)
      } else {
        const res = await api.post('/auth/register', { username, email, password })
        onLogin(res.data.user, res.data.token)
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Something went wrong')
    }
    setLoading(false)
  }

  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: '#4a8c2a',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'VT323', monospace",
      imageRendering: 'pixelated' as any,
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Dirt pattern background */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'repeating-conic-gradient(#866043 0% 25%, #714a30 0% 50%) 0 0 / 32px 32px',
        opacity: 0.3,
      }} />

      <form onSubmit={handleSubmit} style={{
        position: 'relative',
        width: 440,
        background: '#c6c6c6',
        border: '4px solid',
        borderTopColor: '#fff',
        borderLeftColor: '#fff',
        borderBottomColor: '#555',
        borderRightColor: '#555',
        padding: 0,
        boxShadow: '8px 8px 0 rgba(0,0,0,0.5)',
      }}>
        {/* Title bar */}
        <div style={{
          background: '#555',
          padding: '12px 16px',
          borderBottom: '4px solid #333',
          textAlign: 'center',
        }}>
          <h1 style={{
            margin: 0, fontSize: 32, color: '#fff',
            textShadow: '3px 3px 0 #222',
            letterSpacing: 2,
          }}>POLYCRAFT</h1>
          <p style={{
            margin: '4px 0 0', fontSize: 16, color: '#aaa',
            textShadow: '2px 2px 0 #111',
          }}>{isLogin ? 'Sign in to your cities' : 'Create a new profile'}</p>
        </div>

        <div style={{ padding: '20px 24px' }}>
          {error && (
            <div style={{
              background: '#aa0000', color: '#fff', padding: '8px 12px',
              border: '2px solid #550000', marginBottom: 12,
              fontSize: 18, textShadow: '2px 2px 0 #330000',
            }}>{error}</div>
          )}

          {!isLogin && (
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 18, color: '#333', marginBottom: 4 }}>Username</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                required autoComplete="username" placeholder="Steve"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: '#000', color: '#fff', fontSize: 20,
                  border: '4px solid', borderTopColor: '#555', borderLeftColor: '#555',
                  borderBottomColor: '#fff', borderRightColor: '#fff',
                  padding: '8px 12px', fontFamily: "'VT323', monospace",
                  textShadow: '2px 2px 0 #333',
                }} />
            </div>
          )}

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 18, color: '#333', marginBottom: 4 }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              required autoComplete="email" placeholder="player@polycraft.com"
              style={{
                width: '100%', boxSizing: 'border-box',
                background: '#000', color: '#fff', fontSize: 20,
                border: '4px solid', borderTopColor: '#555', borderLeftColor: '#555',
                borderBottomColor: '#fff', borderRightColor: '#fff',
                padding: '8px 12px', fontFamily: "'VT323', monospace",
                textShadow: '2px 2px 0 #333',
              }} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 18, color: '#333', marginBottom: 4 }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              required autoComplete={isLogin ? 'current-password' : 'new-password'}
              placeholder="••••••••"
              style={{
                width: '100%', boxSizing: 'border-box',
                background: '#000', color: '#fff', fontSize: 20,
                border: '4px solid', borderTopColor: '#555', borderLeftColor: '#555',
                borderBottomColor: '#fff', borderRightColor: '#fff',
                padding: '8px 12px', fontFamily: "'VT323', monospace",
                textShadow: '2px 2px 0 #333',
              }} />
          </div>

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '10px 0',
            background: '#aaa', fontSize: 22, color: '#000',
            border: '4px solid', borderTopColor: '#fff', borderLeftColor: '#fff',
            borderBottomColor: '#555', borderRightColor: '#555',
            cursor: 'pointer', fontFamily: "'VT323', monospace",
            boxShadow: '4px 4px 0 rgba(0,0,0,0.3)',
          }}>
            {loading ? 'Loading...' : isLogin ? 'Play PolyCraft' : 'Create Profile'}
          </button>

          <div style={{
            textAlign: 'center', marginTop: 16, fontSize: 18,
            color: '#555', cursor: 'pointer',
          }}
            onClick={() => { setIsLogin(!isLogin); setError('') }}
          >
            {isLogin ? 'Create a new account' : 'Already have an account? Sign in'}
          </div>
        </div>
      </form>
    </div>
  )
}
