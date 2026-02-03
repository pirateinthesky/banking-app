'use server';

import { signIn as nextAuthSignIn, auth } from "@/lib/auth"; 
import { db } from "@/lib/db"; 
import bcrypt from "bcryptjs"; 
import { revalidatePath } from "next/cache";

import { extractCustomerIdFromUrl, parseStringify, encryptId } from "../utils";
import { CountryCode, ProcessorTokenCreateRequest, ProcessorTokenCreateRequestProcessorEnum, Products } from "plaid";
import { plaidClient } from '@/lib/plaid';
import { addFundingSource, createDwollaCustomer } from "./dwolla.actions";

// --- 1. KULLANICI BİLGİSİNİ GETİR ---
export const getUserInfo = async ({ userId }: getUserInfoProps) => {
  try {
    const user = await db.user.findUnique({
      where: {
        id: userId
      }
    });

    if (!user) return null;

    return parseStringify({ ...user, $id: user.id });
  } catch (error) {
    console.log(error)
  }
}

// --- 2. GİRİŞ YAP (Sign In) ---
export const signIn = async ({ email, password }: signInProps) => {
  try {
    const result = await nextAuthSignIn("credentials", {
      email,
      password,
      redirect: false, 
    });

    if (result?.error) {
      console.log("NextAuth Hatası:", result.error);
      return null;
    }

    return { success: true };
  } catch (error) {
    if ((error as Error).message.includes("NEXT_REDIRECT")) {
        return { success: true };
    }
    console.error('SignIn Error', error);
    return null;
  }
}

// --- 3. KAYIT OL (Sign Up) ---
export const signUp = async ({ password, ...userData }: SignUpParams) => {
  const { email, firstName, lastName } = userData;
  
  try {
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) throw new Error("User already exists");

    const hashedPassword = await bcrypt.hash(password, 10);

    const dwollaCustomerUrl = await createDwollaCustomer({
      ...userData,
      type: 'personal'
    });

    if (!dwollaCustomerUrl) throw new Error('Error creating Dwolla customer');

    const dwollaCustomerId = extractCustomerIdFromUrl(dwollaCustomerUrl);

    const newUser = await db.user.create({
      data: {
        ...userData,
        password: hashedPassword,
        dwollaCustomerId,
        dwollaCustomerUrl,
      }
    });

    return parseStringify({ ...newUser, $id: newUser.id });

  } catch (error) {
    console.error("SignUp Hatası:", error);
    return null;
  }
}

// --- 4. OTURUM AÇMIŞ KULLANICIYI GETİR ---
export const getLoggedInUser = async () => {
  try {
    const session = await auth();
    
    if (!session || !session.user) {
      return null;
    }

    const user = await db.user.findUnique({
      where: {
        id: session.user.id
      }
    });

    if (!user) return null;

    return parseStringify({ ...user, $id: user.id });
  } catch (error) {
    console.log("Oturum kontrol hatası:", error);
    return null;
  }
}

// --- 5. ÇIKIŞ YAP ---
export const logoutAccount = async () => {
  try {
    return true;
  } catch (error) {
    return null;
  }
}

// --- 6. PLAID LINK TOKEN ---
export const createLinkToken = async (user: User) => {
  try {
    const tokenParams = {
      user: {
        client_user_id: user.id || user.$id 
      },
      client_name: `${user.firstName} ${user.lastName}`,
      products: ['auth', 'transactions'] as Products[],
      language: 'en',
      country_codes: ['US'] as CountryCode[],
    }

    const response = await plaidClient.linkTokenCreate(tokenParams);

    return parseStringify({ linkToken: response.data.link_token })
  } catch (error) {
    console.log(error);
  }
}

// --- 7. BANKA HESABI OLUŞTUR (Veritabanına Kayıt) ---
export const createBankAccount = async ({
  userId,
  bankId,
  accountId, // EKSİK OLAN PARÇA BUYDU, ARTIK BURADA
  accessToken,
  fundingSourceUrl,
  shareableId,
}: createBankAccountProps) => {
  try {
    const bankAccount = await db.bankAccount.create({
      data: {
        userId,
        appwriteItemId: bankId,
        accessToken,
        fundingSourceUrl,
        shareableId,
        accountId, // Veritabanına bunu yazıyor
      }
    });

    return parseStringify(bankAccount);
  } catch (error) {
    console.log("Banka Kayıt Hatası:", error); // Hatayı görmek için log ekledim
  }
}

// --- 8. PUBLIC TOKEN DEĞİŞİMİ (Plaid -> DB Köprüsü) ---
export const exchangePublicToken = async ({
  publicToken,
  user,
}: exchangePublicTokenProps) => {
  try {
    const response = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });

    const accessToken = response.data.access_token;
    const itemId = response.data.item_id;
    
    const accountsResponse = await plaidClient.accountsGet({
      access_token: accessToken,
    });

    const accountData = accountsResponse.data.accounts[0];

    const request: ProcessorTokenCreateRequest = {
      access_token: accessToken,
      account_id: accountData.account_id,
      processor: "dwolla" as ProcessorTokenCreateRequestProcessorEnum,
    };

    const processorTokenResponse = await plaidClient.processorTokenCreate(request);
    const processorToken = processorTokenResponse.data.processor_token;

     const fundingSourceUrl = await addFundingSource({
      dwollaCustomerId: user.dwollaCustomerId,
      processorToken,
      bankName: accountData.name,
    });
    
    if (!fundingSourceUrl) throw Error;

    // BURASI ÇOK ÖNEMLİ: accountData.account_id verisini buraya ekledik!
    await createBankAccount({
      userId: user.$id || user.id, 
      bankId: itemId,
      accountId: accountData.account_id, // <--- İŞTE EKSİK PARÇA BURASIYDI!
      accessToken,
      fundingSourceUrl,
      shareableId: encryptId(accountData.account_id),
    });

    revalidatePath("/");

    return parseStringify({
      publicTokenExchange: "complete",
    });
  } catch (error) {
    console.error("An error occurred while creating exchanging token:", error);
  }
}

// --- 9. BANKALARI GETİR ---
export const getBanks = async ({ userId }: getBanksProps) => {
  try {
    const banks = await db.bankAccount.findMany({
      where: {
        userId: userId
      }
    });

    return parseStringify(banks);
  } catch (error) {
    console.log(error)
  }
}

// --- 10. TEK BANKA GETİR ---
export const getBank = async ({ documentId }: getBankProps) => {
  try {
    if (!documentId) return null; // Koruma

    // Önce ID (UUID) olarak dene
    let bank = await db.bankAccount.findUnique({
      where: {
        id: documentId
      }
    });

    // Eğer ID ile bulunamazsa, Plaid Item ID ile dene
    if (!bank) {
      bank = await db.bankAccount.findFirst({
        where: {
          appwriteItemId: documentId
        }
      });
    }

    if (!bank) return null;

    return parseStringify(bank);
  } catch (error) {
    console.log(error)
    return null;
  }
}

// --- 11. ACCOUNT ID'YE GÖRE BANKA GETİR (GÜNCELLENDİ: Kapsamlı Arama) ---
export const getBankByAccountId = async ({ accountId }: getBankByAccountIdProps) => {
  try {
    // GÜNCELLEME: Sadece accountId'ye değil, shareableId'ye de bakıyoruz.
    // Çünkü kopyaladığın ID şifrelenmiş olabilir.
    const bank = await db.bankAccount.findFirst({
      where: {
        OR: [
          { accountId: accountId },      // Normal Plaid ID
          { shareableId: accountId }     // Şifrelenmiş ID (Kopyalanan bu olabilir)
        ]
      }
    });

    if (!bank) return null;

    return parseStringify(bank);
  } catch (error) {
    console.log(error);
    return null;
  }
}