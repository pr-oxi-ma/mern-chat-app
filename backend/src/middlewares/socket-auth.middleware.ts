import { NextFunction } from "connect";
import jwt from "jsonwebtoken";
import { Socket } from "socket.io";
import { prisma } from "../lib/prisma.lib.js";
import { CustomError } from "../utils/error.utils.js";
import { env } from "../schemas/env.schema.js";

type SessionPayload = {
  userId: string;
  expiresAt: Date;
};

export const socketAuthenticatorMiddleware = async (socket: Socket, next: NextFunction) => {
  try {
    const token = socket.handshake.query.token as string;

    if (!token) {
      return next(new CustomError("Token missing, please login again", 401));
    }

    const decodedInfo = jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] }) as SessionPayload;

    if (!decodedInfo || !decodedInfo.userId) {
      return next(new CustomError("Invalid token, please login again", 401));
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: decodedInfo.userId },
    });

    if (!existingUser) {
      return next(new CustomError("Invalid token, please login again", 401));
    }

    (socket as any).user = existingUser; // assign user to socket safely
    next();
  } catch (error) {
    console.error("Socket auth error:", error);
    return next(new CustomError("Invalid token, please login again", 401));
  }
};
