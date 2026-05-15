import mongoose from "mongoose";
import { UserSetProgress } from "../models/index.js";

const userObjectId = (id) => new mongoose.Types.ObjectId(id);

export const aggregateStatusStats = (userId) => {
  return UserSetProgress.aggregate([
    { $match: { userId: userObjectId(userId) } },
    { $lookup: { from: "vocabsets", localField: "setId", foreignField: "_id", as: "setDetails" } },
    { $unwind: "$setDetails" },
    { $group: { _id: "$status", totalWords: { $sum: "$setDetails.itemCount" } } },
  ]);
};

export const aggregateDueWordsCount = (userId, endOfToday) => {
  return UserSetProgress.aggregate([
    { $match: { userId: userObjectId(userId), nextReviewDate: { $lte: endOfToday } } },
    { $lookup: { from: "vocabsets", localField: "setId", foreignField: "_id", as: "setDetails" } },
    { $unwind: "$setDetails" },
    { $group: { _id: null, dueWordsCount: { $sum: "$setDetails.itemCount" } } },
  ]);
};

export const findDueProgresses = (userId, endOfToday) => {
  return UserSetProgress.find({ userId, nextReviewDate: { $lte: endOfToday } })
    .populate('setId', 'name itemCount image coverImage').lean();
};

export const findProgress = (userId, setId) => {
  return UserSetProgress.findOne({ userId, setId });
};

export const createProgress = (data) => {
  const progress = new UserSetProgress(data);
  return progress.save();
};

export const saveProgress = (progressDocument) => {
  return progressDocument.save();
};

/** Lấy tất cả bộ từ mà user đang học (UserSetProgress) kèm thông tin bộ từ */
export const findAllProgressByUser = (userId) => {
  return UserSetProgress.find({ userId })
    .populate('setId', 'name itemCount image coverImage topicId')
    .lean();
};
