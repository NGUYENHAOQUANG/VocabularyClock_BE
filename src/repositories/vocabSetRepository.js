import { VocabSet } from "../models/index.js";

export const findAvailableSets = (userId, scheduledSetIds) => {
  return VocabSet.find({
    ownerId: userId,
    _id: { $nin: scheduledSetIds }
  }).select('name itemCount image coverImage').lean();
};

export const findMySets = (topicId, userId) => {
  return VocabSet.find({ topicId, ownerId: userId, isSystemSet: false })
    .select("-__v -createdAt -updatedAt")
    .sort({ order: 1 })
    .lean();
};

export const findSystemSets = (topicId) => {
  return VocabSet.find({ topicId, isSystemSet: true })
    .select("name description itemCount order")
    .sort({ order: 1 })
    .lean();
};

export const checkSystemSetExists = (setId) => {
  return VocabSet.exists({ _id: setId, isSystemSet: true });
};

export const findSetsByTopic = (topicId) => {
  return VocabSet.find({ topicId }).select('_id').lean();
};

export const findSet = (setId, userId) => {
  return VocabSet.findOne({ _id: setId, ownerId: userId });
};

export const createSet = (data) => {
  return VocabSet.create(data);
};

export const updateSet = (setId, userId, updateData) => {
  return VocabSet.findOneAndUpdate(
    { _id: setId, ownerId: userId },
    updateData,
    { new: true, runValidators: true }
  );
};

export const deleteSet = (setId, userId) => {
  return VocabSet.findOneAndDelete({ _id: setId, ownerId: userId });
};

export const deleteSetsByTopic = (topicId) => {
  return VocabSet.deleteMany({ topicId });
};
