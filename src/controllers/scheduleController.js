import * as scheduleService from "../services/scheduleService.js";

const userObjectId = (id) => new mongoose.Types.ObjectId(id);

/**
 * Lấy danh sách các Bộ từ chưa thuộc Lịch trình nào
 * Dùng cho Modal "Thêm bộ từ" (Hình 3)
 */
export const getAvailableSets = async (req, res) => {
  try {
    const userId = req.user.id;

    const availableSets = await scheduleService.getAvailableSetsData(userId);
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
    const data = await scheduleService.getTasksData(userId);
    return res.status(200).json({ success: true, data });
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

    const task = await scheduleService.createTaskData(userId, req.body);
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

    const responseData = await scheduleService.getTaskDetailsData(id, userId);
    if (!responseData) return res.status(404).json({ success: false, message: "Task not found" });

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

    const task = await scheduleService.updateTaskData(id, userId, req.body);
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

    const task = await scheduleService.deleteTaskData(id, userId);
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

    const task = await scheduleService.assignSetsToTaskData(id, setIds, userId);
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

    const task = await scheduleService.removeSetFromTaskData(id, setId, userId);
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });

    return res.status(200).json({ success: true, message: "Set removed successfully", data: task });
  } catch (err) {
    console.error("[removeSetFromTask]", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
