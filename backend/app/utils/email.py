"""Email sending utilities via SMTP."""

import smtplib
import os
from dotenv import load_dotenv
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Load .env first so credentials are available
load_dotenv()


def send_reset_password_email(to_email: str, reset_token: str, reset_url: str) -> bool:
	"""
	Send password reset email via SMTP.
	
	Args:
		to_email: Recipient email address
		reset_token: Password reset token
		reset_url: Full URL for reset link
	
	Returns:
		True if email sent successfully, False otherwise
	"""
	try:
		smtp_server = os.getenv("MAIL_SERVER") or os.getenv("SMTP_SERVER", "smtp.gmail.com")
		smtp_port = int(os.getenv("MAIL_PORT") or os.getenv("SMTP_PORT", "587"))
		smtp_user = os.getenv("MAIL_USERNAME") or os.getenv("SMTP_USER")
		smtp_password_raw = os.getenv("MAIL_PASSWORD") or os.getenv("SMTP_PASSWORD")
		# Strip surrounding whitespace but preserve internal spaces
		smtp_user = smtp_user.strip() if smtp_user else None
		smtp_password = smtp_password_raw.strip() if smtp_password_raw else None

		if not smtp_user or not smtp_password:
			print("⚠️ MAIL_USERNAME hoặc MAIL_PASSWORD chưa cấu hình trong .env")
			return False

		print(f"🔍 SMTP DEBUG - user: '{smtp_user}', password length: {len(smtp_password)}, server: {smtp_server}:{smtp_port}")
		
		# Create email message
		msg = MIMEMultipart()
		msg['From'] = smtp_user
		msg['To'] = to_email
		msg['Subject'] = "[SEIMS] Yêu cầu đặt lại mật khẩu"
		
		body = f"""
		<html>
			<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
				<div style="max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; padding: 20px;">
					<h2 style="color: #4CAF50; border-bottom: 2px solid #4CAF50; padding-bottom: 10px;">
						Yêu cầu đặt lại mật khẩu SEIMS
					</h2>
					
					<p>Chào bạn,</p>
					
					<p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn trong hệ thống SEIMS.</p>
					
					<p style="color: #d9534f;">
						<strong> Lưu ý:</strong> Link này sẽ hết hạn trong <strong>1 giờ</strong>
					</p>
					
					<div style="text-align: center; margin: 30px 0;">
						<a href="{reset_url}" style="background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
							Đặt lại mật khẩu
						</a>
					</div>
					
					<p>Hoặc copy link này vào trình duyệt:</p>
					<p style="background-color: #f5f5f5; padding: 10px; border-left: 3px solid #4CAF50; word-break: break-all;">
						{reset_url}
					</p>
					
					<hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
					
					<p style="color: #888; font-size: 12px;">
						Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này hoặc liên hệ với admin.
					</p>
					
					<p style="color: #888; font-size: 12px;">
						Email này được gửi tự động. Vui lòng không trả lời email này.
					</p>
				</div>
			</body>
		</html>
		"""
		
		msg.attach(MIMEText(body, "html"))
		
		# Send email via SMTP
		with smtplib.SMTP(smtp_server, smtp_port) as server:
			server.starttls()
			server.login(smtp_user, smtp_password)
			server.send_message(msg)
		
		print(f"✅ Email gửi thành công đến {to_email}")
		return True
		
	except smtplib.SMTPAuthenticationError as e:
		smtp_msg = getattr(e, 'smtp_error', None) or getattr(e, 'smtp_code', None) or str(e)
		print(f"❌ Lỗi xác thực SMTP (code={getattr(e, 'smtp_code', '?')}): {smtp_msg}")
		return False
	except smtplib.SMTPException as e:
		print(f"❌ Lỗi SMTP: {e}")
		return False
	except Exception as e:
		print(f"❌ Lỗi gửi email: {e}")
		return False
