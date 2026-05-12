import { Topic, VocabSet, Vocabulary, UserVocabulary } from "../models/index.js";

/**
 * GET /api/my-words/topics
 * Lấy danh sách các chủ đề (Topic) do user tự tạo.
 */
export const getMyTopics = async (req, res) => {
  try {
    const topics = await Topic.find({ ownerId: req.user.id, isSystemTopic: false })
      .select("-__v -createdAt -updatedAt")
      .lean();
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
    const topic = await Topic.create({
      name,
      description,
      typeId,
      ownerId: req.user.id,
      isSystemTopic: false, // Đây là từ vựng cá nhân
    });
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
    const sets = await VocabSet.find({ topicId, ownerId: req.user.id, isSystemSet: false })
      .select("-__v -createdAt -updatedAt")
      .sort({ order: 1 })
      .lean();
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
    const { name, description, topicId } = req.body;
    
    // Kiểm tra bảo mật: đảm bảo user đang thêm Set vào đúng Topic của họ
    const topicExists = await Topic.exists({ _id: topicId, ownerId: req.user.id });
    if (!topicExists) {
      return res.status(404).json({ success: false, message: "Topic not found or unauthorized" });
    }

    const newSet = await VocabSet.create({
      name,
      description,
      topicId,
      ownerId: req.user.id,
      isSystemSet: false,
    });
    
    // Cập nhật thống kê totalSets cho Topic
    await Topic.findByIdAndUpdate(topicId, { $inc: { totalSets: 1 } });

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
    const vocabs = await Vocabulary.find({ setId, ownerId: req.user.id, isSystemVocab: false })
      .select("-__v -createdAt -updatedAt")
      .lean();
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
    
    // Kiểm tra bảo mật: đảm bảo user đang thêm từ vào đúng Set của họ
    const vocabSet = await VocabSet.findOne({ _id: setId, ownerId: req.user.id });
    if (!vocabSet) {
      return res.status(404).json({ success: false, message: "Vocab set not found or unauthorized" });
    }

    // 1. Tạo từ vựng
    const vocab = await Vocabulary.create({
      setId,
      content,
      type,
      meaning,
      phonetic,
      partOfSpeech,
      examples,
      level,
      tags,
      imageUrl,
      ownerId: req.user.id,
      isSystemVocab: false,
    });

    // 2. Cập nhật thống kê số lượng từ cho VocabSet và Topic
    vocabSet.itemCount += 1;
    await vocabSet.save();
    await Topic.findByIdAndUpdate(vocabSet.topicId, { $inc: { totalItems: 1 } });

    // 3. RẤT QUAN TRỌNG: Khi user tạo từ, chúng ta phải khởi tạo tiến trình học cho từ này
    // (Lưu vào bảng UserVocabulary với status = 'new') để module SRS có thể pick lên và nhắc nhở
    await UserVocabulary.create({
      userId: req.user.id,
      vocabId: vocab._id,
      setId: setId,
      vocabType: type,
      status: "new"
    });

    return res.status(201).json({ success: true, data: vocab });
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
    const topic = await Topic.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user.id },
      req.body,
      { new: true, runValidators: true }
    );
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
    const topic = await Topic.findOneAndDelete({ _id: req.params.id, ownerId: req.user.id });
    if (!topic) return res.status(404).json({ success: false, message: "Topic not found or unauthorized" });

    // Lấy ID tất cả các Set thuộc Topic này
    const sets = await VocabSet.find({ topicId: topic._id }).select('_id');
    const setIds = sets.map(s => s._id);

    // Xóa liên đới
    await VocabSet.deleteMany({ topicId: topic._id });
    await Vocabulary.deleteMany({ setId: { $in: setIds } });
    await UserVocabulary.deleteMany({ setId: { $in: setIds }, userId: req.user.id });

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
    const set = await VocabSet.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user.id },
      req.body,
      { new: true, runValidators: true }
    );
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
    const set = await VocabSet.findOneAndDelete({ _id: req.params.id, ownerId: req.user.id });
    if (!set) return res.status(404).json({ success: false, message: "Set not found or unauthorized" });

    // Cập nhật lại số lượng cho Topic
    await Topic.findByIdAndUpdate(set.topicId, { 
      $inc: { totalSets: -1, totalItems: -set.itemCount } 
    });

    // Xóa liên đới
    await Vocabulary.deleteMany({ setId: set._id });
    await UserVocabulary.deleteMany({ setId: set._id, userId: req.user.id });

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
    const vocab = await Vocabulary.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user.id },
      req.body,
      { new: true, runValidators: true }
    );
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
    const vocab = await Vocabulary.findOneAndDelete({ _id: req.params.id, ownerId: req.user.id });
    if (!vocab) return res.status(404).json({ success: false, message: "Vocab not found or unauthorized" });

    // Xóa tiến trình học (bảng UserVocabulary)
    await UserVocabulary.deleteMany({ vocabId: vocab._id, userId: req.user.id });

    // Giảm số lượng từ vựng ở VocabSet
    const vocabSet = await VocabSet.findByIdAndUpdate(vocab.setId, { $inc: { itemCount: -1 } });
    
    // Giảm số lượng từ vựng ở Topic
    if (vocabSet) {
      await Topic.findByIdAndUpdate(vocabSet.topicId, { $inc: { totalItems: -1 } });
    }

    return res.status(200).json({ success: true, message: "Vocabulary deleted successfully" });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
