import BankCard from '@/components/BankCard';
import HeaderBox from '@/components/HeaderBox';
import { getAccounts } from '@/lib/actions/bank.actions';
import { getTransactionsByBankId } from '@/lib/actions/transaction.actions';
import { getLoggedInUser } from '@/lib/actions/user.actions';
import React from 'react'
import { redirect } from 'next/navigation'; // <-- 1. IMPORT EKLENDİ

const MyBanks = async () => {
  const loggedIn = await getLoggedInUser();

  // --- 🛡️ KORUMA KALKANI 🛡️ ---
  // Kullanıcı giriş yapmamışsa (null ise), aşağı inip $id okumaya çalışma.
  // Direkt giriş sayfasına yönlendir.
  if (!loggedIn) {
    redirect('/sign-in');
  }
  // -----------------------------

  const accounts = await getAccounts({ 
    userId: loggedIn.$id 
  })

  // Hesaplar gelmediyse (veya hata varsa) sessizce çık
  if (!accounts) return null;

  // --- 😈 ÇAKALCA MOD V3 (MY BANKS SAYFASI) 😈 ---
  // Tüm hesapları gezip, veritabanındaki işlemleri kontrol ederek
  // bakiyelerini güncelliyoruz.
  if (accounts && accounts.data) {
    await Promise.all(accounts.data.map(async (account: any) => {
        
        const dbTransactions = await getTransactionsByBankId({ bankId: account.appwriteItemId });

        if (dbTransactions && dbTransactions.documents) {
            dbTransactions.documents.forEach((t: any) => {
                const amount = parseFloat(t.amount);

                // A) GÖNDEREN BU HESAPSA -> Bakiyeden Düş
                if (t.senderBankId === account.appwriteItemId) {
                    account.currentBalance -= amount;
                    account.availableBalance -= amount;
                }

                // B) ALICI BU HESAPSA -> Bakiyeye Ekle
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
    <section className='flex'>
      <div className="my-banks">
        <HeaderBox 
          title="My Bank Accounts"
          subtext="Effortlessly manage your banking activites."
        />

        <div className="space-y-4">
          <h2 className="header-2">
            Your cards
          </h2>
          <div className="flex flex-wrap gap-6">
            {accounts && accounts.data.map((a: Account) => (
              <BankCard 
                key={a.id}
                account={a}
                userName={loggedIn?.firstName}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default MyBanks