import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import API from '../../services/api';

/**
 * PaymentReturn - Xử lý redirect từ VNPay / MoMo sau khi thanh toán.
 * URL patterns:
 *   /payment/vnpay/return?vnp_ResponseCode=00&vnp_TxnRef=123&...
 *   /payment/momo/return?order_id=SEIMS123&result_code=0&trans_id=xxx
 */
export default function PaymentReturn() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing'); // processing | success | failed
  const [message, setMessage] = useState('Đang xử lý thanh toán...');

  useEffect(() => {
    async function handleCallback() {
      const params = Object.fromEntries(searchParams.entries());

      // Xác định loại payment gateway
      const isVnPay = params.vnp_TxnRef || params.vnp_ResponseCode;

      try {
        if (isVnPay) {
          // Gọi backend verify VNPay
          const queryString = searchParams.toString();
          const response = await API.get(`/payment/vnpay/return?${queryString}`);
          const data = response.data;

          if (data.success) {
            setStatus('success');
            setMessage(data.message || 'Thanh toán VNPay thành công!');
          } else {
            setStatus('failed');
            setMessage(data.message || 'Thanh toán VNPay thất bại.');
          }
        } else {
          setStatus('failed');
          setMessage('Không xác định được phương thức thanh toán.');
        }
      } catch (err) {
        console.error('Payment return error:', err);
        setStatus('failed');
        setMessage('Có lỗi xảy ra khi xử lý thanh toán.');
      }

      // Tự động chuyển về orders sau 5 giây
      setTimeout(() => {
        navigate('/customer/orders');
      }, 5000);
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
      backgroundColor: '#f5f5f5',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '2.5rem',
        textAlign: 'center',
        boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
        maxWidth: '440px',
        width: '90%',
      }}>
        {status === 'processing' && (
          <>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
            <h2 style={{ color: '#333', marginBottom: '0.5rem' }}>Đang xử lý</h2>
          </>
        )}
        {status === 'success' && (
          <>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
            <h2 style={{ color: '#0a7c42', marginBottom: '0.5rem' }}>Thành công!</h2>
          </>
        )}
        {status === 'failed' && (
          <>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❌</div>
            <h2 style={{ color: '#d32f2f', marginBottom: '0.5rem' }}>Thất bại</h2>
          </>
        )}
        <p style={{ color: '#666', fontSize: '1rem', lineHeight: 1.6 }}>{message}</p>
        <p style={{ color: '#999', fontSize: '0.85rem', marginTop: '1.5rem' }}>
          Tự động chuyển về trang đơn hàng sau vài giây...
        </p>
        <button
          onClick={() => navigate('/customer/orders')}
          style={{
            marginTop: '1rem',
            padding: '0.75rem 2rem',
            backgroundColor: status === 'success' ? '#0a7c42' : '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: 500,
          }}
        >
          Xem đơn hàng ngay
        </button>
      </div>
    </div>
  );
}
