import { useState } from 'react';
import type { FormEvent } from 'react';
import type { CustomerFormState, CustomerVisionRecordFormState } from '../app/formTypes';
import { getErrorMessage, notifyError } from '../app/notify';
import { api } from '../services/api';
import type { Customer } from '../types';

const createEmptyVisionRecordForm = (): CustomerVisionRecordFormState => ({
  recordedAt: '',
  leftSphere: '',
  leftCylinder: '',
  leftAxis: '',
  leftPD: '',
  leftVisualAcuity: '',
  rightSphere: '',
  rightCylinder: '',
  rightAxis: '',
  rightPD: '',
  rightVisualAcuity: '',
});

const EMPTY_CUSTOMER_FORM: CustomerFormState = {
  name: '',
  phone: '',
  notes: '',
  visionRecords: [createEmptyVisionRecordForm()],
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
      visionRecords:
        customer.visionRecords.length > 0
          ? customer.visionRecords.map((record) => ({
              recordedAt: record.recordedAt ? record.recordedAt.slice(0, 16) : '',
              leftSphere: record.leftSphere.toFixed(2),
              leftCylinder: record.leftCylinder.toFixed(2),
              leftAxis: String(record.leftAxis),
              leftPD: record.leftPD.toFixed(1),
              leftVisualAcuity: record.leftVisualAcuity.toFixed(1),
              rightSphere: record.rightSphere.toFixed(2),
              rightCylinder: record.rightCylinder.toFixed(2),
              rightAxis: String(record.rightAxis),
              rightPD: record.rightPD.toFixed(1),
              rightVisualAcuity: record.rightVisualAcuity.toFixed(1),
            }))
          : [createEmptyVisionRecordForm()],
    });
    setIsCustomerModalOpen(true);
  };

  const closeCustomerModal = () => {
    setIsCustomerModalOpen(false);
  };

  const handleSubmitCustomer = async (event: FormEvent) => {
    event.preventDefault();
    if (!customerForm.name.trim() || !customerForm.phone.trim()) return;

    const parseFloatOrZero = (value: string) => {
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? parsed : 0;
    };

    const parseIntOrZero = (value: string) => {
      const parsed = Number.parseInt(value, 10);
      return Number.isFinite(parsed) ? parsed : 0;
    };

    const visionPayload = customerForm.visionRecords
      .map((record) => {
        const hasAnyInput = [
          record.recordedAt,
          record.leftSphere,
          record.leftCylinder,
          record.leftAxis,
          record.leftPD,
          record.leftVisualAcuity,
          record.rightSphere,
          record.rightCylinder,
          record.rightAxis,
          record.rightPD,
          record.rightVisualAcuity,
        ].some((value) => value.trim() !== '');

        return {
          hasAnyInput,
          payload: {
            recorded_at: record.recordedAt.trim() || null,
            left_sphere: parseFloatOrZero(record.leftSphere),
            left_cylinder: parseFloatOrZero(record.leftCylinder),
            left_axis: parseIntOrZero(record.leftAxis),
            left_pd: parseFloatOrZero(record.leftPD),
            left_visual_acuity: parseFloatOrZero(record.leftVisualAcuity),
            right_sphere: parseFloatOrZero(record.rightSphere),
            right_cylinder: parseFloatOrZero(record.rightCylinder),
            right_axis: parseIntOrZero(record.rightAxis),
            right_pd: parseFloatOrZero(record.rightPD),
            right_visual_acuity: parseFloatOrZero(record.rightVisualAcuity),
          },
        };
      })
      .filter((item) => item.hasAnyInput)
      .map((item) => item.payload);

    if (editingCustomer) {
      const confirmed = window.confirm(
        `确认保存对客户「${editingCustomer.name}」的修改吗？`,
      );
      if (!confirmed) return;
    }

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
          vision_records: visionPayload,
        });
      } else {
        await api.customers.create({
          name: customerForm.name.trim(),
          phone: customerForm.phone.trim(),
          notes: customerForm.notes.trim() || null,
          vision_records: visionPayload,
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

  const handleDeleteCustomer = async (customer: Customer) => {
    const id = Number(customer.id);
    if (!Number.isFinite(id)) {
      notifyError('当前客户不是后端数据，无法删除');
      return;
    }

    try {
      const relatedOrders = await api.orders.list(id);
      if (relatedOrders.length > 0) {
        const firstConfirm = window.confirm(
          `客户「${customer.name}」存在 ${relatedOrders.length} 条关联订单。删除后将无法从客户列表查看该客户，但订单会保留客户快照信息。是否继续？`,
        );
        if (!firstConfirm) return;

        const secondConfirm = window.confirm('这是不可恢复操作，请再次确认删除该客户。');
        if (!secondConfirm) return;

        const typedName = window.prompt(
          `请输入客户姓名「${customer.name}」以确认删除：`,
          '',
        );

        if (typedName === null) return;
        if (typedName.trim() !== customer.name) {
          notifyError('输入的客户姓名不匹配，已取消删除');
          return;
        }
      } else {
        const firstConfirm = window.confirm(`确认删除客户「${customer.name}」吗？`);
        if (!firstConfirm) return;

        const secondConfirm = window.confirm('这是不可恢复操作，请再次确认删除该客户。');
        if (!secondConfirm) return;
      }

      await api.customers.remove(id);
      await loadCustomers();
    } catch (error) {
      notifyError(getErrorMessage(error, '删除客户失败'));
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
    handleDeleteCustomer,
  };
}
