'use server';

import { Client } from "dwolla-v2";

// 1. ORTAM AYARLARINI YAP
const getEnvironment = () => {
  const environment = process.env.DWOLLA_ENV as string;

  switch (environment) {
    case "sandbox":
      return "sandbox";
    case "production":
      return "production";
    default:
      throw new Error(
        "Dwolla environment should either be set to `sandbox` or `production`"
      );
  }
};

// 2. DWOLLA İSTEMCİSİNİ BAŞLAT (Hata burada çıkıyordu, şimdi en tepede tanımlı)
const dwollaClient = new Client({
  environment: getEnvironment(),
  key: process.env.DWOLLA_KEY as string,
  secret: process.env.DWOLLA_SECRET as string,
});

// --- FONKSİYONLAR ---

export const createDwollaCustomer = async (newCustomer: NewDwollaCustomerParams) => {
  try {
    return await dwollaClient
      .post("customers", newCustomer)
      .then((res) => res.headers.get("location"));
  } catch (error) {
    console.error("Creating a Dwolla Customer Failed: ", error);
  }
};

export const createTransfer = async ({
  sourceFundingSourceUrl,
  destinationFundingSourceUrl,
  amount,
}: TransferParams) => {
  try {
    const requestBody = {
      _links: {
        source: {
          href: sourceFundingSourceUrl,
        },
        destination: {
          href: destinationFundingSourceUrl,
        },
      },
      amount: {
        currency: "USD",
        value: amount,
      },
    };

    return await dwollaClient
      .post("transfers", requestBody)
      .then((res) => res.headers.get("location"));
  } catch (error) {
    console.error("Creating a Dwolla Transfer Failed: ", error);
  }
};

// BANKA BAĞLAMA (Hata Yönetimi Eklenmiş Hali)
export const addFundingSource = async ({
  dwollaCustomerId,
  processorToken,
  bankName,
}: AddFundingSourceParams) => {
  try {
    // dwolla-v2 client for creating a funding source
    const dwollaAuthLinks = await dwollaClient
      .post(`customers/${dwollaCustomerId}/funding-sources`, {
        name: bankName,
        plaidToken: processorToken,
      });
      
    return dwollaAuthLinks.headers.get("location");
  } catch (error: any) {
    // HATA YAKALAMA: Eğer banka zaten ekliyse (DuplicateResource), var olanın linkini dön.
    if (error && error.body && error.body.code === "DuplicateResource") {
      console.log("Dwolla: Banka zaten ekli, mevcut ID kullanılıyor.");
      return error.body._links.about.href;
    }

    console.error("Adding a Funding Source Failed: ", error);
  }
};