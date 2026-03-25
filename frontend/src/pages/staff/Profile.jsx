import { useState } from 'react'
import SectionCard from '../../components/staff/SectionCard'

const defaultProfile = {
  fullName: 'Tran Staff',
  email: 'staff01@seims.vn',
  phone: '0908 123 456',
  store: 'BigMart Central',
  role: 'Store Employee',
}

export default function Profile() {
  const [profile, setProfile] = useState(defaultProfile)
  const [saved, setSaved] = useState(false)

  function handleChange(event) {
    const { name, value } = event.target
    setProfile((prev) => ({ ...prev, [name]: value }))
    setSaved(false)
  }

  function handleSubmit(event) {
    event.preventDefault()
    setSaved(true)
  }

  return (
    <SectionCard title="Profile" subtitle="View and update your staff information">
      <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">Full Name
          <input name="fullName" value={profile.fullName} onChange={handleChange} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
        </label>
        <label className="text-sm">Email
          <input name="email" type="email" value={profile.email} onChange={handleChange} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
        </label>
        <label className="text-sm">Phone
          <input name="phone" value={profile.phone} onChange={handleChange} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
        </label>
        <label className="text-sm">Store
          <input name="store" value={profile.store} onChange={handleChange} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
        </label>
        <label className="text-sm sm:col-span-2">Role
          <input name="role" value={profile.role} disabled className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2" />
        </label>

        <div className="sm:col-span-2 flex justify-end gap-2">
          {saved && <p className="mr-auto text-sm font-semibold text-emerald-700">Profile updated successfully.</p>}
          <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
            Save Changes
          </button>
        </div>
      </form>
    </SectionCard>
  )
}
