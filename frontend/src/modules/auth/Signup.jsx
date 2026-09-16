import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { apiErrorMessage } from '../../services/api'
import AuthHero from '../../components/AuthHero'

const initialForm = {
  role: 'trainee',
  email: '',
  password: '',
  full_name: '',
  employee_id: '',
  qualifications: '',
  work_experience: '',
  skills: '',
  current_role_title: '',
  phone: '',
}

export default function Signup() {
  const { t } = useTranslation()
  const { signup, login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState(initialForm)
  const [submitting, setSubmitting] = useState(false)

  function update(field) {
    return (e) => setForm({ ...form, [field]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await signup(form)
      toast.success('Account created — pending Admin approval.')
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
        <div className="w-full max-w-md">
          <h1 className="font-display text-2xl font-semibold mb-1">{t('auth.signup')}</h1>
          <p className="text-sm text-ink/60 mb-6">Register as a Trainer or Trainee. An Admin reviews every account.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">{t('auth.role')}</label>
              <div className="flex gap-2">
                {['trainee', 'trainer'].map((r) => (
                  <button
                    type="button"
                    key={r}
                    onClick={() => setForm({ ...form, role: r })}
                    className={`flex-1 rounded border px-3 py-2 text-sm font-medium capitalize ${
                      form.role === r ? 'border-teal-600 bg-teal-50 text-teal-700' : 'border-line text-ink/60'
                    }`}
                  >
                    {t(`auth.${r}`)}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="label">{t('auth.full_name')}</label>
                <input required className="input" value={form.full_name} onChange={update('full_name')} />
              </div>
              <div>
                <label className="label">{t('auth.email')}</label>
                <input type="email" required className="input" value={form.email} onChange={update('email')} />
              </div>
              <div>
                <label className="label">{t('auth.password')}</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  className="input"
                  value={form.password}
                  onChange={update('password')}
                />
              </div>
              <div>
                <label className="label">{t('auth.employee_id')}</label>
                <input required className="input" value={form.employee_id} onChange={update('employee_id')} />
              </div>
              <div>
                <label className="label">Current role</label>
                <input className="input" value={form.current_role_title} onChange={update('current_role_title')} />
              </div>
              <div className="col-span-2">
                <label className="label">Skills (comma-separated)</label>
                <input
                  className="input"
                  placeholder="Radar Systems, AWS Sensor Calibration"
                  value={form.skills}
                  onChange={update('skills')}
                />
              </div>
              <div className="col-span-2">
                <label className="label">Qualifications</label>
                <textarea className="input" rows={2} value={form.qualifications} onChange={update('qualifications')} />
              </div>
              <div className="col-span-2">
                <label className="label">Work experience</label>
                <textarea className="input" rows={2} value={form.work_experience} onChange={update('work_experience')} />
              </div>
            </div>

            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? 'Creating account…' : t('auth.signup')}
            </button>
          </form>

          <p className="text-sm text-ink/60 mt-6">
            {t('auth.have_account')}{' '}
            <Link to="/login" className="text-teal-600 font-medium hover:underline">
              {t('auth.login')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
