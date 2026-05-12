import jwt from "jsonwebtoken";
import { User } from "../models/index.js";

/**
 * protect – JWT access token verification middleware.
 * Attaches req.user = { id, email, name } if token is valid.
 */
export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "No authentication token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("_id email name isActive");

    if (!user) {
      return res.status(401).json({ success: false, message: "User not found" });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: "Account has been deactivated" });
    }

    req.user = { id: user._id.toString(), email: user.email, name: user.name };
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, message: "Access token has expired", code: "TOKEN_EXPIRED" });
    }
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
};
