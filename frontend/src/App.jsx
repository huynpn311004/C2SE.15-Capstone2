import { BrowserRouter, Route, Routes } from 'react-router-dom'

import Home from './pages/Home.jsx'
import Login from './pages/auth/Login.jsx'
import Register from './pages/auth/Register.jsx'
import SystemAdminDashboard from './pages/admin/SystemAdminDashboard.jsx'
import SupermarketManagement from './pages/admin/SupermarketManagement.jsx'
import CharityManagement from './pages/admin/CharityManagement.jsx'
import DeliveryManagement from './pages/admin/DeliveryManagement.jsx'
import UserManagement from './pages/admin/UserManagement.jsx'
import ReportsAnalytics from './pages/admin/ReportsAnalytics.jsx'
import AdminSettings from './pages/admin/AdminSettings.jsx'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Admin Routes */}
        <Route path="/admin/dashboard" element={<SystemAdminDashboard />} />
        <Route path="/admin/supermarkets" element={<SupermarketManagement />} />
        <Route path="/admin/charities" element={<CharityManagement />} />
        <Route path="/admin/delivery" element={<DeliveryManagement />} />
        <Route path="/admin/users" element={<UserManagement />} />
        <Route path="/admin/reports" element={<ReportsAnalytics />} />
        <Route path="/admin/settings" element={<AdminSettings />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
