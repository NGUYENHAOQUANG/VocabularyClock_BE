import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    // ── Xác thực ──────────────────────────────────────────────────
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String },          // null nếu đăng nhập bằng Google
    googleId: { type: String, sparse: true, unique: true },
    avatarUrl: { type: String, default: '' },

    // ── Thông tin cá nhân ──────────────────────────────────────────
    name: { type: String, required: true, trim: true },
    nativeLanguage: {
      type: String,
      default: 'vi',                     // Mã ngôn ngữ: 'vi', 'es', 'ja', 'ko'…
    },

    // ── Cài đặt học tập ────────────────────────────────────────────
    settings: {
      dailyNewWordLimit:   { type: Number, default: 15 },
      dailyReviewLimit:   { type: Number, default: 50 },
      reminderTimes:      { type: [String], default: ['08:00', '20:00'] },  // HH:mm
      learningDays: {
        type: [String],
        enum: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
        default: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
      },
      interfaceLanguage:  { type: String, default: 'vi' },  // Ngôn ngữ UI
    },

    // ── Trạng thái tài khoản ───────────────────────────────────────
    isEmailVerified: { type: Boolean, default: false },
    isActive:        { type: Boolean, default: true },

    // ── Token cho xác thực & đặt lại mật khẩu ─────────────────────
    refreshToken:              { type: String },
    emailVerificationToken:    { type: String },
    passwordResetToken:        { type: String },
    passwordResetExpires:      { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model('User', UserSchema);
