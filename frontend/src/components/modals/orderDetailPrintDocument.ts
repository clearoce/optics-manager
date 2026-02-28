type OrderDetailPrintRow = {
  productId: number;
  displayName: string;
  unitPrice: number;
  paidPrice: number;
  quantity: number;
  subtotal: number;
};

export type OrderDetailPrintVisionRecord = {
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

type BuildOrderDetailPrintDocumentOptions = {
  printTitle: string;
  orderId: number;
  customerName: string;
  customerPhone: string;
  totalAmount: number;
  orderDate: string;
  notes?: string;
  visionRecords: OrderDetailPrintVisionRecord[];
  rows: OrderDetailPrintRow[];
};

const escapeHtml = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const formatRecordedAtToMinute = (value: string) => {
  const normalized = value.trim().replace('T', ' ');
  const matched = normalized.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2})/);

  if (matched) {
    return matched[1];
  }

  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    const pad = (num: number) => String(num).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  return normalized;
};

const ORDER_DETAIL_PRINT_STYLE = `
@page { size: A4 landscape; margin: 10mm; }
body { margin: 0; color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Microsoft YaHei', sans-serif; }
.sheet { width: 100%; }
h1 { margin: 0 0 6px; font-size: 20px; }
.meta { margin: 0 0 12px; font-size: 12px; color: #475569; }
table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 12px; }
th, td { border: 1px solid #cbd5e1; padding: 6px 8px; vertical-align: top; word-break: break-word; overflow-wrap: anywhere; }
th { background: #f8fafc; text-align: left; }
.section-title { margin: 14px 0 6px; font-size: 14px; font-weight: 700; color: #0f172a; }
.vision-table th:nth-child(1), .vision-table td:nth-child(1) { width: 20%; }
.vision-table th:nth-child(2), .vision-table td:nth-child(2) { width: 8%; }
.vision-table th:nth-child(3), .vision-table td:nth-child(3) { width: 14%; }
.vision-table th:nth-child(4), .vision-table td:nth-child(4) { width: 14%; }
.vision-table th:nth-child(5), .vision-table td:nth-child(5) { width: 14%; }
.vision-table th:nth-child(6), .vision-table td:nth-child(6) { width: 14%; }
.vision-table th:nth-child(7), .vision-table td:nth-child(7) { width: 16%; }
.product-table th:nth-child(1), .product-table td:nth-child(1) { width: 10%; }
.product-table th:nth-child(2), .product-table td:nth-child(2) { width: 30%; }
.product-table th:nth-child(3), .product-table td:nth-child(3) { width: 18%; }
.product-table th:nth-child(4), .product-table td:nth-child(4) { width: 12%; }
.product-table th:nth-child(5), .product-table td:nth-child(5) { width: 18%; }
tfoot td { font-weight: 700; background: #f8fafc; }
.notes { margin-top: 10px; font-size: 12px; color: #334155; }
`;

export const buildOrderDetailPrintDocument = ({
  printTitle,
  orderId,
  customerName,
  customerPhone,
  totalAmount,
  orderDate,
  notes,
  visionRecords,
  rows,
}: BuildOrderDetailPrintDocumentOptions) => {
  const visionRowsHtml = visionRecords.map((record) => {
    const recordedAt = escapeHtml(formatRecordedAtToMinute(record.recordedAt));

    return `
    <tr>
      <td rowspan="2">${recordedAt}</td>
      <td>左眼</td>
      <td>${escapeHtml(record.leftSphere)}</td>
      <td>${escapeHtml(record.leftCylinder)}</td>
      <td>${escapeHtml(record.leftAxis)}</td>
      <td>${escapeHtml(record.leftPD)}</td>
      <td>${escapeHtml(record.leftVisualAcuity)}</td>
    </tr>
    <tr>
      <td>右眼</td>
      <td>${escapeHtml(record.rightSphere)}</td>
      <td>${escapeHtml(record.rightCylinder)}</td>
      <td>${escapeHtml(record.rightAxis)}</td>
      <td>${escapeHtml(record.rightPD)}</td>
      <td>${escapeHtml(record.rightVisualAcuity)}</td>
    </tr>
  `;
  }).join('');

  const rowsHtml = rows.map((row) => `
    <tr>
      <td>P${row.productId}</td>
      <td>${escapeHtml(row.displayName)}</td>
      <td>¥${row.paidPrice.toFixed(2)}</td>
      <td>${row.quantity}</td>
      <td>¥${row.subtotal.toFixed(2)}</td>
    </tr>
  `).join('');

  return `
    <!doctype html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${escapeHtml(printTitle)}</title>
      <style>${ORDER_DETAIL_PRINT_STYLE}</style>
    </head>
    <body>
      <div class="sheet">
        <h1>订单#${orderId}: ${customerName} - ${customerPhone}</h1>
        <p class="meta">实收金额：¥${totalAmount.toFixed(2)} &nbsp;·&nbsp; 日期：${escapeHtml(orderDate)}</p>

        <h2 class="section-title">验光信息</h2>
        <table class="vision-table">
          <thead>
            <tr>
              <th>记录时间</th>
              <th>眼别</th>
              <th>球镜(S)</th>
              <th>柱镜(C)</th>
              <th>轴位(A)</th>
              <th>瞳距(PD)</th>
              <th>矫正视力(VA)</th>
            </tr>
          </thead>
          <tbody>
            ${visionRowsHtml || '<tr><td colspan="7">订单创建时未填写</td></tr>'}
          </tbody>
        </table>

        <h2 class="section-title">商品明细</h2>
        <table class="product-table">
          <thead>
            <tr>
              <th>商品 ID</th>
              <th>商品名称</th>
              <th>单价</th>
              <th>数量</th>
              <th>小计</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="5">暂无订单明细</td></tr>'}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="4" style="text-align:right;">实收合计</td>
              <td>¥${totalAmount.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>

        ${notes ? `<p class="notes"><strong>备注：</strong>${escapeHtml(notes)}</p>` : ''}
      </div>
    </body>
    </html>
  `;
};