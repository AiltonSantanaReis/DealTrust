export type CurrencyCode = "BRL";

export type Money = {
  readonly amountCents: number;
  readonly currency: CurrencyCode;
};

export type FinalPriceInput = {
  readonly productPrice: Money;
  readonly shipping?: Money;
  readonly couponDiscount?: Money;
  readonly confirmedCashback?: Money;
};

export function createMoney(amountCents: number, currency: CurrencyCode = "BRL"): Money {
  if (!Number.isInteger(amountCents)) {
    throw new Error("Money amount must be an integer number of cents.");
  }

  if (amountCents < 0) {
    throw new Error("Money amount cannot be negative.");
  }

  return { amountCents, currency };
}

export function calculateFinalPrice(input: FinalPriceInput): Money {
  const currency = input.productPrice.currency;
  const shipping = input.shipping ?? createMoney(0, currency);
  const couponDiscount = input.couponDiscount ?? createMoney(0, currency);
  const confirmedCashback = input.confirmedCashback ?? createMoney(0, currency);

  assertSameCurrency(currency, shipping, "shipping");
  assertSameCurrency(currency, couponDiscount, "couponDiscount");
  assertSameCurrency(currency, confirmedCashback, "confirmedCashback");

  const discounts = couponDiscount.amountCents + confirmedCashback.amountCents;
  const gross = input.productPrice.amountCents + shipping.amountCents;
  const amountCents = Math.max(0, gross - discounts);

  return createMoney(amountCents, currency);
}

function assertSameCurrency(expected: CurrencyCode, money: Money, fieldName: string): void {
  if (money.currency !== expected) {
    throw new Error(`${fieldName} currency must match productPrice currency.`);
  }
}

