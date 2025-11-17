import React, { createContext, useContext, useState, useEffect } from 'react';

interface Currency {
  code: string;
  symbol: string;
  name: string;
  rate: number;
}

interface UserCurrency {
  country: string;
  currency: string;
  symbol: string;
  rate: number;
}

interface CurrencyContextType {
  userCurrency: UserCurrency;
  formatPrice: (usdPrice: number) => string;
  convertPrice: (usdPrice: number) => number;
  supportedCurrencies: Currency[];
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [userCurrency, setUserCurrency] = useState<UserCurrency>({
    country: 'US',
    currency: 'USD',
    symbol: '$',
    rate: 1
  });

  const [supportedCurrencies] = useState<Currency[]>([
    { code: 'USD', symbol: '$', name: 'US Dollar', rate: 1 },
    { code: 'EUR', symbol: '€', name: 'Euro', rate: 0.85 },
    { code: 'GBP', symbol: '£', name: 'British Pound', rate: 0.73 },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen', rate: 110 },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', rate: 1.35 },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', rate: 1.25 },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee', rate: 75 },
    { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', rate: 6.45 },
    { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', rate: 5.2 },
    { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso', rate: 20 },
    { code: 'KRW', symbol: '₩', name: 'South Korean Won', rate: 1180 },
    { code: 'ZAR', symbol: 'R', name: 'South African Rand', rate: 14.5 },
    { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', rate: 1.35 },
    { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar', rate: 7.8 },
    { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar', rate: 1.42 },
    { code: 'SEK', symbol: 'kr', name: 'Swedish Krona', rate: 8.5 },
    { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone', rate: 8.6 },
    { code: 'DKK', symbol: 'kr', name: 'Danish Krone', rate: 6.35 },
    { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', rate: 0.92 },
    { code: 'PLN', symbol: 'zł', name: 'Polish Zloty', rate: 3.9 },
    { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna', rate: 21.5 },
    { code: 'HUF', symbol: 'Ft', name: 'Hungarian Forint', rate: 295 },
    { code: 'RUB', symbol: '₽', name: 'Russian Ruble', rate: 73 },
    { code: 'TRY', symbol: '₺', name: 'Turkish Lira', rate: 8.5 },
    { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', rate: 3.67 },
    { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal', rate: 3.75 },
    { code: 'ILS', symbol: '₪', name: 'Israeli Shekel', rate: 3.2 },
    { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', rate: 14200 },
    { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', rate: 4.15 },
    { code: 'THB', symbol: '฿', name: 'Thai Baht', rate: 31 },
    { code: 'PHP', symbol: '₱', name: 'Philippine Peso', rate: 50 },
    { code: 'CLP', symbol: '$', name: 'Chilean Peso', rate: 780 },
    { code: 'COP', symbol: '$', name: 'Colombian Peso', rate: 3750 },
    { code: 'PEN', symbol: 'S/', name: 'Peruvian Sol', rate: 3.55 },
    { code: 'ARS', symbol: '$', name: 'Argentine Peso', rate: 98 },
    { code: 'EGP', symbol: '£', name: 'Egyptian Pound', rate: 15.7 },
    { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', rate: 411 },
    { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee', rate: 166 },
    { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka', rate: 84.5 },
    { code: 'VND', symbol: '₫', name: 'Vietnamese Dong', rate: 22800 }
  ]);

  useEffect(() => {
    // Try to get country from browser
    const detectCountry = async () => {
      try {
        // Use a geolocation service or browser locale
        // For development, we'll use browser locale as fallback
        const locale = navigator.language || 'en-US';
        const country = locale.split('-')[1] || 'US';

        // Map common countries to currencies
        const countryToCurrency: Record<string, string> = {
          'US': 'USD',
          'GB': 'GBP',
          'DE': 'EUR',
          'FR': 'EUR',
          'ES': 'EUR',
          'IT': 'EUR',
          'JP': 'JPY',
          'CN': 'CNY',
          'IN': 'INR',
          'AU': 'AUD',
          'CA': 'CAD',
          'BR': 'BRL',
          'MX': 'MXN',
          'KR': 'KRW',
          'ZA': 'ZAR',
          'SG': 'SGD',
          'HK': 'HKD',
          'NZ': 'NZD',
          'SE': 'SEK',
          'NO': 'NOK',
          'DK': 'DKK',
          'CH': 'CHF',
          'PL': 'PLN',
          'CZ': 'CZK',
          'HU': 'HUF',
          'RU': 'RUB',
          'TR': 'TRY',
          'AE': 'AED',
          'SA': 'SAR',
          'IL': 'ILS',
          'ID': 'IDR',
          'MY': 'MYR',
          'TH': 'THB',
          'PH': 'PHP',
          'CL': 'CLP',
          'CO': 'COP',
          'PE': 'PEN',
          'AR': 'ARS',
          'EG': 'EGP',
          'NG': 'NGN',
          'PK': 'PKR',
          'BD': 'BDT',
          'VN': 'VND'
        };

        const currencyCode = countryToCurrency[country] || 'USD';
        const currency = supportedCurrencies.find(c => c.code === currencyCode) || supportedCurrencies[0];

        setUserCurrency({
          country,
          currency: currency.code,
          symbol: currency.symbol,
          rate: currency.rate
        });
      } catch (error) {
        console.error('Error detecting country:', error);
        // Keep default USD
      }
    };

    detectCountry();
  }, []);

  const formatPrice = (usdPrice: number): string => {
    const convertedPrice = usdPrice * userCurrency.rate;

    // Format based on currency
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

    const locale = localeMap[userCurrency.currency] || 'en-US';

    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: userCurrency.currency,
        minimumFractionDigits: userCurrency.currency === 'JPY' ? 0 : 2,
        maximumFractionDigits: userCurrency.currency === 'JPY' ? 0 : 2
      }).format(convertedPrice);
    } catch (error) {
      // Fallback to symbol formatting
      return `${userCurrency.symbol}${convertedPrice.toFixed(2)}`;
    }
  };

  const convertPrice = (usdPrice: number): number => {
    return usdPrice * userCurrency.rate;
  };

  return (
    <CurrencyContext.Provider value={{ userCurrency, formatPrice, convertPrice, supportedCurrencies }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}