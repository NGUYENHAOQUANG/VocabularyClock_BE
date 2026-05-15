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
        as: 'systemSetDetails'
    }},
    { $lookup: {
        from: 'myvocabsets',
        localField: 'setId',
        foreignField: '_id',
        as: 'mySetDetails'
    }},
    { $addFields: {
        setDetails: { 
            $ifNull: [ 
                { $arrayElemAt: ['$systemSetDetails', 0] }, 
                { $arrayElemAt: ['$mySetDetails', 0] } 
            ] 
        }
    }},
    { $project: {
        systemSetDetails: 0,
        mySetDetails: 0
    }}
  ]);

  console.log("[getHistoryAggregation] DEBUG Retrieved:", JSON.stringify(result, null, 2));
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
