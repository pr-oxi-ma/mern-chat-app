import bcrypt from 'bcryptjs';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { config } from '../config/env.config.js';
import { DEFAULT_AVATAR } from '../constants/file.constant.js';
import { prisma } from '../lib/prisma.lib.js';
import { env } from '../schemas/env.schema.js';

function formatName(rawName: string) {
  let name = rawName.trim();
  name = name.replace(/\s\s+/g, ' '); // collapse multiple spaces
  name = name.replace(/[^a-zA-Z\s'’]/g, ''); // remove invalid characters
  // Capitalize first letter of each word
  name = name.replace(/(?:^|\s|['’])[a-z]/g, (l) => l.toUpperCase());
  // Special capitalization cases
  name = name.replace(/\bMc([a-z])/g, (_, c) => `Mc${c.toUpperCase()}`);
  name = name.replace(/\bO(['’])([a-z])/g, (_, a, c) => `O${a}${c.toUpperCase()}`);
  // Enforce length rules
  if (name.length < 3) name = name.padEnd(3, 'X'); // minimum 3 chars fallback
  if (name.length > 25) name = name.slice(0, 25);
  return name;
}

// Helper function to generate a valid username from first name
async function generateUsername(fullName: string) {
  let firstName = fullName.split(' ')[0] || 'user';
  let username = firstName.toLowerCase().replace(/\s/g, '').replace(/[^a-z0-9_]/g, '');
  if (username.length < 3) username = username.padEnd(3, 'x');
  if (username.length > 20) username = username.slice(0, 20);

  // Check uniqueness, append random number if already exists
  let exists = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  while (exists) {
    const randomNumber = Math.floor(10 + Math.random() * 990); // 10-999, random 3-digit number
    const tempUsername = `${username}${randomNumber}`;
    exists = await prisma.user.findUnique({ where: { username: tempUsername }, select: { id: true } });
    if (!exists) username = tempUsername;
  }
  return username;
}

passport.use(
  new GoogleStrategy(
    {
      clientID: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      callbackURL: config.callbackUrl,
    },
    async function (accessToken, refreshToken, profile, done) {
      try {
        if (profile.emails && profile.emails[0].value && profile.displayName) {
          const email = profile.emails[0].value;
          const existingUser = await prisma.user.findUnique({ where: { email } });

          if (existingUser) {
            // Existing user
            done(null, {
              id: existingUser.id,
              username: existingUser.username,
              name: existingUser.name,
              avatar: existingUser.avatar,
              email: existingUser.email,
              emailVerified: existingUser.emailVerified,
              newUser: false,
              googleId: profile.id,
            });
          } else {
            // New user
            let avatarUrl = DEFAULT_AVATAR;
            if (profile.photos && profile.photos[0].value) {
              avatarUrl = profile.photos[0].value;
            }

            const fullName = formatName(profile.displayName);
            const username = await generateUsername(profile.name?.givenName || fullName.split(' ')[0]);

            const newUser = await prisma.user.create({
              data: {
                username,
                name: fullName,
                avatar: avatarUrl,
                email,
                hashedPassword: await bcrypt.hash(profile.id, 10),
                emailVerified: true,
                oAuthSignup: true,
                googleId: profile.id,
              },
              select: {
                id: true,
                username: true,
                name: true,
                avatar: true,
                email: true,
                emailVerified: true,
                googleId: true,
              },
            });

            done(null, { ...newUser, newUser: true });
          }
        } else {
          throw new Error('Some error occurred during Google OAuth signup');
        }
      } catch (error) {
        console.error(error);
        done('Some error occurred', undefined);
      }
    }
  )
);
