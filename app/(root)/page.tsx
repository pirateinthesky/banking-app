import HeaderBox from '@/components/HeaderBox'
import RecentTransactions from '@/components/RecentTransactions';
import RightSidebar from '@/components/RightSidebar';
import TotalBalanceBox from '@/components/TotalBalanceBox';
import { getAccounts, getAccount } from '@/lib/actions/bank.actions';
import { getLoggedInUser } from '@/lib/actions/user.actions';
import { getTransactionsByBankId } from '@/lib/actions/transaction.actions';
import { redirect } from 'next/navigation'; // <--- 1. BURASI EKLENDİ

const Home = async ({ searchParams: { id, page } }: SearchParamProps) => {
  const currentPage = Number(page as string) || 1;
  const loggedIn = await getLoggedInUser();

  
  if (!loggedIn) {
    redirect('/sign-in');
  }
  // -------------------------------------------------------------------------------

  const accounts = await getAccounts({ 
    userId: loggedIn.$id 
  })

  if(!accounts) return;
  
  const accountsData = accounts?.data;

  // --- Hesaplamalar (Senin yazdığın özel mantık korunuyor) ---
  if (accountsData) {
    // 1. Hesapları gez ve bakiyeleri güncelle
    await Promise.all(accountsData.map(async (acc: any) => {
        try {
            const dbTransactions = await getTransactionsByBankId({ bankId: acc.appwriteItemId });
            
            if (dbTransactions && dbTransactions.documents) {
                dbTransactions.documents.forEach((t: any) => {
                    const amount = parseFloat(t.amount);

                    // Para Çıkışı
                    if (t.senderBankId === acc.appwriteItemId) {
                        acc.currentBalance -= amount;
                        if (typeof acc.availableBalance === 'number') {
                            acc.availableBalance -= amount;
                        }
                    }

                    // Para Girişi
                    if (t.receiverBankId === acc.appwriteItemId) {
                        acc.currentBalance += amount;
                        if (typeof acc.availableBalance === 'number') {
                            acc.availableBalance += amount;
                        }
                    }
                });
            }
        } catch (error) {
            console.log("Bakiye güncelleme hatası:", error);
        }
        return acc;
    }));
  }

  // 2. YENİ ADIM: Güncellenmiş bakiyeleri toplayıp 'Gerçek Toplam'ı buluyoruz
  let totalCurrentBalance = 0;
  if (accountsData) {
    totalCurrentBalance = accountsData.reduce((sum: number, acc: any) => {
        return sum + acc.currentBalance;
    }, 0);
  }
  // --- MOD BİTİŞ ---

// Eğer accountsData boşsa veya yoksa, appwriteItemId null olsun (patlamasın)
const appwriteItemId = (id as string) || (accountsData && accountsData.length > 0 ? accountsData[0].appwriteItemId : null);

// Eğer ID varsa getir, yoksa null olsun
const account = appwriteItemId ? await getAccount({ appwriteItemId }) : null;

  // Seçili hesap verisini de güncel listeden eşle
  const currentAccountData = accountsData.find((a: any) => a.appwriteItemId === appwriteItemId);
  if (currentAccountData && account) {
      account.data.currentBalance = currentAccountData.currentBalance;
      account.data.availableBalance = currentAccountData.availableBalance;
  }

  return (
    <section className="home">
      <div className="home-content">
        <header className="home-header">
          <HeaderBox 
            type="greeting"
            title="Welcome"
            user={loggedIn?.firstName || 'Guest'}
            subtext="Access and manage your account and transactions efficiently."
          />

          <TotalBalanceBox 
            accounts={accountsData} 
            totalBanks={accounts?.totalBanks}
            // ARTIK BURAYA HESAPLADIĞIMIZ YENİ TOPLAMI VERİYORUZ 👇
            totalCurrentBalance={totalCurrentBalance}
          />
        </header>

        <RecentTransactions 
          accounts={accountsData}
          transactions={account?.transactions}
          appwriteItemId={appwriteItemId}
          page={currentPage}
        />
      </div>

      <RightSidebar 
        user={loggedIn}
        transactions={account?.transactions}
        banks={accountsData?.slice(0, 2)}
      />
    </section>
  )
}

export default Home