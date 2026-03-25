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
import StaffLayout from './pages/staff/StaffLayout.jsx'
import StaffDashboard from './pages/staff/Dashboard.jsx'
import InventoryLots from './pages/staff/InventoryLots.jsx'
import ExpiryTracking from './pages/staff/ExpiryTracking.jsx'
import NearExpiryProducts from './pages/staff/NearExpiryProducts.jsx'
import OrdersManagement from './pages/staff/OrdersManagement.jsx'
import DonationManagement from './pages/staff/DonationManagement.jsx'
import Notifications from './pages/staff/Notifications.jsx'
import Profile from './pages/staff/Profile.jsx'
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

        {/* Staff Routes */}
        <Route path="/staff" element={<StaffLayout />}>
          <Route path="dashboard" element={<StaffDashboard />} />
          <Route path="inventory-lots" element={<InventoryLots />} />
          <Route path="expiry-tracking" element={<ExpiryTracking />} />
          <Route path="near-expiry" element={<NearExpiryProducts />} />
          <Route path="orders" element={<OrdersManagement />} />
          <Route path="donations" element={<DonationManagement />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="profile" element={<Profile />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
