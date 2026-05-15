import * as myWordsService from "../services/myWordsService.js";

/**
 * GET /api/my-words/topics
 * Lấy danh sách các chủ đề (Topic) do user tự tạo.
 */
export const getMyTopics = async (req, res) => {
  try {
    const topics = await myWordsService.getMyTopicsData(req.user.id);
    return res.status(200).json({ success: true, data: topics });
  } catch (err) {
    console.error("[getMyTopics]", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * POST /api/my-words/topics
 * User tự tạo chủ đề mới cho riêng mình.
 */
export const createMyTopic = async (req, res) => {
  try {
    const { name, description, typeId } = req.body;
    const topic = await myWordsService.createMyTopicData(req.user.id, req.body);
    return res.status(201).json({ success: true, data: topic });
  } catch (err) {
    console.error("[createMyTopic]", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * GET /api/my-words/topics/:id/sets
 * Lấy danh sách các bộ từ (VocabSet) thuộc về 1 chủ đề của user.
 */
export const getMySets = async (req, res) => {
  try {
    const { id: topicId } = req.params;
    const sets = await myWordsService.getMySetsData(topicId, req.user.id);
    return res.status(200).json({ success: true, data: sets });
  } catch (err) {
    console.error("[getMySets]", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * POST /api/my-words/sets
 * User tự tạo bộ từ mới nằm trong chủ đề của họ.
 */
export const createMySet = async (req, res) => {
  try {
    const newSet = await myWordsService.createMySetData(req.user.id, req.body);
    if (!newSet) {
      return res.status(404).json({ success: false, message: "Topic not found or unauthorized" });
    }

    return res.status(201).json({ success: true, data: newSet });
  } catch (err) {
    console.error("[createMySet]", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * GET /api/my-words/sets/:id/vocabularies
 * Lấy danh sách toàn bộ từ vựng thuộc về 1 bộ từ của user.
 */
export const getMyVocabs = async (req, res) => {
  try {
    const { id: setId } = req.params;
    const vocabs = await myWordsService.getMyVocabsData(setId, req.user.id);
    return res.status(200).json({ success: true, data: vocabs });
  } catch (err) {
    console.error("[getMyVocabs]", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * POST /api/my-words/vocabularies
 * User thêm một từ vựng mới vào bộ từ của họ.
 */
export const createMyVocab = async (req, res) => {
  try {
    const { setId, content, type, meaning, phonetic, partOfSpeech, examples, level, tags, imageUrl } = req.body;
    
    const newVocab = await myWordsService.createMyVocabData(req.user.id, req.body);
    if (!newVocab) {
      return res.status(404).json({ success: false, message: "Vocab set not found or unauthorized" });
    }

    return res.status(201).json({ success: true, data: newVocab });


  } catch (err) {
    console.error("[createMyVocab]", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ── UPDATE & DELETE ─────────────────────────────────────────────────────────

/**
 * PUT /api/my-words/topics/:id
 * Sửa thông tin Topic cá nhân
 */
export const updateMyTopic = async (req, res) => {
  try {
    const topic = await myWordsService.updateMyTopicData(req.params.id, req.user.id, req.body);
    if (!topic) return res.status(404).json({ success: false, message: "Topic not found or unauthorized" });
    return res.status(200).json({ success: true, data: topic });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * DELETE /api/my-words/topics/:id
 * Xóa Topic cá nhân -> Xóa luôn toàn bộ Set, Vocab, và tiến trình học liên quan
 */
export const deleteMyTopic = async (req, res) => {
  try {
    const topic = await myWordsService.deleteMyTopicData(req.params.id, req.user.id);

    return res.status(200).json({ success: true, message: "Topic deleted successfully" });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * PUT /api/my-words/sets/:id
 * Sửa thông tin VocabSet cá nhân
 */
export const updateMySet = async (req, res) => {
  try {
    const set = await myWordsService.updateMySetData(req.params.id, req.user.id, req.body);
    if (!set) return res.status(404).json({ success: false, message: "Set not found or unauthorized" });
    return res.status(200).json({ success: true, data: set });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * DELETE /api/my-words/sets/:id
 * Xóa VocabSet cá nhân -> Cập nhật thống kê Topic, xóa Vocab và tiến trình học
 */
export const deleteMySet = async (req, res) => {
  try {
    const set = await myWordsService.deleteMySetData(req.params.id, req.user.id);
    if (!set) return res.status(404).json({ success: false, message: "Set not found or unauthorized" });

    return res.status(200).json({ success: true, message: "Vocab set deleted successfully" });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * PUT /api/my-words/vocabularies/:id
 * Sửa thông tin từ vựng cá nhân
 */
export const updateMyVocab = async (req, res) => {
  try {
    const vocab = await myWordsService.updateMyVocabData(req.params.id, req.user.id, req.body);
    if (!vocab) return res.status(404).json({ success: false, message: "Vocab not found or unauthorized" });
    return res.status(200).json({ success: true, data: vocab });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * DELETE /api/my-words/vocabularies/:id
 * Xóa từ vựng cá nhân -> Cập nhật thống kê, xóa tiến trình học
 */
export const deleteMyVocab = async (req, res) => {
  try {
    const vocab = await myWordsService.deleteMyVocabData(req.params.id, req.user.id);
    if (!vocab) return res.status(404).json({ success: false, message: "Vocab not found or unauthorized" });

    return res.status(200).json({ success: true, message: "Vocabulary deleted successfully" });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
export const getAllMySets = async (req, res) => { 
  try {
    const sets = await myWordsService.getAllMySetsData(req.user.id);
    res.status(200).json({ success: true, data: sets }); 
  } catch (err) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
