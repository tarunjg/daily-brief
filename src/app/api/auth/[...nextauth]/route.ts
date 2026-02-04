import NextAuth, { type NextAuthOptions, type Session } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { db } from '@/lib/db';
import { users, accounts, sessions, userPreferences } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      image?: string;
      onboardingCompleted: boolean;
    };
    accessToken?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId: string;
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
    onboardingCompleted: boolean;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/documents',
            'https://www.googleapis.com/auth/drive.file',
          ].join(' '),
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      if (!account || !user.email) return false;

      try {
        // Upsert user
        const existing = await db.select().from(users).where(eq(users.email, user.email)).limit(1);

        let userId: string;

        if (existing.length === 0) {
          const [newUser] = await db.insert(users).values({
            email: user.email,
            name: user.name || user.email,
            image: user.image || null,
            googleAccessToken: account.access_token || null,
            googleRefreshToken: account.refresh_token || null,
          }).returning({ id: users.id });
          userId = newUser.id;

          // Create empty preferences row
          await db.insert(userPreferences).values({ userId });
        } else {
          userId = existing[0].id;
          // Update tokens
          await db.update(users).set({
            googleAccessToken: account.access_token || existing[0].googleAccessToken,
            googleRefreshToken: account.refresh_token || existing[0].googleRefreshToken,
            updatedAt: new Date(),
          }).where(eq(users.id, userId));
        }

        return true;
      } catch (error) {
        console.error('Sign-in error:', error);
        return false;
      }
    },

    async jwt({ token, account, user }) {
      if (account && user) {
        // First sign-in: persist tokens
        const dbUser = await db.select().from(users).where(eq(users.email, user.email!)).limit(1);
        if (dbUser.length > 0) {
          token.userId = dbUser[0].id;
          token.onboardingCompleted = dbUser[0].onboardingCompleted || false;
        }
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.accessTokenExpires = account.expires_at ? account.expires_at * 1000 : undefined;
      }

      // Refresh onboarding status on each request
      if (token.userId) {
        const dbUser = await db.select({ onboardingCompleted: users.onboardingCompleted })
          .from(users)
          .where(eq(users.id, token.userId))
          .limit(1);
        if (dbUser.length > 0) {
          token.onboardingCompleted = dbUser[0].onboardingCompleted || false;
        }
      }

      return token;
    },

    async session({ session, token }): Promise<Session> {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.userId,
          onboardingCompleted: token.onboardingCompleted,
        },
        accessToken: token.accessToken as string | undefined,
      };
    },

    async redirect({ url, baseUrl }) {
      // After sign-in, redirect to onboarding if not completed
      if (url.startsWith(baseUrl)) return url;
      return baseUrl;
    },
  },

  pages: {
    signIn: '/auth/signin',
  },

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
