import { ScheduledTask } from "../models/index.js";

export const findTasksByUserId = (userId, selectFields = '') => {
  let query = ScheduledTask.find({ userId });
  if (selectFields) query = query.select(selectFields);
  return query;
};

export const findTasksWithSets = (userId) => {
  return ScheduledTask.find({ userId }).populate('setIds', 'itemCount').lean();
};

export const findTasksWithSpecificSets = (userId, setIds) => {
  return ScheduledTask.find({ userId, setIds: { $in: setIds } }).lean();
};

export const findTaskDetails = (taskId, userId) => {
  return ScheduledTask.findOne({ _id: taskId, userId }).populate('setIds', 'name itemCount image coverImage').lean();
};

export const removeSetsFromAllTasks = (userId, setIds) => {
  return ScheduledTask.updateMany(
    { userId, setIds: { $in: setIds } },
    { $pull: { setIds: { $in: setIds } } }
  );
};

export const assignSetsToTask = (taskId, setIds, userId) => {
  return ScheduledTask.findOneAndUpdate(
    { _id: taskId, userId },
    { $addToSet: { setIds: { $each: setIds } } },
    { new: true }
  ).populate('setIds', 'name itemCount');
};

export const createTask = (data) => {
  const task = new ScheduledTask(data);
  return task.save();
};

export const updateTask = (taskId, userId, updateData) => {
  return ScheduledTask.findOneAndUpdate(
    { _id: taskId, userId },
    updateData,
    { new: true, runValidators: true }
  );
};

export const deleteTask = (taskId, userId) => {
  return ScheduledTask.findOneAndDelete({ _id: taskId, userId });
};

export const removeSetFromTask = (taskId, setId, userId) => {
  return ScheduledTask.findOneAndUpdate(
    { _id: taskId, userId },
    { $pull: { setIds: setId } },
    { new: true }
  );
};
