import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  // 👇 BURAYI DEĞİŞTİRİYORUZ: process.env... yerine direkt yazıyoruz
  secret: "cok-gizli-ve-uzun-bir-deneme-sifresi-123456", 
  pages: {
    signIn: "/sign-in",
  },
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials);

        if (parsedCredentials.success) {
          const { email, password } = parsedCredentials.data;
          
          const user = await db.user.findUnique({ where: { email } });
          
          if (!user) return null;

          const passwordsMatch = await bcrypt.compare(password, user.password);

          if (passwordsMatch) {
            return {
              id: user.id,
              name: `${user.firstName} ${user.lastName}`,
              email: user.email,
            };
          }
        }
        console.log("Giriş bilgileri hatalı");
        return null;
      },
    }),
  ],
  callbacks: {
    async session({ token, session }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token }) {
      return token;
    }
  }
})