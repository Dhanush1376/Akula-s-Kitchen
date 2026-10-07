/**
 * Akula's Kitchen - Premium Transactional Email Templates
 * Clean, modern, and simple layout in Heritage Olive Green (#283618)
 * and Turmeric Golden Amber (#f7bb0e).
 * Official domain: akulas.kitchen
 */

import { getStoreConfigSync } from '../../config/storeConfig';

// --- Shared Utility Components ---

export const formatCurrency = (amount: number) => `₹${Number(amount || 0).toLocaleString('en-IN')}`;

export const escapeHtml = (unsafe: any) => {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

export const getPrimaryEntityName = (items: any[]): string | null => {
  if (!items || !Array.isArray(items) || items.length === 0) return null;
  const first =
    items[0].title || items[0].name || items[0].productTitle || items[0].productId?.title || null;
  if (!first) return null;
  if (items.length > 1) {
    return `${first} (+${items.length - 1} more)`;
  }
  return first;
};

export const button = (text: string, url: string) => `
  <div style="margin: 28px 0; text-align: center;">
    <a href="${url}" style="background-color: #283618; color: #ffffff !important; border: 2px solid #283618; padding: 12px 28px; text-decoration: none; font-size: 14px; font-weight: 700; border-radius: 999px; display: inline-block; box-shadow: 0 4px 12px rgba(40, 54, 24, 0.18);">
      ${text}
    </a>
  </div>
`;

export const dataTable = (rows: { label: string; value: string }[]) => {
  const rowsHtml = rows
    .map(
      (r, idx) => `
    <tr style="${idx < rows.length - 1 ? 'border-bottom: 1px solid #ede5d3;' : ''}">
      <td style="padding: 9px 4px; color: #606c38; font-size: 13px; font-weight: 600; width: 40%; vertical-align: top;">${r.label}</td>
      <td style="padding: 9px 4px; color: #283618; font-size: 13.5px; font-weight: 700; vertical-align: top;">${r.value}</td>
    </tr>
  `,
    )
    .join('');

  return `
    <div style="background-color: #faf7f0; border: 1px solid #e5dcce; border-radius: 10px; padding: 14px 18px; margin-bottom: 20px;">
      <table style="width: 100%; border-collapse: collapse;">
        ${rowsHtml}
      </table>
    </div>
  `;
};

/**
 * Reusable HTML wrapper featuring a clean luxury card layout,
 * heritage olive header banner with gold accent stripe, and minimalist footer.
 */
export const getLuxuryEmailWrapper = (
  subtitle: string,
  bodyContentHtml: string,
  footerTextHtml?: string,
  preheaderText?: string,
): string => {
  const store = getStoreConfigSync();
  const domain = store.websiteDomain || 'akulas.kitchen';
  const siteUrl = store.websiteUrl || 'https://akulas.kitchen';
  const supportEmail = store.contact?.email || 'support@akulas.kitchen';
  const previewText = preheaderText || subtitle;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${store.name} — ${subtitle}</title>
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    table { border-collapse: collapse !important; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #f7f4ec; color: #283618; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }

    .wrapper-table { background-color: #f7f4ec; width: 100% !important; }
    .email-container { max-width: 580px; margin: 0 auto !important; width: 100% !important; }
    .main-card { background-color: #ffffff; border: 1px solid #e4dac7; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 20px rgba(40, 54, 24, 0.06); }
    
    /* Clean Brand Header */
    .brand-header { background-color: #283618; border-bottom: 3px solid #f7bb0e; padding: 22px 20px; text-align: center; }
    .brand-link { text-decoration: none; display: inline-block; }
    .brand-name { font-size: 24px; font-weight: 800; color: #ffffff !important; display: block; margin: 0; letter-spacing: -0.3px; text-decoration: none; }
    .brand-domain { color: #f7bb0e; font-size: 11.5px; font-weight: 700; letter-spacing: 0.06em; margin-top: 3px; }

    /* Content Area */
    .body-card-content { padding: 32px 32px 16px; }
    .body-content { color: #2d3725; font-size: 14.5px; line-height: 1.6; text-align: left; }
    .body-content h2 { color: #283618; font-size: 19px; font-weight: 800; margin: 0 0 14px 0; letter-spacing: -0.2px; }
    .body-content h3 { color: #283618; font-size: 14px; font-weight: 700; margin: 20px 0 10px 0; }
    .body-content p { margin: 0 0 16px 0; }
    .body-content strong { color: #283618; }

    /* Clean OTP / Code Display */
    .code-container { background-color: #fdfbf6; border: 1.5px solid #283618; border-top: 3px solid #f7bb0e; padding: 20px 16px; border-radius: 10px; margin: 20px 0; text-align: center; }
    .code-display { margin: 0; letter-spacing: 7px; color: #283618; font-size: 34px; font-weight: 800; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; text-align: center; }
    
    /* CTA Button */
    .button-wrapper { margin: 26px 0; text-align: center; }
    .cta-button { background-color: #283618; color: #ffffff !important; border: 2px solid #283618; padding: 12px 28px; text-decoration: none; font-size: 13.5px; font-weight: 700; border-radius: 999px; display: inline-block; box-shadow: 0 3px 10px rgba(40, 54, 24, 0.18); }
    
    /* Minimalist Footer */
    .footer-divider { border-top: 1px solid #e8e1cf; padding: 22px 28px 24px; text-align: center; background-color: #faf8f2; }
    .footer-brand { margin: 0 0 4px 0; font-size: 13px; font-weight: 700; color: #283618; }
    .footer-support { margin: 0; color: #606c38; font-size: 12px; }
    .footer-support a { color: #283618; font-weight: 600; text-decoration: underline; }

    /* Dark Mode */
    @media (prefers-color-scheme: dark) {
      body, .wrapper-table { background-color: #172011 !important; color: #fbf8ee !important; }
      .main-card { background-color: #1f2a17 !important; border-color: #3b492b !important; }
      .brand-header { background-color: #12180d !important; border-bottom-color: #f7bb0e !important; }
      .brand-name { color: #ffffff !important; }
      .body-card-content { background-color: #1f2a17 !important; }
      .body-content { color: #e1e9d8 !important; }
      .body-content h2, .body-content h3 { color: #fefae0 !important; }
      .body-content strong { color: #ffffff !important; }
      .code-container { background-color: #27361c !important; border-color: #606c38 !important; }
      .code-display { color: #f7bb0e !important; }
      .cta-button { background-color: #f7bb0e !important; color: #283618 !important; border-color: #f7bb0e !important; }
      .footer-divider { background-color: #151e10 !important; border-top-color: #3b492b !important; }
      .footer-brand { color: #fefae0 !important; }
      .footer-support { color: #a4b395 !important; }
      .footer-support a { color: #f7bb0e !important; }
    }

    @media only screen and (max-width: 600px) {
      .body-card-content { padding: 22px 18px 14px !important; }
      .footer-divider { padding: 18px 16px 20px !important; }
      .brand-header { padding: 18px 14px !important; }
      .brand-name { font-size: 21px !important; }
      .code-display { font-size: 28px !important; letter-spacing: 5px !important; }
    }
  </style>
</head>
<body>
  <div style="display: none; max-height: 0px; overflow: hidden; font-size: 1px; line-height: 1px; color: #fff; opacity: 0;">
    ${previewText}
  </div>
  <table border="0" cellpadding="0" cellspacing="0" width="100%" class="wrapper-table">
    <tr>
      <td align="center" style="padding: 20px 10px;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" class="email-container">
          <tr>
            <td class="main-card">
              <!-- Clean Brand Header -->
              <div class="brand-header">
                <a href="${siteUrl}" target="_blank" class="brand-link">
                  <h1 class="brand-name">${store.name}</h1>
                  <div class="brand-domain">${domain}</div>
                </a>
              </div>

              <!-- Main Card Body -->
              <div class="body-card-content">
                <div class="body-content">
                  ${bodyContentHtml}
                </div>
              </div>

              <!-- Minimalist Clean Footer -->
              <div class="footer-divider">
                <p class="footer-brand">
                  ${store.name} • <a href="${siteUrl}" target="_blank" style="color: #283618; text-decoration: none;">${domain}</a>
                </p>
                <p class="footer-support">
                  ${footerTextHtml ? `${footerTextHtml} • ` : ''}Need help? <a href="mailto:${supportEmail}">${supportEmail}</a>
                </p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

/**
 * Generates the clean OTP Authentication Email
 */
export const getOtpEmailTemplate = (otpCode: string, expiryMinutes: number = 5): string => {
  const store = getStoreConfigSync();
  const domain = store.websiteDomain || 'akulas.kitchen';
  const preheader = `Your ${domain} verification code is ${otpCode}`;
  const body = `
    <h2 style="text-align: center; margin-bottom: 6px;">Verification Code</h2>
    <p style="text-align: center; color: #606c38; margin-bottom: 18px; font-size: 14px;">Use this code to sign in to <strong>${domain}</strong></p>
    <div class="code-container">
      <div class="code-display">${otpCode}</div>
    </div>
    <p style="color: #606c38; font-size: 13px; text-align: center; margin: 12px 0 0 0;">
      Expires in ${expiryMinutes} minutes. Never share this code.
    </p>
  `;
  return getLuxuryEmailWrapper('Verification Code', body, undefined, preheader);
};

/**
 * Generates the clean Cash on Delivery Order Verification Email
 */
export const getCodOtpEmailTemplate = (otpCode: string, expiryMinutes: number = 5): string => {
  const store = getStoreConfigSync();
  const domain = store.websiteDomain || 'akulas.kitchen';
  const preheader = `Your COD verification code for ${domain} is ${otpCode}`;
  const body = `
    <h2 style="text-align: center; margin-bottom: 6px;">Order Verification</h2>
    <p style="text-align: center; color: #606c38; margin-bottom: 18px; font-size: 14px;">Use this Verification Code to confirm your Cash on Delivery order on <strong>${domain}</strong></p>
    <div class="code-container">
      <div class="code-display">${otpCode}</div>
    </div>
    <p style="color: #606c38; font-size: 13px; text-align: center; margin: 12px 0 0 0;">
      Expires in ${expiryMinutes} minutes.
    </p>
  `;
  return getLuxuryEmailWrapper('Order Verification', body, undefined, preheader);
};

/**
 * Generates the clean Team Invitation Email
 */
export const getTeamInviteEmailTemplate = (
  inviteUrl: string,
  role: string,
  permissions: string,
): string => {
  const store = getStoreConfigSync();
  const domain = store.websiteDomain || 'akulas.kitchen';
  const preheader = `You've been invited to join ${store.name}`;
  const body = `
    <h2>Team Invitation</h2>
    <p>You have been invited to join the <strong>${store.name}</strong> team as a <strong>${escapeHtml(role)}</strong> (${escapeHtml(permissions)} access).</p>
    <div class="button-wrapper">
      <a href="${inviteUrl}" class="cta-button" target="_blank">Accept Invitation</a>
    </div>
  `;
  return getLuxuryEmailWrapper('Team Invite', body, undefined, preheader);
};

/**
 * Generates the clean SMTP Diagnostic Test Email
 */
export const getDiagnosticTestEmailTemplate = (
  host: string,
  user: string,
  timestamp: string,
): string => {
  const store = getStoreConfigSync();
  const domain = store.websiteDomain || 'akulas.kitchen';
  const body = `
    <h2>SMTP Connectivity Verified</h2>
    <p>Email delivery is configured and active for <strong>${domain}</strong>.</p>
    <div style="background-color: #faf7f0; border: 1px solid #e5dcce; border-left: 3px solid #283618; padding: 16px; border-radius: 8px; margin: 20px 0; font-family: monospace; font-size: 13px; line-height: 1.7; color: #283618;">
      Host: ${host}<br/>
      Account: ${user}<br/>
      Verified: ${timestamp}
    </div>
  `;
  return getLuxuryEmailWrapper('Connectivity Test', body);
};

/**
 * Generates the clean Order Confirmation Email
 */
export const getOrderConfirmationTemplate = (orderDetails: any): string => {
  const store = getStoreConfigSync();
  const domain = store.websiteDomain || 'akulas.kitchen';
  const preheader = `Your order #${orderDetails.orderId} is confirmed`;
  const body = `
    <h2>Order Confirmed</h2>
    <p>Thank you for your order! We are preparing it fresh.</p>
    <div style="background-color: #faf7f0; border: 1px solid #e5dcce; border-left: 3px solid #f7bb0e; padding: 16px 20px; border-radius: 8px; margin: 20px 0; font-size: 14px; line-height: 1.7; color: #283618;">
      <strong>Order ID:</strong> #${escapeHtml(orderDetails.orderId)}<br/>
      <strong>Total:</strong> ₹${orderDetails.totalAmount}<br/>
      <strong>Payment:</strong> ${escapeHtml(orderDetails.paymentStatus)}
    </div>
    <div class="button-wrapper">
      <a href="${orderDetails.orderLink || `${store.websiteUrl}/dashboard/orders`}" class="cta-button" target="_blank">Track Order</a>
    </div>
  `;
  return getLuxuryEmailWrapper('Order Confirmed', body, undefined, preheader);
};

/**
 * Generates the clean Admin Notification Email
 */
export const getAdminNotificationTemplate = (
  title: string,
  message: string,
  actionUrl?: string,
): string => {
  const actionButton = actionUrl
    ? `<div class="button-wrapper"><a href="${actionUrl}" class="cta-button" target="_blank">View Details</a></div>`
    : '';

  const body = `
    <h2>${escapeHtml(title)}</h2>
    <p style="line-height: 1.6;">${message}</p>
    ${actionButton}
  `;
  return getLuxuryEmailWrapper('Admin Alert', body);
};

/**
 * Generates the clean Welcome Email
 */
export const getWelcomeEmailTemplate = (name: string, frontendUrl: string): string => {
  const store = getStoreConfigSync();
  const domain = store.websiteDomain || 'akulas.kitchen';
  const url = frontendUrl || store.websiteUrl || 'https://akulas.kitchen';
  const preheader = `Welcome to ${store.name}`;
  const body = `
    <h2>Welcome to ${store.name}!</h2>
    <p>Hi ${escapeHtml(name)}, thank you for joining our community.</p>
    <div class="button-wrapper">
      <a href="${url}" class="cta-button" target="_blank">Explore Menu on ${domain}</a>
    </div>
  `;
  return getLuxuryEmailWrapper('Welcome', body, undefined, preheader);
};

/**
 * Generates the clean Suspicious Login Alert Email
 */
export const getSuspiciousLoginEmailTemplate = (
  name: string,
  loginTime: string,
  ipAddress: string,
): string => {
  const store = getStoreConfigSync();
  const domain = store.websiteDomain || 'akulas.kitchen';
  const preheader = `New login detected for your ${domain} account`;
  const body = `
    <h2 style="color: #b91c1c;">New Login Detected</h2>
    <p>Hi ${escapeHtml(name)}, a new login was detected on your account.</p>
    <div style="background-color: #fdf6f0; border: 1px solid #fed7aa; border-left: 3px solid #ea580c; padding: 16px 20px; border-radius: 8px; margin: 20px 0; font-size: 14px; line-height: 1.7; color: #7c2d12;">
      Time: ${escapeHtml(loginTime)}<br/>
      IP: ${escapeHtml(ipAddress)}
    </div>
    <p style="color: #b91c1c; font-size: 13px; font-weight: 600;">If this was not you, please contact support immediately.</p>
  `;
  return getLuxuryEmailWrapper('Security Alert', body, undefined, preheader);
};
