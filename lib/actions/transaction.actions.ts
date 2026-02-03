'use server';

import { db } from "@/lib/db";
import { parseStringify } from "../utils";

// --- 1. İŞLEM OLUŞTUR ---
export const createTransaction = async (transaction: CreateTransactionProps) => {
  try {
    if (!transaction.senderId) {
      throw new Error("Transaction failed: Sender ID is missing.");
    }

    const newTransaction = await db.transaction.create({
      data: {
        channel: 'online',
        category: 'Transfer',
        name: transaction.name,
        amount: Number(transaction.amount),
        date: new Date(),
        senderId: transaction.senderId,
        senderBankId: transaction.senderBankId,
        receiverId: transaction.receiverId,
        receiverBankId: transaction.receiverBankId,
        email: transaction.email,
        user: {
          connect: { id: transaction.senderId }
        }
      }
    });

    return parseStringify(newTransaction);
  } catch (error) {
    console.log("Transaction oluşturma hatası:", error);
    return null; 
  }
}

// --- 2. BANKA İŞLEMLERİNİ GETİR (LİSTE DÜZELTMESİ) ---
export const getTransactionsByBankId = async ({bankId}: getTransactionsByBankIdProps) => {
  try {
    const senderTransactions = await db.transaction.findMany({
      where: {
        senderBankId: bankId,
      }
    })

    const receiverTransactions = await db.transaction.findMany({
      where: {
        receiverBankId: bankId,
      }
    });

    // DÜZELTME: Obje değil, direkt işlemlerin olduğu LİSTEYİ dönüyoruz.
    const transactions = [
        ...senderTransactions, 
        ...receiverTransactions,
    ];

    return parseStringify(transactions);
  } catch (error) {
    console.log(error);
    return []; // Hata durumunda boş liste dön
  }
}