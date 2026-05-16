import * as reviewService from "../services/reviewService.js";

/**
 * GET /api/review/dashboard
 * Lấy data cho biểu đồ Donut và thống kê
 */
export const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const data = await reviewService.getDashboardStatsData(userId);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("[getDashboardStats]", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

/**
 * GET /api/review/learned-words
 * Lấy danh sách từ vựng đã học theo bộ lọc
 */
export const getLearnedWords = async (req, res) => {
  try {
    const { day, status } = req.query;
    const userId = req.user.id;

    const words = await reviewService.getLearnedWordsData(userId, day, status);

    return res.status(200).json({ success: true, data: words });
  } catch (err) {
    console.error("[getLearnedWords]", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

/**
 * GET /api/review/due-tasks
 * Bộ từ cần ôn nhóm theo Lịch trình (Hình 4)
 */
export const getDueTasks = async (req, res) => {
  try {
    const userId = req.user.id;
    const formattedData = await reviewService.getDueTasksData(userId);
    return res.status(200).json({ success: true, data: formattedData });
  } catch (err) {
    console.error("[getDueTasks]", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

/**
 * GET /api/review/sets/:setId/words
 * Lấy danh sách từ vựng trong 1 Bộ từ để ôn tập (kèm cờ isMarkedRemembered)
 */
export const getReviewSetWords = async (req, res) => {
  try {
    const { setId } = req.params;
    const userId = req.user.id;

    const formattedWords = await reviewService.getReviewSetWordsData(setId, userId);
    return res.status(200).json({ success: true, data: formattedWords });
  } catch (err) {
    console.error("[getReviewSetWords]", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

/**
 * POST /api/review/words/:id/mark-remembered
 * Đánh dấu đã nhớ 1 từ vựng (bỏ qua trong ngày hôm nay)
 */
export const markWordRemembered = async (req, res) => {
  try {
    const { id: vocabId } = req.params;
    const { isRemembered } = req.body;
    const userId = req.user.id;

    const userVocab = await reviewService.markWordRememberedData(userId, vocabId, isRemembered);

    if (!userVocab) {
      return res.status(404).json({ success: false, message: "Vocabulary not found in user's list" });
    }

    return res.status(200).json({
      success: true,
      message: "Marked successfully",
      isMarkedRemembered: userVocab.isMarkedRemembered,
    });
  } catch (err) {
    console.error("[markWordRemembered]", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

/**
 * POST /api/review/sets/:setId/complete
 * Hoàn tất ôn tập 1 bộ từ -> Nâng cấp SRS
 */
export const completeSetReview = async (req, res) => {
  try {
    const { setId } = req.params;
    const { sessionType, sessionId, logs, setName, originalSessionId } = req.body;
    const userId = req.user.id;

    const progress = await reviewService.completeSetReviewData(userId, setId, sessionType, sessionId, logs, setName, originalSessionId);

    return res.status(200).json({
      success: true,
      message: "Set review completed",
      data: {
        newStatus: progress.status,
        nextReviewDate: progress.nextReviewDate,
      },
    });
  } catch (err) {
    console.error("[completeSetReview]", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

/**
 * GET /api/review/history
 * Lấy lịch sử học & ôn tập (nhóm theo phiên học)
 */
export const getReviewHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const formattedHistory = await reviewService.getReviewHistoryData(userId);
    return res.status(200).json({ success: true, data: formattedHistory });
  } catch (err) {
    console.error("[getReviewHistory]", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

/**
 * GET /api/review/sets
 * Lấy danh sách các bộ từ user đang học (phục vụ LearnedWordsListScreen - Theo bộ từ)
 */
export const getUserSets = async (req, res) => {
  try {
    const userId = req.user.id;
    const sets = await reviewService.getUserSetsData(userId);
    return res.status(200).json({ success: true, data: sets });
  } catch (err) {
    console.error("[getUserSets]", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

/**
 * GET /api/review/session/:sessionId/words
 * Lấy danh sách từ vựng thực tế trong 1 phiên học kèm trạng thái đúng/sai
 */
export const getSessionWords = async (req, res) => {
  try {
    const userId = req.user.id;
    const { sessionId } = req.params;
    const words = await reviewService.getSessionWordsData(sessionId, userId);
    return res.status(200).json({ success: true, data: words });
  } catch (err) {
    console.error("[getSessionWords]", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

/**
 * GET /api/review/session/:sessionId/wrong-words
 * Lấy các từ sai chưa được fix của một session, group theo trò chơi
 */
export const getSessionWrongWords = async (req, res) => {
  try {
    const userId = req.user.id;
    const { sessionId } = req.params;
    const data = await reviewService.getSessionWrongWordsData(sessionId, userId);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("[getSessionWrongWords]", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

/**
 * POST /api/review/session/:sessionId/fix-words
 * Đánh dấu isFixed=true cho các từ được trả lời đúng trong lượt ôn lại
 * Body: { fixedByType: { [actionType]: vocabId[] } }
 */
export const fixWrongWords = async (req, res) => {
  try {
    const userId = req.user.id;
    const { sessionId: originalSessionId } = req.params;
    const { fixedByType, logs } = req.body;

    if (!fixedByType && !logs) {
      return res.status(200).json({ success: true, message: 'No words to fix or logs to update' });
    }

    await reviewService.fixWrongWordsData(userId, originalSessionId, fixedByType, logs);
    return res.status(200).json({ success: true, message: 'Words marked as fixed' });
  } catch (err) {
    console.error("[fixWrongWords]", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
