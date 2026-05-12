import * as dictionaryService from "../services/dictionaryService.js";

/**
 * GET /api/topics
 * Lấy danh sách tất cả các Topic hệ thống.
 * Sử dụng .lean() để tăng tốc độ truy vấn vì chỉ cần đọc dữ liệu.
 */
export const getSystemTopics = async (req, res) => {
  try {
    const topics = await dictionaryService.getSystemTopicsData();

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
    
    const sets = await dictionaryService.getSystemSetsByTopicData(id);
    if (!sets) {
      return res.status(404).json({ success: false, message: "Topic not found" });
    }

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
    
    const vocabularies = await dictionaryService.getSystemVocabsBySetData(id);
    if (!vocabularies) {
      return res.status(404).json({ success: false, message: "Vocab set not found" });
    }

    return res.status(200).json({ success: true, data: vocabularies });
  } catch (err) {
    console.error("[getSystemVocabsBySet]", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
