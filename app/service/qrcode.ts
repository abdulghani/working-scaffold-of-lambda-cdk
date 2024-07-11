import { EMVParser } from "emvqrcode-tools";
import {
  AdditionalDataFieldTemplate,
  IEMVQR
} from "emvqrcode-tools/src/emv/types";

import { POS } from "./pos";

export type GenerateQROptions = Partial<POS> & {
  amount: number;
  customer_name?: string;
  order_number?: string;
};

const MERCHANT_CATEGORY_CODE = "5812"; // Eating Places & Restaurants
const CURRENCY_CODE = "360"; // IDR
const DEFAULT_MERCHANT_CITY = "Jakarta";

export function generateQRData(options: GenerateQROptions): string {
  if (!options.base_payment_qr) {
    throw new Error("POS does not have base_payment_qr");
  }

  const template = AdditionalDataFieldTemplate();
  const emv = EMVParser.toEMVQR(options.base_payment_qr) as IEMVQR;

  emv.setMerchantCategoryCode(MERCHANT_CATEGORY_CODE);
  emv.setMerchantName(options.name);
  emv.setTransactionCurrency(CURRENCY_CODE);
  emv.setTransactionAmount(options.amount);
  emv.setMerchantCity(DEFAULT_MERCHANT_CITY);
  // template.setStoreLabel(options.name);

  if (options.order_number && options.customer_name) {
    /** DOESN'T WORK WITH SHOPEE PAY */
    // emv.setMerchantCity(
    //   `Pesanan ${options.order_number}, ${options.customer_name}`
    // );
    /** DOESN'T WORK WITH BCA M-BANKING */
    // template.setBillNumber(options.order_number);
    // template.setCustomerLabel(options.customer_name);
    // template.setPurposeTransaction(
    //   `Pembayaran pesanan ${options.order_number}, ${options.customer_name}`
    // );
  }

  // emv.setAdditionalDataFieldTemplate(template);

  return emv.generatePayload();
}
