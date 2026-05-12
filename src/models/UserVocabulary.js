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

    // ── Trạng thái ghi nhớ (7 mức độ SRS) ─────────────────────────
    // Khớp với FE: LearnedWord.status & MOCK_STATS (new, vague, recognized…)
    status: {
      type: String,
      enum: [
        'new',          // Day 0 – Mới học, chưa nhớ            → interval: 0
        'vague',        // Level 2 – Nhớ mơ hồ                  → interval: 1
        'recognized',   // Level 3 – Nhận diện được              → interval: 2
        'applicable',   // Level 4 – Dùng được trong câu         → interval: 4
        'fluent',       // Level 5 – Gặp là hiểu ngay            → interval: 7
        'stabilized',   // Level 6 – Ghi nhớ ổn định             → interval: 15
        'mastered',     // Level 7 – Thuộc vĩnh viễn             → interval: 30
      ],
      default: 'new',
      index: true,
    },

    // ── SRS Logic ──────────────────────────────────────────────────
    interval:       { type: Number, default: 0 },   // Khoảng cách ôn tập hiện tại (ngày)
    nextReviewDate: { type: Date, index: true },     // Ngày ôn tập tiếp theo (KEY FIELD cho SRS)
    reviewCount:    { type: Number, default: 0 },    // Tổng số lần đã ôn
    againCount:     { type: Number, default: 0 },    // Số lần nhấn "Again" – dùng cho WrongWord list

    // ── Timestamps học tập ─────────────────────────────────────────
    // Khớp với FE: LearnedWord.firstLearnedAt, LearnedWord.lastReviewedAt
    firstLearnedAt: { type: Date, default: Date.now },
    lastReviewedAt: { type: Date },

    // ── Đánh dấu thủ công ──────────────────────────────────────────
    isMarkedRemembered: { type: Boolean, default: false }, // Nút "Đã nhớ" trên SetDetailScreen
  },
  { timestamps: true }
);

// ── Indexes tối ưu cho các query quan trọng ──────────────────────────────────

// [1] Compound index cơ bản: Mỗi user chỉ có 1 record cho 1 từ
UserVocabularySchema.index({ userId: 1, vocabId: 1 }, { unique: true });

// [2] SRS core: "Tất cả từ đến hạn ôn hôm nay của user X"
//     → UserVocabulary.find({ userId, nextReviewDate: { $lte: today } })
UserVocabularySchema.index({ userId: 1, nextReviewDate: 1 });

// [3] SRS + Set: "Từ đến hạn ôn trong Set X của user Y hôm nay"
//     → Phục vụ ReviewSetSummary.dueWordsCount trên FE
UserVocabularySchema.index({ userId: 1, setId: 1, nextReviewDate: 1 });

// [4] SRS + Type: "Từ vocabulary đến hạn ôn hôm nay"
//     → Phục vụ VocabTypeStats.dueReviewCount trên FE
UserVocabularySchema.index({ userId: 1, vocabType: 1, nextReviewDate: 1 });

// [5] Stats: "Đếm từ theo status, group by type" cho Review screen
UserVocabularySchema.index({ userId: 1, status: 1, vocabType: 1 });

export default mongoose.model('UserVocabulary', UserVocabularySchema);
