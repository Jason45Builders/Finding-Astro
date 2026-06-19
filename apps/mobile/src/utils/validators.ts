export const validateRequired = (value: string, label: string): string | null => {
  if (!value.trim()) {
    return `${label} is required.`;
  }

  return null;
};

export const validatePhone = (phone: string): string | null => {
  const digits = phone.replace(/[^\d]/g, "");
  return digits.length >= 10 ? null : "Enter a valid phone number.";
};

export const validateOtp = (code: string): string | null =>
  /^\d{6}$/.test(code) ? null : "OTP must be a 6-digit code.";

export const splitCsv = (value: string): string[] =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
