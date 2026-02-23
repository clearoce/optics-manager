export type CustomerFormState = {
  name: string;
  phone: string;
  notes: string;
};

export type ProductFormState = {
  name: string;
  sku: string;
  category: string;
  price: string;
  lowStockThreshold: string;
  notes: string;
};

export type StockFormState = {
  changeAmount: string;
  reason: string;
};
