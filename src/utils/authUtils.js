import jwt from 'jsonwebtoken';

/**
 * Tạo Access Token (ngắn hạn: 15 phút)
 */
export const generateAccessToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });
};

/**
 * Tạo Refresh Token (dài hạn: 7 ngày)
 */
export const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });
};

/**
 * Format response user (loại bỏ các field nhạy cảm)
 */
export const formatUserResponse = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  avatarUrl: user.avatarUrl,
  nativeLanguage: user.nativeLanguage,
  isEmailVerified: user.isEmailVerified,
  settings: user.settings,
  createdAt: user.createdAt,
});
