import { Topic, VocabSet, Vocabulary } from "../models/index.js";

/**
 * GET /api/topics
 * Lấy danh sách tất cả các Topic hệ thống.
 * Sử dụng .lean() để tăng tốc độ truy vấn vì chỉ cần đọc dữ liệu.
 */
export const getSystemTopics = async (req, res) => {
  try {
    const topics = await Topic.find({ isSystemTopic: true })
      .select("name description color imageUrl typeId totalSets totalItems")
      .lean();

    return res.status(200).json({ success: true, data: topics });
  } catch (err) {
    console.error("[getSystemTopics]", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * GET /api/topics/:id/sets
 * Lấy danh sách các VocabSet thuộc 1 Topic hệ thống cụ thể.
 * Sắp xếp theo thứ tự (order).
 */
export const getSystemSetsByTopic = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Kiểm tra Topic có tồn tại và có phải là hệ thống không
    const topicExists = await Topic.exists({ _id: id, isSystemTopic: true });
    if (!topicExists) {
      return res.status(404).json({ success: false, message: "Topic not found" });
    }

    const sets = await VocabSet.find({ topicId: id, isSystemSet: true })
      .select("name description itemCount order")
      .sort({ order: 1 })
      .lean();

    return res.status(200).json({ success: true, data: sets });
  } catch (err) {
    console.error("[getSystemSetsByTopic]", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * GET /api/sets/:id/vocabularies
 * Lấy danh sách toàn bộ từ vựng (Vocabulary) thuộc 1 VocabSet cụ thể.
 */
export const getSystemVocabsBySet = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Kiểm tra Set có tồn tại và có phải là hệ thống không
    const setExists = await VocabSet.exists({ _id: id, isSystemSet: true });
    if (!setExists) {
      return res.status(404).json({ success: false, message: "Vocab set not found" });
    }

    const vocabularies = await Vocabulary.find({ setId: id, isSystemVocab: true })
      // Bỏ đi các trường không cần thiết để tối ưu dung lượng response
      .select("-ownerId -isSystemVocab -createdAt -updatedAt -__v")
      .lean();

    return res.status(200).json({ success: true, data: vocabularies });
  } catch (err) {
    console.error("[getSystemVocabsBySet]", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
