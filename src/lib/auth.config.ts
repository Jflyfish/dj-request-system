import type { NextAuthConfig } from 'next-auth';

// Edge-safe config — no Prisma, no bcrypt, no Node.js-only modules
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      if (nextUrl.pathname.startsWith('/dj')) {
        return isLoggedIn;
      }
      return true;
    },
  },
  providers: [],
};
