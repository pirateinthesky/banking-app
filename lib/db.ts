import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

// Next.js development modunda her kayıtta yeni bağlantı açıp
// "Too many connections" hatası vermesin diye bu kontrolü yapıyoruz.
export const db = globalThis.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = db;
}