export function txLabel(tx: any): string {
  if (tx?.description) return tx.description;
  switch (tx?.type) {
    case "deposit":
      return "Wallet Funding";
    case "sms_purchase":
      return "SMS Purchase";
    case "marketplace_purchase":
      return "Marketplace Purchase";
    case "store_purchase":
      return "Store Purchase";
    default:
      return "Transaction";
  }
}