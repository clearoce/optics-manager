import { useState } from 'react';
import type { FormEvent } from 'react';
import type { CustomerFormState } from '../app/formTypes';
import { getErrorMessage, notifyError } from '../app/notify';
import { api } from '../services/api';
import type { Customer } from '../types';

const EMPTY_CUSTOMER_FORM: CustomerFormState = {
  name: '',
  phone: '',
  notes: '',
};

type UseCustomerEditorParams = {
  loadCustomers: () => Promise<void>;
};

export function useCustomerEditor({ loadCustomers }: UseCustomerEditorParams) {
  const [customerSubmitting, setCustomerSubmitting] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerForm, setCustomerForm] = useState<CustomerFormState>(EMPTY_CUSTOMER_FORM);

  const openCreateCustomerModal = () => {
    setEditingCustomer(null);
    setCustomerForm(EMPTY_CUSTOMER_FORM);
    setIsCustomerModalOpen(true);
  };

  const openEditCustomerModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setCustomerForm({
      name: customer.name,
      phone: customer.phone,
      notes: customer.notes,
    });
    setIsCustomerModalOpen(true);
  };

  const closeCustomerModal = () => {
    setIsCustomerModalOpen(false);
  };

  const handleSubmitCustomer = async (event: FormEvent) => {
    event.preventDefault();
    if (!customerForm.name.trim() || !customerForm.phone.trim()) return;

    setCustomerSubmitting(true);
    try {
      if (editingCustomer) {
        const id = Number(editingCustomer.id);
        if (!Number.isFinite(id)) {
          throw new Error('当前客户不是后端数据，无法编辑');
        }
        await api.customers.update(id, {
          name: customerForm.name.trim(),
          phone: customerForm.phone.trim(),
          notes: customerForm.notes.trim() || null,
        });
      } else {
        await api.customers.create({
          name: customerForm.name.trim(),
          phone: customerForm.phone.trim(),
          notes: customerForm.notes.trim() || null,
        });
      }

      setIsCustomerModalOpen(false);
      await loadCustomers();
    } catch (error) {
      notifyError(getErrorMessage(error, '提交客户信息失败'));
    } finally {
      setCustomerSubmitting(false);
    }
  };

  return {
    isCustomerModalOpen,
    editingCustomer,
    customerForm,
    setCustomerForm,
    customerSubmitting,
    openCreateCustomerModal,
    openEditCustomerModal,
    closeCustomerModal,
    handleSubmitCustomer,
  };
}
