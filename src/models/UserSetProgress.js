import mongoose from 'mongoose';

/**
 * UserSetProgress – Theo dõi tiến độ học tập của người dùng đối với một Bộ từ vựng (VocabSet).
 * Thuật toán Spaced Repetition System (SRS) giờ đây được áp dụng ở cấp độ Bộ từ, không phải cấp độ Từ.
 */
const UserSetProgressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    setId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VocabSet',
      required: true,
      index: true,
    },

    // ── Trạng thái ghi nhớ (7 mức độ SRS) ─────────────────────────
    status: {
      type: String,
      enum: [
        'new',          // Level 0 – Mới học
        'vague',        // Level 1 – Đang học
        'recognized',   // Level 2 – Nhận biết
        'applicable',   // Level 3 – Biết dùng
        'fluent',       // Level 4 – Trôi chảy
        'stabilized',   // Level 5 – Ổn định
        'mastered',     // Level 6 – Thành thạo
      ],
      default: 'new',
      index: true,
    },

    // ── SRS Logic ──────────────────────────────────────────────────
    interval:       { type: Number, default: 0 },   // Khoảng cách ôn tập hiện tại (ngày)
    nextReviewDate: { type: Date, index: true },    // Ngày ôn tập tiếp theo (KEY FIELD cho SRS)
    reviewCount:    { type: Number, default: 0 },   // Tổng số lần đã ôn bộ này

    // ── Timestamps ─────────────────────────────────────────
    lastReviewedAt: { type: Date },
  },
  { timestamps: true }
);

// Mỗi user chỉ có 1 progress cho 1 set
UserSetProgressSchema.index({ userId: 1, setId: 1 }, { unique: true });

// Query cho "due tasks"
UserSetProgressSchema.index({ userId: 1, nextReviewDate: 1 });

export default mongoose.model('UserSetProgress', UserSetProgressSchema);
