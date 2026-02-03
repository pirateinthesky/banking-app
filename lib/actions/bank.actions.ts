'use server';

import {
  AchDetails,
  CountryCode,
  TransferAuthorizationCreateRequest,
  TransferCreateRequest,
  TransferNetwork,
  TransferType,
} from "plaid";

import { plaidClient } from '@/lib/plaid';
import { parseStringify } from "../utils";

import { getTransactionsByBankId } from "./transaction.actions";
import { getBanks, getBank } from "./user.actions";

// 1. ÇOKLU BANKA HESAPLARINI GETİR (BAKİYE DÜZELTİLDİ)
export const getAccounts = async ({ userId }: getAccountsProps) => {
  try {
    const banks = await getBanks({ userId });

    if (!banks || banks.length === 0) {
        return parseStringify({ data: [], totalBanks: 0, totalCurrentBalance: 0 });
    }

    const accounts = await Promise.all(
      banks.map(async (bank: Bank) => {
        const accountsResponse = await plaidClient.accountsGet({
          access_token: bank.accessToken,
        });
        const accountData = accountsResponse.data.accounts[0];

        const institution = await getInstitution({
          institutionId: accountsResponse.data.item.institution_id!,
        });

        // --- ÇAKAL MOD (Ana Sayfa İçin) ---
        // Veritabanındaki işlemleri bu hesap için de çekiyoruz
        const transferTransactions = await getTransactionsByBankId({
            bankId: accountData.account_id, // Plaid ID kullanıyoruz
        });

        let totalSent = 0;
        let totalReceived = 0;

        // Hesaplamayı yap
        if(transferTransactions) {
            transferTransactions.forEach((t: any) => {
                if (t.senderBankId === accountData.account_id) {
                    totalSent += t.amount;
                } else if (t.receiverBankId === accountData.account_id) {
                    totalReceived += t.amount;
                }
            });
        }

        // Güncel bakiyeyi hesapla
        const realCurrentBalance = accountData.balances.current! - totalSent + totalReceived;
        // ----------------------------------

        const account = {
          id: accountData.account_id,
          availableBalance: accountData.balances.available!,
          currentBalance: realCurrentBalance, // <-- ARTIK GÜNCEL!
          institutionId: institution.institution_id,
          name: accountData.name,
          officialName: accountData.official_name,
          mask: accountData.mask!,
          type: accountData.type as string,
          subtype: accountData.subtype! as string,
          appwriteItemId: bank.appwriteItemId,
          shareableId: bank.shareableId,
          fundingSourceUrl: bank.fundingSourceUrl,
          userId: bank.userId,
        };

        return account;
      })
    );

    const totalBanks = accounts.length;
    const totalCurrentBalance = accounts.reduce((total, account) => {
      return total + account.currentBalance;
    }, 0);

    return parseStringify({ data: accounts, totalBanks, totalCurrentBalance });
  } catch (error) {
    console.error("An error occurred while getting the accounts:", error);
  }
};

// 2. TEK BİR HESABI GETİR (Burası zaten tamamdı)
export const getAccount = async ({ appwriteItemId }: getAccountProps) => {
  try {
    if (!appwriteItemId) return null;

    const bank = await getBank({ documentId: appwriteItemId });

    if (!bank) return null;

    const accountsResponse = await plaidClient.accountsGet({
      access_token: bank.accessToken,
    });
    const accountData = accountsResponse.data.accounts[0];

    // --- VERİTABANI İŞLEMLERİNİ ÇEK ---
    const transferTransactions = await getTransactionsByBankId({
      bankId: bank.accountId,
    });

    const transferTransactionsCust = transferTransactions.map(
      (transferData: Transaction) => {
        const amount = transferData.amount;
        const senderBankId = transferData.senderBankId;

        return {
          id: transferData.id,
          name: transferData.name,
          amount: amount,
          date: transferData.date,
          paymentChannel: transferData.channel,
          category: transferData.category,
          type: senderBankId === bank.accountId ? "debit" : "credit",
          accountId: bank.accountId,
          amountOriginal: amount,
          currency: 'USD',
          image: transferData.receiverBankId ? '/icons/transfer.svg' : undefined,
        };
      }
    );

    // --- ÇAKAL MOD (Detay Sayfası İçin) ---
    let totalSent = 0;
    let totalReceived = 0;

    transferTransactions.forEach((t: any) => {
      if (t.senderBankId === bank.accountId) {
        totalSent += t.amount;
      } else if (t.receiverBankId === bank.accountId) {
        totalReceived += t.amount;
      }
    });

    const realCurrentBalance = accountData.balances.current! - totalSent + totalReceived;
    // --------------------------------------

    const institution = await getInstitution({
      institutionId: accountsResponse.data.item.institution_id!,
    });

    const transactions = await getTransactions({
      accessToken: bank.accessToken,
    });

    const account = {
      id: accountData.account_id,
      availableBalance: accountData.balances.available!,
      currentBalance: realCurrentBalance, // Güncel bakiye
      institutionId: institution.institution_id,
      name: accountData.name,
      officialName: accountData.official_name,
      mask: accountData.mask!,
      type: accountData.type as string,
      subtype: accountData.subtype! as string,
      appwriteItemId: bank.appwriteItemId,
      shareableId: bank.shareableId,
      fundingSourceUrl: bank.fundingSourceUrl,
      userId: bank.userId,
    };

    const allTransactions = [...transactions, ...transferTransactionsCust].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return parseStringify({
      data: account,
      transactions: allTransactions,
    });
  } catch (error) {
    console.error("An error occurred while getting the account:", error);
  }
};

// 3. KURUM BİLGİSİ
export const getInstitution = async ({
  institutionId,
}: getInstitutionProps) => {
  try {
    const institutionResponse = await plaidClient.institutionsGetById({
      institution_id: institutionId,
      country_codes: ["US"] as CountryCode[],
    });

    const intitution = institutionResponse.data.institution;

    return parseStringify(intitution);
  } catch (error) {
    console.error("An error occurred while getting the institution:", error);
  }
};

// 4. PLAID İŞLEMLERİ
export const getTransactions = async ({
  accessToken,
}: getTransactionsProps) => {
  let hasMore = true;
  let transactions: any = [];

  try {
    let cursor = undefined;

    while (hasMore) {
      const response = await plaidClient.transactionsSync({
        access_token: accessToken,
        cursor: cursor,
      });

      const data = response.data;

      transactions = response.data.added.map((transaction) => ({
        id: transaction.transaction_id,
        name: transaction.name,
        paymentChannel: transaction.payment_channel,
        type: transaction.payment_channel,
        accountId: transaction.account_id,
        amount: transaction.amount,
        pending: transaction.pending,
        category: transaction.category ? transaction.category[0] : "",
        date: transaction.date,
        image: transaction.logo_url,
      }));

      hasMore = data.has_more;
      cursor = data.next_cursor;
    }

    return parseStringify(transactions);
  } catch (error) {
    return []; 
  }
};