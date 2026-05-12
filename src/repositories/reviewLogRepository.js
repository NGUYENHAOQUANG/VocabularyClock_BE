import mongoose from "mongoose";
import { ReviewLog } from "../models/index.js";

const userObjectId = (id) => new mongoose.Types.ObjectId(id);

export const countAnswersByResult = (userId, results) => {
  return ReviewLog.countDocuments({
    userId,
    result: { $in: results }
  });
};

export const countTotalReviews = (userId) => {
  return ReviewLog.countDocuments({ userId });
};

export const getHistoryAggregation = (userId) => {
  return ReviewLog.aggregate([
    { $match: { userId: userObjectId(userId) } },
    { $group: {
        _id: "$sessionId",
        setId: { $first: "$setId" },
        sessionType: { $first: "$sessionType" },
        reviewedAt: { $max: "$reviewedAt" },
        logs: { $push: "$$ROOT" }
    }},
    { $sort: { reviewedAt: -1 } },
    { $limit: 50 },
    { $lookup: {
        from: "vocabsets",
        localField: "setId",
        foreignField: "_id",
        as: "setDetails"
    }},
    { $unwind: "$setDetails" }
  ]);
};

export const insertLogs = (logs) => {
  return ReviewLog.insertMany(logs);
};
