import { config } from "../config/env.config.js";
import { UploadApiResponse } from "cloudinary";
import { NextFunction, Response } from "express";
import type { AuthenticatedRequest } from "../interfaces/auth/auth.interface.js";
import { prisma } from "../lib/prisma.lib.js";
import {
  deleteFilesFromCloudinary,
  uploadFilesToCloudinary,
} from "../utils/auth.util.js";
import { sendMail } from "../utils/email.util.js";
import { CustomError, asyncErrorHandler } from "../utils/error.utils.js";
import { DEFAULT_AVATAR } from "../constants/file.constant.js";

export const udpateUser = asyncErrorHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { name, username, avatarReset } = req.body;

    // --- Username uniqueness check ---
    if (username) {
      const existing = await prisma.user.findFirst({
        where: { username, NOT: { id: req.user.id } },
      });
      if (existing) {
        return next(new CustomError("Username already taken", 400));
      }
    }

    let avatarUrl: string | undefined;
    let avatarPublicId: string | null | undefined;

    // --- Case 1: Reset avatar to default ---
    if (avatarReset === "true" || avatarReset === true) {
      if (req.user.avatarCloudinaryPublicId) {
        await deleteFilesFromCloudinary({
          publicIds: [req.user.avatarCloudinaryPublicId],
        });
      }

      avatarUrl = DEFAULT_AVATAR;
      avatarPublicId = null; // reset public ID
    }

    // --- Case 2: Upload new avatar ---
    else if (req.file) {
      const existingAvatarPublicId = req.user.avatarCloudinaryPublicId;
      let uploadResults: UploadApiResponse[] | undefined;

      if (existingAvatarPublicId) {
        const [_, result] = (await Promise.all([
          deleteFilesFromCloudinary({ publicIds: [existingAvatarPublicId] }),
          uploadFilesToCloudinary({ files: [req.file] }),
        ])) as [any, UploadApiResponse[] | undefined];
        uploadResults = result;
      } else {
        uploadResults = await uploadFilesToCloudinary({ files: [req.file] });
      }

      if (!uploadResults) {
        return next(new CustomError("Some error occurred during upload", 500));
      }

      avatarUrl = uploadResults[0].secure_url;
      avatarPublicId = uploadResults[0].public_id;
    }

    // --- Update user info ---
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(name && { name }),
        ...(username && { username }),
        ...(avatarUrl && { avatar: avatarUrl }),
        avatarCloudinaryPublicId:
          avatarPublicId !== undefined
            ? avatarPublicId
            : req.user.avatarCloudinaryPublicId,
      },
    });

    const secureUserInfo = {
      id: updatedUser.id,
      name: updatedUser.name,
      username: updatedUser.username,
      avatar: updatedUser.avatar,
      email: updatedUser.email,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
      emailVerified: updatedUser.emailVerified,
      publicKey: updatedUser.publicKey,
      notificationsEnabled: updatedUser.notificationsEnabled,
      verificationBadge: updatedUser.verificationBadge,
      fcmToken: updatedUser.fcmToken,
      oAuthSignup: updatedUser.oAuthSignup,
    };

    return res.status(200).json(secureUserInfo);
  }
);

// --- Keeping your email test handler as-is ---
export const testEmailHandler = asyncErrorHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { emailType } = req.query;

    if (emailType === "welcome") {
      await sendMail(req.user.email, req.user.username, "welcome");
      return res.status(200).json({ message: `sent ${emailType}` });
    }

    if (emailType === "resetPassword") {
      await sendMail(
        req.user.email,
        req.user.username,
        "resetPassword",
        config.clientUrl
      );
      return res.status(200).json({ message: `sent ${emailType}` });
    }

    if (emailType === "otpVerification") {
      await sendMail(req.user.email, req.user.username, "OTP", undefined, "3412");
      return res.status(200).json({ message: `sent ${emailType}` });
    }

    if (emailType === "privateKeyRecovery") {
      await sendMail(
        req.user.email,
        req.user.username,
        "privateKeyRecovery",
        undefined,
        undefined,
        config.clientUrl
      );
      return res.status(200).json({ message: `sent ${emailType}` });
    }

    res.status(200);
  }
);
