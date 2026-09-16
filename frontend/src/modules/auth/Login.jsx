import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { apiErrorMessage } from '../../services/api'
import AuthHero from '../../components/AuthHero'

export default function Login() {
  const { t } = useTranslation()
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const user = await login(form.email, form.password)
      navigate(`/${user.role}`)
    } catch (err) {
      toast.error(apiErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <AuthHero />
      <div className="flex items-center justify-center p-8 bg-paper">
        <div className="w-full max-w-sm">
          <h1 className="font-display text-2xl font-semibold mb-1">{t('auth.login')}</h1>
          <p className="text-sm text-ink/60 mb-6">Sign in to your CAPACITY CONNECT dashboard.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">{t('auth.email')}</label>
              <input
                type="email"
                required
                className="input"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="label">{t('auth.password')}</label>
              <input
                type="password"
                required
                className="input"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? 'Signing in…' : t('auth.login')}
            </button>
          </form>

          <p className="text-sm text-ink/60 mt-6">
            {t('auth.no_account')}{' '}
            <Link to="/signup" className="text-teal-600 font-medium hover:underline">
              {t('auth.signup')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
