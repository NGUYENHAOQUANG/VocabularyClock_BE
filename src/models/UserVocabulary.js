import mongoose from 'mongoose';

/**
 * UserVocabulary – Bảng trung gian quan trọng nhất.
 * Lưu TIẾN TRÌNH HỌC của từng User với từng Từ vựng.
 *
 * Dùng thuật toán SRS (Spaced Repetition System) để tính nextReviewDate.
 * Khớp với dữ liệu FE: LearnedWord, WrongWord, MOCK_LEARNED_WORDS, MOCK_STATS
 *
 * ── SRS Interval Map ───────────────────────────────────────────────────────
 *  result    │ status mới     │ interval (ngày)
 *  ──────────┼────────────────┼────────────────
 *  again     │ new/vague      │ 0 (học lại ngay)
 *  hard      │ giữ nguyên     │ interval * 0.5
 *  good      │ lên 1 cấp      │ 1 → 2 → 4 → 7 → 15 → 30
 *  easy      │ lên 2 cấp      │ interval * 2
 */
const UserVocabularySchema = new mongoose.Schema(
  {
    // ── Quan hệ ─────────────────────────────────────────────────────
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    vocabId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vocabulary',
      required: true,
    },

    // ── Denormalized fields – tối ưu SRS query (tránh JOIN) ─────────
    // Sao chép từ Vocabulary khi tạo record. Tránh phải JOIN mỗi lần query SRS.
    setId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VocabSet',
      index: true,
    },
    vocabType: {
      type: String,
      enum: ['vocabulary', 'collocation', 'structure', 'idiom', 'phrasal_verb'],
      index: true,
    },

    // ── Metadata lọc theo ngày học ──────────────────────────────────
    // FE dùng DAY_TABS để filter: mon, tue, wed…
    learnedDayOfWeek: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      index: true,
    },

    // ── Đánh dấu thủ công ──────────────────────────────────────────
    isMarkedRemembered: { type: Boolean, default: false }, // Nút "Đã nhớ" trên SetDetailScreen

    // ── Thống kê phân tích chuyên sâu (Analytics Counters) ────────
    // Cho phép truy vấn siêu tốc: "Từ sai nhiều nhất", "Kỹ năng yếu nhất của User",...
    stats: {
      totalAttempts: { type: Number, default: 0 },   // Tổng số lần tương tác
      correctCount: { type: Number, default: 0 },    // Tổng số lần đúng (good, easy)
      incorrectCount: { type: Number, default: 0 },  // Tổng số lần sai (again, hard)
      // Thống kê chi tiết theo từng kỹ năng:
      byAction: {
        flashcard: { correct: { type: Number, default: 0 }, incorrect: { type: Number, default: 0 } },
        quiz:      { correct: { type: Number, default: 0 }, incorrect: { type: Number, default: 0 } },
        typing:    { correct: { type: Number, default: 0 }, incorrect: { type: Number, default: 0 } },
        writing:   { correct: { type: Number, default: 0 }, incorrect: { type: Number, default: 0 } },
        picture:   { correct: { type: Number, default: 0 }, incorrect: { type: Number, default: 0 } }
      }
    },

    // ── Timestamps học tập ─────────────────────────────────────────
    // Khớp với FE: LearnedWord.firstLearnedAt, LearnedWord.lastReviewedAt
    firstLearnedAt: { type: Date, default: Date.now },
    lastReviewedAt: { type: Date },
  },
  { timestamps: true }
);

// ── Indexes tối ưu cho các query quan trọng ──────────────────────────────────

// [1] Compound index cơ bản: Mỗi user chỉ có 1 record cho 1 từ
UserVocabularySchema.index({ userId: 1, vocabId: 1 }, { unique: true });

// [2] Query danh sách từ đã học theo ngày
UserVocabularySchema.index({ userId: 1, learnedDayOfWeek: 1 });

// [3] Lọc từ theo loại và set
UserVocabularySchema.index({ userId: 1, setId: 1, vocabType: 1 });

export default mongoose.model('UserVocabulary', UserVocabularySchema);
