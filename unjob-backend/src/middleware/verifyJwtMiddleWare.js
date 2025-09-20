import jwt from "jsonwebtoken";
import asyncHandler from "../utils/asyncHandler.js";
import apiError from "../utils/apiError.js";
import { User } from "../models/UserModel.js";

const isProduction = process.env.NODE_ENV === "production";

const cookieOptions = {
  domain: isProduction ? "unjob.ai" : "localhost",
  path: "/",
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "None" : "Lax",
  maxAge: 24 * 60 * 60 * 1000, // 1 day
};

const verifyJwt = asyncHandler(async (req, res, next) => {
  console.log("Verifying JWT...");
  const { accessToken, refreshToken } = req?.cookies;
  console.log("Cookies:", req?.cookies);
  if (!accessToken || !refreshToken) {
    throw new apiError(401, "Unauthorized: No tokens provided");
  }

  let user;
  let newAccessToken = "";

  // Helper function to fetch user safely
  const getUser = async (userId) => {
    const foundUser = await User.findById(userId);
    if (!foundUser || foundUser.status === "inactive") {
      throw new apiError(
        401,
        "Unauthorized: User does not exist or is inactive"
      );
    }
    return foundUser;
  };

  try {
    // Try verifying access token first
    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
    user = await getUser(decoded.userId);
  } catch (accessErr) {
    // Access token invalid or expired → try refresh token
    try {
      const decodedRefresh = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET
      );
      user = await getUser(decodedRefresh.userId);

      // ✅ Generate new access token
      newAccessToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN,
      });

      // ✅ Send it back as cookie
      res.cookie("accessToken", newAccessToken, cookieOptions);
    } catch (refreshErr) {
      throw new apiError(401, "Unauthorized: Invalid access or refresh token");
    }
  }

  // Attach user info to request
  req.user = {
    userId: user._id,
    newAccessToken, // empty if not rotated
  };

  next();
});

export default verifyJwt;
