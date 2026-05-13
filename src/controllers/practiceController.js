import * as practiceService from "../services/practiceService.js";

/**
 * GET /api/practice/sets
 * Lấy danh sách tất cả bộ từ có thể dùng để luyện tập
 * (gồm bộ từ hệ thống và bộ từ cá nhân của user)
 */
export const getPracticeSets = async (req, res) => {
  try {
    const userId = req.user.id;
    const data = await practiceService.getPracticeSetsData(userId);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("[getPracticeSets]", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

/**
 * GET /api/practice/sets/:setId/words?isMyWord=true|false
 * Lấy danh sách từ vựng trong 1 bộ từ để dùng cho game
 * Query param: isMyWord=true nếu là bộ từ cá nhân
 */
export const getPracticeWords = async (req, res) => {
  try {
    const { setId } = req.params;
    const isMyWord = req.query.isMyWord === "true";
    const userId = req.user?.id || null;

    const words = await practiceService.getPracticeWordsData(userId, setId, isMyWord);

    if (!words || words.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy từ vựng trong bộ từ này.",
      });
    }

    return res.status(200).json({ success: true, data: words });
  } catch (err) {
    console.error("[getPracticeWords]", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
