import { ScheduledTask, VocabSet, UserSetProgress } from "../models/index.js";
import mongoose from "mongoose";

const userObjectId = (id) => new mongoose.Types.ObjectId(id);

/**
 * Lấy danh sách các Bộ từ chưa thuộc Lịch trình nào
 * Dùng cho Modal "Thêm bộ từ" (Hình 3)
 */
export const getAvailableSets = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Tìm tất cả các Lịch trình của user
    const tasks = await ScheduledTask.find({ userId }).select('setIds');
    const scheduledSetIds = tasks.flatMap(task => task.setIds);

    // 2. Tìm các Bộ từ do user tạo (hoặc user đã lưu) MÀ KHÔNG nằm trong mảng trên
    const availableSets = await VocabSet.find({
      ownerId: userId,
      _id: { $nin: scheduledSetIds }
    }).select('name itemCount image coverImage').lean();

    return res.status(200).json({ success: true, data: availableSets });
  } catch (err) {
    console.error("[getAvailableSets]", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * GET /api/schedule/tasks
 * Lịch trình hôm nay (Hình 1 - Màn hình chính của lịch trình)
 */
export const getTasks = async (req, res) => {
  try {
    const userId = req.user.id;
    // Lấy tất cả task trong bảng ScheduledTask
    const tasks = await ScheduledTask.find({ userId }).populate('setIds', 'itemCount').lean();

    const formattedTasks = tasks.map(task => {
      const setsCount = task.setIds.length;
      const totalWords = task.setIds.reduce((sum, set) => sum + (set.itemCount || 0), 0);
      return {
        _id: task._id,
        name: task.name,
        time: task.time,
        status: task.status, // todo, done
        setsCount,
        totalWords
      };
    });

    const completedTasks = formattedTasks.filter(t => t.status === 'done').length;

    return res.status(200).json({
      success: true,
      data: {
        progress: `${completedTasks}/${formattedTasks.length} Task`,
        tasks: formattedTasks
      }
    });
  } catch (err) {
    console.error("[getTasks]", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * POST /api/schedule/tasks
 * Tạo Lịch trình mới
 */
export const createTask = async (req, res) => {
  try {
    const { name, time, methods, reminderEnabled } = req.body;
    const userId = req.user.id;

    const task = new ScheduledTask({
      userId,
      name,
      time,
      methods: methods || ['flashcard'],
      reminderEnabled: reminderEnabled !== undefined ? reminderEnabled : true,
      source: 'user',
      setIds: []
    });

    await task.save();

    return res.status(201).json({ success: true, data: task });
  } catch (err) {
    console.error("[createTask]", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * GET /api/schedule/tasks/:id
 * Xem chi tiết Lịch trình (Hình 2)
 */
export const getTaskDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const task = await ScheduledTask.findOne({ _id: id, userId }).populate('setIds', 'name itemCount image coverImage').lean();
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });

    // Tính tổng số từ cần ôn (Due words) cho các bộ từ trong task này
    const setIds = task.setIds.map(s => s._id);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const dueProgresses = await UserSetProgress.find({
      userId,
      setId: { $in: setIds },
      nextReviewDate: { $lte: endOfToday }
    }).lean();

    const dueSetIds = dueProgresses.map(p => p.setId.toString());

    // Map lại danh sách sets để thêm cờ due
    let dueWordsTotal = 0;
    const mappedSets = task.setIds.map(set => {
      const isDue = dueSetIds.includes(set._id.toString());
      if (isDue) {
        dueWordsTotal += (set.itemCount || 0);
      }
      
      const progress = dueProgresses.find(p => p.setId.toString() === set._id.toString());

      return {
        _id: set._id,
        name: set.name,
        itemCount: set.itemCount,
        image: set.image,
        coverImage: set.coverImage,
        isDue,
        status: progress ? progress.status : 'new'
      };
    });

    const responseData = {
      _id: task._id,
      name: task.name,
      time: task.time,
      methods: task.methods,
      reminderEnabled: task.reminderEnabled,
      setsCount: task.setIds.length,
      dueWordsTotal,
      sets: mappedSets
    };

    return res.status(200).json({ success: true, data: responseData });
  } catch (err) {
    console.error("[getTaskDetails]", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * PUT /api/schedule/tasks/:id
 * Cập nhật Lịch trình
 */
export const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const task = await ScheduledTask.findOneAndUpdate(
      { _id: id, userId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!task) return res.status(404).json({ success: false, message: "Task not found" });

    return res.status(200).json({ success: true, data: task });
  } catch (err) {
    console.error("[updateTask]", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * DELETE /api/schedule/tasks/:id
 * Xóa lịch trình (Các bộ từ bên trong sẽ về trạng thái tự do)
 */
export const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const task = await ScheduledTask.findOneAndDelete({ _id: id, userId });
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });

    // Không xóa bộ từ, vì vậy chỉ cần xóa cái vỏ ScheduledTask là xong. 
    // Các VocabSet vẫn tồn tại trong DB, khi getAvailableSets sẽ tự động query ra lại.

    return res.status(200).json({ success: true, message: "Task deleted successfully" });
  } catch (err) {
    console.error("[deleteTask]", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * POST /api/schedule/tasks/:id/add-sets
 * Gắn các Bộ từ vào Lịch trình
 */
export const addSetsToTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { setIds } = req.body; // array of set Ids
    const userId = req.user.id;

    // 1. Đảm bảo các bộ từ này bị gỡ khỏi tất cả các Lịch trình khác (nếu có)
    await ScheduledTask.updateMany(
      { userId, setIds: { $in: setIds } },
      { $pull: { setIds: { $in: setIds } } }
    );

    // 2. Gắn vào lịch trình hiện tại
    const task = await ScheduledTask.findOneAndUpdate(
      { _id: id, userId },
      { $addToSet: { setIds: { $each: setIds } } },
      { new: true }
    ).populate('setIds', 'name itemCount');

    if (!task) return res.status(404).json({ success: false, message: "Task not found" });

    return res.status(200).json({ success: true, message: "Sets added successfully", data: task });
  } catch (err) {
    console.error("[addSetsToTask]", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * POST /api/schedule/tasks/:id/remove-set
 * Gỡ 1 Bộ từ ra khỏi Lịch trình (Nút "Chuyển")
 */
export const removeSetFromTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { setId } = req.body;
    const userId = req.user.id;

    const task = await ScheduledTask.findOneAndUpdate(
      { _id: id, userId },
      { $pull: { setIds: setId } },
      { new: true }
    );

    if (!task) return res.status(404).json({ success: false, message: "Task not found" });

    return res.status(200).json({ success: true, message: "Set removed successfully", data: task });
  } catch (err) {
    console.error("[removeSetFromTask]", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
