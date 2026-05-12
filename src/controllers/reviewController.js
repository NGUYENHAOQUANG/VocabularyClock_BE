import mongoose from "mongoose";
import {
  UserSetProgress,
  UserVocabulary,
  ScheduledTask,
  VocabSet,
  ReviewLog,
  Vocabulary,
} from "../models/index.js";

const STATUS_LEVELS = [
  "new",
  "vague",
  "recognized",
  "applicable",
  "fluent",
  "stabilized",
  "mastered",
];
const LEVEL_INTERVALS = [0, 1, 2, 4, 7, 15, 30];

const userObjectId = (id) => new mongoose.Types.ObjectId(id);

/**
 * GET /api/review/dashboard
 * Lấy data cho biểu đồ Donut và thống kê
 */
export const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Tính tổng từ vựng theo từng cấp độ (Dựa vào UserSetProgress)
    // - Tìm tất cả UserSetProgress của user
    // - Join với VocabSet để lấy tổng số từ trong bộ (itemCount)
    // - Nhóm theo status
    const statusAggregation = await UserSetProgress.aggregate([
      { $match: { userId: userObjectId(userId) } },
      {
        $lookup: {
          from: "vocabsets",
          localField: "setId",
          foreignField: "_id",
          as: "setDetails",
        },
      },
      { $unwind: "$setDetails" },
      {
        $group: {
          _id: "$status",
          totalWords: { $sum: "$setDetails.itemCount" },
        },
      },
    ]);

    const statusCounts = STATUS_LEVELS.reduce((acc, status) => {
      const found = statusAggregation.find((s) => s._id === status);
      acc[status] = found ? found.totalWords : 0;
      return acc;
    }, {});

    const totalVocab = Object.values(statusCounts).reduce((a, b) => a + b, 0);

    // 2. Lấy thống kê đúng/sai từ ReviewLog
    const correctAnswers = await ReviewLog.countDocuments({
      userId,
      result: { $in: ["good", "easy"] },
    });
    const incorrectAnswers = await ReviewLog.countDocuments({
      userId,
      result: { $in: ["again", "hard"] },
    });
    const totalReviews = await ReviewLog.countDocuments({ userId });

    // 3. Số từ cần ôn hôm nay
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const dueSetsAggregation = await UserSetProgress.aggregate([
      {
        $match: {
          userId: userObjectId(userId),
          nextReviewDate: { $lte: endOfToday },
        },
      },
      {
        $lookup: {
          from: "vocabsets",
          localField: "setId",
          foreignField: "_id",
          as: "setDetails",
        },
      },
      { $unwind: "$setDetails" },
      {
        $group: {
          _id: null,
          dueWordsCount: { $sum: "$setDetails.itemCount" },
        },
      },
    ]);
    const dueWordsCount =
      dueSetsAggregation.length > 0 ? dueSetsAggregation[0].dueWordsCount : 0;

    return res.status(200).json({
      success: true,
      data: {
        totalVocab,
        statusCounts,
        accuracyStats: { correctAnswers, incorrectAnswers, totalReviews },
        dueWordsCount,
      },
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

    let filter = { userId };
    if (day && day !== "All") filter.learnedDayOfWeek = day;

    // Nếu muốn filter theo status, ta phải lấy từ UserSetProgress,
    // do đó ta cần join để lấy status của Set chứa từ đó.
    let pipeline = [
      { $match: { userId: userObjectId(userId) } },
      {
        $lookup: {
          from: "usersetprogresses",
          let: { setId: "$setId", uId: "$userId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$setId", "$$setId"] },
                    { $eq: ["$userId", "$$uId"] },
                  ],
                },
              },
            },
          ],
          as: "setProgress",
        },
      },
      { $unwind: { path: "$setProgress", preserveNullAndEmptyArrays: true } },
    ];

    if (day && day !== "All")
      pipeline.push({ $match: { learnedDayOfWeek: day } });
    if (status && status !== "All")
      pipeline.push({ $match: { "setProgress.status": status } });

    // Join với Vocabulary để lấy thông tin từ
    pipeline.push({
      $lookup: {
        from: "vocabularies",
        localField: "vocabId",
        foreignField: "_id",
        as: "vocabDetails",
      },
    });
    pipeline.push({ $unwind: "$vocabDetails" });

    // Định dạng lại đầu ra
    pipeline.push({
      $project: {
        _id: 1,
        vocabId: "$vocabId",
        word: "$vocabDetails.word",
        phonetic: "$vocabDetails.phonetic",
        type: "$vocabDetails.type",
        meaning: "$vocabDetails.meaning",
        example: "$vocabDetails.example",
        status: { $ifNull: ["$setProgress.status", "new"] },
        isMarkedRemembered: 1,
      },
    });

    const words = await UserVocabulary.aggregate(pipeline);

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
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // 1. Tìm tất cả các tiến trình (UserSetProgress) đến hạn
    const dueProgresses = await UserSetProgress.find({
      userId,
      nextReviewDate: { $lte: endOfToday },
    })
      .populate("setId", "name itemCount image coverImage")
      .lean();

    if (!dueProgresses.length) {
      return res.status(200).json({ success: true, data: [] });
    }

    const dueSetIds = dueProgresses.map((p) => p.setId._id);

    // 2. Tìm các ScheduledTask chứa các bộ từ này
    const tasks = await ScheduledTask.find({
      userId,
      setIds: { $in: dueSetIds },
    }).lean();

    // 3. Chuẩn bị danh sách phẳng (Flat list)
    const formattedData = dueProgresses.map((progress) => {
      const set = progress.setId;
      // Tìm task chứa set này (nếu có)
      const parentTask = tasks.find((t) =>
        t.setIds.map((id) => id.toString()).includes(set._id.toString()),
      );

      return {
        _id: set._id,
        name: set.name,
        itemCount: set.itemCount,
        image: set.image,
        coverImage: set.coverImage,
        status: progress.status,
        reviewCount: progress.reviewCount,
        taskInfo: parentTask
          ? {
              taskId: parentTask._id,
              time: parentTask.time,
              name: parentTask.name,
            }
          : null,
      };
    });

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

    // Lấy thông tin cơ bản của Vocabulary
    const words = await Vocabulary.find({ setId }).lean();

    // Lấy UserVocabulary của user cho các từ này để xem cờ isMarkedRemembered
    const userVocabs = await UserVocabulary.find({
      userId,
      vocabId: { $in: words.map((w) => w._id) },
    }).lean();

    const formattedWords = words.map((word) => {
      const userRecord = userVocabs.find(
        (uv) => uv.vocabId.toString() === word._id.toString(),
      );
      return {
        _id: word._id,
        content: word.content,
        phonetic: word.phonetic,
        type: word.type,
        meaning: word.meaning,
        examples: word.examples,
        isMarkedRemembered: userRecord ? userRecord.isMarkedRemembered : false,
      };
    });

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

    const userVocab = await UserVocabulary.findOneAndUpdate(
      { userId, vocabId },
      { isMarkedRemembered: isRemembered },
      { new: true },
    );

    if (!userVocab) {
      return res
        .status(404)
        .json({
          success: false,
          message: "Vocabulary not found in user's list",
        });
    }

    return res
      .status(200)
      .json({
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
    const { sessionType, sessionId, logs } = req.body;
    const userId = req.user.id;

    // 1. Lưu logs (nếu có)
    if (logs && logs.length > 0) {
      const reviewLogs = logs.map((log) => ({
        userId,
        vocabId: log.vocabId,
        setId,
        sessionId,
        sessionType,
        result: log.result,
        actionType: log.actionType,
        responseTime: log.responseTime || 0,
        reviewedAt: new Date(),
      }));
      await ReviewLog.insertMany(reviewLogs);
    }

    let progress = await UserSetProgress.findOne({ userId, setId });

    // Nếu chưa có (ví dụ user vừa add từ hệ thống), tạo mới với mức 'new'
    if (!progress) {
      progress = new UserSetProgress({
        userId,
        setId,
        status: "new",
        interval: 0,
        nextReviewDate: new Date(),
      });
    }

    // Tăng cấp độ
    let currentLevel = STATUS_LEVELS.indexOf(progress.status);
    if (currentLevel === -1) currentLevel = 0;

    const newLevel = Math.min(STATUS_LEVELS.length - 1, currentLevel + 1);
    const newInterval = LEVEL_INTERVALS[newLevel];

    progress.status = STATUS_LEVELS[newLevel];
    progress.interval = newInterval;

    let nextDate = new Date();
    nextDate.setHours(0, 0, 0, 0);
    if (newInterval > 0) {
      nextDate.setDate(nextDate.getDate() + newInterval);
    }
    progress.nextReviewDate = nextDate;
    progress.reviewCount += 1;
    progress.lastReviewedAt = new Date();

    await progress.save();

    // Reset cờ "Đã nhớ" cho toàn bộ từ trong bộ này để lần sau ôn lại chúng xuất hiện
    await UserVocabulary.updateMany(
      { userId, setId },
      { $set: { isMarkedRemembered: false } },
    );

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

    // Lấy 50 phiên học gần nhất của user
    const history = await ReviewLog.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: "$sessionId",
          setId: { $first: "$setId" },
          sessionType: { $first: "$sessionType" },
          reviewedAt: { $max: "$reviewedAt" },
          logs: { $push: "$$ROOT" },
        },
      },
      { $sort: { reviewedAt: -1 } },
      { $limit: 50 },
      // Populate VocabSet để lấy tên bộ từ
      {
        $lookup: {
          from: "vocabsets",
          localField: "setId",
          foreignField: "_id",
          as: "setDetails",
        },
      },
      { $unwind: "$setDetails" },
    ]);

    const formattedHistory = history.map((session) => {
      const { logs } = session;

      // Nhóm log theo actionType (Flashcard, Trắc nghiệm, v.v.)
      const methodsMap = {};
      const incorrectVocabIds = new Set();

      logs.forEach((log) => {
        if (!methodsMap[log.actionType]) {
          methodsMap[log.actionType] = { correct: 0, incorrect: 0 };
        }
        if (log.result === "good" || log.result === "easy") {
          methodsMap[log.actionType].correct += 1;
        } else {
          methodsMap[log.actionType].incorrect += 1;
          incorrectVocabIds.add(log.vocabId.toString());
        }
      });

      const methods = Object.keys(methodsMap).map((type) => {
        let label = "Unknown";
        if (type === "flashcard") label = "Flashcard";
        else if (type === "quiz") label = "Trắc nghiệm";
        else if (type === "typing") label = "Gõ từ";
        else if (type === "writing") label = "Viết câu";

        return {
          type,
          label,
          correct: methodsMap[type].correct,
          incorrect: methodsMap[type].incorrect,
        };
      });

      return {
        sessionId: session._id,
        sessionType: session.sessionType,
        setName: session.setDetails.name,
        reviewedAt: session.reviewedAt,
        methods,
        incorrectCount: incorrectVocabIds.size,
        incorrectVocabIds: Array.from(incorrectVocabIds),
      };
    });

    return res.status(200).json({ success: true, data: formattedHistory });
  } catch (err) {
    console.error("[getReviewHistory]", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
