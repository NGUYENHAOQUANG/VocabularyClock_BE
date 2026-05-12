import mongoose from 'mongoose';

/**
 * ReviewLog – Lịch sử mỗi lần ôn tập.
 * Mỗi document = 1 lần User tương tác với 1 từ trong 1 session.
 *
 * Dùng để:
 * - Tính WrongWord list (aggregate: result="again", group by vocabId)
 * - Tính ReviewHistory (group by sessionId / date)
 * - Tính thống kê accuracy (correct / total)
 * Khớp với FE: ReviewHistorySession, MOCK_REVIEW_HISTORY, MOCK_STATS.againCount
 */
const ReviewLogSchema = new mongoose.Schema(
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
    setId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VocabSet',
      required: true,
      index: true,
    },

    // ── Gộp các lần ôn trong cùng 1 phiên ─────────────────────────
    // Dùng để group thành ReviewHistorySession trên FE
    sessionId: { type: String, required: true },
    sessionType: { 
      type: String, 
      enum: ['learning', 'review'], 
      required: true 
    },

    // ── Kết quả đánh giá của người dùng ────────────────────────────
    result: {
      type: String,
      enum: [
        'again',   // Chưa nhớ – học lại ngay
        'hard',    // Nhớ khó – ôn sớm hơn
        'good',    // Nhớ được – ôn đúng lịch
        'easy',    // Nhớ rất tốt – ôn muộn hơn
      ],
      required: true,
    },

    // ── Hình thức ôn tập ────────────────────────────────────────────
    // Khớp với FE: ReviewHistorySession.methods[].methodId
    actionType: {
      type: String,
      enum: [
        'flashcard',  // Lật thẻ
        'quiz',       // Trắc nghiệm (chọn đáp án)
        'writing',    // Viết lại câu (tính năng mới)
        'typing',     // Gõ lại từ
      ],
      required: true,
    },

    // ── Thống kê hiệu suất ──────────────────────────────────────────
    responseTime: { type: Number },  // Thời gian phản hồi (ms) – dùng cho analytics

    // ── Timestamp ───────────────────────────────────────────────────
    reviewedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }  // reviewedAt tự quản lý
);

// Index tổng hợp để aggregate thống kê nhanh
ReviewLogSchema.index({ userId: 1, reviewedAt: -1 });
ReviewLogSchema.index({ userId: 1, vocabId: 1, result: 1 });
ReviewLogSchema.index({ sessionId: 1 });

export default mongoose.model('ReviewLog', ReviewLogSchema);
