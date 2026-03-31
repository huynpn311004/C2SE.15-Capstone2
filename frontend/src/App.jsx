import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './services/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { ROLES } from './services/AuthContext';

import Home from './pages/Home.jsx';
import Login from './pages/auth/Login.jsx';
import Register from './pages/auth/Register.jsx';
import ForgotPassword from './pages/auth/ForgotPassword.jsx';
import SystemAdminDashboard from './pages/admin/SystemAdminDashboard.jsx';
import SupermarketManagement from './pages/admin/SupermarketManagement.jsx';
import CharityManagement from './pages/admin/CharityManagement.jsx';
import DeliveryManagement from './pages/admin/DeliveryManagement.jsx';
import UserManagement from './pages/admin/UserManagement.jsx';
import ReportsAnalytics from './pages/admin/ReportsAnalytics.jsx';
import AdminAuditLog from './pages/admin/AdminAuditLog.jsx';
import AdminSettings from './pages/admin/AdminSettings.jsx';
import StaffDashboard from './pages/staff/DashboardStaff.jsx';
import InventoryLots from './pages/staff/InventoryLots.jsx';
import ExpiryTracking from './pages/staff/ExpiryTracking.jsx';
import NearExpiryProducts from './pages/staff/NearExpiryProducts.jsx';
import OrdersManagement from './pages/staff/OrdersManagement.jsx';
import DonationManagement from './pages/staff/DonationManagement.jsx';
import Notifications from './pages/staff/Notifications.jsx';
import StaffSetting from './pages/staff/StaffSetting.jsx';
import CategoryManagement from './pages/staff/CategoryManagement.jsx';
import ProductManagement from './pages/staff/ProductManagement.jsx';
import SupermarketAdminLayout from './components/layout/SupermarketAdmin.jsx';
import SupermarketAdminDashboard from './pages/supermarketadmin/SupermarketAdminDashboard.jsx';
import StoreManagement from './pages/supermarketadmin/StoreManagement.jsx';
import StaffManagement from './pages/supermarketadmin/StaffManagement.jsx';
import PolicyConfiguration from './pages/supermarketadmin/PolicyConfiguration.jsx';
import SupermarketReports from './pages/supermarketadmin/SupermarketReports.jsx';
import DonationMonitoring from './pages/supermarketadmin/DonationMonitoring.jsx';
import AuditLog from './pages/supermarketadmin/AuditLog.jsx';
import SupermarketAdminSettings from './pages/supermarketadmin/SupermarketAdminSettings.jsx';
import CharityDashboard from './pages/charity/CharityDashboard.jsx';
import DonationMarket from './pages/charity/DonationMarket.jsx';
import DonationHistory from './pages/charity/DonationHistory.jsx';
import CharitySettings from './pages/charity/CharitySettings.jsx';
import CustomerLayout from './components/layout/CustomerLayout.jsx';
import CustomerHome from './pages/customer/CustomerHome.jsx';
import CustomerCart from './pages/customer/CustomerCart.jsx';
import CustomerCheckout from './pages/customer/CustomerCheckout.jsx';
import CustomerOrders from './pages/customer/CustomerOrders.jsx';
import CustomerProductDetail from './pages/customer/CustomerProductDetail.jsx';
import CustomerProfile from './pages/customer/CustomerProfile.jsx';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* System Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={[ROLES.SYSTEM_ADMIN]}>
                <Navigate to="/admin/dashboard" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={[ROLES.SYSTEM_ADMIN]}>
                <SystemAdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/supermarkets"
            element={
              <ProtectedRoute allowedRoles={[ROLES.SYSTEM_ADMIN]}>
                <SupermarketManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/charities"
            element={
              <ProtectedRoute allowedRoles={[ROLES.SYSTEM_ADMIN]}>
                <CharityManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/delivery"
            element={
              <ProtectedRoute allowedRoles={[ROLES.SYSTEM_ADMIN]}>
                <DeliveryManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRoles={[ROLES.SYSTEM_ADMIN]}>
                <UserManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <ProtectedRoute allowedRoles={[ROLES.SYSTEM_ADMIN]}>
                <ReportsAnalytics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/audit-logs"
            element={
              <ProtectedRoute allowedRoles={[ROLES.SYSTEM_ADMIN]}>
                <AdminAuditLog />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute allowedRoles={[ROLES.SYSTEM_ADMIN]}>
                <AdminSettings />
              </ProtectedRoute>
            }
          />

          {/* Supermarket Admin Routes */}
          <Route
            path="/supermarketadmin"
            element={
              <ProtectedRoute allowedRoles={[ROLES.SUPERMARKET_ADMIN]}>
                <Navigate to="/supermarketadmin/dashboard" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/supermarketadmin/dashboard"
            element={
              <ProtectedRoute allowedRoles={[ROLES.SUPERMARKET_ADMIN]}>
                <SupermarketAdminLayout>
                  <SupermarketAdminDashboard />
                </SupermarketAdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/supermarketadmin/stores"
            element={
              <ProtectedRoute allowedRoles={[ROLES.SUPERMARKET_ADMIN]}>
                <SupermarketAdminLayout>
                  <StoreManagement />
                </SupermarketAdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/supermarketadmin/staff"
            element={
              <ProtectedRoute allowedRoles={[ROLES.SUPERMARKET_ADMIN]}>
                <SupermarketAdminLayout>
                  <StaffManagement />
                </SupermarketAdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/supermarketadmin/policies"
            element={
              <ProtectedRoute allowedRoles={[ROLES.SUPERMARKET_ADMIN]}>
                <SupermarketAdminLayout>
                  <PolicyConfiguration />
                </SupermarketAdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/supermarketadmin/reports"
            element={
              <ProtectedRoute allowedRoles={[ROLES.SUPERMARKET_ADMIN]}>
                <SupermarketAdminLayout>
                  <SupermarketReports />
                </SupermarketAdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/supermarketadmin/donations"
            element={
              <ProtectedRoute allowedRoles={[ROLES.SUPERMARKET_ADMIN]}>
                <SupermarketAdminLayout>
                  <DonationMonitoring />
                </SupermarketAdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/supermarketadmin/audit-logs"
            element={
              <ProtectedRoute allowedRoles={[ROLES.SUPERMARKET_ADMIN]}>
                <SupermarketAdminLayout>
                  <AuditLog />
                </SupermarketAdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/supermarketadmin/settings"
            element={
              <ProtectedRoute allowedRoles={[ROLES.SUPERMARKET_ADMIN]}>
                <SupermarketAdminLayout>
                  <SupermarketAdminSettings />
                </SupermarketAdminLayout>
              </ProtectedRoute>
            }
          />

          {/* Staff Routes */}
          <Route
            path="/staff"
            element={
              <ProtectedRoute allowedRoles={[ROLES.STORE_STAFF]}>
                <Navigate to="/staff/dashboard" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/dashboard"
            element={
              <ProtectedRoute allowedRoles={[ROLES.STORE_STAFF]}>
                <StaffDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/inventory-lots"
            element={
              <ProtectedRoute allowedRoles={[ROLES.STORE_STAFF]}>
                <InventoryLots />
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/expiry-tracking"
            element={
              <ProtectedRoute allowedRoles={[ROLES.STORE_STAFF]}>
                <ExpiryTracking />
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/near-expiry"
            element={
              <ProtectedRoute allowedRoles={[ROLES.STORE_STAFF]}>
                <NearExpiryProducts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/orders"
            element={
              <ProtectedRoute allowedRoles={[ROLES.STORE_STAFF]}>
                <OrdersManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/donations"
            element={
              <ProtectedRoute allowedRoles={[ROLES.STORE_STAFF]}>
                <DonationManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/notifications"
            element={
              <ProtectedRoute allowedRoles={[ROLES.STORE_STAFF]}>
                <Notifications />
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/settings"
            element={
              <ProtectedRoute allowedRoles={[ROLES.STORE_STAFF]}>
                <StaffSetting />
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/categories"
            element={
              <ProtectedRoute allowedRoles={[ROLES.STORE_STAFF]}>
                <CategoryManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/products"
            element={
              <ProtectedRoute allowedRoles={[ROLES.STORE_STAFF]}>
                <ProductManagement />
              </ProtectedRoute>
            }
          />

          {/* Charity Routes */}
          <Route
            path="/charity"
            element={
              <ProtectedRoute allowedRoles={[ROLES.CHARITY]}>
                <Navigate to="/charity/dashboard" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/charity/dashboard"
            element={
              <ProtectedRoute allowedRoles={[ROLES.CHARITY]}>
                <CharityDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/charity/market"
            element={
              <ProtectedRoute allowedRoles={[ROLES.CHARITY]}>
                <DonationMarket />
              </ProtectedRoute>
            }
          />
          <Route
            path="/charity/history"
            element={
              <ProtectedRoute allowedRoles={[ROLES.CHARITY]}>
                <DonationHistory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/charity/settings"
            element={
              <ProtectedRoute allowedRoles={[ROLES.CHARITY]}>
                <CharitySettings />
              </ProtectedRoute>
            }
          />

          {/* Customer Routes */}
          <Route
            path="/customer"
            element={
              <ProtectedRoute allowedRoles={[ROLES.CUSTOMER]}>
                <Navigate to="/customer/home" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/home"
            element={
              <ProtectedRoute allowedRoles={[ROLES.CUSTOMER]}>
                <CustomerLayout>
                  <CustomerHome />
                </CustomerLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/cart"
            element={
              <ProtectedRoute allowedRoles={[ROLES.CUSTOMER]}>
                <CustomerLayout>
                  <CustomerCart />
                </CustomerLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/checkout"
            element={
              <ProtectedRoute allowedRoles={[ROLES.CUSTOMER]}>
                <CustomerLayout>
                  <CustomerCheckout />
                </CustomerLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/orders"
            element={
              <ProtectedRoute allowedRoles={[ROLES.CUSTOMER]}>
                <CustomerLayout>
                  <CustomerOrders />
                </CustomerLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/product/:id"
            element={
              <ProtectedRoute allowedRoles={[ROLES.CUSTOMER]}>
                <CustomerLayout>
                  <CustomerProductDetail />
                </CustomerLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer/profile"
            element={
              <ProtectedRoute allowedRoles={[ROLES.CUSTOMER]}>
                <CustomerLayout>
                  <CustomerProfile />
                </CustomerLayout>
              </ProtectedRoute>
            }
          />

          {/* Catch all - redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
