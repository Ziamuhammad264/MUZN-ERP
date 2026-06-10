import dayjs from 'dayjs';

/**
 * Format number as AED currency
 * @param {number} amount
 * @returns {string}
 */
export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) {
    amount = 0;
  }
  return new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency: 'AED',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

/**
 * Format date to standard readable format
 * @param {string|Date} date
 * @param {string} format
 * @returns {string}
 */
export const formatDate = (date, format = 'DD MMM YYYY') => {
  if (!date) return '—';
  return dayjs(date).format(format);
};

/**
 * Format relative date / days remaining
 * @param {string|Date} date
 * @returns {number}
 */
export const getDaysRemaining = (date) => {
  if (!date) return 0;
  const target = dayjs(date);
  const now = dayjs();
  return target.diff(now, 'day');
};
