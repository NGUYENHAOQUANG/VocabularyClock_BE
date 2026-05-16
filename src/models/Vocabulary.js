import mongoose from "mongoose";

// ── Sub-schema: Một câu ví dụ đa ngôn ngữ ────────────────────────────────────
// Khớp với interface ExampleSentence trong FE
const ExampleSentenceSchema = new mongoose.Schema(
  {
    en: { type: String, required: true }, // Câu tiếng Anh (đáp án đúng)
    translations: {
      type: Map,
      of: String,
      default: {}, // { vi: '...', es: '...', ja: '...' }
    },
  },
  { _id: false }, // Không cần _id cho sub-doc
);

// ── Schema chính ──────────────────────────────────────────────────────────────
const VocabularySchema = new mongoose.Schema(
  {
    // ── Nội dung ───────────────────────────────────────────────────
    content: { type: String, required: true, trim: true }, // "Apple", "Take a look", "S + V"
    type: {
      type: String,
      enum: ["vocabulary", "collocation", "structure", "idiom", "phrasal_verb"],
      default: "vocabulary",
      index: true,
    },

    // ── Nghĩa & phiên âm ────────────────────────────────────────────
    meaning: { type: String, required: true }, // Nghĩa tiếng Việt (hoặc ngôn ngữ mẹ đẻ)
    phonetic: { type: String }, // /ˈæpl/
    partOfSpeech: { type: String }, // noun, verb, adjective, phrase…

    // ── Ví dụ đa ngôn ngữ ───────────────────────────────────────────
    // Khớp với ExampleSentence[] trên FE – câu [0] là câu hiển thị mặc định
    examples: { type: [ExampleSentenceSchema], default: [] },

    // ── Ghi chú & bổ sung ────────────────────────────────────────────
    grammarNote: { type: String }, // Ghi chú ngữ pháp (dành cho 'structure')

    // ── Media ────────────────────────────────────────────────────────
    imageUrl: { type: String, default: "" }, // URL ảnh minh họa (ImageKit CDN)
    audioUrl: { type: String }, // URL file âm thanh phát âm

    // ── Phân loại cấp độ & tags ─────────────────────────────────────
    level: {
      type: String,
      enum: ["A1", "A2", "B1", "B2", "C1", "C2", "None"],
      default: "None",
    },
    tags: { type: [String], default: [] }, // ['IELTS', 'Business', 'Travel']

    // ── Chủ sở hữu ──────────────────────────────────────────────────
    // null = từ vựng hệ thống (Dictionary); ObjectId = từ do User tự tạo (My Words)
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    isSystemVocab: { type: Boolean, default: true }, // true = từ hệ thống

    // ── Thuộc Set nào ────────────────────────────────────────────────
    setId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VocabSet",
      index: true,
    },
  },
  { timestamps: true },
);

// Index để tìm kiếm nhanh
VocabularySchema.index({ content: "text", meaning: "text" });
VocabularySchema.index({ ownerId: 1, type: 1 });

export default mongoose.model("Vocabulary", VocabularySchema);
