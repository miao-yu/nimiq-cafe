// ----------------------------------------------------------------------

export type ICurrencyMeta = {
  symbol: string;
  name: string;
  symbol_native: string;
  decimal_digits: number;
  rounding: number;
  code: string;
  name_plural: string;
};

/** price.json: a unix timestamp plus one lowercase key per quoted currency. */
export type INimPriceItem = {
  timestamp: number;
} & Record<string, string | number>;

/** Response of /api/calculator: defaults and reference data for the form. */
export type ICalculatorItem = {
  currency: string;
  circulatingSupplyStaked: number;
  circulatingSupplyStakedOptions: number[];
  stakingAmount: number;
  sign: string;
  currencyPrice: string;
  /** Uppercase currency code to NIM price, fiat only. */
  nimPrice: Record<string, string>;
  currencies: Record<string, ICurrencyMeta>;
  restake: boolean;
  poolFee: number;
  price: INimPriceItem;
};
