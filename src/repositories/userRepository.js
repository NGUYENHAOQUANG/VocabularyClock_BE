import User from "../models/User.js";

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

export const findUserByResetToken = (token) => {
  return User.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: Date.now() },
  });
};

export const createUser = (data) => {
  return User.create(data);
};

export const saveUser = (userDoc) => {
  return userDoc.save();
};
