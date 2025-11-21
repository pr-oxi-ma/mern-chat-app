import { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma.lib.js";
import { asyncErrorHandler } from "../utils/error.utils.js";
import { calculateSkip } from "../utils/generic.js";

// ✅ Get all messages in a chat with pagination
export const getMessages = asyncErrorHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { page = 1, limit = 20 } = req.query;

  const pageNumber = Number(page);
  const limitNumber = Number(limit);

  const messages = await prisma.message.findMany({
    where: {
      chatId: id,
    },
    include: {
      sender: {
        select: {
          id: true,
          username: true,
          avatar: true,
        },
      },
      attachments: {
        select: {
          secureUrl: true,
        },
      },
      poll: {
        select: {
          id: true,
          question: true,
          options: true,
          multipleAnswers: true,
          votes: {
            select: {
              optionIndex: true,
              user: {
                select: {
                  id: true,
                  username: true,
                  avatar: true,
                },
              },
            },
          },
        },
      },
      reactions: {
        select: {
          reaction: true,
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
        },
      },
      replyToMessage: {
        select: {
          id: true,
          textMessageContent: true,
          isPollMessage: true,
          url: true,
          audioUrl: true,
          attachments: {
            select: {
              secureUrl: true,
            },
          },
          sender: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    skip: calculateSkip(pageNumber, limitNumber),
    take: limitNumber,
  });

  const totalMessagesCount = await prisma.message.count({
    where: {
      chatId: id,
    },
  });

  const totalPages = Math.ceil(totalMessagesCount / limitNumber);

  return res.status(200).json({
    messages: messages.reverse(),
    totalPages,
  });
});
