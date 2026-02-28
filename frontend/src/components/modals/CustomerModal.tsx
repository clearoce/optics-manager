import type { FormEvent } from 'react';
import { Edit, Loader2, Plus, Save, Trash2, Users } from 'lucide-react';
import type { CustomerFormState, CustomerVisionRecordFormState } from '../../app/formTypes';
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

  const createEmptyVisionRecord = (): CustomerVisionRecordFormState => ({
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

  const updateVisionRecord = (
    index: number,
    patch: Partial<CustomerVisionRecordFormState>,
  ) => {
    onCustomerFormChange({
      ...customerForm,
      visionRecords: customerForm.visionRecords.map((record, recordIndex) =>
        recordIndex === index ? { ...record, ...patch } : record,
      ),
    });
  };

  const addVisionRecord = () => {
    onCustomerFormChange({
      ...customerForm,
      visionRecords: [...customerForm.visionRecords, createEmptyVisionRecord()],
    });
  };

  const removeVisionRecord = (index: number) => {
    const nextRecords = customerForm.visionRecords.filter((_, recordIndex) => recordIndex !== index);
    onCustomerFormChange({
      ...customerForm,
      visionRecords: nextRecords.length > 0 ? nextRecords : [createEmptyVisionRecord()],
    });
  };

  return (
    <ModalShell containerClassName="max-w-4xl max-h-[92vh] flex flex-col">
      <ModalHeader
        title={editingCustomer ? '编辑客户资料' : '添加新客户'}
        icon={editingCustomer ? <Edit className="h-5 w-5 mr-2 text-blue-600" /> : <Users className="h-5 w-5 mr-2 text-blue-600" />}
        onClose={onClose}
      />

      <form onSubmit={onSubmit} className="p-6 space-y-4 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-800">验光参数记录（可多组）</h3>
            <button
              type="button"
              onClick={addVisionRecord}
              className="inline-flex items-center text-xs px-2.5 py-1.5 rounded border border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              新增一组
            </button>
          </div>

          <div className="text-xs text-slate-500 leading-5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            轴位为整数（0-180）；球镜/柱镜保留 2 位小数；瞳距/矫正视力保留 1 位小数。
          </div>

          {customerForm.visionRecords.map((record, index) => (
            <div key={index} className="border border-slate-200 rounded-xl p-3 space-y-3 bg-slate-50/60">
              {(() => {
                const fieldPrefix = `vision-${index}`;
                return (
                  <>
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-slate-700">第 {index + 1} 组</div>
                <button
                  type="button"
                  onClick={() => removeVisionRecord(index)}
                  disabled={customerForm.visionRecords.length === 1}
                  className="inline-flex items-center text-xs px-2 py-1 rounded border border-rose-200 text-rose-700 hover:bg-rose-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  删除
                </button>
              </div>

              <div>
                <label htmlFor={`${fieldPrefix}-recorded-at`} className="block text-xs font-medium text-slate-600 mb-1">
                  记录时间
                </label>
                <input
                  id={`${fieldPrefix}-recorded-at`}
                  type="datetime-local"
                  value={record.recordedAt}
                  onChange={(event) => updateVisionRecord(index, { recordedAt: event.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                <table className="w-full min-w-[640px] table-fixed text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-2 py-1.5 font-medium border-b border-slate-200 text-center">眼别</th>
                      <th className="px-2 py-1.5 font-medium border-b border-slate-200 text-center">球镜(S)</th>
                      <th className="px-2 py-1.5 font-medium border-b border-slate-200 text-center">柱镜(C)</th>
                      <th className="px-2 py-1.5 font-medium border-b border-slate-200 text-center">轴位(A)</th>
                      <th className="px-2 py-1.5 font-medium border-b border-slate-200 text-center">瞳距(PD)</th>
                      <th className="px-2 py-1.5 font-medium border-b border-slate-200 text-center">矫正视力(VA)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-white border-b border-slate-100">
                      <td className="px-2 py-2 text-center font-medium text-slate-700">左眼</td>
                      <td className="px-2 py-1.5">
                        <input
                          id={`${fieldPrefix}-left-sphere`}
                          type="number"
                          step="0.01"
                          value={record.leftSphere}
                          onChange={(event) => updateVisionRecord(index, { leftSphere: event.target.value })}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded-md text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          id={`${fieldPrefix}-left-cylinder`}
                          type="number"
                          step="0.01"
                          value={record.leftCylinder}
                          onChange={(event) => updateVisionRecord(index, { leftCylinder: event.target.value })}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded-md text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          id={`${fieldPrefix}-left-axis`}
                          type="number"
                          step="1"
                          min={0}
                          max={180}
                          value={record.leftAxis}
                          onChange={(event) => updateVisionRecord(index, { leftAxis: event.target.value })}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded-md text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          id={`${fieldPrefix}-left-pd`}
                          type="number"
                          step="0.1"
                          value={record.leftPD}
                          onChange={(event) => updateVisionRecord(index, { leftPD: event.target.value })}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded-md text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          id={`${fieldPrefix}-left-visual-acuity`}
                          type="number"
                          step="0.1"
                          value={record.leftVisualAcuity}
                          onChange={(event) => updateVisionRecord(index, { leftVisualAcuity: event.target.value })}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded-md text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </td>
                    </tr>
                    <tr className="bg-white">
                      <td className="px-2 py-2 text-center font-medium text-slate-700">右眼</td>
                      <td className="px-2 py-1.5">
                        <input
                          id={`${fieldPrefix}-right-sphere`}
                          type="number"
                          step="0.01"
                          value={record.rightSphere}
                          onChange={(event) => updateVisionRecord(index, { rightSphere: event.target.value })}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded-md text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          id={`${fieldPrefix}-right-cylinder`}
                          type="number"
                          step="0.01"
                          value={record.rightCylinder}
                          onChange={(event) => updateVisionRecord(index, { rightCylinder: event.target.value })}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded-md text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          id={`${fieldPrefix}-right-axis`}
                          type="number"
                          step="1"
                          min={0}
                          max={180}
                          value={record.rightAxis}
                          onChange={(event) => updateVisionRecord(index, { rightAxis: event.target.value })}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded-md text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          id={`${fieldPrefix}-right-pd`}
                          type="number"
                          step="0.1"
                          value={record.rightPD}
                          onChange={(event) => updateVisionRecord(index, { rightPD: event.target.value })}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded-md text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          id={`${fieldPrefix}-right-visual-acuity`}
                          type="number"
                          step="0.1"
                          value={record.rightVisualAcuity}
                          onChange={(event) => updateVisionRecord(index, { rightVisualAcuity: event.target.value })}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded-md text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
                  </>
                );
              })()}
            </div>
          ))}
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