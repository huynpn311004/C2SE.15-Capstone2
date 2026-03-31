import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './services/AuthContext';

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
import CustomerShop from './pages/customer/CustomerShop.jsx';
import DeliveryDashboard from './pages/delivery/DeliveryDashboard.jsx';
import DeliveryOrders from './pages/delivery/DeliveryOrders.jsx';
import DeliveryHistory from './pages/delivery/DeliveryHistory.jsx';
import DeliverySettings from './pages/delivery/DeliverySettings.jsx';
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
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/dashboard" element={<SystemAdminDashboard />} />
          <Route path="/admin/supermarkets" element={<SupermarketManagement />} />
          <Route path="/admin/charities" element={<CharityManagement />} />
          <Route path="/admin/delivery" element={<DeliveryManagement />} />
          <Route path="/admin/users" element={<UserManagement />} />
          <Route path="/admin/reports" element={<ReportsAnalytics />} />
          <Route path="/admin/audit-logs" element={<AdminAuditLog />} />
          <Route path="/admin/settings" element={<AdminSettings />} />

          {/* Supermarket Admin Routes */}
          <Route path="/supermarketadmin" element={<Navigate to="/supermarketadmin/dashboard" replace />} />
          <Route path="/supermarketadmin/dashboard" element={<SupermarketAdminLayout><SupermarketAdminDashboard /></SupermarketAdminLayout>} />
          <Route path="/supermarketadmin/stores" element={<SupermarketAdminLayout><StoreManagement /></SupermarketAdminLayout>} />
          <Route path="/supermarketadmin/staff" element={<SupermarketAdminLayout><StaffManagement /></SupermarketAdminLayout>} />
          <Route path="/supermarketadmin/policies" element={<SupermarketAdminLayout><PolicyConfiguration /></SupermarketAdminLayout>} />
          <Route path="/supermarketadmin/reports" element={<SupermarketAdminLayout><SupermarketReports /></SupermarketAdminLayout>} />
          <Route path="/supermarketadmin/donations" element={<SupermarketAdminLayout><DonationMonitoring /></SupermarketAdminLayout>} />
          <Route path="/supermarketadmin/audit-logs" element={<SupermarketAdminLayout><AuditLog /></SupermarketAdminLayout>} />
          <Route path="/supermarketadmin/settings" element={<SupermarketAdminLayout><SupermarketAdminSettings /></SupermarketAdminLayout>} />

          {/* Staff Routes */}
          <Route path="/staff" element={<Navigate to="/staff/dashboard" replace />} />
          <Route path="/staff/dashboard" element={<StaffDashboard />} />
          <Route path="/staff/inventory-lots" element={<InventoryLots />} />
          <Route path="/staff/expiry-tracking" element={<ExpiryTracking />} />
          <Route path="/staff/near-expiry" element={<NearExpiryProducts />} />
          <Route path="/staff/orders" element={<OrdersManagement />} />
          <Route path="/staff/donations" element={<DonationManagement />} />
          <Route path="/staff/notifications" element={<Notifications />} />
          <Route path="/staff/settings" element={<StaffSetting />} />
          <Route path="/staff/categories" element={<CategoryManagement />} />
          <Route path="/staff/products" element={<ProductManagement />} />

          {/* Charity Routes */}
          <Route path="/charity" element={<Navigate to="/charity/dashboard" replace />} />
          <Route path="/charity/dashboard" element={<CharityDashboard />} />
          <Route path="/charity/market" element={<DonationMarket />} />
          <Route path="/charity/history" element={<DonationHistory />} />
          <Route path="/charity/settings" element={<CharitySettings />} />

          {/* Customer Routes */}
          <Route path="/customer" element={<Navigate to="/customer/home" replace />} />
          <Route path="/customer/home" element={<CustomerLayout><CustomerHome /></CustomerLayout>} />
          <Route path="/customer/shop" element={<CustomerLayout><CustomerShop /></CustomerLayout>} />
          <Route path="/customer/cart" element={<CustomerLayout><CustomerCart /></CustomerLayout>} />
          <Route path="/customer/checkout" element={<CustomerLayout><CustomerCheckout /></CustomerLayout>} />
          <Route path="/customer/orders" element={<CustomerLayout><CustomerOrders /></CustomerLayout>} />
          <Route path="/customer/product/:id" element={<CustomerLayout><CustomerProductDetail /></CustomerLayout>} />
          <Route path="/customer/profile" element={<CustomerLayout><CustomerProfile /></CustomerLayout>} />

          {/* Delivery Partner Routes */}
          <Route path="/delivery" element={<Navigate to="/delivery/dashboard" replace />} />
          <Route path="/delivery/dashboard" element={<DeliveryDashboard />} />
          <Route path="/delivery/orders" element={<DeliveryOrders />} />
          <Route path="/delivery/history" element={<DeliveryHistory />} />
          <Route path="/delivery/settings" element={<DeliverySettings />} />

          {/* Catch all - redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
