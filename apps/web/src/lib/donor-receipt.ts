export function generateDonorReceipt({
  receiptNumber,
  welfareGroup,
  welfareGroupAddress,
  amount,
  currency,
  donorName,
  paymentDate,
  utr,
  status,
  purpose,
  note,
  upiIdSnapshot,
  upiNameSnapshot,
  verifiedAt,
  rejectionReason,
  createdAt,
}: {
  receiptNumber: string;
  welfareGroup: string;
  welfareGroupAddress: string | null;
  amount: number;
  currency: string;
  donorName: string;
  paymentDate: string;
  utr: string;
  status: string;
  purpose: string | null;
  note: string | null;
  upiIdSnapshot: string;
  upiNameSnapshot: string;
  verifiedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
}) {
  const lines = [
    "=".repeat(48),
    "FINDING ASTRO - DONATION RECEIPT",
    "=".repeat(48),
    "",
    `Receipt Number : ${receiptNumber}`,
    `Date           : ${paymentDate}`,
    `Status         : ${status}`,
    "",
    "-".repeat(48),
    "DONOR DETAILS",
    "-".repeat(48),
    `Name           : ${donorName}`,
    "",
    "-".repeat(48),
    "DONATION DETAILS",
    "-".repeat(48),
    `Amount         : ${currency} ${amount.toFixed(2)}`,
    `UTR            : ${utr}`,
    `UPI ID         : ${upiIdSnapshot}`,
    `UPI Name       : ${upiNameSnapshot}`,
    `Purpose        : ${purpose ?? "General donation"}`,
    `Note           : ${note ?? "-"}`,
    "",
    "-".repeat(48),
    "WELFARE ORGANIZATION",
    "-".repeat(48),
    `Name           : ${welfareGroup}`,
    `Address        : ${welfareGroupAddress ?? "-"}`,
    "",
    "-".repeat(48),
    "VERIFICATION",
    "-".repeat(48),
    `Verified At    : ${verifiedAt ?? "Pending"}`,
    `Rejection Reason: ${rejectionReason ?? "-"}`,
    "",
    "=".repeat(48),
    "Thank you for supporting animal welfare.",
    "This is a system-generated receipt.",
    "=".repeat(48),
  ];

  return lines.join("\n");
}
