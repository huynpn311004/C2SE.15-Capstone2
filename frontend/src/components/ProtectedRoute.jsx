import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        textAlign: 'center',
        padding: '20px',
      }}>
        <h2>Không có quyền truy cập</h2>
        <p>Bạn không có quyền truy cập trang này.</p>
        <p>Vai trò hiện tại: <strong>{user?.role}</strong></p>
        <button
          onClick={() => window.history.back()}
          style={{
            marginTop: '20px',
            padding: '10px 20px',
            background: '#4a7c59',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          Quay lại
        </button>
      </div>
    );
  }

  return children;
}
