import mongoose from 'mongoose';

/**
 * Topic (Chủ đề) – Cấp cao nhất trong cây phân cấp:
 *   Topic → VocabSet → Vocabulary
 *
 * Ví dụ: "Học thuật" (typeId: 'vocabulary'), "IELTS Grammar" (typeId: 'structure')
 * Khớp với interface Topic trong FE.
 */
const TopicSchema = new mongoose.Schema(
  {
    // ── Thông tin hiển thị ──────────────────────────────────────────
    name:        { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    color:       { type: String, default: '' },   // Màu accent hiển thị trên card (hex hoặc tên)
    imageUrl:    { type: String, default: '' },   // Ảnh bìa chủ đề (từ ImageKit)

    // ── Loại từ vựng trong topic này ───────────────────────────────
    typeId: {
      type: String,
      enum: ['vocabulary', 'collocation', 'structure', 'idiom', 'phrasal_verb'],
      required: true,
      index: true,
    },

    // ── Chủ sở hữu ──────────────────────────────────────────────────
    // null = topic hệ thống; ObjectId = topic do User tự tạo (My Words)
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    isSystemTopic: { type: Boolean, default: true },

    // ── Thống kê (computed và cache lại để tránh query nặng) ────────
    // FE dùng: topic.totalSets, topic.totalItems
    totalSets:  { type: Number, default: 0 },
    totalItems: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model('Topic', TopicSchema);
