import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import * as userRepo from "../repositories/userRepository.js";
import { sendPasswordResetEmail } from "../services/emailService.js";
import {
  generateAccessToken,
  generateRefreshToken,
  formatUserResponse,
} from "../utils/authUtils.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────────────────────────────────────
export const register = async (req, res) => {
  try {
    const { name, email, password, nativeLanguage } = req.body;

    const existing = await userRepo.findUserByEmail(email);
    if (existing) {
      return res
        .status(409)
        .json({ success: false, message: "Email is already registered" });
    }

    const user = await userRepo.createUser({
      name,
      email,
      password,
      nativeLanguage: nativeLanguage || "eng",
    });

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    const hashedRefreshToken = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");
    user.refreshToken = hashedRefreshToken;
    await userRepo.saveUser(user);

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      data: {
        user: formatUserResponse(user),
        accessToken,
        refreshToken,
      },
    });
  } catch (err) {
    console.error("[register]", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────────────────────
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await userRepo.findUserByEmailWithSecrets(email);
    if (!user || !user.password) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });
    }

    if (!user.isActive) {
      return res
        .status(403)
        .json({ success: false, message: "Account has been deactivated" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    const hashedRefreshToken = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");
    user.refreshToken = hashedRefreshToken;
    await userRepo.saveUser(user);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: formatUserResponse(user),
        accessToken,
        refreshToken,
      },
    });
  } catch (err) {
    console.error("[login]", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/google
// ─────────────────────────────────────────────────────────────────────────────
export const googleAuth = async (req, res) => {
  try {
    const { idToken } = req.body;

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    let user = await userRepo.findUserByEmail(email);

    if (!user) {
      user = await userRepo.createUser({
        googleId,
        email,
        name,
        avatarUrl: picture || "",
        isEmailVerified: true,
      });
    } else if (!user.googleId) {
      user.googleId = googleId;
      user.avatarUrl = user.avatarUrl || picture || "";
      user.isEmailVerified = true;
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    const hashedRefreshToken = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");
    user.refreshToken = hashedRefreshToken;
    await userRepo.saveUser(user);

    return res.status(200).json({
      success: true,
      message: "Google sign-in successful",
      data: {
        user: formatUserResponse(user),
        accessToken,
        refreshToken,
      },
    });
  } catch (err) {
    console.error("[googleAuth]", err);
    return res
      .status(401)
      .json({ success: false, message: "Invalid Google token" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/refresh-token
// ─────────────────────────────────────────────────────────────────────────────
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "Refresh token is required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

    const user = await userRepo.findUserByIdWithSecrets(decoded.id);
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    if (!user || user.refreshToken !== hashedToken) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid refresh token" });
    }

    const newAccessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    const hashedNewRefreshToken = crypto
      .createHash("sha256")
      .update(newRefreshToken)
      .digest("hex");
    user.refreshToken = hashedNewRefreshToken;
    await userRepo.saveUser(user);

    return res.status(200).json({
      success: true,
      data: { accessToken: newAccessToken, refreshToken: newRefreshToken },
    });
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Refresh token expired or invalid",
      code: "REFRESH_EXPIRED",
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/logout
// ─────────────────────────────────────────────────────────────────────────────
export const logout = async (req, res) => {
  try {
    await userRepo.findUserById(req.user.id).then((u) => {
      if (u) {
        u.refreshToken = null;
        return userRepo.saveUser(u);
      }
    });
    return res
      .status(200)
      .json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    console.error("[logout]", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/me
// ─────────────────────────────────────────────────────────────────────────────
export const getMe = async (req, res) => {
  try {
    const user = await userRepo.findUserById(req.user.id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    return res
      .status(200)
      .json({ success: true, data: { user: formatUserResponse(user) } });
  } catch (err) {
    console.error("[getMe]", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/auth/me — Cập nhật thông tin cá nhân (tên, avatar, nativeLanguage)
// ─────────────────────────────────────────────────────────────────────────────
export const updateProfile = async (req, res) => {
  try {
    const { name, avatarUrl, nativeLanguage } = req.body;
    const user = await userRepo.findUserById(req.user.id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (name !== undefined) user.name = name;
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
    if (nativeLanguage !== undefined) user.nativeLanguage = nativeLanguage;

    await userRepo.saveUser(user);

    return res.status(200).json({
      success: true,
      data: { user: formatUserResponse(user) },
    });
  } catch (err) {
    console.error("[updateProfile]", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/auth/settings — Cập nhật cài đặt học tập
// ─────────────────────────────────────────────────────────────────────────────
export const updateSettings = async (req, res) => {
  try {
    const user = await userRepo.findUserById(req.user.id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const allowedFields = [
      "dailyNewWordLimit",
      "dailyReviewLimit",
      "reminderTimes",
      "learningDays",
      "interfaceLanguage",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        user.settings[field] = req.body[field];
      }
    });

    await userRepo.saveUser(user);

    return res.status(200).json({
      success: true,
      data: { settings: user.settings },
    });
  } catch (err) {
    console.error("[updateSettings]", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/change-password
// ─────────────────────────────────────────────────────────────────────────────
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await userRepo.findUserByIdWithSecrets(req.user.id);
    if (!user || !user.password) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid user or password not set" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Incorrect current password" });
    }

    user.password = newPassword;
    user.refreshToken = null; // Bắt đăng nhập lại ở thiết bị khác

    await userRepo.saveUser(user);

    return res.status(200).json({
      success: true,
      message: "Password changed successfully. Please log in again.",
    });
  } catch (err) {
    console.error("[changePassword]", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/forgot-password
// ─────────────────────────────────────────────────────────────────────────────
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await userRepo.findUserByEmail(email);

    if (!user) {
      return res.status(200).json({
        success: true,
        message: "If that email exists, a reset link has been sent.",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash OTP before saving
    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(otp, salt);

    user.passwordResetToken = hashedOtp;
    user.passwordResetExpires = new Date(
      Date.now() + parseInt(process.env.OTP_EXPIRES_MINUTES) * 60 * 1000,
    );
    await userRepo.saveUser(user);

    // Bắt đầu gửi email (có xử lý nếu chưa cấu hình .env)
    try {
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        await sendPasswordResetEmail(email, otp);
      } else {
        console.warn(
          "⚠️ [CẢNH BÁO]: Chưa cấu hình EMAIL_USER và EMAIL_PASS trong .env! Bỏ qua bước gửi email thật.",
        );
      }
    } catch (emailError) {
      console.error("[forgotPassword] Lỗi gửi email:", emailError);
      return res.status(500).json({
        success: false,
        message: "Không thể gửi email OTP lúc này, vui lòng thử lại sau.",
      });
    }

    console.log(
      `[forgotPassword] MÃ OTP ĐẶT LẠI MẬT KHẨU CHO EMAIL ${email}:`,
      otp,
    );

    return res.status(200).json({
      success: true,
      message: "If that email exists, an OTP has been sent.",
      devOtp: otp, // Tạm thời trả về để frontend tự điền (bỏ đi khi lên production)
    });
  } catch (err) {
    console.error("[forgotPassword]", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/reset-password
// ─────────────────────────────────────────────────────────────────────────────
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    const user = await userRepo.findUserByEmail(email);

    if (
      !user ||
      !user.passwordResetToken ||
      user.passwordResetExpires < Date.now()
    ) {
      return res.status(400).json({
        success: false,
        message: "Mã OTP không hợp lệ hoặc đã hết hạn.",
      });
    }

    const isMatch = await user.compareOTP(otp);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Mã OTP không hợp lệ hoặc đã hết hạn.",
      });
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.refreshToken = null; // Bắt đăng nhập lại trên mọi thiết bị
    await userRepo.saveUser(user);

    return res.status(200).json({
      success: true,
      message: "Password reset successful. Please log in again.",
    });
  } catch (err) {
    console.error("[resetPassword]", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/verify-otp
// ─────────────────────────────────────────────────────────────────────────────
export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await userRepo.findUserByEmail(email);

    if (
      !user ||
      !user.passwordResetToken ||
      user.passwordResetExpires < Date.now()
    ) {
      return res.status(400).json({
        success: false,
        message: "Mã OTP không hợp lệ hoặc đã hết hạn.",
      });
    }

    const isMatch = await user.compareOTP(otp);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Mã OTP không hợp lệ hoặc đã hết hạn.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Mã OTP hợp lệ.",
    });
  } catch (err) {
    console.error("[verifyOtp]", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/auth/me
// ─────────────────────────────────────────────────────────────────────────────
export const deleteAccount = async (req, res) => {
  try {
    const user = await userRepo.findUserById(req.user.id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Xoá tài khoản khỏi CSDL
    await userRepo.deleteUserById(req.user.id);

    return res.status(200).json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (err) {
    console.error("[deleteAccount]", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/auth/me/data
// ─────────────────────────────────────────────────────────────────────────────
export const deleteData = async (req, res) => {
  try {
    const user = await userRepo.findUserById(req.user.id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Xoá tất cả dữ liệu học tập
    await userRepo.deleteUserData(req.user.id);

    return res.status(200).json({
      success: true,
      message: "Data deleted successfully",
    });
  } catch (err) {
    console.error("[deleteData]", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
