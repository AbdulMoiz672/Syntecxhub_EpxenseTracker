import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Check, Eye, EyeOff, LockKeyhole, Mail, Wallet } from 'lucide-react'
import { loginAccount, registerAccount } from './data/authApi.js'
import './auth.css'

export default function AuthPage({ onAuthenticated }) {
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const firstFieldRef = useRef(null)
  const isRegistering = mode === 'register'

  useEffect(() => {
    firstFieldRef.current?.focus()
  }, [mode])

  function switchMode(nextMode) {
    setMode(nextMode)
    setError('')
    setPassword('')
    setConfirmPassword('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    if (isRegistering && name.trim().length < 2) {
      setError('Please enter your name.')
      return
    }
    if (password.length < 8) {
      setError('Use a password with at least 8 characters.')
      return
    }
    if (isRegistering && password !== confirmPassword) {
      setError('Those passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      const user = isRegistering
        ? await registerAccount({ name, email, password })
        : await loginAccount({ email, password })
      onAuthenticated(user)
    } catch (authError) {
      setError(authError.message || 'We could not sign you in. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-story" aria-label="Pennywise">
        <a className="auth-brand" href="#auth" aria-label="Pennywise">
          <span className="auth-brand-mark"><Wallet size={20} /></span>
          <span>pennywise<span>.</span></span>
        </a>
        <div className="auth-story-copy">
          <span className="auth-eyebrow"><span /> PERSONAL FINANCE, MADE CLEAR</span>
          <h1>Make room for what matters.</h1>
          <p>A calmer way to keep track of everyday spending, so the little things add up to a clearer picture.</p>
          <div className="auth-story-rule"><span /><span /><span /></div>
          <div className="auth-story-note"><Check size={15} /><span>A little more clarity, one day at a time.</span></div>
        </div>
        <div className="auth-story-footer"><span>YOUR MONEY, IN FOCUS</span><span>01 / 01</span></div>
      </section>

      <section className="auth-main" id="auth">
        <a className="auth-mobile-brand" href="#auth" aria-label="Pennywise home">
          <span className="auth-brand-mark"><Wallet size={18} /></span>
          <span>pennywise<span>.</span></span>
        </a>
        <div className="auth-card">
          <div className="auth-card-kicker">{isRegistering ? 'A FRESH START' : 'WELCOME BACK'}</div>
          <h2>{isRegistering ? 'Create your account' : 'Sign in to Pennywise'}</h2>
          <p className="auth-intro">{isRegistering ? 'Set up your personal space to start tracking.' : 'Your spending space is ready when you are.'}</p>

          <form className="auth-form" onSubmit={handleSubmit}>
            {isRegistering && <div className="auth-field"><label htmlFor="auth-name">Your name</label><div className="auth-input-wrap"><input ref={firstFieldRef} id="auth-name" type="text" autoComplete="name" placeholder="Jamie Davis" value={name} onChange={(event) => setName(event.target.value)} maxLength={60} required /><span className="auth-field-mark">JD</span></div></div>}
            <div className="auth-field"><label htmlFor="auth-email">Email address</label><div className="auth-input-wrap"><input ref={!isRegistering ? firstFieldRef : null} id="auth-email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required /><Mail size={17} /></div></div>
            <div className="auth-field"><label htmlFor="auth-password">Password</label><div className="auth-input-wrap"><input id="auth-password" type={showPassword ? 'text' : 'password'} autoComplete={isRegistering ? 'new-password' : 'current-password'} placeholder={isRegistering ? 'At least 8 characters' : 'Enter your password'} value={password} onChange={(event) => setPassword(event.target.value)} required /><button className="password-toggle" type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></div>
            {isRegistering && <div className="auth-field"><label htmlFor="auth-confirm">Confirm password</label><div className="auth-input-wrap"><input id="auth-confirm" type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Enter your password again" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /><LockKeyhole size={17} /></div></div>}
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button className="auth-submit" type="submit" disabled={submitting}>{submitting ? 'Please wait…' : isRegistering ? 'Create account' : 'Sign in'}{!submitting && <ArrowRight size={17} />}</button>
          </form>

          <div className="auth-switch">{isRegistering ? 'Already have an account?' : 'New to Pennywise?'} <button type="button" onClick={() => switchMode(isRegistering ? 'login' : 'register')}>{isRegistering ? 'Sign in' : 'Create an account'}</button></div>
          <div className="auth-privacy"><LockKeyhole size={13} /><span>Your account and expenses are protected by your sign-in.</span></div>
        </div>
        <div className="auth-main-footer">A personal workspace for the everyday.</div>
      </section>
    </main>
  )
}