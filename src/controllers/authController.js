import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import * as userRepo from "../repositories/userRepository.js";
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

    user.refreshToken = refreshToken;
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

    user.refreshToken = refreshToken;
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

    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (!user) {
      user = await User.create({
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

    user.refreshToken = refreshToken;
    await user.save();

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

    const user = await User.findById(decoded.id).select("+refreshToken");
    if (!user || user.refreshToken !== token) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid refresh token" });
    }

    const newAccessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    user.refreshToken = newRefreshToken;
    await user.save();

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
    await userRepo.findUserById(req.user.id).then(u => {
      if (u) { u.refreshToken = null; return userRepo.saveUser(u); }
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
      return res.status(404).json({ success: false, message: "User not found" });
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
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/auth/settings — Cập nhật cài đặt học tập
// ─────────────────────────────────────────────────────────────────────────────
export const updateSettings = async (req, res) => {
  try {
    const user = await userRepo.findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
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
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/change-password
// ─────────────────────────────────────────────────────────────────────────────
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select("+password");
    if (!user || !user.password) {
      return res.status(400).json({
        success: false,
        message: "This account uses Google sign-in and has no password",
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Current password is incorrect" });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    user.refreshToken = null;
    await user.save();

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

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.passwordResetToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    // TODO: Send email with resetToken
    console.log("[forgotPassword] Reset token:", resetToken);

    return res.status(200).json({
      success: true,
      message: "If that email exists, a reset link has been sent.",
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
    const { token, newPassword } = req.body;

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const user = await userRepo.findUserByResetToken(hashedToken);

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Reset token is invalid or has expired",
      });
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.refreshToken = null;
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
