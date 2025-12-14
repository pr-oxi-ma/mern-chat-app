import { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";
import type { AuthenticatedRequest } from "../interfaces/auth/auth.interface.js";
import { prisma } from "../lib/prisma.lib.js";
import { CustomError, asyncErrorHandler } from "../utils/error.utils.js";
import { env } from "../schemas/env.schema.js";

type SessionPayload = {
  userId: string;
  expiresAt?: Date;
};

// Middleware to verify JWT from cookie or Authorization header
export const verifyToken = asyncErrorHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    let token: string | undefined;

    // 1️⃣ Try to get token from cookies
    if (req.cookies?.token) {
      token = req.cookies.token;
    }

    // 2️⃣ Fallback: try from Authorization header
    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    // 3️⃣ If still not found → throw
    if (!token) {
      return next(new CustomError("Token missing, please login again", 401));
    }

    // 4️⃣ Verify token
    let decodedInfo: SessionPayload;
    try {
      decodedInfo = jwt.verify(token, env.JWT_SECRET) as SessionPayload;
    } catch {
      return next(new CustomError("Invalid or expired token, please login again", 401));
    }

    // 5️⃣ Check decoded payload
    if (!decodedInfo?.userId) {
      return next(new CustomError("Invalid token payload", 401));
    }

    // 6️⃣ Find user in database
    const user = await prisma.user.findUnique({
      where: { id: decodedInfo.userId },
      select: {
        id: true,
        name: true,
        username: true,
        avatar: true,
        email: true,
        createdAt: true,
        updatedAt: true,
        emailVerified: true,
        publicKey: true,
        notificationsEnabled: true,
        verificationBadge: true,
        fcmToken: true,
        oAuthSignup: true,
      },
    });

    if (!user) {
      return next(new CustomError("Invalid token, user not found", 401));
    }

    // 7️⃣ Attach user to request
    req.user = user;
    next();
  }
);
        
