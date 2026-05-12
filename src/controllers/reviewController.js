import mongoose from "mongoose";
import { UserSetProgress, UserVocabulary, ScheduledTask, VocabSet, ReviewLog } from "../models/index.js";

const STATUS_LEVELS = ["new", "vague", "recognized", "applicable", "fluent", "stabilized", "mastered"];
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
          as: "setDetails"
        }
      },
      { $unwind: "$setDetails" },
      {
        $group: {
          _id: "$status",
          totalWords: { $sum: "$setDetails.itemCount" }
        }
      }
    ]);

    const statusCounts = STATUS_LEVELS.reduce((acc, status) => {
      const found = statusAggregation.find(s => s._id === status);
      acc[status] = found ? found.totalWords : 0;
      return acc;
    }, {});

    const totalVocab = Object.values(statusCounts).reduce((a, b) => a + b, 0);

    // 2. Lấy thống kê đúng/sai từ ReviewLog
    const correctAnswers = await ReviewLog.countDocuments({ userId, result: { $in: ['good', 'easy'] } });
    const incorrectAnswers = await ReviewLog.countDocuments({ userId, result: { $in: ['again', 'hard'] } });
    const totalReviews = await ReviewLog.countDocuments({ userId });

    // 3. Số từ cần ôn hôm nay
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const dueSetsAggregation = await UserSetProgress.aggregate([
      { $match: { userId: userObjectId(userId), nextReviewDate: { $lte: endOfToday } } },
      {
        $lookup: {
          from: "vocabsets",
          localField: "setId",
          foreignField: "_id",
          as: "setDetails"
        }
      },
      { $unwind: "$setDetails" },
      {
        $group: {
          _id: null,
          dueWordsCount: { $sum: "$setDetails.itemCount" }
        }
      }
    ]);
    const dueWordsCount = dueSetsAggregation.length > 0 ? dueSetsAggregation[0].dueWordsCount : 0;

    return res.status(200).json({
      success: true,
      data: {
        totalVocab,
        statusCounts,
        accuracyStats: { correctAnswers, incorrectAnswers, totalReviews },
        dueWordsCount
      }
    });
  } catch (err) {
    console.error("[getDashboardStats]", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
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
            { $match: { $expr: { $and: [{ $eq: ["$setId", "$$setId"] }, { $eq: ["$userId", "$$uId"] }] } } }
          ],
          as: "setProgress"
        }
      },
      { $unwind: { path: "$setProgress", preserveNullAndEmptyArrays: true } }
    ];

    if (day && day !== "All") pipeline.push({ $match: { learnedDayOfWeek: day } });
    if (status && status !== "All") pipeline.push({ $match: { "setProgress.status": status } });

    // Join với Vocabulary để lấy thông tin từ
    pipeline.push({
      $lookup: {
        from: "vocabularies",
        localField: "vocabId",
        foreignField: "_id",
        as: "vocabDetails"
      }
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
        isMarkedRemembered: 1
      }
    });

    const words = await UserVocabulary.aggregate(pipeline);

    return res.status(200).json({ success: true, data: words });
  } catch (err) {
    console.error("[getLearnedWords]", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * GET /api/review/daily-schedule
 * Lịch trình hôm nay (Hình 5)
 */
export const getDailySchedule = async (req, res) => {
  try {
    const userId = req.user.id;
    // Tạm thời lấy tất cả task trong bảng ScheduledTask
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
    console.error("[getDailySchedule]", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
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

    // Tìm các bộ từ đến hạn
    const dueProgresses = await UserSetProgress.find({
      userId,
      nextReviewDate: { $lte: endOfToday }
    }).populate('setId', 'name itemCount').lean();

    const dueSetIds = dueProgresses.map(p => p.setId._id.toString());

    // Tìm ScheduledTasks chứa các bộ từ đó
    const tasks = await ScheduledTask.find({ userId, setIds: { $in: dueSetIds } })
      .populate('setIds', 'name itemCount')
      .lean();

    const formattedData = tasks.map(task => {
      // Lọc ra các set trong task này mà thực sự "due"
      const taskDueSets = task.setIds.filter(set => dueSetIds.includes(set._id.toString()));
      if (taskDueSets.length === 0) return null;

      return {
        taskId: task._id,
        time: task.time,
        taskName: task.name,
        dueSets: taskDueSets.map(set => {
          const progress = dueProgresses.find(p => p.setId._id.toString() === set._id.toString());
          return {
            setId: set._id,
            name: set.name,
            itemCount: set.itemCount,
            reviewCount: progress ? progress.reviewCount : 0,
            status: progress ? progress.status : 'new'
          }
        })
      };
    }).filter(Boolean); // Bỏ các task null

    return res.status(200).json({ success: true, data: formattedData });
  } catch (err) {
    console.error("[getDueTasks]", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
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
      { new: true }
    );

    if (!userVocab) {
      return res.status(404).json({ success: false, message: "Vocabulary not found in user's list" });
    }

    return res.status(200).json({ success: true, message: "Marked successfully", isMarkedRemembered: userVocab.isMarkedRemembered });
  } catch (err) {
    console.error("[markWordRemembered]", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * POST /api/review/sets/:setId/complete
 * Hoàn tất ôn tập 1 bộ từ -> Nâng cấp SRS
 */
export const completeSetReview = async (req, res) => {
  try {
    const { setId } = req.params;
    const userId = req.user.id;

    let progress = await UserSetProgress.findOne({ userId, setId });
    
    // Nếu chưa có (ví dụ user vừa add từ hệ thống), tạo mới với mức 'new'
    if (!progress) {
      progress = new UserSetProgress({
        userId,
        setId,
        status: 'new',
        interval: 0,
        nextReviewDate: new Date()
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
      { $set: { isMarkedRemembered: false } }
    );

    return res.status(200).json({ 
      success: true, 
      message: "Set review completed",
      data: {
        newStatus: progress.status,
        nextReviewDate: progress.nextReviewDate
      }
    });
  } catch (err) {
    console.error("[completeSetReview]", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
