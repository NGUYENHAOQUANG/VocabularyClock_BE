import mongoose from 'mongoose';
import bcrypt from "bcryptjs";

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

UserSchema.pre("save", async function (next) {
  // Chỉ hash password nếu user có nhập password (authType local)
  if ((this.isModified("password") || this.isNew) && this.password) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

UserSchema.methods.comparePassword = async function (password) {
  if (!this.password) return false;
  return await bcrypt.compare(password, this.password);
};

export default mongoose.model('User', UserSchema);
