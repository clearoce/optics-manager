export type CustomerFormState = {
  name: string;
  phone: string;
  notes: string;
  visionRecords: CustomerVisionRecordFormState[];
};

export type CustomerVisionRecordFormState = {
  groupNumber?: number;
  recordedAt: string;
  leftSphere: string;
  leftCylinder: string;
  leftAxis: string;
  leftPD: string;
  leftVisualAcuity: string;
  rightSphere: string;
  rightCylinder: string;
  rightAxis: string;
  rightPD: string;
  rightVisualAcuity: string;
};

export type ProductFormState = {
  name: string;
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
