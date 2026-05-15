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
    // ── Session (Mã Nhóm) ─────────────────────────────────────────
    sessionId: { type: String, required: true },
    sessionType: { 
      type: String, 
      enum: ['learning', 'review', 'practice'], 
      required: true 
    },

    // ── Mảng chứa tất cả các câu trả lời (Gộp Mảng - Tối ưu 50x) ──
    logs: [
      {
        vocabId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Vocabulary',
          required: true,
        },
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
        actionType: {
          type: String,
          enum: [
            'flashcard',  // Lật thẻ
            'quiz',       // Trắc nghiệm (chọn đáp án)
            'writing',    // Viết lại câu (tính năng mới)
            'typing',     // Gõ lại từ
            'picture',    // Nối hình
          ],
          required: true,
        },
        responseTime: { type: Number },
      }
    ],

    // ── Timestamp ───────────────────────────────────────────────────
    reviewedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

// Index tối ưu: Query theo User, theo SessionId
ReviewLogSchema.index({ userId: 1, reviewedAt: -1 });
// unique: mỗi session chỉ có đúng 1 document (logic gộp mảng bằng upsert)
ReviewLogSchema.index({ sessionId: 1 }, { unique: true });

export default mongoose.model('ReviewLog', ReviewLogSchema);
