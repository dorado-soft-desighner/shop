import React, { useState, useEffect } from 'react';
import CashBoxCalculator from './CashBoxCalculator';

export default function CashierPanel({ API_URL, token, user, onLogout }) {
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [amountReceived, setAmountReceived] = useState('');
  const [paymentDetails, setPaymentDetails] = useState({ type: '', refNo: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successReceipt, setSuccessReceipt] = useState(null);
  const [successReturn, setSuccessReturn] = useState(null);

  // Return States
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [originalInvoiceNo, setOriginalInvoiceNo] = useState('');
  const [fetchedInvoice, setFetchedInvoice] = useState(null);
  const [returnType, setReturnType] = useState('Refund');
  const [returnPaymentMethod, setReturnPaymentMethod] = useState('Cash');

  // Shift & Cash Box States
  const [activeShift, setActiveShift] = useState(null);
  const [checkingShift, setCheckingShift] = useState(true);
  const [showOpenShiftModal, setShowOpenShiftModal] = useState(false);
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);
  const [zReportData, setZReportData] = useState(null); // Received after shifting completes

  // Cash In / Out States
  const [showCashModal, setShowCashModal] = useState(false);
  const [cashTxType, setCashTxType] = useState('paid_in');
  const [cashTxAmount, setCashTxAmount] = useState('');
  const [cashTxReason, setCashTxReason] = useState('');
  const [cashTxIssuedTo, setCashTxIssuedTo] = useState('');
  const [cashTxLoading, setCashTxLoading] = useState(false);
  const [successCashTx, setSuccessCashTx] = useState(null);

  // Fetch product catalog
  const fetchProducts = async () => {
    try {
      const response = await fetch(`${API_URL}/api/products`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setProducts(data);
      } else {
        throw new Error(data.error || 'Failed to fetch catalog.');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // Check cashier shift status
  const checkShiftStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/api/shifts/active`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        if (data.active) {
          setActiveShift(data.shift);
          setShowOpenShiftModal(false);
        } else {
          setActiveShift(null);
          setShowOpenShiftModal(true);
        }
      } else {
        throw new Error(data.error || 'Failed to verify drawer status.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setCheckingShift(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    checkShiftStatus();
  }, []);

  const categories = ['All', ...new Set(products.map(p => p.category))];

  // Shift opening handler
  const handleStartShift = async (total, counts) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/shifts/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          opening_balance: total,
          opening_denominations: counts
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to register shift opening.');
      }

      setActiveShift(data);
      setShowOpenShiftModal(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Shift ending handler (Closing cash calculator)
  const handleEndShift = async (total, counts) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/shifts/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          closing_balance: total,
          closing_denominations: counts
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to close shift register.');
      }

      setZReportData(data);
      setShowCloseShiftModal(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter products
  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.barcode.includes(searchQuery);
    return matchesCategory && matchesSearch;
  });

  const addToCart = (product) => {
    const existingInCart = cart.find(item => item.id === product.id);
    const currentQty = existingInCart ? existingInCart.quantity : 0;

    if (product.stock_quantity <= currentQty) {
      alert(`⚠️ Product '${product.name}' is out of stock! Max stock: ${product.stock_quantity}`);
      return;
    }

    if (existingInCart) {
      setCart(cart.map(item => 
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const updateQuantity = (productId, delta) => {
    const product = products.find(p => p.id === productId);
    const existingInCart = cart.find(item => item.id === productId);
    if (!existingInCart) return;

    const newQty = existingInCart.quantity + delta;

    if (newQty <= 0) {
      setCart(cart.filter(item => item.id !== productId));
      return;
    }

    if (delta > 0 && product.stock_quantity < newQty) {
      alert(`⚠️ Cannot increase quantity! Stock limit reached (${product.stock_quantity} available).`);
      return;
    }

    setCart(cart.map(item => 
      item.id === productId ? { ...item, quantity: newQty } : item
    ));
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  // Cart Calculations
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const netTotal = Math.max(0, subtotal - Number(discount || 0));
  const changeDue = amountReceived ? Math.max(0, Number(amountReceived) - netTotal) : 0;

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return;

    if (paymentMethod === 'Cash' && amountReceived && Number(amountReceived) < netTotal) {
      alert('⚠️ Amount received is less than the net payable total.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const checkoutData = {
        items: cart.map(item => ({ id: item.id, name: item.name, quantity: item.quantity })),
        discount: Number(discount),
        payment_method: paymentMethod,
        amount_received: paymentMethod === 'Cash' ? Number(amountReceived || netTotal) : netTotal,
        payment_details: paymentMethod !== 'Cash' ? paymentDetails : undefined
      };

      const response = await fetch(`${API_URL}/api/sales/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(checkoutData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Checkout process failed.');
      }

      setSuccessReceipt(data);
      setCart([]);
      setDiscount(0);
      setAmountReceived('');
      setPaymentDetails({ type: '', refNo: '' });
      fetchProducts();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchOriginalInvoice = async () => {
    if (!originalInvoiceNo) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/sales/invoice/${originalInvoiceNo}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch original invoice.');
      
      const availableItems = data.items.map(item => ({
        ...item,
        available_to_return: item.quantity - (item.returned_quantity || 0),
        return_qty: 0
      })).filter(item => item.available_to_return > 0);

      if (availableItems.length === 0) {
        throw new Error('All items in this invoice have already been returned.');
      }
      
      setFetchedInvoice({ ...data, returnable_items: availableItems });
    } catch (err) {
      alert(err.message);
      setFetchedInvoice(null);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessReturn = async () => {
    const itemsToReturn = fetchedInvoice?.returnable_items.filter(i => i.return_qty > 0) || [];
    if (itemsToReturn.length === 0) {
      alert('Please specify return quantities for at least one item.');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/sales/return`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          original_invoice_no: fetchedInvoice.invoice_no,
          items: itemsToReturn.map(i => ({ id: i.product_id, name: i.product_name, quantity: i.return_qty })),
          reason: returnReason,
          return_type: returnType,
          payment_method: returnPaymentMethod
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to process return');
      }
      setSuccessReturn(data);
      setShowReturnModal(false);
      setOriginalInvoiceNo('');
      setFetchedInvoice(null);
      setReturnReason('');
      fetchProducts();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------
  // POPUP-BASED PRINT UTILITIES
  // Opens a new temp window with the given HTML and prints.
  // -------------------------------------------------------
  const openPrintWindow = (htmlContent) => {
    const pw = window.open('', '_blank', 'width=400,height=600');
    if (!pw) {
      alert('Please allow pop-ups for this site to enable printing.');
      return;
    }
    pw.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Dorado Essence - Print</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Courier New', Courier, monospace;
            font-size: 12px;
            color: #000;
            background: #fff;
            padding: 5mm;
            width: 80mm;
          }
          h2, h3, h4 { margin: 2px 0; }
          table { width: 100%; border-collapse: collapse; }
          td, th { padding: 3px 0; }
          .right { text-align: right; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .divider { border-bottom: 1px dashed #000; margin: 5px 0; }
          .small { font-size: 10px; }
          .xsmall { font-size: 9px; color: #555; }
          @media print {
            body { width: 100%; }
            @page { margin: 0; }
          }
        </style>
      </head>
      <body>
        ${htmlContent}
        <script>window.onload = function(){ window.print(); setTimeout(function(){ window.close(); }, 500); }<\/script>
      </body>
      </html>
    `);
    pw.document.close();
  };

  const printInvoice = () => {
    if (!successReceipt) return;
    const r = successReceipt;
    const itemRows = r.items.map(item => `
      <tr>
        <td>${item.product_name}<br>&nbsp;&nbsp;x${item.quantity} @ Rs.${item.price.toFixed(2)}</td>
        <td class="right">Rs.${item.total.toFixed(2)}</td>
      </tr>`).join('');
    const discountRow = r.discount > 0 ? `<tr><td>Discount Applied:</td><td class="right">-Rs.${r.discount.toFixed(2)}</td></tr>` : '';
    const refRow = r.payment_details?.refNo ? `<tr><td>Ref No:</td><td class="right">${r.payment_details.refNo}</td></tr>` : '';
    const html = `
      <div class="center">
        <h2>DORADO ESSENCE</h2>
        <p class="bold">LUXURIOUS FRAGRANCE</p>
        <p>3rd Floor, Crown Mall, Polonnaruwa</p>
        <p>Tel: 0713171781, 0272555250</p>
        <div class="divider"></div>
      </div>
      <p><b>Invoice:</b> ${r.invoice_no}</p>
      <p><b>Date:</b> ${new Date(r.created_at).toLocaleString()}</p>
      <p><b>Cashier:</b> ${r.cashier_name}</p>
      <div class="divider"></div>
      <table>
        <thead><tr><th>Item</th><th class="right">Amount</th></tr></thead>
        <tbody>${itemRows}</tbody>
      </table>
      <div class="divider"></div>
      <table>
        <tr><td>Subtotal:</td><td class="right">Rs.${r.subtotal.toFixed(2)}</td></tr>
        ${discountRow}
        <tr class="bold"><td>NET PAYABLE:</td><td class="right">Rs.${r.net_total.toFixed(2)}</td></tr>
        <tr><td>Paid (${r.payment_method}${r.payment_details?.type ? ' - ' + r.payment_details.type : ''}):</td><td class="right">Rs.${r.amount_received.toFixed(2)}</td></tr>
        ${refRow}
        <tr><td>Change Due:</td><td class="right">Rs.${r.change_given.toFixed(2)}</td></tr>
      </table>
      <div class="divider"></div>
      <div class="center">
        <p class="bold">Thank you for choosing us!</p>
        <p class="xsmall">Software by Suneth +94713507882</p>
      </div>`;
    openPrintWindow(html);
  };

  const printZReport = () => {
    if (!zReportData) return;
    const z = zReportData;
    const denomRows = Object.entries(z.closing_denominations)
      .filter(([, count]) => count > 0)
      .map(([denom, count]) => `<tr><td>Rs. ${denom} x ${count}</td><td class="right">Rs.${(Number(denom) * count).toFixed(2)}</td></tr>`)
      .join('');
    const varianceText = z.discrepancy === 0 ? 'Rs.0.00 (BALANCED)' : `Rs.${z.discrepancy.toFixed(2)} (${z.discrepancy < 0 ? 'SHORTAGE' : 'OVERAGE'})`;
    const html = `
      <div class="center">
        <h2>DORADO ESSENCE</h2>
        <p class="bold">Z-REPORT / SHIFT AUDIT REPORT</p>
        <div class="divider"></div>
      </div>
      <p><b>Cashier:</b> ${z.cashier_name}</p>
      <p><b>Opened:</b> ${new Date(z.start_time).toLocaleString()}</p>
      <p><b>Closed:</b> ${new Date(z.end_time).toLocaleString()}</p>
      <div class="divider"></div>
      <h3>DRAWER RECONCILIATION</h3>
      <table>
        <tr><td>Opening Cash:</td><td class="right">Rs.${z.opening_balance.toFixed(2)}</td></tr>
        <tr><td>Cash Sales (+):</td><td class="right">Rs.${z.cash_sales.toFixed(2)}</td></tr>
        ${(z.total_paid_in && z.total_paid_in > 0) ? `<tr><td>Paid In (+):</td><td class="right">Rs.${Number(z.total_paid_in).toFixed(2)}</td></tr>` : ''}
        ${(z.total_paid_out && z.total_paid_out > 0) ? `<tr><td>Paid Out (-):</td><td class="right">-Rs.${Number(z.total_paid_out).toFixed(2)}</td></tr>` : ''}
        <tr class="bold"><td>Expected Cash:</td><td class="right">Rs.${z.expected_cash.toFixed(2)}</td></tr>
        <tr class="bold"><td>Declared Cash:</td><td class="right">Rs.${z.closing_balance.toFixed(2)}</td></tr>
        <tr class="bold"><td>VARIANCE:</td><td class="right">${varianceText}</td></tr>
      </table>
      <div class="divider"></div>
      <h3>SESSION SALES SUMMARY</h3>
      <table>
        <tr><td>Cash Sales:</td><td class="right">Rs.${z.cash_sales.toFixed(2)}</td></tr>
        <tr><td>Card Sales:</td><td class="right">Rs.${z.card_sales.toFixed(2)}</td></tr>
        <tr><td>Mobile QR Sales:</td><td class="right">Rs.${z.qr_sales.toFixed(2)}</td></tr>
        <tr><td>Discounts Given:</td><td class="right">Rs.${z.total_discounts.toFixed(2)}</td></tr>
        <tr class="bold"><td>NET SESSION SALES:</td><td class="right">Rs.${z.net_sales.toFixed(2)}</td></tr>
      </table>
      <div class="divider"></div>
      <h3>CLOSING DENOMINATIONS</h3>
      <table>${denomRows}</table>
      <div class="divider"></div>
      <div class="center">
        <p class="bold">SHIFT REGISTER CLOSED SUCCESSFULLY</p>
        <p class="xsmall">Dorado Decoupled Shift Audits</p>
      </div>`;
    openPrintWindow(html);
  };

  // -------------------------------------------------------
  // CASH IN / OUT HANDLER
  // -------------------------------------------------------
  const handleCashTransaction = async (e) => {
    e.preventDefault();
    if (!cashTxAmount || Number(cashTxAmount) <= 0) {
      alert('Please enter a valid amount greater than zero.');
      return;
    }
    if (!cashTxReason.trim()) {
      alert('Please enter a reason for this transaction.');
      return;
    }
    setCashTxLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/cash`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type: cashTxType,
          amount: Number(cashTxAmount),
          reason: cashTxReason,
          issued_to: cashTxIssuedTo
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to record transaction.');
      setSuccessCashTx({ ...data, cashier_name: user.full_name });
      setShowCashModal(false);
      setCashTxAmount('');
      setCashTxReason('');
      setCashTxIssuedTo('');
      setCashTxType('paid_in');
    } catch (err) {
      alert(err.message);
    } finally {
      setCashTxLoading(false);
    }
  };

  const printCashSlip = () => {
    if (!successCashTx) return;
    const tx = successCashTx;
    const typeLabel = tx.type === 'paid_in' ? 'PAID IN' : 'PAID OUT';
    const typeColor = tx.type === 'paid_in' ? '#16a34a' : '#dc2626';
    const issuedToRow = tx.issued_to ? `<tr><td><b>Issued To:</b></td><td style="text-align:right">${tx.issued_to}</td></tr>` : '';
    const signatureLine = tx.type === 'paid_out' ? `
      <div style="margin-top:20px">
        <p style="margin:0;font-size:11px">Authorized Signature:</p>
        <div style="border-bottom:1px solid #000;margin-top:28px;margin-bottom:4px"></div>
        <p style="margin:0;font-size:10px;color:#555">Name &amp; Signature</p>
      </div>
      <div style="margin-top:14px">
        <p style="margin:0;font-size:11px">Received By (${tx.issued_to || 'Recipient'}):</p>
        <div style="border-bottom:1px solid #000;margin-top:28px;margin-bottom:4px"></div>
        <p style="margin:0;font-size:10px;color:#555">Signature &amp; Date</p>
      </div>` : '';
    const html = `
      <div style="text-align:center">
        <h2 style="margin:0;font-size:16px">DORADO ESSENCE</h2>
        <p style="margin:2px 0;font-size:11px;font-weight:bold">LUXURIOUS FRAGRANCE</p>
        <p style="margin:0;font-size:10px">3rd Floor, Crown Mall, Polonnaruwa</p>
        <p style="margin:0 0 6px 0;font-size:10px">Tel: 0713171781, 0272555250</p>
        <div style="border-bottom:1px dashed #000;margin:5px 0"></div>
        <div style="display:inline-block;border:2px solid ${typeColor};border-radius:4px;padding:3px 12px;margin:5px 0">
          <span style="font-size:13px;font-weight:bold;color:${typeColor}">${typeLabel}</span>
        </div>
        <div style="border-bottom:1px dashed #000;margin:5px 0"></div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <tr><td><b>Date:</b></td><td style="text-align:right">${new Date(tx.created_at).toLocaleString()}</td></tr>
        <tr><td><b>Cashier:</b></td><td style="text-align:right">${tx.cashier_name}</td></tr>
        <tr><td colspan="2"><div style="border-bottom:1px dashed #000;margin:4px 0"></div></td></tr>
        <tr><td><b>Amount:</b></td><td style="text-align:right;font-size:14px;font-weight:bold">Rs. ${Number(tx.amount).toFixed(2)}</td></tr>
        <tr><td><b>Reason:</b></td><td style="text-align:right">${tx.reason}</td></tr>
        ${issuedToRow}
      </table>
      <div style="border-bottom:1px dashed #000;margin:8px 0"></div>
      ${signatureLine}
      <div style="text-align:center;margin-top:12px;font-size:10px;color:#555">
        <p style="margin:0">Software by Suneth +94713507882</p>
      </div>`;
    openPrintWindow(html);
  };

  const printReturnNote = () => {
    if (!successReturn) return;
    const r = successReturn;
    const itemRows = r.items.map(item => `
      <tr><td>${item.product_name} x${item.quantity}</td><td class="right">Rs.${item.refund_amount.toFixed(2)}</td></tr>`).join('');
    const html = `
      <div class="center">
        <h2>DORADO ESSENCE</h2>
        <p class="bold">CREDIT NOTE / RETURN RECEIPT</p>
        <div class="divider"></div>
      </div>
      <p><b>Return No:</b> ${r.return_no}</p>
      <p><b>Original Inv:</b> ${r.original_invoice_no}</p>
      <p><b>Date:</b> ${new Date(r.created_at).toLocaleString()}</p>
      <p><b>Cashier:</b> ${r.cashier_name}</p>
      <p><b>Reason:</b> ${r.reason}</p>
      <div class="divider"></div>
      <table>
        <thead><tr><th>Item (Returned)</th><th class="right">Refund</th></tr></thead>
        <tbody>${itemRows}</tbody>
      </table>
      <div class="divider"></div>
      <table>
        <tr class="bold"><td>TOTAL REFUND:</td><td class="right">Rs.${r.total_refund.toFixed(2)}</td></tr>
        <tr><td>Adjustment:</td><td class="right">${r.return_type} (${r.payment_method})</td></tr>
      </table>
      <div class="divider"></div>
      <div class="center">
        <p class="bold">Valid for authorized returns only.</p>
      </div>`;
    openPrintWindow(html);
  };

  // -------------------------------------------------------
  // OPEN CASH DRAWER
  // Sends ESC/POS drawer kick command via a minimal print job.
  // Works when cash drawer is connected to thermal printer's
  // RJ11/RJ12 drawer kick port.
  // -------------------------------------------------------
  const openCashDrawer = () => {
    // Silent cash drawer kick using a hidden iframe.
    // We inject a 1x1 invisible iframe that auto-prints a blank page.
    // The thermal printer driver detects the print job and fires the
    // drawer kick relay (ESC p command) without any visible dialog.

    // Remove any previously injected drawer iframe
    const oldFrame = document.getElementById('__drawer_kick_frame__');
    if (oldFrame) oldFrame.remove();

    const iframe = document.createElement('iframe');
    iframe.id = '__drawer_kick_frame__';
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;visibility:hidden;';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; }
    body { width: 1px; height: 1px; overflow: hidden; background: white; }
    @page { margin: 0; size: 58mm 1mm; }
  </style>
</head>
<body>
  <div style="font-size:1px;color:white;visibility:hidden;">.</div>
  <script>
    window.onload = function() {
      window.focus();
      window.print();
      setTimeout(function(){ window.parent.document.getElementById('__drawer_kick_frame__') && window.parent.document.getElementById('__drawer_kick_frame__').remove(); }, 1000);
    };
  <\/script>
</body>
</html>`);
    doc.close();
  };

  if (checkingShift) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', color: 'var(--text-secondary)', gap: '16px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid rgba(0, 242, 254, 0.1)', borderTopColor: 'var(--accent-cyan)', animation: 'spin 1s linear infinite' }}></div>
        <span>Auditing Cash Drawer shifts...</span>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      
      {/* ==================================================== */}
      {/* 1. FORCE SHIFT OPEN MODAL (Opening Cash Box Declaration) */}
      {/* ==================================================== */}
      {showOpenShiftModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'var(--bg-primary)',
          backgroundImage: 'radial-gradient(circle at 50% 0%, #1e1e38 0%, #0a0a0f 70%)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          zIndex: 90, padding: '40px 20px 20px 20px', overflowY: 'auto'
        }}>
          <div className="glass-panel-glow" style={{
            width: '100%', maxWidth: '480px', padding: '36px',
            position: 'relative'
          }}>
            <button 
              onClick={onLogout} 
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'var(--text-secondary)',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(239, 68, 68, 0.15)';
                e.target.style.borderColor = 'rgba(239, 68, 68, 0.4)';
                e.target.style.color = '#ef4444';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(255,255,255,0.05)';
                e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                e.target.style.color = 'var(--text-secondary)';
              }}
            >
              🚪 Sign Out
            </button>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: '56px', height: '56px', borderRadius: '14px',
                background: 'linear-gradient(135deg, rgba(0,242,254,0.1) 0%, rgba(79,172,254,0.05) 100%)',
                border: '1px solid var(--accent-cyan)', marginBottom: '12px'
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="2.5">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                </svg>
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: '800' }}>Shift Session Opening</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Logged in cashier: {user.full_name}</p>
            </div>

            <CashBoxCalculator
              title="Cash Box Opening Count"
              confirmText="🔑 Open Register & Start Shift"
              onConfirm={handleStartShift}
            />
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MAIN POS VIEW CONTROLLER (Hidden when Z-report is being printed) */}
      {/* ==================================================== */}
      <div className="no-print" style={{ padding: '24px', display: showOpenShiftModal || zReportData ? 'none' : 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Header Bar */}
        <header className="glass-panel" style={{
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(0,242,254,0.1) 0%, rgba(79,172,254,0.05) 100%)',
              border: '1px solid var(--accent-cyan)',
              padding: '8px',
              borderRadius: '10px'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="2.5">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                <line x1="8" y1="21" x2="16" y2="21"></line>
                <line x1="12" y1="17" x2="12" y2="21"></line>
              </svg>
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: '800' }}>DORADO ESSENCE POS</h2>
              {activeShift && (
                <p style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--accent-emerald)', display: 'inline-block' }}></span>
                  Shift active since {new Date(activeShift.start_time).toLocaleTimeString()} (Opening: Rs. {activeShift.opening_balance})
                </p>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: '600' }}>{user.full_name}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Role: Cashier Terminal</p>
            </div>
            
            <button onClick={() => setShowReturnModal(true)} className="btn-secondary" style={{ padding: '10px 16px', fontSize: '0.85rem' }}>
              🔄 Sales Return
            </button>
            <button
              onClick={() => setShowCashModal(true)}
              style={{
                padding: '10px 16px', fontSize: '0.85rem',
                background: 'linear-gradient(135deg, rgba(251,191,36,0.15) 0%, rgba(245,158,11,0.08) 100%)',
                border: '1px solid rgba(251,191,36,0.4)',
                color: '#fbbf24', borderRadius: '10px', cursor: 'pointer',
                fontWeight: '600', transition: 'all 0.2s'
              }}
            >
              💵 Cash In / Out
            </button>
            <button
              onClick={openCashDrawer}
              title="Send drawer kick command to thermal printer"
              style={{
                padding: '10px 14px', fontSize: '0.85rem',
                background: 'linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(109,40,217,0.08) 100%)',
                border: '1px solid rgba(139,92,246,0.4)',
                color: '#a78bfa', borderRadius: '10px', cursor: 'pointer',
                fontWeight: '600', transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="2" y="7" width="20" height="13" rx="2"/>
                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                <line x1="12" y1="12" x2="12" y2="16"/>
                <line x1="10" y1="14" x2="14" y2="14"/>
              </svg>
              Open Drawer
            </button>
             <button onClick={() => setShowCloseShiftModal(true)} className="btn-danger" style={{ padding: '10px 16px', fontSize: '0.85rem' }}>
              Shift Logout (Z-Report)
            </button>
            <button 
              onClick={() => {
                if (window.confirm("Are you sure you want to sign out? Your active shift will remain open so you can resume it later.")) {
                  onLogout();
                }
              }} 
              className="btn-secondary" 
              style={{ 
                padding: '10px 16px', 
                fontSize: '0.85rem',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#ef4444'
              }}
            >
              🚪 Sign Out
            </button>
          </div>
        </header>

        {/* Main Column Layout */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 380px',
          gap: '20px',
          alignItems: 'start'
        }}>
          
          {/* Left Side: Product Grid & Search */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Controls: Search and Categories */}
            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Search products by barcode or name..."
                    className="glass-input"
                    style={{ width: '100%', paddingLeft: '40px' }}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <div style={{ position: 'absolute', left: '14px', top: '13px', color: 'var(--text-muted)' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Category tabs slider */}
              <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`category-tab ${selectedCategory === cat ? 'active' : ''}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Product Cards Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: '16px'
            }}>
              {filteredProducts.map(prod => {
                const isLowStock = prod.stock_quantity <= prod.low_stock_threshold;
                const isOut = prod.stock_quantity === 0;

                return (
                  <div
                    key={prod.id}
                    onClick={() => !isOut && addToCart(prod)}
                    className="glass-panel pos-prod-card animate-fade-in"
                    style={{
                      padding: '16px',
                      border: isOut ? '1px solid rgba(255,42,95,0.2)' : isLowStock ? '1px solid rgba(255, 208, 0, 0.2)' : '1px solid rgba(255,255,255,0.05)',
                      opacity: isOut ? 0.6 : 1,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: '160px'
                    }}
                  >
                    <div>
                      <span style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        display: 'block',
                        marginBottom: '4px'
                      }}>
                        {prod.category}
                      </span>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: '600', marginBottom: '8px', lineHeight: '1.3' }}>
                        {prod.name}
                      </h3>
                    </div>

                    <div>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        marginBottom: '10px'
                      }}>
                        <span style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--accent-cyan)' }}>
                          Rs. {prod.price.toFixed(2)}
                        </span>
                      </div>

                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.75rem',
                        borderTop: '1px solid rgba(255,255,255,0.05)',
                        paddingTop: '8px'
                      }}>
                        <span style={{ color: 'var(--text-muted)' }}>Stock:</span>
                        <span style={{
                          fontWeight: 'bold',
                          color: isOut ? 'var(--accent-rose)' : isLowStock ? 'var(--accent-gold)' : 'var(--accent-emerald)'
                        }}>
                          {isOut ? 'Out of stock' : `${prod.stock_quantity} units`}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredProducts.length === 0 && (
                <div className="glass-panel" style={{
                  gridColumn: '1 / -1',
                  padding: '40px',
                  textAlign: 'center',
                  color: 'var(--text-muted)'
                }}>
                  🔍 No products match your filter search.
                </div>
              )}
            </div>
          </div>

          {/* Right Side: Cart Panel */}
          <div className="glass-panel-glow" style={{
            padding: '24px',
            height: 'calc(100vh - 120px)',
            position: 'sticky',
            top: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
                <span>Shopping Cart</span>
                <span style={{ color: 'var(--accent-cyan)', fontSize: '0.9rem' }}>{cart.length} Items</span>
              </h3>

              {/* Cart Items List */}
              <div style={{
                maxHeight: 'calc(100vh - 460px)',
                overflowY: 'auto',
                paddingRight: '4px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                {cart.map(item => (
                  <div key={item.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    padding: '10px 12px',
                    borderRadius: '10px'
                  }}>
                    <div style={{ flex: 1, marginRight: '10px' }}>
                      <p style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '4px' }}>{item.name}</p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)' }}>Rs. {item.price.toFixed(2)}</p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        style={{ width: '24px', height: '24px', borderRadius: '6px', border: 'none', background: 'rgba(255,255,255,0.05)', color: '#fff', cursor: 'pointer' }}
                      >
                        -
                      </button>
                      <span style={{ fontSize: '0.9rem', fontWeight: 'bold', width: '20px', textAlign: 'center' }}>
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        style={{ width: '24px', height: '24px', borderRadius: '6px', border: 'none', background: 'rgba(255,255,255,0.05)', color: '#fff', cursor: 'pointer' }}
                      >
                        +
                      </button>
                      
                      <button
                        onClick={() => removeFromCart(item.id)}
                        style={{ marginLeft: '8px', border: 'none', background: 'transparent', color: 'var(--accent-rose)', cursor: 'pointer' }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}

                {cart.length === 0 && (
                  <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    🛒 Your checkout cart is empty.
                  </div>
                )}
              </div>
            </div>

            {/* Pricing Summary */}
            <div style={{
              borderTop: '1px solid rgba(255,255,255,0.05)',
              paddingTop: '20px',
              marginTop: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <span>Subtotal:</span>
                <span>Rs. {subtotal.toFixed(2)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Discount (Rs.):</span>
                <input
                  type="number"
                  className="glass-input"
                  style={{ width: '100px', padding: '6px 10px', fontSize: '0.85rem', textAlign: 'right' }}
                  value={discount}
                  min="0"
                  max={subtotal}
                  onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                />
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                fontSize: '1.25rem',
                fontWeight: '800',
                borderTop: '1px solid rgba(255,255,255,0.05)',
                paddingTop: '12px',
                color: '#fff'
              }}>
                <span>Net Payable:</span>
                <span style={{ color: 'var(--accent-cyan)' }}>Rs. {netTotal.toFixed(2)}</span>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '6px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '8px',
                padding: '3px',
                marginTop: '10px'
              }}>
                {['Cash', 'Card', 'Mobile QR'].map(method => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => {
                      setPaymentMethod(method);
                      if (method !== 'Cash') setAmountReceived('');
                      setPaymentDetails({ type: '', refNo: '' });
                    }}
                    style={{
                      padding: '8px 0',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      background: paymentMethod === method ? 'rgba(0, 242, 254, 0.1)' : 'transparent',
                      color: paymentMethod === method ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    {method}
                  </button>
                ))}
              </div>

              {paymentMethod === 'Cash' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '6px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Amount Paid:</label>
                    <input
                      type="number"
                      placeholder={`Rs. ${netTotal}`}
                      className="glass-input"
                      style={{ padding: '8px 10px', fontSize: '0.85rem' }}
                      value={amountReceived}
                      onChange={(e) => setAmountReceived(e.target.value)}
                    />
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'right' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Change Due:</span>
                    <span style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--accent-emerald)', padding: '8px 0' }}>
                      Rs. {changeDue.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {paymentMethod === 'Card' && (
                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  <select 
                    className="glass-input" 
                    style={{ flex: 1, padding: '8px 10px', fontSize: '0.85rem', backgroundColor: 'rgba(0,0,0,0.2)' }}
                    value={paymentDetails.type}
                    onChange={(e) => setPaymentDetails({...paymentDetails, type: e.target.value})}
                  >
                    <option value="" disabled>Select Card</option>
                    <option value="VISA">VISA</option>
                    <option value="Master">Master</option>
                    <option value="Amex">Amex</option>
                    <option value="UnionPay">UnionPay</option>
                    <option value="JCB">JCB</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Ref No (Opt)"
                    className="glass-input"
                    style={{ flex: 1, padding: '8px 10px', fontSize: '0.85rem' }}
                    value={paymentDetails.refNo}
                    onChange={(e) => setPaymentDetails({...paymentDetails, refNo: e.target.value})}
                  />
                </div>
              )}

              {paymentMethod === 'Mobile QR' && (
                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  <select 
                    className="glass-input" 
                    style={{ flex: 1, padding: '8px 10px', fontSize: '0.85rem', backgroundColor: 'rgba(0,0,0,0.2)' }}
                    value={paymentDetails.type}
                    onChange={(e) => setPaymentDetails({...paymentDetails, type: e.target.value})}
                  >
                    <option value="" disabled>Select App</option>
                    <option value="Mintpay">Mintpay</option>
                    <option value="Payzy">Payzy</option>
                    <option value="Koko">Koko</option>
                    <option value="LankaQR">LankaQR</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Ref No (Opt)"
                    className="glass-input"
                    style={{ flex: 1, padding: '8px 10px', fontSize: '0.85rem' }}
                    value={paymentDetails.refNo}
                    onChange={(e) => setPaymentDetails({...paymentDetails, refNo: e.target.value})}
                  />
                </div>
              )}

              <button
                onClick={handleCheckout}
                disabled={cart.length === 0 || loading}
                className="btn-primary"
                style={{
                  width: '100%', padding: '14px', fontSize: '0.95rem', marginTop: '10px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  opacity: cart.length === 0 ? 0.5 : 1
                }}
              >
                {loading ? (
                  <span>Registering Invoice...</span>
                ) : (
                  <>
                    <span>Complete Checkout Order</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================== */}
      {/* CASH IN / OUT MODAL                                   */}
      {/* ==================================================== */}
      {showCashModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          zIndex: 100, padding: '40px 20px 20px 20px', overflowY: 'auto'
        }}>
          <div className="glass-panel-glow animate-fade-in" style={{
            width: '100%', maxWidth: '480px', padding: '32px',
            display: 'flex', flexDirection: 'column', gap: '20px'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px', height: '38px', borderRadius: '10px',
                  background: 'linear-gradient(135deg, rgba(251,191,36,0.2), rgba(245,158,11,0.1))',
                  border: '1px solid rgba(251,191,36,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px'
                }}>💵</div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '800' }}>Cash In / Out</h3>
              </div>
              <button onClick={() => setShowCashModal(false)} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                Cancel
              </button>
            </div>

            <form onSubmit={handleCashTransaction} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Type Selector */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Transaction Type
                </label>
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px'
                }}>
                  <button
                    type="button"
                    onClick={() => setCashTxType('paid_in')}
                    style={{
                      padding: '14px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                      background: cashTxType === 'paid_in'
                        ? 'linear-gradient(135deg, rgba(22,163,74,0.25), rgba(16,185,129,0.15))'
                        : 'rgba(255,255,255,0.03)',
                      border: cashTxType === 'paid_in' ? '2px solid #16a34a' : '2px solid rgba(255,255,255,0.08)',
                      color: cashTxType === 'paid_in' ? '#4ade80' : 'var(--text-muted)',
                      fontWeight: '700', fontSize: '0.95rem', transition: 'all 0.2s'
                    }}
                  >
                    ⬇️ PAID IN<br/>
                    <span style={{ fontSize: '0.72rem', fontWeight: '400', opacity: 0.8 }}>Cash added to drawer</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCashTxType('paid_out')}
                    style={{
                      padding: '14px', borderRadius: '10px', cursor: 'pointer',
                      background: cashTxType === 'paid_out'
                        ? 'linear-gradient(135deg, rgba(220,38,38,0.25), rgba(239,68,68,0.15))'
                        : 'rgba(255,255,255,0.03)',
                      border: cashTxType === 'paid_out' ? '2px solid #dc2626' : '2px solid rgba(255,255,255,0.08)',
                      color: cashTxType === 'paid_out' ? '#f87171' : 'var(--text-muted)',
                      fontWeight: '700', fontSize: '0.95rem', transition: 'all 0.2s'
                    }}
                  >
                    ⬆️ PAID OUT<br/>
                    <span style={{ fontSize: '0.72rem', fontWeight: '400', opacity: 0.8 }}>Cash removed from drawer</span>
                  </button>
                </div>
              </div>

              {/* Amount */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Amount (Rs.)
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  className="glass-input"
                  style={{ padding: '12px 14px', fontSize: '1.1rem', fontWeight: '700' }}
                  value={cashTxAmount}
                  min="0.01"
                  step="0.01"
                  required
                  onChange={(e) => setCashTxAmount(e.target.value)}
                />
              </div>

              {/* Reason */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Reason / Description
                </label>
                <input
                  type="text"
                  placeholder={cashTxType === 'paid_in' ? 'e.g. Opening adjustment, Petty cash replenishment' : 'e.g. Supplier payment, Office supplies'}
                  className="glass-input"
                  style={{ padding: '12px 14px', fontSize: '0.9rem' }}
                  value={cashTxReason}
                  required
                  onChange={(e) => setCashTxReason(e.target.value)}
                />
              </div>

              {/* Issued To (only for Paid Out) */}
              {cashTxType === 'paid_out' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Amount Issued To <span style={{ color: '#f87171' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Supplier Name, Employee Name"
                    className="glass-input"
                    style={{ padding: '12px 14px', fontSize: '0.9rem', borderColor: 'rgba(248,113,113,0.3)' }}
                    value={cashTxIssuedTo}
                    required={cashTxType === 'paid_out'}
                    onChange={(e) => setCashTxIssuedTo(e.target.value)}
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                    This name will appear on the printed slip for signature.
                  </p>
                </div>
              )}

              {/* Summary preview */}
              {cashTxAmount > 0 && (
                <div style={{
                  padding: '12px 16px', borderRadius: '10px',
                  background: cashTxType === 'paid_in' ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.08)',
                  border: cashTxType === 'paid_in' ? '1px solid rgba(22,163,74,0.2)' : '1px solid rgba(220,38,38,0.2)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {cashTxType === 'paid_in' ? '⬇️ Adding to drawer:' : '⬆️ Removing from drawer:'}
                  </span>
                  <span style={{
                    fontSize: '1.15rem', fontWeight: '800',
                    color: cashTxType === 'paid_in' ? '#4ade80' : '#f87171'
                  }}>
                    Rs. {Number(cashTxAmount || 0).toFixed(2)}
                  </span>
                </div>
              )}

              <button
                type="submit"
                disabled={cashTxLoading}
                style={{
                  padding: '14px', fontSize: '0.95rem', fontWeight: '700',
                  borderRadius: '10px', border: 'none', cursor: 'pointer',
                  background: cashTxType === 'paid_in'
                    ? 'linear-gradient(135deg, #16a34a, #15803d)'
                    : 'linear-gradient(135deg, #dc2626, #b91c1c)',
                  color: '#fff', opacity: cashTxLoading ? 0.7 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}
              >
                {cashTxLoading ? 'Recording...' : (cashTxType === 'paid_in' ? '✅ Record Paid In' : '✅ Record Paid Out & Print Slip')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* CASH TRANSACTION SUCCESS / PRINT SLIP MODAL           */}
      {/* ==================================================== */}
      {successCashTx && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          zIndex: 110, padding: '40px 20px 20px 20px', overflowY: 'auto'
        }}>
          <div className="glass-panel-glow animate-fade-in" style={{
            width: '100%', maxWidth: '400px', padding: '30px',
            display: 'flex', flexDirection: 'column', gap: '20px'
          }}>
            {/* Success Icon */}
            <div style={{ textAlign: 'center' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: '56px', height: '56px', borderRadius: '50%', marginBottom: '12px',
                background: successCashTx.type === 'paid_in' ? 'rgba(22,163,74,0.15)' : 'rgba(220,38,38,0.15)',
                border: successCashTx.type === 'paid_in' ? '2px solid #16a34a' : '2px solid #dc2626',
                fontSize: '26px'
              }}>
                {successCashTx.type === 'paid_in' ? '⬇️' : '⬆️'}
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', margin: '0 0 4px 0' }}>
                {successCashTx.type === 'paid_in' ? 'Paid In Recorded!' : 'Paid Out Recorded!'}
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                Transaction saved and shift balance updated.
              </p>
            </div>

            {/* Slip Preview */}
            <div style={{
              background: '#fff', color: '#000', padding: '18px', borderRadius: '8px',
              fontFamily: 'monospace', fontSize: '11px', lineHeight: '1.5',
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
            }}>
              <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                <p style={{ margin: 0, fontWeight: 'bold', fontSize: '13px' }}>DORADO ESSENCE</p>
                <p style={{ margin: 0, fontSize: '10px' }}>CASH TRANSACTION SLIP</p>
                <div style={{
                  display: 'inline-block',
                  border: `2px solid ${successCashTx.type === 'paid_in' ? '#16a34a' : '#dc2626'}`,
                  borderRadius: '4px', padding: '2px 10px', margin: '5px 0'
                }}>
                  <span style={{ fontWeight: 'bold', color: successCashTx.type === 'paid_in' ? '#16a34a' : '#dc2626', fontSize: '12px' }}>
                    {successCashTx.type === 'paid_in' ? 'PAID IN' : 'PAID OUT'}
                  </span>
                </div>
                <p style={{ borderBottom: '1px dashed #000', margin: '5px 0' }}></p>
              </div>
              <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td><b>Date:</b></td>
                    <td style={{ textAlign: 'right' }}>{new Date(successCashTx.created_at).toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td><b>Cashier:</b></td>
                    <td style={{ textAlign: 'right' }}>{successCashTx.cashier_name}</td>
                  </tr>
                  <tr><td colSpan="2"><div style={{ borderBottom: '1px dashed #000', margin: '4px 0' }}></div></td></tr>
                  <tr>
                    <td><b>Amount:</b></td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '13px' }}>Rs. {Number(successCashTx.amount).toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td><b>Reason:</b></td>
                    <td style={{ textAlign: 'right' }}>{successCashTx.reason}</td>
                  </tr>
                  {successCashTx.issued_to && (
                    <tr>
                      <td><b>Issued To:</b></td>
                      <td style={{ textAlign: 'right' }}>{successCashTx.issued_to}</td>
                    </tr>
                  )}
                </tbody>
              </table>
              {successCashTx.type === 'paid_out' && (
                <div style={{ marginTop: '14px', fontSize: '10px' }}>
                  <p style={{ borderBottom: '1px dashed #000', margin: '6px 0' }}></p>
                  <p style={{ margin: '0 0 2px 0' }}>Authorized Signature:</p>
                  <div style={{ borderBottom: '1px solid #000', marginTop: '20px', marginBottom: '3px' }}></div>
                  <p style={{ margin: '0 0 10px 0', color: '#666' }}>Name &amp; Signature</p>
                  <p style={{ margin: '0 0 2px 0' }}>Received By ({successCashTx.issued_to || 'Recipient'}):</p>
                  <div style={{ borderBottom: '1px solid #000', marginTop: '20px', marginBottom: '3px' }}></div>
                  <p style={{ margin: 0, color: '#666' }}>Signature &amp; Date</p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button onClick={printCashSlip} style={{
                padding: '12px 0', fontSize: '0.9rem', fontWeight: '700',
                borderRadius: '10px', border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, var(--accent-cyan), #4facfe)',
                color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
              }}>
                🖨️ Print Slip
              </button>
              <button onClick={() => setSuccessCashTx(null)} className="btn-secondary" style={{ padding: '12px 0', fontSize: '0.9rem' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* SALES RETURN MODAL */}
      {/* ==================================================== */}
      {showReturnModal && (

        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          zIndex: 100, padding: '40px 20px 20px 20px', overflowY: 'auto'
        }}>
          <div className="glass-panel-glow animate-fade-in" style={{
            width: '100%', maxWidth: '600px', padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800' }}>🔄 Process Sales Return</h3>
              <button onClick={() => { setShowReturnModal(false); setOriginalInvoiceNo(''); setFetchedInvoice(null); setReturnReason(''); }} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                Cancel
              </button>
            </div>

            {!fetchedInvoice ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Enter Original Invoice Number:</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input 
                    type="text" 
                    placeholder="e.g. INV-20260520-103729" 
                    className="glass-input" 
                    style={{ flex: 1, padding: '10px' }}
                    value={originalInvoiceNo}
                    onChange={(e) => setOriginalInvoiceNo(e.target.value)}
                  />
                  <button onClick={handleFetchOriginalInvoice} disabled={loading || !originalInvoiceNo} className="btn-primary" style={{ padding: '0 20px' }}>
                    Fetch Bill
                  </button>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Returns must be linked to their original purchase invoice for auditing.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ background: 'rgba(0,242,167,0.05)', border: '1px solid var(--accent-emerald)', padding: '12px', borderRadius: '8px' }}>
                  <h4 style={{ margin: '0 0 6px 0', color: 'var(--accent-emerald)' }}>Invoice Verified: {fetchedInvoice.invoice_no}</h4>
                  <p style={{ margin: 0, fontSize: '0.8rem' }}>Issued on: {new Date(fetchedInvoice.created_at).toLocaleString()}</p>
                </div>

                <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px' }}>
                  <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <th style={{ textAlign: 'left', paddingBottom: '8px' }}>Product</th>
                        <th style={{ textAlign: 'center', paddingBottom: '8px' }}>Max Qty</th>
                        <th style={{ textAlign: 'right', paddingBottom: '8px' }}>Return Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fetchedInvoice.returnable_items.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '10px 0' }}>{item.product_name} <br/><span style={{ color: 'var(--accent-cyan)', fontSize: '0.75rem' }}>Rs. {item.price.toFixed(2)}</span></td>
                          <td style={{ textAlign: 'center', padding: '10px 0' }}>{item.available_to_return}</td>
                          <td style={{ textAlign: 'right', padding: '10px 0' }}>
                            <input 
                              type="number" 
                              min="0" 
                              max={item.available_to_return}
                              value={item.return_qty} 
                              onChange={(e) => {
                                let val = parseInt(e.target.value) || 0;
                                if (val > item.available_to_return) val = item.available_to_return;
                                if (val < 0) val = 0;
                                const updated = fetchedInvoice.returnable_items.map(i => i.product_id === item.product_id ? { ...i, return_qty: val } : i);
                                setFetchedInvoice({ ...fetchedInvoice, returnable_items: updated });
                              }}
                              className="glass-input" 
                              style={{ width: '60px', padding: '4px', textAlign: 'center' }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Return Type:</label>
                    <select className="glass-input" style={{ width: '100%', padding: '8px' }} value={returnType} onChange={e => setReturnType(e.target.value)}>
                      <option value="Refund">Refund</option>
                      <option value="Exchange">Exchange</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Adjustment Method:</label>
                    <select className="glass-input" style={{ width: '100%', padding: '8px' }} value={returnPaymentMethod} onChange={e => setReturnPaymentMethod(e.target.value)}>
                      <option value="Cash">Cash</option>
                      <option value="Card">Card</option>
                      <option value="Store Credit">Store Credit / Credit Note</option>
                    </select>
                  </div>
                </div>

                <input 
                  type="text" 
                  placeholder="Reason for return (Required)" 
                  className="glass-input"
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  style={{ padding: '10px', width: '100%' }}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
                  <span>Total Financial Adjustment:</span>
                  <span style={{ color: 'var(--accent-rose)', fontSize: '1.2rem' }}>
                    Rs. {(fetchedInvoice.returnable_items.reduce((sum, i) => sum + (i.price * i.return_qty), 0)).toFixed(2)}
                  </span>
                </div>

                <button onClick={handleProcessReturn} disabled={loading || !returnReason} className="btn-primary" style={{ padding: '12px', fontSize: '1rem', background: 'var(--accent-rose)', borderColor: 'var(--accent-rose)' }}>
                  {loading ? 'Processing...' : 'Confirm Return & Update Records'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Return Success Invoice Print Modal */}
      {successReturn && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          zIndex: 100, padding: '40px 20px 20px 20px', overflowY: 'auto'
        }}>
          <div className="glass-panel-glow animate-fade-in" style={{
            width: '100%', maxWidth: '400px', padding: '30px',
            display: 'flex', flexDirection: 'column', gap: '20px'
          }}>
            <div style={{ textAlign: 'center', color: 'var(--accent-rose)' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: '48px', height: '48px', borderRadius: '50%',
                background: 'rgba(255,42,95,0.1)', border: '1px solid var(--accent-rose)',
                marginBottom: '12px'
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800' }}>Return Processed!</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Inventory has been restocked automatically.</p>
            </div>

            {/* Embedded Credit Note Preview */}
            <div style={{
              background: '#fff', color: '#000', padding: '20px', borderRadius: '8px',
              fontFamily: 'monospace', fontSize: '11px', lineHeight: '1.4',
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)', maxHeight: '260px', overflowY: 'auto'
            }}>
              <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 'bold', margin: '0 0 2px 0' }}>DORADO ESSENCE</h4>
                <p style={{ margin: '0', fontSize: '10px', fontWeight: 'bold' }}>CREDIT NOTE / RETURN RECEIPT</p>
                <p style={{ borderBottom: '1px dashed #000', margin: '5px 0' }}></p>
              </div>

              <div>
                <p style={{ margin: '0' }}><strong>Return No:</strong> {successReturn.return_no}</p>
                <p style={{ margin: '0' }}><strong>Original Inv:</strong> {successReturn.original_invoice_no}</p>
                <p style={{ margin: '0' }}><strong>Date:</strong> {new Date(successReturn.created_at).toLocaleString()}</p>
                <p style={{ margin: '0' }}><strong>Cashier:</strong> {successReturn.cashier_name}</p>
                <p style={{ borderBottom: '1px dashed #000', margin: '5px 0' }}></p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {successReturn.items.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{item.product_name} x{item.quantity}</span>
                    <span>Rs.{item.refund_amount.toFixed(2)}</span>
                  </div>
                ))}
                <p style={{ borderBottom: '1px dashed #000', margin: '5px 0' }}></p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'right' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '12px' }}>
                  <span>Total Refund:</span>
                  <span>Rs.{successReturn.total_refund.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#555' }}>
                  <span>Method:</span>
                  <span>{successReturn.return_type} ({successReturn.payment_method})</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#555', fontSize: '10px' }}>
                  <span>Reason:</span>
                  <span>{successReturn.reason}</span>
                </div>
              </div>

              <div style={{ textAlign: 'center', marginTop: '10px' }}>
                <p style={{ borderBottom: '1px dashed #000', margin: '5px 0' }}></p>
                <p style={{ margin: '0', fontSize: '10px' }}>Thank you. This note serves as proof of return.</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button onClick={printReturnNote} className="btn-primary" style={{ padding: '12px 0', fontSize: '0.9rem' }}>
                🖨️ Print Note
              </button>
              <button onClick={() => setSuccessReturn(null)} className="btn-secondary" style={{ padding: '12px 0', fontSize: '0.9rem' }}>
                Close Panel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden container specifically for POS Thermal printer layout (Return Note) */}
      {successReturn && (
        <div className="print-receipt-container" style={{ display: 'none', background: '#fff', color: '#000' }}>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0' }}>DORADO ESSENCE</h2>
            <p style={{ margin: '2px 0', fontSize: '12px', fontWeight: 'bold' }}>CREDIT NOTE / RETURN</p>
            <p style={{ borderBottom: '1px dashed #000', margin: '6px 0' }}></p>
          </div>

          <div style={{ fontSize: '11px' }}>
            <p style={{ margin: '2px 0' }}><strong>Return No:</strong> {successReturn.return_no}</p>
            <p style={{ margin: '2px 0' }}><strong>Original Inv:</strong> {successReturn.original_invoice_no}</p>
            <p style={{ margin: '2px 0' }}><strong>Date:</strong> {new Date(successReturn.created_at).toLocaleString()}</p>
            <p style={{ margin: '2px 0' }}><strong>Cashier:</strong> {successReturn.cashier_name}</p>
            <p style={{ margin: '2px 0' }}><strong>Reason:</strong> {successReturn.reason}</p>
            <p style={{ borderBottom: '1px dashed #000', margin: '6px 0' }}></p>
          </div>

          <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px dashed #000' }}>
                <th style={{ textAlign: 'left', paddingBottom: '4px' }}>Item (Returned)</th>
                <th style={{ textAlign: 'right', paddingBottom: '4px' }}>Refund</th>
              </tr>
            </thead>
            <tbody>
              {successReturn.items.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ padding: '3px 0' }}>{item.product_name} <br/> &nbsp; x{item.quantity}</td>
                  <td style={{ textAlign: 'right', verticalAlign: 'bottom', padding: '3px 0' }}>Rs.{item.refund_amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ borderBottom: '1px dashed #000', margin: '6px 0' }}></p>

          <div style={{ fontSize: '11px', textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '12px' }}>
              <span>TOTAL REFUND:</span>
              <span>Rs.{successReturn.total_refund.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Adjustment:</span>
              <span>{successReturn.return_type} ({successReturn.payment_method})</span>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '15px', fontSize: '10px' }}>
            <p style={{ borderBottom: '1px dashed #000', margin: '6px 0' }}></p>
            <p style={{ margin: '4px 0 2px 0', fontWeight: 'bold' }}>Valid for authorized returns only.</p>
          </div>
        </div>
      )}


      {/* ==================================================== */}
      {/* 2. SHIFT CLOSE / COINS INPUT MODAL */}
      {/* ==================================================== */}
      {showCloseShiftModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          zIndex: 100, padding: '40px 20px 20px 20px', overflowY: 'auto'
        }}>
          <div className="glass-panel-glow animate-fade-in" style={{
            width: '100%', maxWidth: '480px', padding: '36px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800' }}>🔒 Cash Drawer Reconciliation</h3>
              <button onClick={() => setShowCloseShiftModal(false)} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                Back to POS
              </button>
            </div>

            <CashBoxCalculator
              title="Closing Cash Drawer Audit"
              confirmText="🏁 Close Shift & Generate Z-Report"
              onConfirm={handleEndShift}
            />
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 3. Z-REPORT VIEW & PRINT SCREEN */}
      {/* ==================================================== */}
      {zReportData && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'var(--bg-primary)',
          backgroundImage: 'radial-gradient(circle at 50% 0%, #1e1e38 0%, #0a0a0f 70%)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          zIndex: 150, padding: '40px 20px 20px 20px', overflowY: 'auto'
        }}>
          <div className="glass-panel-glow animate-fade-in no-print" style={{
            width: '100%', maxWidth: '420px', padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px'
          }}>
            <div style={{ textAlign: 'center', color: 'var(--accent-gold)' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: '48px', height: '48px', borderRadius: '50%',
                background: 'rgba(255,208,0,0.1)', border: '1px solid var(--accent-gold)', marginBottom: '12px'
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path>
                  <path d="M12 6v6l4 2"></path>
                </svg>
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800' }}>Shift Terminal Closed</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Z-Report registered successfully.</p>
            </div>

            {/* Z-Report mock container for visual preview */}
            <div style={{
              background: '#fff', color: '#000', padding: '20px', borderRadius: '8px',
              fontFamily: 'monospace', fontSize: '11px', lineHeight: '1.4',
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)', maxHeight: '280px', overflowY: 'auto'
            }}>
              <div style={{ textAlign: 'center' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 'bold', margin: '0 0 2px 0' }}>DORADO ESSENCE</h4>
                <p style={{ margin: '0' }}>Z-REPORT / SHIFT AUDIT</p>
                <p style={{ borderBottom: '1px dashed #000', margin: '5px 0' }}></p>
              </div>

              <div>
                <p style={{ margin: '0' }}><strong>Cashier:</strong> {zReportData.cashier_name}</p>
                <p style={{ margin: '0' }}><strong>Opened:</strong> {new Date(zReportData.start_time).toLocaleString()}</p>
                <p style={{ margin: '0' }}><strong>Closed:</strong> {new Date(zReportData.end_time).toLocaleString()}</p>
                <p style={{ borderBottom: '1px dashed #000', margin: '5px 0' }}></p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Opening Balance:</span>
                  <span>Rs. {zReportData.opening_balance.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Cash Sales (+):</span>
                  <span>Rs. {zReportData.cash_sales.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #ddd', paddingTop: '3px' }}>
                  <span>Expected Drawer Cash:</span>
                  <span>Rs. {zReportData.expected_cash.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                  <span>Declared Drawer Cash:</span>
                  <span>Rs. {zReportData.closing_balance.toFixed(2)}</span>
                </div>

                <p style={{ borderBottom: '1px dashed #000', margin: '5px 0' }}></p>

                {/* Sales stats */}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Card Sales:</span>
                  <span>Rs. {zReportData.card_sales.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Mobile QR Sales:</span>
                  <span>Rs. {zReportData.qr_sales.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Discounts Given:</span>
                  <span>Rs. {zReportData.total_discounts.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                  <span>Net Session Turnover:</span>
                  <span>Rs. {zReportData.net_sales.toFixed(2)}</span>
                </div>

                <p style={{ borderBottom: '1px dashed #000', margin: '5px 0' }}></p>

                {/* Variance result */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', fontWeight: 'bold',
                  color: zReportData.discrepancy < 0 ? '#ff2a5f' : zReportData.discrepancy > 0 ? '#ffd000' : '#00f2a7'
                }}>
                  <span>DRAWER VARIANCE:</span>
                  <span>
                    {zReportData.discrepancy === 0 
                      ? 'Balanced' 
                      : `Rs. ${zReportData.discrepancy.toFixed(2)}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button onClick={printZReport} className="btn-primary" style={{ padding: '12px 0', fontSize: '0.9rem' }}>
                🖨️ Print Z-Report
              </button>
              <button onClick={onLogout} className="btn-danger" style={{ padding: '12px 0', fontSize: '0.9rem' }}>
                Complete Sign-Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden container specifically for POS Thermal printer layout (Z-Report) */}
      {zReportData && (
        <div className="print-receipt-container" style={{ display: 'none', background: '#fff', color: '#000' }}>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 'bold', margin: '0' }}>DORADO ESSENCE</h2>
            <p style={{ fontSize: '11px', margin: '3px 0 0 0', fontWeight: 'bold', textTransform: 'uppercase' }}>
              Z-REPORT / SHIFT AUDIT REPORT
            </p>
            <p style={{ borderBottom: '1px dashed #000', margin: '6px 0' }}></p>
          </div>

          <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <p style={{ margin: '0' }}><strong>Cashier Name:</strong> {zReportData.cashier_name}</p>
            <p style={{ margin: '0' }}><strong>Session Opened:</strong> {new Date(zReportData.start_time).toLocaleString()}</p>
            <p style={{ margin: '0' }}><strong>Session Closed:</strong> {new Date(zReportData.end_time).toLocaleString()}</p>
            <p style={{ borderBottom: '1px dashed #000', margin: '6px 0' }}></p>
          </div>

          <h3 style={{ fontSize: '12px', fontWeight: 'bold', margin: '4px 0 6px 0' }}>DRAWER RECONCILIATION</h3>
          <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ padding: '3px 0' }}>Opening Drawer Cash:</td>
                <td style={{ textAlign: 'right', padding: '3px 0' }}>Rs.{zReportData.opening_balance.toFixed(2)}</td>
              </tr>
              <tr>
                <td style={{ padding: '3px 0' }}>Cash Sales Received (+):</td>
                <td style={{ textAlign: 'right', padding: '3px 0' }}>Rs.{zReportData.cash_sales.toFixed(2)}</td>
              </tr>
              <tr style={{ borderTop: '1px solid #000', fontWeight: 'bold' }}>
                <td style={{ padding: '4px 0' }}>Expected Drawer Cash:</td>
                <td style={{ textAlign: 'right', padding: '4px 0' }}>Rs.{zReportData.expected_cash.toFixed(2)}</td>
              </tr>
              <tr style={{ fontWeight: 'bold' }}>
                <td style={{ padding: '3px 0' }}>Actual Drawer Cash Count:</td>
                <td style={{ textAlign: 'right', padding: '3px 0' }}>Rs.{zReportData.closing_balance.toFixed(2)}</td>
              </tr>
              <tr style={{ borderTop: '1px dashed #000', fontWeight: 'bold' }}>
                <td style={{ padding: '4px 0' }}>Reconciliation Variance:</td>
                <td style={{ textAlign: 'right', padding: '4px 0' }}>
                  {zReportData.discrepancy === 0 
                    ? 'Rs.0.00 (Balanced)' 
                    : `Rs.${zReportData.discrepancy.toFixed(2)} (${zReportData.discrepancy < 0 ? 'SHORTAGE' : 'OVERAGE'})`}
                </td>
              </tr>
            </tbody>
          </table>

          <p style={{ borderBottom: '1px dashed #000', margin: '6px 0' }}></p>

          <h3 style={{ fontSize: '12px', fontWeight: 'bold', margin: '4px 0 6px 0' }}>SESSION SALES SUMMARY</h3>
          <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ padding: '3px 0' }}>Cash Sales Volume:</td>
                <td style={{ textAlign: 'right', padding: '3px 0' }}>Rs.{zReportData.cash_sales.toFixed(2)}</td>
              </tr>
              <tr>
                <td style={{ padding: '3px 0' }}>Credit Card Sales Volume:</td>
                <td style={{ textAlign: 'right', padding: '3px 0' }}>Rs.{zReportData.card_sales.toFixed(2)}</td>
              </tr>
              <tr>
                <td style={{ padding: '3px 0' }}>Mobile QR Sales Volume:</td>
                <td style={{ textAlign: 'right', padding: '3px 0' }}>Rs.{zReportData.qr_sales.toFixed(2)}</td>
              </tr>
              <tr>
                <td style={{ padding: '3px 0' }}>Discounts Awarded (-):</td>
                <td style={{ textAlign: 'right', padding: '3px 0' }}>Rs.{zReportData.total_discounts.toFixed(2)}</td>
              </tr>
              <tr style={{ borderTop: '1px solid #000', fontWeight: 'bold' }}>
                <td style={{ padding: '4px 0' }}>TOTAL NET SESSION SALES:</td>
                <td style={{ textAlign: 'right', padding: '4px 0' }}>Rs.{zReportData.net_sales.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <p style={{ borderBottom: '1px dashed #000', margin: '6px 0' }}></p>
          
          <h3 style={{ fontSize: '12px', fontWeight: 'bold', margin: '4px 0 6px 0' }}>CLOSING DENOMINATIONS LIST</h3>
          <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse', fontFamily: 'monospace' }}>
            <tbody>
              {Object.entries(zReportData.closing_denominations)
                .filter(([_, count]) => count > 0)
                .map(([denom, count]) => {
                  const val = Number(denom);
                  return (
                    <tr key={denom}>
                      <td style={{ padding: '2px 0' }}>Rs. {denom} x {count}</td>
                      <td style={{ textAlign: 'right', padding: '2px 0' }}>Rs. {(val * count).toFixed(2)}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>

          <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '10px' }}>
            <p style={{ borderBottom: '1px dashed #000', margin: '6px 0' }}></p>
            <p style={{ margin: '4px 0 2px 0', fontWeight: 'bold' }}>SHIFT REGISTER CLOSED SUCCESSFULLY</p>
            <p style={{ margin: '0', fontSize: '8px', color: '#666' }}>Dorado Decoupled Shift Audits</p>
          </div>
        </div>
      )}

      {/* Checkout Success Invoice Print Modal */}
      {successReceipt && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          zIndex: 100, padding: '40px 20px 20px 20px', overflowY: 'auto'
        }}>
          <div className="glass-panel-glow animate-fade-in" style={{
            width: '100%', maxWidth: '400px', padding: '30px',
            display: 'flex', flexDirection: 'column', gap: '20px'
          }}>
            <div style={{ textAlign: 'center', color: 'var(--accent-emerald)' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: '48px', height: '48px', borderRadius: '50%',
                background: 'rgba(0,242,167,0.1)', border: '1px solid var(--accent-emerald)',
                marginBottom: '12px'
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800' }}>Transaction Successful!</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Invoice registered in system database.</p>
            </div>

            {/* Embedded Invoice Preview */}
            <div style={{
              background: '#fff', color: '#000', padding: '20px', borderRadius: '8px',
              fontFamily: 'monospace', fontSize: '11px', lineHeight: '1.4',
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)', maxHeight: '260px', overflowY: 'auto'
            }}>
              <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 'bold', margin: '0 0 2px 0' }}>DORADO ESSENCE</h4>
                <p style={{ margin: '0', fontSize: '10px', fontWeight: 'bold' }}>LUXURIOUS FRAGRANCE</p>
                <p style={{ margin: '2px 0 0 0' }}>3rd Floor, Crown Mall, Polonnaruwa</p>
                <p style={{ margin: '0' }}>Tel: 0713171781, 0272555250</p>
                <p style={{ borderBottom: '1px dashed #000', margin: '5px 0' }}></p>
              </div>

              <div>
                <p style={{ margin: '0' }}><strong>Invoice:</strong> {successReceipt.invoice_no}</p>
                <p style={{ margin: '0' }}><strong>Date:</strong> {new Date(successReceipt.created_at).toLocaleString()}</p>
                <p style={{ margin: '0' }}><strong>Cashier:</strong> {successReceipt.cashier_name}</p>
                <p style={{ borderBottom: '1px dashed #000', margin: '5px 0' }}></p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {successReceipt.items.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{item.product_name} x{item.quantity}</span>
                    <span>Rs.{item.total.toFixed(2)}</span>
                  </div>
                ))}
                <p style={{ borderBottom: '1px dashed #000', margin: '5px 0' }}></p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'right' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Subtotal:</span>
                  <span>Rs.{successReceipt.subtotal.toFixed(2)}</span>
                </div>
                {successReceipt.discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Discount:</span>
                    <span>-Rs.{successReceipt.discount.toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '12px' }}>
                  <span>Net Total:</span>
                  <span>Rs.{successReceipt.net_total.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#555' }}>
                  <span>Paid ({successReceipt.payment_method}{successReceipt.payment_details?.type ? ` - ${successReceipt.payment_details.type}` : ''}):</span>
                  <span>Rs.{successReceipt.amount_received.toFixed(2)}</span>
                </div>
                {successReceipt.payment_details?.refNo && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#555', fontSize: '10px' }}>
                    <span>Ref No:</span>
                    <span>{successReceipt.payment_details.refNo}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#555' }}>
                  <span>Change:</span>
                  <span>Rs.{successReceipt.change_given.toFixed(2)}</span>
                </div>
              </div>

              <div style={{ textAlign: 'center', marginTop: '10px' }}>
                <p style={{ borderBottom: '1px dashed #000', margin: '5px 0' }}></p>
                <p style={{ margin: '0', fontSize: '10px' }}>Thank you for choosing us to brighten your day with fragrance!</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '9px', color: '#777' }}>Software by Suneth +94713507882</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button onClick={printInvoice} className="btn-primary" style={{ padding: '12px 0', fontSize: '0.9rem' }}>
                🖨️ Print Receipt
              </button>
              <button onClick={() => setSuccessReceipt(null)} className="btn-secondary" style={{ padding: '12px 0', fontSize: '0.9rem' }}>
                Close Panel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden container specifically for POS Thermal printer layout (Invoice) */}
      {successReceipt && (
        <div className="print-receipt-container" style={{ display: 'none', background: '#fff', color: '#000' }}>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0' }}>DORADO ESSENCE</h2>
            <p style={{ margin: '2px 0', fontSize: '12px', fontWeight: 'bold' }}>LUXURIOUS FRAGRANCE</p>
            <p style={{ margin: '2px 0' }}>3rd Floor, Crown Mall, Polonnaruwa</p>
            <p style={{ margin: '2px 0' }}>Tel: 0713171781, 0272555250</p>
            <p style={{ borderBottom: '1px dashed #000', margin: '6px 0' }}></p>
          </div>

          <div style={{ fontSize: '11px' }}>
            <p style={{ margin: '2px 0' }}><strong>Invoice No:</strong> {successReceipt.invoice_no}</p>
            <p style={{ margin: '2px 0' }}><strong>Date/Time:</strong> {new Date(successReceipt.created_at).toLocaleString()}</p>
            <p style={{ margin: '2px 0' }}><strong>Cashier:</strong> {successReceipt.cashier_name}</p>
            <p style={{ borderBottom: '1px dashed #000', margin: '6px 0' }}></p>
          </div>

          <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px dashed #000' }}>
                <th style={{ textAlign: 'left', paddingBottom: '4px' }}>Item Description</th>
                <th style={{ textAlign: 'right', paddingBottom: '4px' }}>Price</th>
              </tr>
            </thead>
            <tbody>
              {successReceipt.items.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ padding: '3px 0' }}>{item.product_name} <br/> &nbsp; x{item.quantity}</td>
                  <td style={{ textAlign: 'right', verticalAlign: 'bottom', padding: '3px 0' }}>Rs.{item.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ borderBottom: '1px dashed #000', margin: '6px 0' }}></p>

          <div style={{ fontSize: '11px', textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Gross Subtotal:</span>
              <span>Rs.{successReceipt.subtotal.toFixed(2)}</span>
            </div>
            {successReceipt.discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Discount Applied:</span>
                <span>-Rs.{successReceipt.discount.toFixed(2)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '12px' }}>
              <span>NET PAYABLE AMOUNT:</span>
              <span>Rs.{successReceipt.net_total.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Amount Received ({successReceipt.payment_method}{successReceipt.payment_details?.type ? ` - ${successReceipt.payment_details.type}` : ''}):</span>
              <span>Rs.{successReceipt.amount_received.toFixed(2)}</span>
            </div>
            {successReceipt.payment_details?.refNo && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Ref No:</span>
                <span>{successReceipt.payment_details.refNo}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
              <span>Balance Change Due:</span>
              <span>Rs.{successReceipt.change_given.toFixed(2)}</span>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '15px', fontSize: '10px' }}>
            <p style={{ borderBottom: '1px dashed #000', margin: '6px 0' }}></p>
            <p style={{ margin: '4px 0 2px 0', fontWeight: 'bold' }}>Thank you for choosing us to brighten your day with fragrance!</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '8px', color: '#666' }}>Software by Suneth +94713507882</p>
          </div>
        </div>
      )}

    </div>
  );
}
