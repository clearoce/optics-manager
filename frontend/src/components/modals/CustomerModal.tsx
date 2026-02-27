import type { FormEvent } from 'react';
import { Edit, Loader2, Save, Users } from 'lucide-react';
import type { CustomerFormState } from '../../app/formTypes';
import type { Customer } from '../../types';
import { ModalHeader, ModalShell } from '../common/ModalShell';
import { ClearableInput, ClearableTextarea } from '../common/ClearableInput';

type CustomerModalProps = {
  isOpen: boolean;
  editingCustomer: Customer | null;
  customerForm: CustomerFormState;
  customerSubmitting: boolean;
  onClose: () => void;
  onCustomerFormChange: (form: CustomerFormState) => void;
  onSubmit: (event: FormEvent) => void;
};

export function CustomerModal({
  isOpen,
  editingCustomer,
  customerForm,
  customerSubmitting,
  onClose,
  onCustomerFormChange,
  onSubmit,
}: CustomerModalProps) {
  if (!isOpen) return null;

  return (
    <ModalShell containerClassName="max-w-2xl max-h-[92vh] flex flex-col">
      <ModalHeader
        title={editingCustomer ? '编辑客户资料' : '添加新客户'}
        icon={editingCustomer ? <Edit className="h-5 w-5 mr-2 text-blue-600" /> : <Users className="h-5 w-5 mr-2 text-blue-600" />}
        onClose={onClose}
      />

      <form onSubmit={onSubmit} className="p-6 space-y-4 overflow-y-auto">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">姓名</label>
          <ClearableInput
            type="text"
            required
            value={customerForm.name}
            onChange={(value) => onCustomerFormChange({ ...customerForm, name: value })}
            onClear={() => onCustomerFormChange({ ...customerForm, name: '' })}
            clearAriaLabel="清空客户姓名输入"
            className="w-full px-4 py-2 pr-9 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="例如：张三"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">电话</label>
          <ClearableInput
            type="tel"
            required
            value={customerForm.phone}
            onChange={(value) => onCustomerFormChange({ ...customerForm, phone: value })}
            onClear={() => onCustomerFormChange({ ...customerForm, phone: '' })}
            clearAriaLabel="清空客户电话输入"
            className="w-full px-4 py-2 pr-9 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="例如：13800000000"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">备注</label>
          <ClearableTextarea
            value={customerForm.notes}
            onChange={(value) => onCustomerFormChange({ ...customerForm, notes: value })}
            onClear={() => onCustomerFormChange({ ...customerForm, notes: '' })}
            clearAriaLabel="清空客户备注输入"
            className="w-full px-4 py-2 pr-9 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            rows={3}
            placeholder="可填写偏好、回访信息等"
          />
        </div>

        <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 text-sm"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={customerSubmitting}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center disabled:opacity-70"
          >
            {customerSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            {editingCustomer ? '保存更改' : '创建客户'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}