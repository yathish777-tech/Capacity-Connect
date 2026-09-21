import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Check, Search, UserCheck, X } from 'lucide-react'
import Card from '../../components/Card'
import EmptyState from '../../components/EmptyState'
import Loader from '../../components/Loader'
import StatusBadge from '../../components/StatusBadge'
import * as adminService from '../../services/adminService'
import { apiErrorMessage } from '../../services/api'
import { t } from '../../i18n'

const roleTabs = [
  ['all', 'common.all'],
  ['trainer', 'common.trainers'],
  ['trainee', 'common.trainees'],
]

const statuses = [
  ['pending', 'common.pending'],
  ['approved', 'common.approved'],
  ['rejected', 'common.rejected'],
]

export default function UserApprovals() {
  const [users, setUsers] = useState(null)
  const [role, setRole] = useState('all')
  const [status, setStatus] = useState('pending')
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState(new Set())
  const [busy, setBusy] = useState(false)

  function refresh() {
    setUsers(null)
    adminService.getUserApprovals({ role, status, q }).then(setUsers).catch((err) => toast.error(apiErrorMessage(err)))
  }

  useEffect(refresh, [role, status])

  useEffect(() => {
    const id = setTimeout(refresh, 300)
    return () => clearTimeout(id)
  }, [q])

  const visibleIds = useMemo(() => (users || []).map((u) => u.id), [users])
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id))

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allSelected) visibleIds.forEach((id) => next.delete(id))
      else visibleIds.forEach((id) => next.add(id))
      return next
    })
  }

  function toggleOne(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function review(userId, action) {
    const reason = action === 'reject' ? window.prompt(`${t('common.reason')}:`) : ''
    if (action === 'reject' && reason === null) return
    setBusy(true)
    try {
      if (action === 'approve') await adminService.approveUser(userId)
      else await adminService.rejectUser(userId, reason)
      toast.success(action === 'approve' ? t('admin.userApprovals.approvedToast') : t('admin.userApprovals.rejectedToast'))
      refresh()
    } catch (err) {
      toast.error(apiErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function bulk(action) {
    const ids = [...selected]
    if (!ids.length) return
    const reason = action === 'reject' ? window.prompt(`${t('common.reason')}:`) : ''
    if (action === 'reject' && reason === null) return
    setBusy(true)
    try {
      await adminService.bulkReviewUsers(ids, action, reason)
      setSelected(new Set())
      toast.success(action === 'approve' ? t('admin.userApprovals.bulkApprovedToast') : t('admin.userApprovals.bulkRejectedToast'))
      refresh()
    } catch (err) {
      toast.error(apiErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-xl font-semibold">{t('admin.userApprovals.title')}</h1>
        <div className="flex flex-wrap gap-2">
          <button disabled={busy || selected.size === 0} onClick={() => bulk('approve')} className="btn-primary text-sm px-3 py-1.5">
            <Check className="h-4 w-4" /> {t('admin.userApprovals.bulkApprove')}
          </button>
          <button disabled={busy || selected.size === 0} onClick={() => bulk('reject')} className="btn-secondary text-sm px-3 py-1.5">
            <X className="h-4 w-4" /> {t('admin.userApprovals.bulkReject')}
          </button>
        </div>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded border border-line overflow-hidden">
            {roleTabs.map(([value, label]) => (
              <button key={value} onClick={() => setRole(value)} className={`px-3 py-2 text-sm ${role === value ? 'bg-teal-600 text-white' : 'bg-white hover:bg-ink/5'}`}>
                {t(label)}
              </button>
            ))}
          </div>
          <select className="input w-44" value={status} onChange={(e) => setStatus(e.target.value)}>
            {statuses.map(([value, label]) => (
              <option key={value} value={value}>{t(label)}</option>
            ))}
          </select>
          <div className="relative min-w-[260px] flex-1">
            <Search className="h-4 w-4 absolute left-3 top-3 text-ink/40" />
            <input className="input pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('admin.userApprovals.search')} />
          </div>
        </div>
      </Card>

      <Card>
        {users === null ? (
          <Loader label="Loading approvals..." />
        ) : users.length === 0 ? (
          <EmptyState icon={UserCheck} title={t('admin.userApprovals.empty')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink/50 border-b border-line">
                  <th className="py-2 pr-3"><input type="checkbox" checked={allSelected} onChange={toggleAll} /></th>
                  <th className="py-2 pr-4">{t('admin.userApprovals.role')}</th>
                  <th className="py-2 pr-4">{t('admin.userApprovals.name')}</th>
                  <th className="py-2 pr-4">{t('admin.userApprovals.email')}</th>
                  <th className="py-2 pr-4">{t('admin.userApprovals.signupDate')}</th>
                  <th className="py-2 pr-4">{t('admin.userApprovals.signupFields')}</th>
                  <th className="py-2 pr-4">{t('admin.userApprovals.status')}</th>
                  <th className="py-2 pr-4 text-right">{t('admin.userApprovals.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-line last:border-0 align-top">
                    <td className="py-3 pr-3"><input type="checkbox" checked={selected.has(u.id)} onChange={() => toggleOne(u.id)} /></td>
                    <td className="py-3 pr-4"><span className="rounded bg-ink/10 px-2 py-1 text-xs capitalize">{u.role}</span></td>
                    <td className="py-3 pr-4 font-medium">{u.profile?.full_name || '-'}</td>
                    <td className="py-3 pr-4 text-ink/70">{u.email}</td>
                    <td className="py-3 pr-4 text-ink/70">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="py-3 pr-4 text-ink/70 max-w-xs">
                      {u.role === 'trainer' ? (
                        <span>{u.profile?.skills || u.profile?.work_experience || 'No trainer fields captured'}</span>
                      ) : (
                        <span>{u.profile?.qualifications || u.profile?.current_role_title || 'No trainee fields captured'}</span>
                      )}
                      {u.rejection_reason && <p className="text-xs text-red-700 mt-1">{u.rejection_reason}</p>}
                    </td>
                    <td className="py-3 pr-4"><StatusBadge status={u.status} /></td>
                    <td className="py-3 pr-4">
                      <div className="flex justify-end gap-2">
                        <button disabled={busy} onClick={() => review(u.id, 'approve')} className="btn-primary text-xs px-2.5 py-1">
                          <Check className="h-3.5 w-3.5" /> {t('common.approve')}
                        </button>
                        <button disabled={busy} onClick={() => review(u.id, 'reject')} className="btn-secondary text-xs px-2.5 py-1">
                          <X className="h-3.5 w-3.5" /> {t('common.reject')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
