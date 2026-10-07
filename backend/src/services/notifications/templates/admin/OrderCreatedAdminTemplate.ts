import { MetadataGrid, InvoiceTable } from '../../components';

export const OrderCreatedAdminTemplate = (data: any) => {
  const {
    customerInfo,
    customerStats,
    orderDetails,
    products,
    finance,
    deliveryInfo: _deliveryInfo,
  } = data;

  const productRows = products.map((p: any) => ({
    description: `${p.name} (SKU: ${p.sku})`,
    quantity: p.quantity,
    unitPrice: p.price,
    total: p.price * p.quantity,
  }));

  const grandTotal = Number(
    orderDetails.total ??
      orderDetails.totalAmount ??
      orderDetails.grandTotal ??
      finance?.grossRevenue ??
      0,
  );

  const content = `
    <div style="margin-bottom: 24px;">
      <h2 style="margin: 0 0 8px 0; color: #111827;">New Order Received</h2>
      <p style="margin: 0; color: #4b5563; font-family: monospace;">ID: ${orderDetails.id} | Platform Fee: ₹${finance.fees.platformFee || 0} | Est. Margin: ${finance.profitability?.marginPercentage || 'N/A'}</p>
    </div>

    <!-- Prominent Grand Total Banner -->
    <div style="background-color: #faf5e6; border: 2px solid #283618; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;">
      <span style="font-size: 11px; font-weight: 800; color: #606c38; text-transform: uppercase; letter-spacing: 0.08em; display: block; margin-bottom: 4px;">Grand Total Amount</span>
      <strong style="font-size: 26px; font-weight: 900; color: #283618; font-family: monospace;">₹${grandTotal.toLocaleString('en-IN')}</strong>
    </div>

    ${MetadataGrid({
      title: 'Customer Intelligence',
      data: {
        Name: customerInfo.name,
        Email: customerInfo.email,
        Phone: customerInfo.phone,
        LTV: `₹${customerStats.lifetimeSpend}`,
        Orders: customerStats.orderCount,
        Tier: customerInfo.loyaltyTier,
        IP: customerInfo.device?.ip || 'N/A',
      },
    })}

    ${MetadataGrid({
      title: 'Financial Breakdown',
      data: {
        'Grand Total': `₹${grandTotal.toLocaleString('en-IN')}`,
        'Gross Revenue': `₹${finance.grossRevenue}`,
        'Net Revenue': `₹${finance.netRevenue}`,
        'Gateway Fee': `₹${finance.fees.gatewayFee}`,
        'Est. Profit': `₹${finance.profitability.estimatedProfit}`,
      },
    })}

    <h3 style="margin: 32px 0 16px 0; color: #111827;">Itemized Breakdown</h3>
    ${InvoiceTable(productRows, orderDetails.subtotal, orderDetails.tax || 0, grandTotal)}

    <div style="margin-top: 32px; display: flex; gap: 12px;">
    </div>
  `;

  const itemTitle = products && products.length > 0 ? products[0].name : 'Items';
  const moreCount = products && products.length > 1 ? ` +${products.length - 1} more` : '';
  const productName = `${itemTitle}${moreCount}`;
  const customerName = customerInfo.name || 'A customer';

  return {
    html: content,
    subject: `[New Order] ${productName} placed by ${customerName} (₹${grandTotal.toLocaleString('en-IN')})`,
    preheader: `Order ID: ${orderDetails.id} | Grand Total: ₹${grandTotal} | LTV: ₹${customerStats.lifetimeSpend}`,
  };
};
