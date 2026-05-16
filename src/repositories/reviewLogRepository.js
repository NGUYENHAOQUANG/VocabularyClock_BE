import mongoose from "mongoose";
import { ReviewLog } from "../models/index.js";

const userObjectId = (id) => new mongoose.Types.ObjectId(id);

export const findBySessionId = (sessionId, userId) => {
  return ReviewLog.findOne({ sessionId, userId }).lean();
};

export const countAnswersByResult = async (userId, results) => {
  const aggr = await ReviewLog.aggregate([
    { $match: { userId: userObjectId(userId) } },
    { $unwind: "$logs" },
    { $match: { "logs.result": { $in: results } } },
    { $count: "total" }
  ]);
  return aggr.length > 0 ? aggr[0].total : 0;
};

export const countTotalReviews = async (userId) => {
  const aggr = await ReviewLog.aggregate([
    { $match: { userId: userObjectId(userId) } },
    { $project: { logCount: { $size: { $ifNull: ["$logs", []] } } } },
    { $group: { _id: null, total: { $sum: "$logCount" } } }
  ]);
  return aggr.length > 0 ? aggr[0].total : 0;
};

export const getHistoryAggregation = async (userId) => {
  const result = await ReviewLog.aggregate([
    { $match: { userId: userObjectId(userId) } },
    { $sort: { reviewedAt: -1 } },
    { $limit: 50 },
    { $lookup: {
        from: 'vocabsets',
        localField: 'setId',
        foreignField: '_id',
        as: 'setDetails'
    }},
    { $unwind: { path: "$setDetails", preserveNullAndEmptyArrays: true } }
  ]);

  return result;
};

export const upsertSessionLogs = (userId, setId, sessionType, sessionId, logs, setName) => {
  return ReviewLog.findOneAndUpdate(
    { sessionId },
    {
      $setOnInsert: { userId, setId, sessionType, reviewedAt: new Date(), setName },
      $push: { logs: { $each: logs } }
    },
    { upsert: true, new: true }
  );
};

export const insertLogs = (logs) => {
  // Bị thay thế bằng upsertSessionLogs nhưng vẫn giữ lại để tương thích ngược nếu cần
  return ReviewLog.insertMany(logs);
};

/**
 * Lấy danh sách từ SAI chưa được fix trong 1 session, group theo actionType
 * Trả về: { [actionType]: vocabId[] }
 */
export const getSessionWrongWordIds = async (sessionId, userId) => {
  const log = await ReviewLog.findOne({ sessionId, userId }).lean();
  if (!log || !log.logs || log.logs.length === 0) return {};

  // Group các từ sai (chưa isFixed) theo actionType
  const grouped = {};
  const seenPerType = {}; // Tránh lặp vocabId trong cùng actionType

  log.logs.forEach((entry) => {
    const isWrong = entry.result === 'again' || entry.result === 'hard';
    if (!isWrong || entry.isFixed) return;

    const type = entry.actionType;
    const vid = entry.vocabId.toString();

    if (!seenPerType[type]) seenPerType[type] = new Set();
    if (seenPerType[type].has(vid)) return;
    seenPerType[type].add(vid);

    if (!grouped[type]) grouped[type] = [];
    grouped[type].push(vid);
  });

  return grouped;
};

/**
 * Đánh dấu isFixed = true cho các từ đã được ôn lại đúng trong session gốc.
 * fixedByType: { [actionType]: vocabId[] } — các từ vừa trả lời đúng
 */
export const markLogsAsFixed = async (userId, originalSessionId, fixedByType) => {
  const log = await ReviewLog.findOne({ sessionId: originalSessionId, userId });
  if (!log) return;

  let changed = false;
  log.logs.forEach((entry) => {
    if (entry.isFixed) return;
    const isWrong = entry.result === 'again' || entry.result === 'hard';
    if (!isWrong) return;

    const fixedIds = fixedByType[entry.actionType] || [];
    if (fixedIds.includes(entry.vocabId.toString())) {
      entry.isFixed = true;
      changed = true;
    }
  });

  if (changed) await log.save();
};
