import mongoose from 'mongoose';

/**
 * VocabSet (Bộ từ vựng) – Cấp giữa trong cây phân cấp:
 *   Topic → VocabSet → Vocabulary
 *
 * Ví dụ: "Set 1: Từ vựng về Trường học"
 * Khớp với interface VocabSet & MyVocabSet trong FE.
 */
const VocabSetSchema = new mongoose.Schema(
  {
    // ── Thông tin hiển thị ──────────────────────────────────────────
    name:        { type: String, required: true, trim: true },
    description: { type: String, default: '' },

    // ── Quan hệ ─────────────────────────────────────────────────────
    topicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Topic',
      required: true,
      index: true,
    },

    // ── Chủ sở hữu ──────────────────────────────────────────────────
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    isSystemSet: { type: Boolean, default: true },

    // ── Thống kê ────────────────────────────────────────────────────
    // FE dùng: set.itemCount
    itemCount: { type: Number, default: 0 },

    // ── Sắp xếp trong Topic ─────────────────────────────────────────
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

VocabSetSchema.index({ topicId: 1, order: 1 });
VocabSetSchema.index({ ownerId: 1 });

export default mongoose.model('VocabSet', VocabSetSchema);
