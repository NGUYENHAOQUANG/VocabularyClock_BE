import mongoose from 'mongoose';

/**
 * ScheduledTask – Lịch trình ôn tập do người dùng hoặc hệ thống tạo.
 *
 * Mỗi document = 1 "slot" học tập (1 giờ cụ thể trong ngày) gắn với
 * nhiều bộ từ vựng và nhiều phương thức ôn tập.
 *
 * Khớp với FE: ScheduledTask, DailyTaskData, DailyTasksScreen, ScheduleDetailScreen, AlarmScreen
 */
const ScheduledTaskSchema = new mongoose.Schema(
  {
    // ── Quan hệ ─────────────────────────────────────────────────────
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // ── Thông tin hiển thị ──────────────────────────────────────────
    // Khớp FE: ScheduledTask.name, DailyTaskData.title
    name: { type: String, required: true, trim: true }, // "Ôn buổi tối", "Học từ mới buổi sáng"

    // ── Thời gian nhắc nhở ──────────────────────────────────────────
    // Khớp FE: ScheduledTask.time, DailyTaskData.time
    time: { type: String, required: true }, // "08:00", "20:00"

    // ── Các bộ từ trong lịch ────────────────────────────────────────
    // Khớp FE: ScheduledTask.setIds → dùng để query ReviewSetSummary
    setIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'VocabSet' }],

    // ── Phương thức ôn tập ───────────────────────────────────────────
    // Khớp FE: ScheduledTask.methods → ReviewMethod[]
    methods: {
      type: [String],
      enum: ['flashcard', 'meaning', 'write_full_word', 'rewrite', 'picture'],
      default: ['flashcard'],
    },

    // ── Nguồn gốc ────────────────────────────────────────────────────
    // Khớp FE: ScheduledTask.source
    source: {
      type: String,
      enum: ['system', 'user'], // system = hệ thống tự tạo, user = tự lên lịch
      default: 'user',
    },

    // ── Trạng thái hoàn thành trong ngày ────────────────────────────
    // Khớp FE: ScheduledTask.status, TaskStatus = 'todo' | 'done' | 'overdue'
    status: {
      type: String,
      enum: ['todo', 'done', 'overdue'],
      default: 'todo',
    },

    // ── Lặp lại theo ngày trong tuần ────────────────────────────────
    // Hỗ trợ lịch cố định: học mỗi thứ 2, 4, 6
    repeatDays: {
      type: [String],
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    },

    // ── Báo thức ─────────────────────────────────────────────────────
    // Khớp FE: ScheduledTask.reminderEnabled → AlarmScreen trigger
    reminderEnabled: { type: Boolean, default: true },

    // ── Ngày hoàn thành gần nhất ────────────────────────────────────
    lastCompletedAt: { type: Date },

    // ── Tóm tắt hiển thị (cache) ────────────────────────────────────
    // Khớp FE: DailyTaskData.summary, DailyTaskData.vocabSetsCount
    // Cache để tránh count query mỗi lần render
    cachedSetsCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

ScheduledTaskSchema.index({ userId: 1, time: 1 });
ScheduledTaskSchema.index({ userId: 1, status: 1 });

export default mongoose.model('ScheduledTask', ScheduledTaskSchema);
