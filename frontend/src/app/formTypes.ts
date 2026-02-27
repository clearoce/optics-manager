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
  notes: string;
};

export type OrderItemDraft = {
  productId: string;
  quantity: string;
  productQuery: string;
  unitPrice: string;
  paidPrice: string;
};
