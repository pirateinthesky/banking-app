import BankCard from '@/components/BankCard';
import HeaderBox from '@/components/HeaderBox';
import { getAccounts } from '@/lib/actions/bank.actions';
import { getTransactionsByBankId } from '@/lib/actions/transaction.actions'; // Veritabanı erişimi
import { getLoggedInUser } from '@/lib/actions/user.actions';
import React from 'react'

const MyBanks = async () => {
  const loggedIn = await getLoggedInUser();
  const accounts = await getAccounts({ 
    userId: loggedIn.$id 
  })

  // Burada tüm kartları gezip, veritabanındaki işlemleri kontrol ederek
  // bakiyelerini güncelleyeceğiz.
  
  if (accounts && accounts.data) {
    // Promise.all kullanarak tüm hesaplar için işlemleri paralel yapıyoruz (Hız düşmesin)
    await Promise.all(accounts.data.map(async (account: any) => {
        
        // Bu hesaba ait işlemleri veritabanından çek
        const dbTransactions = await getTransactionsByBankId({ bankId: account.appwriteItemId });

        if (dbTransactions && dbTransactions.documents) {
            // İşlemleri gez ve bakiyeyi güncelle
            dbTransactions.documents.forEach((t: any) => {
                const amount = parseFloat(t.amount);

                // A) GÖNDEREN BU HESAPSA -> Bakiyeden Düş
                if (t.senderBankId === account.appwriteItemId) {
                    account.currentBalance -= amount;
                    account.availableBalance -= amount; // Varsa available da düşsün
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