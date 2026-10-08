import { Header, Footer, OrderSummary, ProductCard, Timeline } from '../../components';
import { getPublicWebsiteUrl, resolveEmailImageUrl } from '../../../../utils/email/emailUrlUtils';

export const OrderCreatedCustomerTemplate = (data: any) => {
  const { customerInfo, orderDetails, products, deliveryInfo } = data;
  const publicBaseUrl = getPublicWebsiteUrl();

  const firstTitle = products?.[0]?.name || products?.[0]?.title || 'Items';
  const moreCount = products && products.length > 1 ? ` (+${products.length - 1} more)` : '';
  const productTitle = `${firstTitle}${moreCount}`;
  const invoiceRef =
    orderDetails.invoiceNumber ||
    (orderDetails.id ? `INV-${String(orderDetails.id).slice(-8).toUpperCase()}` : '');

  const grandTotal = orderDetails.total ?? orderDetails.totalAmount ?? 0;

  const productsHtml = (products || [])
    .map((p: any) =>
      ProductCard({
        name: p.name || p.title || 'Item',
        price: p.price || 0,
        quantity: p.quantity || 1,
        image: resolveEmailImageUrl(p.image || p.imageSrc),
        variant: p.variant,
      }),
    )
    .join('');

  const content = `
    ${Header(`${publicBaseUrl}/MainLogo_bg.png`)}
    
    <h2 style="color: #111827; margin-bottom: 16px;">Thank you for your order, ${customerInfo.name || 'Customer'}!</h2>
    <p style="color: #4b5563; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
      We've received your order for <strong>${productTitle}</strong>${invoiceRef ? ` (Reference: <strong>${invoiceRef}</strong>)` : ''} and are getting it ready for shipment.
    </p>

    <div style="background-color: #f9fafb; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
      <h3 style="color: #111827; margin-top: 0; margin-bottom: 16px; font-size: 18px;">Order Details</h3>
      ${productsHtml}
      ${OrderSummary({
        subtotal: orderDetails.subtotal,
        shipping: orderDetails.shipping,
        discount: orderDetails.discount,
        total: grandTotal,
      })}
    </div>

    <h3 style="color: #111827; margin-top: 32px; margin-bottom: 16px; font-size: 18px;">What's next?</h3>
    ${Timeline([
      { title: 'Order Placed', status: 'completed', time: new Date().toLocaleDateString() },
      { title: 'Processing', status: 'current', description: 'We are preparing your items.' },
      { title: 'Shipped', status: 'upcoming' },
      {
        title: 'Delivered',
        status: 'upcoming',
        time: `Est. ${deliveryInfo?.expectedDelivery || 'in 3-5 days'}`,
      },
    ])}

    ${Footer("Akula's Kitchen", 'support@akulas.kitchen', '')}
  `;

  return {
    html: content,
    subject: invoiceRef
      ? `Order Confirmed: ${productTitle} (${invoiceRef})`
      : `Order Confirmed: ${productTitle}`,
    preheader: `We've received your order for ${productTitle} and are getting it ready. Grand Total: ₹${grandTotal}`,
  };
};
