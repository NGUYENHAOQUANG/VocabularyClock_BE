import mongoose from "mongoose";

/**
 * DailyPlan – Kế hoạch học tập theo ngày của từng User.
 * Mỗi document = 1 ngày học của 1 User.
 *
 * Chứa các session theo giờ (reminderTimes), mỗi session là một danh sách
 * từ vựng cần học/ôn trong khung giờ đó.
 * Khớp với FE: DailyPlan screen, DAY_TABS filter theo ngày trong tuần.
 */

const SessionSchema = new mongoose.Schema(
  {
    // Liên kết tới ScheduledTask để group history
    // Khớp FE: ReviewHistorySession.taskName (populate từ scheduledTaskId)
    scheduledTaskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ScheduledTask",
    },
    taskName: { type: String }, // Cache tên task để query nhanh

    time: { type: String, required: true }, // "08:00", "20:00"
    vocabIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Vocabulary" }],
    actionType: {
      type: String,
      enum: ["learn", "review"], // Học mới hay ôn tập
      default: "review",
    },
    // Phương thức ôn tập của session này
    methods: {
      type: [String],
      enum: ["flashcard", "meaning", "write_full_word", "rewrite", "picture"],
      default: ["flashcard"],
    },
    isCompleted: { type: Boolean, default: false }, // Đã hoàn thành session này chưa
    completedAt: { type: Date },
  },
  { _id: true }, // Cần _id để dùng làm sessionId trong ReviewLog
);

const DailyPlanSchema = new mongoose.Schema(
  {
    // ── Quan hệ ─────────────────────────────────────────────────────
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // ── Ngày học ────────────────────────────────────────────────────
    date: { type: Date, required: true }, // Lưu dưới dạng YYYY-MM-DD 00:00:00 UTC
    dayOfWeek: {
      type: String,
      enum: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
    },

    // ── Các session trong ngày ──────────────────────────────────────
    sessions: { type: [SessionSchema], default: [] },

    // ── Tổng kết ngày ───────────────────────────────────────────────
    isOverallCompleted: { type: Boolean, default: false },
    totalWords: { type: Number, default: 0 }, // Tổng số từ trong ngày
    completedWords: { type: Number, default: 0 }, // Số từ đã hoàn thành
  },
  { timestamps: true },
);

// Mỗi User chỉ có 1 plan cho 1 ngày
DailyPlanSchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.model("DailyPlan", DailyPlanSchema);
