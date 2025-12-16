import HeaderBox from '@/components/HeaderBox'
import PaymentTransferForm from '@/components/PaymentTransferForm'
import { getAccounts } from '@/lib/actions/bank.actions';
import { getLoggedInUser } from '@/lib/actions/user.actions';
import { getTransactionsByBankId } from '@/lib/actions/transaction.actions'; // ÇAKAL MOD İÇİN GEREKLİ
import React from 'react'

const Transfer = async () => {
  const loggedIn = await getLoggedInUser();
  const accounts = await getAccounts({ 
    userId: loggedIn.$id 
  })

  if(!accounts) return null;

  const accountsData = accounts?.data;

  // --- 😈 ÇAKALCA MOD V3 (TRANSFER SAYFASI) 😈 ---
  // Transfer yaparken kullanıcının bakiyeyi doğru görmesi lazım.
  // Tüm hesapları gezip bakiyeleri güncelliyoruz.
  if (accountsData) {
    await Promise.all(accountsData.map(async (account: any) => {
        const dbTransactions = await getTransactionsByBankId({ bankId: account.appwriteItemId });
        if (dbTransactions && dbTransactions.documents) {
            dbTransactions.documents.forEach((t: any) => {
                const amount = parseFloat(t.amount);
                // Para Çıkışı
                if (t.senderBankId === account.appwriteItemId) {
                    account.currentBalance -= amount;
                    account.availableBalance -= amount;
                }
                // Para Girişi
                if (t.receiverBankId === account.appwriteItemId) {
                    account.currentBalance += amount;
                    account.availableBalance += amount;
                }
            });
        }
        return account;
    }));
  }
  // --- ÇAKALCA MOD BİTİŞ ---

  return (
    <section className="payment-transfer">
      <HeaderBox 
        title="Payment Transfer"
        subtext="Please provide any specific details or notes related to the payment transfer"
      />

      <section className="size-full pt-5">
        <PaymentTransferForm accounts={accountsData} />
      </section>
    </section>
  )
}

export default Transfer