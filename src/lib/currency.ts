// Currency configuration for the entire application
// Change DEFAULT_CURRENCY to switch currency across the app

export const DEFAULT_CURRENCY = "₹"; // Change this to your preferred currency symbol (e.g., "$", "€", "£", "₹")

/**
 * Format a number as currency with the configured symbol
 * @param amount - The numeric amount to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted currency string
 */
export const formatCurrency = (amount: number | null | undefined, decimals: number = 2): string => {
  if (amount === null || amount === undefined) {
    return `${DEFAULT_CURRENCY}0.00`;
  }
  return `${DEFAULT_CURRENCY}${Number(amount).toFixed(decimals)}`;
};

/**
 * Get the currency symbol
 * @returns The configured currency symbol
 */
export const getCurrencySymbol = (): string => {
  return DEFAULT_CURRENCY;
};
