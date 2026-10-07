import React, { useState } from 'react';
import { InvoiceTemplate } from '../components/ui/InvoiceTemplate';
import { BRAND } from '../config/brand';

const sampleReferenceOrder = {
  _id: '68bc22849129031022',
  orderId: '68bc22849129031022',
  invoiceNumber: 'INV-2026-000022',
  invoice: {
    number: 'INV-2026-000022',
    issuedAt: new Date('2026-09-06'),
  },
  createdAt: new Date('2026-09-06'),
  paymentMethod: 'COD',
  customer: 'Asha Rao',
  shippingAddress: {
    name: 'Asha Rao',
    email: 'customer@example.com',
    phone: '9876543210',
    address: 'Flat 101, Green Meadows Apartments,',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500081',
  },
  store: {
    displayName: BRAND.name,
    legalCompanyName: BRAND.legalCompanyName || BRAND.name,
    addressLine1: BRAND.address || '',
    city: BRAND.city || '',
    state: BRAND.state || '',
    postalCode: BRAND.postalCode || '',
    country: BRAND.country || 'India',
  },
  items: [
    {
      title: 'Kitchen Essentials Hamper',
      quantity: 1,
      price: 1499,
    },
  ],
  subtotal: 1499,
  shippingFee: 0,
  tax: {
    taxableAmount: 1499,
    cgst: 0,
    sgst: 0,
    totalTax: 0,
    grandTotal: 1499,
    currencySymbol: '₹',
  },
  totalAmount: 1499,
};

const sampleExtremeOrder = {
  _id: '68bc99999999999999',
  orderId: '68bc99999999999999',
  invoiceNumber: 'INV-2026-999999-EXTREME-SPECIAL-EDITION',
  createdAt: new Date(),
  paymentMethod: 'ONLINE_PREPAID',
  shippingAddress: {
    name: 'Sri Ramachandra Venkata Subrahmanya Sastry Garu (Long Name Test)',
    email: 'a.very.long.customer.email.address.for.layout.testing@example.com',
    phone: '+91 9876543210 / 08592-234567',
    address:
      'Door No. 12-34/56, 3rd Floor, Golden Jubilee Tower, Behind Old Municipal Complex, Ramnagar Colony, Extension Phase 2',
    city: 'Visakhapatnam Metropolitan Region',
    state: 'Andhra Pradesh',
    pincode: '530002',
  },
  items: [
    { title: 'Idli Batter (1 kg)', quantity: 2, price: 4999 },
    {
      title: 'Mango Avakaaya Pickle (500 g)',
      quantity: 1,
      price: 8500,
    },
    { title: 'Cashews W240 (500 g)', quantity: 3, price: 1200 },
  ],
  subtotal: 22098,
  discount: 2000,
  shippingFee: 250,
  tax: {
    taxableAmount: 20098,
    cgst: 0,
    sgst: 0,
    totalTax: 0,
    grandTotal: 20348,
  },
  totalAmount: 20348,
};

const sampleUpiOrder = {
  _id: '68bc449129031022',
  orderId: '68bc449129031022',
  invoiceNumber: 'INV-2026-000045',
  invoice: {
    number: 'INV-2026-000045',
    issuedAt: new Date('2026-09-10'),
  },
  createdAt: new Date('2026-09-10'),
  paymentMethod: 'UPI',
  customer: 'Kiran Kumar',
  shippingAddress: {
    name: 'Kiran Kumar',
    email: 'upi.customer@example.com',
    phone: '9876543210',
    address: 'Plot 7, Lake View Road, Madhapur',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500081',
  },
  store: {
    displayName: BRAND.name,
    email: BRAND.email,
    phone: BRAND.phone,
    legalCompanyName: BRAND.legalCompanyName || BRAND.name,
    addressLine1: BRAND.address || '',
    city: BRAND.city || '',
    state: BRAND.state || '',
    postalCode: BRAND.postalCode || '',
    country: BRAND.country || 'India',
  },
  items: [
    {
      title: 'Gongura Pickle (250 g)',
      quantity: 2,
      price: 650,
    },
  ],
  subtotal: 1300,
  shippingFee: 0,
  tax: {
    taxableAmount: 1300,
    cgst: 0,
    sgst: 0,
    totalTax: 0,
    grandTotal: 1300,
    currencySymbol: '₹',
  },
  totalAmount: 1300,
};

export default function InvoicePreviewPage() {
  const [activeTab, setActiveTab] = useState('reference'); // 'reference' | 'upi' | 'extreme'
  const [showModal, setShowModal] = useState(false);
  const currentOrder =
    activeTab === 'upi'
      ? sampleUpiOrder
      : activeTab === 'extreme'
        ? sampleExtremeOrder
        : sampleReferenceOrder;

  return (
    <div className="min-h-screen bg-neutral-100 py-6 px-2 sm:px-4 flex flex-col items-center">
      {/* Test Controls */}
      <div className="mb-4 flex items-center gap-3 bg-white p-2.5 rounded-full shadow-sm border border-neutral-200 flex-wrap justify-center">
        <button
          id="btn-upi"
          onClick={() => setActiveTab('upi')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
            activeTab === 'upi' ? 'bg-black text-white' : 'bg-gray-100 text-gray-700'
          }`}
        >
          UPI Order
        </button>
        <button
          id="btn-reference"
          onClick={() => setActiveTab('reference')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
            activeTab === 'reference' ? 'bg-black text-white' : 'bg-gray-100 text-gray-700'
          }`}
        >
          Reference Order
        </button>
        <button
          id="btn-extreme"
          onClick={() => setActiveTab('extreme')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
            activeTab === 'extreme' ? 'bg-black text-white' : 'bg-gray-100 text-gray-700'
          }`}
        >
          Extreme Data
        </button>
        <button
          id="btn-modal"
          onClick={() => setShowModal(!showModal)}
          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
            showModal ? 'bg-emerald-700 text-white' : 'bg-gray-900 text-white'
          }`}
        >
          {showModal ? 'Close Modal View' : 'Preview as Modal'}
        </button>
      </div>

      {/* Direct Canvas View */}
      {!showModal && (
        <div className="w-full max-w-2xl bg-transparent flex justify-center">
          <InvoiceTemplate order={currentOrder} onClose={() => {}} />
        </div>
      )}

      {/* Modal Dialog Simulation (Matches OrderSuccess, Dashboard, Admin) */}
      {showModal && (
        <>
          <div
            onClick={() => setShowModal(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] no-print"
          />
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-2 sm:p-4 pointer-events-none no-print">
            <div className="invoice-modal-container pointer-events-auto w-full max-w-[500px] h-fit max-h-[96vh] bg-surface rounded-[16px] shadow-[0_25px_65px_-15px_rgba(0,0,0,0.35)] border border-outline-variant/30 overflow-y-auto no-scrollbar p-2 sm:p-2.5 print:static print:p-0 print:border-none print:shadow-none print:bg-white">
              <InvoiceTemplate order={currentOrder} onClose={() => setShowModal(false)} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
