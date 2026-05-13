import { Router } from "express";
import {
  register,
  login,
  googleAuth,
  refreshToken,
  logout,
  getMe,
  updateProfile,
  updateSettings,
  changePassword,
  forgotPassword,
  verifyOtp,
  resetPassword,
  deleteAccount,
  deleteData,
} from "../controllers/authController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { validate } from "../middlewares/validateMiddleware.js";
import {
  registerSchema,
  loginSchema,
  googleAuthSchema,
  forgotPasswordSchema,
  verifyOtpSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from "../validations/authValidation.js";

const router = Router();

// ── Public routes ────────────────────────────────────────────────
router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post("/google", validate(googleAuthSchema), googleAuth);
router.post("/refresh-token", refreshToken);
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
router.post("/verify-otp", validate(verifyOtpSchema), verifyOtp);
router.post("/reset-password", validate(resetPasswordSchema), resetPassword);

// ── Protected routes (cần đăng nhập) ────────────────────────────
router.get("/me", protect, getMe);
router.patch("/me", protect, updateProfile);
router.delete("/me", protect, deleteAccount);
router.delete("/me/data", protect, deleteData);
router.patch("/settings", protect, updateSettings);
router.post("/logout", protect, logout);
router.post(
  "/change-password",
  protect,
  validate(changePasswordSchema),
  changePassword,
);

export default router;
