import React, { useState } from 'react'

export default function CharityRegister() {
  const [orgName, setOrgName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [note, setNote] = useState('')
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    setSubmitted(true)
  }

  return (
    <div className="admin-content-inner">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#134e4a]">Đăng ký tổ chức từ thiện</h2>
        <p className="text-sm text-gray-600 mt-1">
          Trang demo để tránh lỗi import. Nhóm có thể nối API sau.
        </p>
      </div>

      <div className="bg-white border rounded-xl p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-1">Tên tổ chức</label>
            <input
              className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-teal-500"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="vd: Quỹ Bầu Ơi"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-1">Email</label>
              <input
                type="email"
                className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-teal-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@tochuc.org"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1">Số điện thoại</label>
              <input
                className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-teal-500"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="09xx..."
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">Địa chỉ</label>
            <input
              className="w-full border rounded-lg p-2 outline-none focus:ring-2 focus:ring-teal-500"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Số nhà, đường, quận/huyện, tỉnh/thành"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-1">Ghi chú</label>
            <textarea
              className="w-full border rounded-lg p-2 h-24 outline-none focus:ring-2 focus:ring-teal-500"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Giấy tờ, người liên hệ, khung giờ nhận hàng..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="px-4 py-2 rounded-lg font-bold text-white"
              style={{ background: 'linear-gradient(135deg, var(--seims-teal), var(--seims-teal-light))' }}
            >
              Gửi đăng ký
            </button>
            {submitted ? (
              <p className="text-sm text-emerald-700 font-semibold self-center">
                Đã gửi (demo). Nhóm nối API sau nhé.
              </p>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  )
}
