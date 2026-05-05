import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { fetchCustomerOrderDetail, fetchCustomerOrders } from '../../services/customerApi';
import { getProductImageUrl } from '../../services/staffApi';
import './CustomerCheckout.css';  // Reuse styles

const CustomerPayment = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading');  // loading, success, failed
  const [order, setOrder] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const orderId = searchParams.get('orderId') || searchParams.get('order_id');
    const resultCode = parseInt(searchParams.get('resultCode') || '99');
    
    async function checkPaymentStatus() {
      if (!orderId) {
        setStatus('failed');
        setLoading(false);
        return;
      }

      try {
        const orderDetail = await fetchCustomerOrderDetail(orderId);
        setOrder(orderDetail);
        
        if (resultCode === 0 || orderDetail.payment_status === 'paid') {
          setStatus('success');
          
          // Reload orders list
          const recentOrders = await fetchCustomerOrders('pending');
          setOrders(recentOrders.slice(0, 3));
        } else {
          setStatus('failed');
        }
      } catch (err) {
        setStatus('failed');
      } finally {
        setLoading(false);
      }
    }

    checkPaymentStatus();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="customer-page" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ padding: '4rem 2rem', color: 'var(--seims-muted)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
          <p>Đang kiểm tra thanh toán...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="customer-page">
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem 1rem' }}>
        {status === 'success' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem', color: 'var(--seims-success)' }}>✅</div>
              <h2 style={{ color: 'var(--seims-teal-dark)', marginBottom: '0.5rem' }}>Thanh toán thành công!</h2>
              <p style={{ color: 'var(--seims-muted)', fontSize: '1.1rem' }}>
                Cảm ơn bạn đã mua sắm tại Seims. Đơn hàng đang được chuẩn bị.
              </p>
            </div>

            {order && (
              <div style={{ background: 'var(--seims-card)', borderRadius: '16px', padding: '1.5rem', marginBottom: '2rem', border: '1px solid var(--seims-border)' }}>
                <h3 style={{ margin: '0 0 1rem 0', color: 'var(--seims-ink)' }}>Đơn hàng #{order.orderCode}</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <span>Tổng tiền:</span>
                  <span style={{ fontWeight: '700', color: 'var(--seims-teal-dark)' }}>{order.total_amount?.toLocaleString()}đ</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <span>Phương thức:</span>
                  <span style={{ fontWeight: '600' }}>{order.payment_method?.toUpperCase()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Trạng thái:</span>
                  <span style={{ color: 'var(--seims-success)', fontWeight: '700' }}>Đã thanh toán</span>
                </div>
              </div>
            )}

            <div style={{ textAlign: 'center' }}>
              <button 
                onClick={() => navigate('/customer/orders')}
                style={{
                  padding: '1rem 2rem',
                  background: 'var(--seims-teal)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Xem đơn hàng
              </button>
            </div>
          </>
        )}

        {status === 'failed' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ fontSize: '4rem', marginBottom: '1rem', color: 'var(--seims-error)' }}>❌</div>
              <h2 style={{ color: 'var(--seims-error)', marginBottom: '0.5rem' }}>Thanh toán thất bại</h2>
              <p style={{ color: 'var(--seims-muted)' }}>
                Có lỗi xảy ra trong quá trình thanh toán. Vui lòng thử lại hoặc liên hệ hỗ trợ.
              </p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <button 
                onClick={() => navigate('/customer/cart')}
                style={{
                  padding: '1rem 2rem',
                  background: 'var(--seims-error)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  marginRight: '1rem'
                }}
              >
                Quay lại giỏ hàng
              </button>
              <button 
                onClick={() => navigate('/customer/orders')}
                style={{
                  padding: '1rem 2rem',
                  background: 'var(--seims-teal)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Xem đơn hàng
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CustomerPayment;

