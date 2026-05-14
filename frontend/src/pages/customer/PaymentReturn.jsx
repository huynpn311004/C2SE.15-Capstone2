import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import API from '../../services/api';

export default function PaymentReturn() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    async function handleCallback() {
      const params = Object.fromEntries(searchParams.entries());
      const isVnPay = params.vnp_TxnRef || params.vnp_ResponseCode;

      if (!isVnPay) {
        navigate('/customer/checkout');
        return;
      }

      try {
        const queryString = searchParams.toString();
        const response = await API.get(`/payment/vnpay/return?${queryString}`);
        const data = response.data;

        if (data.success) {
          // Chuyển về trang orders kèm theo state thông báo thành công có mã đơn
          navigate('/customer/orders', {
            state: {
              toastSuccess: `Thanh toán thành công đơn hàng ${data.order_code}!`,
              clearCart: true
            }
          });

        } else {
          navigate('/customer/orders', {
            state: {
              toastError: data.message || 'Thanh toán VNPay thất bại.'
            }
          });
        }
      } catch (err) {
        navigate('/customer/orders', {
          state: {
            toastError: 'Có lỗi xảy ra khi xử lý thanh toán VNPay.'
          }
        });
      }

    }

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#f8f9fa',
    }}>
      <div className="order-loading">
        <div className="spinner" style={{
          width: '40px',
          height: '40px',
          border: '4px solid #e9ecef',
          borderTop: '4px solid var(--seims-teal, #0f766e)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '1rem'
        }}></div>
        <p style={{ color: '#666', fontWeight: '500' }}>Đang xác thực kết quả...</p>
      </div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}


