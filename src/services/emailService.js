import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

// Cấu hình transporter (người gửi)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // Email của bạn (VD: myapp@gmail.com)
    pass: process.env.EMAIL_PASS, // Mật khẩu ứng dụng (App Password)
  },
});

/**
 * Gửi email chứa mã OTP khôi phục mật khẩu
 * @param {string} toEmail - Địa chỉ email người nhận
 * @param {string} otp - Mã OTP 6 số
 */
export const sendPasswordResetEmail = async (toEmail, otp) => {
  try {
    const mailOptions = {
      from: `"Vocabulary Clock" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: 'Khôi phục mật khẩu - Vocabulary Clock',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <h2 style="color: #FD714A; text-align: center;">Khôi phục mật khẩu</h2>
          <p>Xin chào,</p>
          <p>Bạn vừa yêu cầu khôi phục mật khẩu cho tài khoản <strong>Vocabulary Clock</strong>.</p>
          <p>Mã OTP của bạn là:</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #333; background-color: #f5f5f5; padding: 15px 30px; border-radius: 8px;">${otp}</span>
          </div>
          <p>Mã này có hiệu lực trong vòng <strong>15 phút</strong>. Tuyệt đối không chia sẻ mã này cho bất kỳ ai.</p>
          <p style="margin-top: 40px; font-size: 12px; color: #888; text-align: center;">
            Nếu bạn không yêu cầu đổi mật khẩu, vui lòng bỏ qua email này.<br>
            Trân trọng,<br>
            Đội ngũ Vocabulary Clock
          </p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[EmailService] Đã gửi email tới ${toEmail} - MessageId: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('[EmailService] Lỗi khi gửi email:', error);
    // Nếu chưa cấu hình cấu hình email, ta vẫn ném lỗi ra để Controller bắt được
    throw new Error('Không thể gửi email. Vui lòng kiểm tra cấu hình SMTP.');
  }
};
