import { 
  User, 
  UserVocabulary, 
  ReviewLog, 
  ScheduledTask, 
  DailyPlan, 
  UserSetProgress 
} from "../models/index.js";

export const findUserByEmail = (email) => {
  return User.findOne({ email });
};

export const findUserByEmailWithSecrets = (email) => {
  return User.findOne({ email }).select("+password +refreshToken");
};

export const findUserById = (id) => {
  return User.findById(id);
};

export const findUserByIdWithSecrets = (id) => {
  return User.findById(id).select("+password +refreshToken");
};



export const createUser = (data) => {
  return User.create(data);
};

export const saveUser = (userDoc) => {
  return userDoc.save();
};

export const deleteUserById = async (id) => {
  // Xoá tất cả dữ liệu liên quan đến user để tránh rác Database
  await Promise.all([
    UserVocabulary.deleteMany({ user: id }),
    ReviewLog.deleteMany({ user: id }),
    ScheduledTask.deleteMany({ user: id }),
    DailyPlan.deleteMany({ user: id }),
    UserSetProgress.deleteMany({ user: id }),
    User.findByIdAndDelete(id)
  ]);
};

export const deleteUserData = async (id) => {
  // Chỉ xoá dữ liệu học tập, giữ lại tài khoản User
  await Promise.all([
    UserVocabulary.deleteMany({ user: id }),
    ReviewLog.deleteMany({ user: id }),
    ScheduledTask.deleteMany({ user: id }),
    DailyPlan.deleteMany({ user: id }),
    UserSetProgress.deleteMany({ user: id })
  ]);
};
