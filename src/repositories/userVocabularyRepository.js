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

export const aggregateLearnedWords = (userId, day, status) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  let pipeline = [
    { $match: { userId: userObjectId } },
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

  if (day && day !== "All") pipeline.push({ $match: { learnedDayOfWeek: day } });
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
      word: "$vocabDetails.word",
      phonetic: "$vocabDetails.phonetic",
      type: "$vocabDetails.type",
      meaning: "$vocabDetails.meaning",
      example: "$vocabDetails.example",
      status: { $ifNull: ["$setProgress.status", "new"] },
      isMarkedRemembered: 1,
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
