import mongoose from "mongoose";
import { UserVocabulary } from "../models/index.js";

export const createUserVocab = (data) => {
  return UserVocabulary.create(data);
};

export const findUserVocabs = (userId, vocabIds) => {
  return UserVocabulary.find({
    userId,
    vocabId: { $in: vocabIds },
  }).lean();
};

export const resetRememberedFlags = (userId, setId) => {
  return UserVocabulary.updateMany(
    { userId, setId },
    { $set: { isMarkedRemembered: false } }
  );
};

export const updateRememberedFlag = (userId, vocabId, isRemembered) => {
  return UserVocabulary.findOneAndUpdate(
    { userId, vocabId },
    { isMarkedRemembered: isRemembered },
    { new: true }
  );
};

export const bulkUpdateStats = (userId, logs, setId = null) => {
  const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const bulkOps = logs.map(log => {
    const isCorrect = log.result === 'good' || log.result === 'easy';
    const incQuery = {
      'stats.totalAttempts': 1,
      ...(isCorrect ? { 'stats.correctCount': 1 } : { 'stats.incorrectCount': 1 }),
      ...(log.actionType ? {
        [`stats.byAction.${log.actionType}.${isCorrect ? 'correct' : 'incorrect'}`]: 1
      } : {})
    };

    // Chỉ ghi các field này khi record được TẠO MỚI (lần đầu tiên học từ này)
    const setOnInsert = {
      learnedDayOfWeek: dayOfWeek,
      firstLearnedAt: new Date(),
    };
    if (setId) setOnInsert.setId = new mongoose.Types.ObjectId(setId);
    if (log.vocabType) setOnInsert.vocabType = log.vocabType;

    return {
      updateOne: {
        filter: { userId, vocabId: log.vocabId },
        update: {
          $inc: incQuery,
          $setOnInsert: setOnInsert,
          $set: { lastReviewedAt: new Date() },
        },
        upsert: true,
      }
    };
  });

  return UserVocabulary.bulkWrite(bulkOps);
};

/**
 * Cập nhật learnedDayOfWeek + firstLearnedAt cho các record chưa có giá trị này.
 * Dùng sau khi completeSetReview để patch cả MyWords (record đã tồn tại từ trước,
 * nên $setOnInsert trong bulkUpdateStats không kích hoạt được).
 */
export const setLearnedDayIfMissing = (userId, vocabIds, setId = null) => {
  const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const update = {
    $set: {
      learnedDayOfWeek: dayOfWeek,
      firstLearnedAt: new Date(),
    },
  };
  if (setId) {
    update.$set.setId = new mongoose.Types.ObjectId(setId);
  }

  return UserVocabulary.updateMany(
    {
      userId,
      vocabId: { $in: vocabIds },
      learnedDayOfWeek: { $exists: false }, // Chỉ patch record chưa có ngày học
    },
    update,
  );
};

export const aggregateLearnedWords = (userId, day, status) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  let pipeline = [
    { $match: { userId: userObjectId, "stats.totalAttempts": { $gt: 0 } } },
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
    // Tính "ngày học hiệu dụng": ưu tiên learnedDayOfWeek, nếu không có thì tính từ firstLearnedAt
    {
      $addFields: {
        effectiveDayOfWeek: {
          $ifNull: [
            "$learnedDayOfWeek",
            {
              $switch: {
                branches: [
                  { case: { $eq: [{ $dayOfWeek: "$firstLearnedAt" }, 1] }, then: "Sunday" },
                  { case: { $eq: [{ $dayOfWeek: "$firstLearnedAt" }, 2] }, then: "Monday" },
                  { case: { $eq: [{ $dayOfWeek: "$firstLearnedAt" }, 3] }, then: "Tuesday" },
                  { case: { $eq: [{ $dayOfWeek: "$firstLearnedAt" }, 4] }, then: "Wednesday" },
                  { case: { $eq: [{ $dayOfWeek: "$firstLearnedAt" }, 5] }, then: "Thursday" },
                  { case: { $eq: [{ $dayOfWeek: "$firstLearnedAt" }, 6] }, then: "Friday" },
                  { case: { $eq: [{ $dayOfWeek: "$firstLearnedAt" }, 7] }, then: "Saturday" },
                ],
                default: null,
              },
            },
          ],
        },
      },
    },
  ];

  if (day && day !== "All") pipeline.push({ $match: { effectiveDayOfWeek: day } });
  if (status && status !== "All") pipeline.push({ $match: { "setProgress.status": status } });

  pipeline.push({
    $lookup: {
      from: "vocabularies",
      localField: "vocabId",
      foreignField: "_id",
      as: "vocabDetails",
    },
  });
  pipeline.push({ $unwind: "$vocabDetails" });

  pipeline.push({
    $project: {
      _id: 1,
      vocabId: "$vocabId",
      word: "$vocabDetails.content",
      phonetic: "$vocabDetails.phonetic",
      partOfSpeech: "$vocabDetails.partOfSpeech",
      type: "$vocabDetails.type",
      meaning: "$vocabDetails.meaning",
      status: { $ifNull: ["$setProgress.status", "new"] },
      isMarkedRemembered: 1,
      learnedDayOfWeek: 1,
      firstLearnedAt: 1,
      lastReviewedAt: 1,
    },
  });

  return UserVocabulary.aggregate(pipeline);
};

export const deleteUserVocabsBySets = (setIds, userId) => {
  return UserVocabulary.deleteMany({ setId: { $in: setIds }, userId });
};

export const deleteUserVocab = (vocabId, userId) => {
  return UserVocabulary.findOneAndDelete({ vocabId, userId });
};

/** Lấy tất cả UserVocabulary của 1 user trong 1 bộ từ (cho practice game) */
export const findUserVocabsBySet = (userId, setId) => {
  return UserVocabulary.find({ userId, setId }).lean();
};

export const aggregateTabStats = async (userId, endOfToday) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  return UserVocabulary.aggregate([
    { $match: { userId: userObjectId, "stats.totalAttempts": { $gt: 0 } } },
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
    {
      $addFields: {
        effectiveStatus: { $ifNull: ["$setProgress.status", "new"] },
        isDue: {
          $cond: [
            { $lte: ["$setProgress.nextReviewDate", endOfToday] },
            true,
            false,
          ],
        },
      },
    },
    {
      $group: {
        _id: { vocabType: "$vocabType", status: "$effectiveStatus" },
        count: { $sum: 1 },
        totalAttempts: { $sum: "$stats.totalAttempts" },
        incorrectCount: { $sum: "$stats.incorrectCount" },
        dueLearn: {
          $sum: {
            $cond: [
              { $and: ["$isDue", { $eq: ["$effectiveStatus", "new"] }] },
              1,
              0,
            ],
          },
        },
        dueReview: {
          $sum: {
            $cond: [
              { $and: ["$isDue", { $ne: ["$effectiveStatus", "new"] }] },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);
};

export const getWrongWordsByTab = async (userId) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  return UserVocabulary.aggregate([
    { $match: { userId: userObjectId, "stats.incorrectCount": { $gt: 0 } } },
    { $sort: { "stats.incorrectCount": -1 } },
    {
      $lookup: {
        from: "vocabularies",
        localField: "vocabId",
        foreignField: "_id",
        as: "vocabDetails",
      },
    },
    { $unwind: "$vocabDetails" },
    {
      $project: {
        id: "$vocabId",
        content: "$vocabDetails.content",
        meaning: "$vocabDetails.meaning",
        phonetic: { $ifNull: ["$vocabDetails.phonetic", ""] },
        againCount: "$stats.incorrectCount",
        type: { $ifNull: ["$vocabType", "$vocabDetails.type"] },
      },
    },
  ]);
};

