/**
 * Currency Service
 * Handles currency detection, conversion, and localization
 */

import fetch from 'node-fetch';

interface CurrencyRate {
  code: string;
  rate: number;
  symbol: string;
  name: string;
  countryCodes: string[];
}

export interface UserCurrency {
  country: string;
  currency: string;
  symbol: string;
  rate: number; // conversion rate from USD
}

export class CurrencyService {
  private currencyRates: Map<string, CurrencyRate> = new Map();
  private lastUpdated: Date | null = null;
  private updateInterval: number = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    this.initializeDefaultRates();
  }

  /**
   * Initialize default currency rates (hardcoded for development)
   * In production, these would be fetched from an API
   */
  private initializeDefaultRates() {
    const rates: CurrencyRate[] = [
      { code: 'USD', rate: 1, symbol: '$', name: 'US Dollar', countryCodes: ['US'] },
      { code: 'EUR', rate: 0.85, symbol: '€', name: 'Euro', countryCodes: ['DE', 'FR', 'ES', 'IT', 'NL', 'BE', 'AT', 'FI', 'PT', 'IE', 'GR', 'CY', 'MT', 'SK', 'SI', 'LV', 'LT', 'EE', 'LU'] },
      { code: 'GBP', rate: 0.73, symbol: '£', name: 'British Pound', countryCodes: ['GB'] },
      { code: 'JPY', rate: 110, symbol: '¥', name: 'Japanese Yen', countryCodes: ['JP'] },
      { code: 'AUD', rate: 1.35, symbol: 'A$', name: 'Australian Dollar', countryCodes: ['AU'] },
      { code: 'CAD', rate: 1.25, symbol: 'C$', name: 'Canadian Dollar', countryCodes: ['CA'] },
      { code: 'INR', rate: 75, symbol: '₹', name: 'Indian Rupee', countryCodes: ['IN'] },
      { code: 'CNY', rate: 6.45, symbol: '¥', name: 'Chinese Yuan', countryCodes: ['CN'] },
      { code: 'BRL', rate: 5.2, symbol: 'R$', name: 'Brazilian Real', countryCodes: ['BR'] },
      { code: 'MXN', rate: 20, symbol: 'MX$', name: 'Mexican Peso', countryCodes: ['MX'] },
      { code: 'KRW', rate: 1180, symbol: '₩', name: 'South Korean Won', countryCodes: ['KR'] },
      { code: 'ZAR', rate: 14.5, symbol: 'R', name: 'South African Rand', countryCodes: ['ZA'] },
      { code: 'SGD', rate: 1.35, symbol: 'S$', name: 'Singapore Dollar', countryCodes: ['SG'] },
      { code: 'HKD', rate: 7.8, symbol: 'HK$', name: 'Hong Kong Dollar', countryCodes: ['HK'] },
      { code: 'NZD', rate: 1.42, symbol: 'NZ$', name: 'New Zealand Dollar', countryCodes: ['NZ'] },
      { code: 'SEK', rate: 8.5, symbol: 'kr', name: 'Swedish Krona', countryCodes: ['SE'] },
      { code: 'NOK', rate: 8.6, symbol: 'kr', name: 'Norwegian Krone', countryCodes: ['NO'] },
      { code: 'DKK', rate: 6.35, symbol: 'kr', name: 'Danish Krone', countryCodes: ['DK'] },
      { code: 'CHF', rate: 0.92, symbol: 'CHF', name: 'Swiss Franc', countryCodes: ['CH'] },
      { code: 'PLN', rate: 3.9, symbol: 'zł', name: 'Polish Zloty', countryCodes: ['PL'] },
      { code: 'CZK', rate: 21.5, symbol: 'Kč', name: 'Czech Koruna', countryCodes: ['CZ'] },
      { code: 'HUF', rate: 295, symbol: 'Ft', name: 'Hungarian Forint', countryCodes: ['HU'] },
      { code: 'RUB', rate: 73, symbol: '₽', name: 'Russian Ruble', countryCodes: ['RU'] },
      { code: 'TRY', rate: 8.5, symbol: '₺', name: 'Turkish Lira', countryCodes: ['TR'] },
      { code: 'AED', rate: 3.67, symbol: 'د.إ', name: 'UAE Dirham', countryCodes: ['AE'] },
      { code: 'SAR', rate: 3.75, symbol: '﷼', name: 'Saudi Riyal', countryCodes: ['SA'] },
      { code: 'ILS', rate: 3.2, symbol: '₪', name: 'Israeli Shekel', countryCodes: ['IL'] },
      { code: 'IDR', rate: 14200, symbol: 'Rp', name: 'Indonesian Rupiah', countryCodes: ['ID'] },
      { code: 'MYR', rate: 4.15, symbol: 'RM', name: 'Malaysian Ringgit', countryCodes: ['MY'] },
      { code: 'THB', rate: 31, symbol: '฿', name: 'Thai Baht', countryCodes: ['TH'] },
      { code: 'PHP', rate: 50, symbol: '₱', name: 'Philippine Peso', countryCodes: ['PH'] },
      { code: 'CLP', rate: 780, symbol: '$', name: 'Chilean Peso', countryCodes: ['CL'] },
      { code: 'COP', rate: 3750, symbol: '$', name: 'Colombian Peso', countryCodes: ['CO'] },
      { code: 'PEN', rate: 3.55, symbol: 'S/', name: 'Peruvian Sol', countryCodes: ['PE'] },
      { code: 'ARS', rate: 98, symbol: '$', name: 'Argentine Peso', countryCodes: ['AR'] },
      { code: 'EGP', rate: 15.7, symbol: '£', name: 'Egyptian Pound', countryCodes: ['EG'] },
      { code: 'NGN', rate: 411, symbol: '₦', name: 'Nigerian Naira', countryCodes: ['NG'] },
      { code: 'PKR', rate: 166, symbol: '₨', name: 'Pakistani Rupee', countryCodes: ['PK'] },
      { code: 'BDT', rate: 84.5, symbol: '৳', name: 'Bangladeshi Taka', countryCodes: ['BD'] },
      { code: 'VND', rate: 22800, symbol: '₫', name: 'Vietnamese Dong', countryCodes: ['VN'] }
    ];

    rates.forEach(rate => {
      this.currencyRates.set(rate.code, rate);
    });
  }

  /**
   * Detect user's currency based on IP geolocation
   * In development, accepts country code parameter
   */
  async detectUserCurrency(ip?: string, countryCode?: string): Promise<UserCurrency> {
    try {
      // Development mode: accept country from request headers
      if (countryCode && this.currencyRates.has(this.getCurrencyByCountry(countryCode))) {
        const currency = this.getCurrencyByCountry(countryCode);
        const rateInfo = this.currencyRates.get(currency)!;
        return {
          country: countryCode,
          currency: currency,
          symbol: rateInfo.symbol,
          rate: rateInfo.rate
        };
      }

      // In production, would use IP geolocation service like:
      // const response = await fetch(`https://ipapi.co/${ip}/json/`);
      // const data = await response.json();
      // const currency = this.getCurrencyByCountry(data.country_code);

      // For development, default to USD
      const defaultRate = this.currencyRates.get('USD')!;
      return {
        country: 'US',
        currency: 'USD',
        symbol: defaultRate.symbol,
        rate: defaultRate.rate
      };
    } catch (error) {
      console.error('Error detecting user currency:', error);
      // Fallback to USD
      const defaultRate = this.currencyRates.get('USD')!;
      return {
        country: 'US',
        currency: 'USD',
        symbol: defaultRate.symbol,
        rate: defaultRate.rate
      };
    }
  }

  /**
   * Get currency code by country code
   */
  private getCurrencyByCountry(countryCode: string): string {
    for (const [currency, rate] of this.currencyRates) {
      if (rate.countryCodes.includes(countryCode)) {
        return currency;
      }
    }
    return 'USD'; // Default to USD
  }

  /**
   * Convert USD price to target currency
   */
  convertPrice(usdPrice: number, targetCurrency: string): number {
    const rateInfo = this.currencyRates.get(targetCurrency);
    if (!rateInfo) {
      return usdPrice;
    }
    return usdPrice * rateInfo.rate;
  }

  /**
   * Get currency info by code
   */
  getCurrencyInfo(currencyCode: string): CurrencyRate | undefined {
    return this.currencyRates.get(currencyCode);
  }

  /**
   * Get all supported currencies
   */
  getSupportedCurrencies(): CurrencyRate[] {
    return Array.from(this.currencyRates.values());
  }

  /**
   * Format price in local currency
   */
  formatPrice(usdPrice: number, currencyCode: string, locale?: string): string {
    const rateInfo = this.currencyRates.get(currencyCode);
    if (!rateInfo) {
      // Fallback to USD formatting
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(usdPrice);
    }

    const convertedPrice = usdPrice * rateInfo.rate;

    // Use locale if provided, otherwise use default locale for currency
    const localeMap: Record<string, string> = {
      'USD': 'en-US',
      'EUR': 'de-DE',
      'GBP': 'en-GB',
      'JPY': 'ja-JP',
      'INR': 'en-IN',
      'CNY': 'zh-CN',
      'BRL': 'pt-BR',
      'MXN': 'es-MX',
      'CAD': 'en-CA',
      'AUD': 'en-AU'
    };

    const targetLocale = locale || localeMap[currencyCode] || 'en-US';

    try {
      return new Intl.NumberFormat(targetLocale, {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: currencyCode === 'JPY' ? 0 : 2,
        maximumFractionDigits: currencyCode === 'JPY' ? 0 : 2
      }).format(convertedPrice);
    } catch (error) {
      // Fallback to symbol formatting
      const symbol = rateInfo.symbol;
      return `${symbol}${convertedPrice.toFixed(2)}`;
    }
  }

  /**
   * Update exchange rates from external API
   * In production, this would fetch from a service like exchangerate-api.com
   */
  async updateExchangeRates(): Promise<void> {
    try {
      // Example: Fetch from exchangerate-api.com
      // const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      // const data = await response.json();
      // Update rates...

      this.lastUpdated = new Date();
      console.log('Exchange rates updated at:', this.lastUpdated);
    } catch (error) {
      console.error('Error updating exchange rates:', error);
    }
  }

  /**
   * Get conversion rate between two currencies
   */
  getConversionRate(from: string, to: string): number {
    const fromRate = this.currencyRates.get(from)?.rate || 1;
    const toRate = this.currencyRates.get(to)?.rate || 1;
    return toRate / fromRate;
  }
}

export const currencyService = new CurrencyService();
