import HeaderBox from '@/components/HeaderBox'
import { Pagination } from '@/components/Pagination';
import TransactionsTable from '@/components/TransactionsTable';
import { getAccount, getAccounts } from '@/lib/actions/bank.actions';
import { getLoggedInUser } from '@/lib/actions/user.actions';
import { getTransactionsByBankId } from '@/lib/actions/transaction.actions'; 
import { formatAmount } from '@/lib/utils';
import { BankTabItem } from '@/components/BankTabItem'; // TAB IMPORT
import React from 'react'

const TransactionHistory = async ({ searchParams: { id, page }}: SearchParamProps) => {
  const currentPage = Number(page as string) || 1;
  const loggedIn = await getLoggedInUser();
  const accounts = await getAccounts({ 
    userId: loggedIn.$id 
  })

  if(!accounts || !accounts.data || accounts.data.length === 0) return;
  
  const accountsData = accounts?.data;
  const appwriteItemId = (id as string) || accountsData[0]?.appwriteItemId;

  const account = await getAccount({ appwriteItemId })

  if (account && account.data && appwriteItemId) {
    try {
        if (typeof appwriteItemId === 'string' && appwriteItemId.trim().length > 0) {
            const dbTransactions = await getTransactionsByBankId({ bankId: appwriteItemId });
            if (dbTransactions && dbTransactions.documents) {
                dbTransactions.documents.forEach((t: any) => {
                    const amount = parseFloat(t.amount);
                    if (t.senderBankId === appwriteItemId) {
                        account.data.currentBalance -= amount;
                        if (typeof account.data.availableBalance === 'number') {
                            account.data.availableBalance -= amount;
                        }
                    }
                    if (t.receiverBankId === appwriteItemId) {
                        account.data.currentBalance += amount;
                        if (typeof account.data.availableBalance === 'number') {
                            account.data.availableBalance += amount;
                        }
                    }
                });
            }
        }
    } catch (error) {
        console.log("Çakalca Mod Hatası:", error);
    }
  }
  // --- MOD BİTİŞ ---

  const rowsPerPage = 10;
  const totalPages = Math.ceil(account?.transactions.length / rowsPerPage);
  const indexOfLastTransaction = currentPage * rowsPerPage;
  const indexOfFirstTransaction = indexOfLastTransaction - rowsPerPage;
  const currentTransactions = account?.transactions.slice(
    indexOfFirstTransaction, indexOfLastTransaction
  )

  return (
    <div className="transactions">
      <div className="transactions-header">
        <HeaderBox
          title="Transaction History"
          subtext="See your bank details and transactions."
        />
      </div>

      <div className="space-y-6">
        
        {/* --- TAB KISMI (BURASI EKLENDİ) --- */}
        <div className="transactions-account">
          <div className="flex flex-col gap-2">
            
            <h2 className="text-18 font-bold text-white">{account?.data.name}</h2>
            <p className="text-14 text-blue-25">
              {account?.data.officialName}
            </p>
            <p className="text-14 font-semibold tracking-[1.1px] text-white">
              ●●●● ●●●● ●●●● {account?.data.mask}
            </p>
          </div>
          
          <div className='transactions-account-balance'>
            <p className="text-14">Current Balance</p>
            <p className="text-24 text-center font-bold">
              {formatAmount(account?.data.currentBalance)}
            </p>
          </div>
        </div>

        {/* Sekmeler Mavi Kutunun ALTINA gelir */}
        <div className="flex items-center gap-4">
          {accountsData.map((a: Account) => (
             <BankTabItem 
               key={a.id}
               account={a}
               appwriteItemId={appwriteItemId}
             />
          ))}
        </div>

        <section className="flex w-full flex-col gap-6">
          <TransactionsTable 
            transactions={currentTransactions}
          />
            {totalPages > 1 && (
              <div className="my-4 w-full">
                <Pagination totalPages={totalPages} page={currentPage} />
              </div>
            )}
        </section>
      </div>
    </div>
  )
}

export default TransactionHistory