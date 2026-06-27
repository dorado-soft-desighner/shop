import React, { useState, useEffect } from 'react';
import { AreaChart, DonutChart, BarChart } from './SvgCharts';
import GrnForm from './GrnForm';

export default function AdminDashboard({ API_URL, token, user, onLogout }) {
  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics', 'inventory', 'sales', 'staff'
  const [reports, setReports] = useState(null);
  const [products, setProducts] = useState([]);
  const [salesHistory, setSalesHistory] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [grnList, setGrnList] = useState([]);
  const [returnsList, setReturnsList] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Modals management
  const [productModal, setProductModal] = useState(null); // null or { mode: 'add' } or { mode: 'edit', data }
  const [staffModal, setStaffModal] = useState(null); // null or { mode: 'add' } or { mode: 'edit', data }
  const [invoiceDetails, setInvoiceDetails] = useState(null); // null or invoice object
  const [grnModal, setGrnModal] = useState(false); // boolean
  const [grnDetails, setGrnDetails] = useState(null); // null or grn object
  const [returnDetails, setReturnDetails] = useState(null);
  const [stockAdjustModal, setStockAdjustModal] = useState(null); // null or { product }
  const [stockAdjustForm, setStockAdjustForm] = useState({ adjustment: '', reason: '', pin: '' });
  const [stockAdjustError, setStockAdjustError] = useState('');

  // Financial Reports
  const [reportType, setReportType] = useState('daily');
  const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0, 10));
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  // Form Fields
  const [productForm, setProductForm] = useState({
    barcode: '', name: '', category: '', price: '', cost_price: '', stock_quantity: '', low_stock_threshold: ''
  });

  const [staffForm, setStaffForm] = useState({
    username: '', password: '', full_name: '', role: 'cashier', status: 'active'
  });

  // Data Loading functions
  const loadAnalytics = async () => {
    try {
      const response = await fetch(`${API_URL}/api/sales/reports`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setReports(data);
      } else {
        throw new Error(data.error || 'Failed to fetch analytics.');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await fetch(`${API_URL}/api/products`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setProducts(data);
      } else {
        throw new Error(data.error || 'Failed to fetch inventory.');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const loadSalesHistory = async () => {
    try {
      const response = await fetch(`${API_URL}/api/sales/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setSalesHistory(data);
      } else {
        throw new Error(data.error || 'Failed to fetch invoices.');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const loadStaff = async () => {
    try {
      const response = await fetch(`${API_URL}/api/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setStaffList(data);
      } else {
        throw new Error(data.error || 'Failed to fetch staff directory.');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const loadGrns = async () => {
    try {
      const response = await fetch(`${API_URL}/api/grn`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setGrnList(data);
      } else {
        throw new Error(data.error || 'Failed to fetch GRNs.');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const loadReturns = async () => {
    try {
      const response = await fetch(`${API_URL}/api/sales/returns`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setReturnsList(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadAnalytics();
    loadProducts();
    loadSalesHistory();
    loadStaff();
    loadGrns();
    loadReturns();
  }, [activeTab]);

  // Product CRUD Handlers
  const handleProductSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const url = productModal.mode === 'add' 
      ? `${API_URL}/api/products` 
      : `${API_URL}/api/products/${productModal.data.id}`;
    
    const method = productModal.mode === 'add' ? 'POST' : 'PUT';

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(productForm)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to persist product details.');
      }

      setProductModal(null);
      setProductForm({
        barcode: '', name: '', category: '', price: '', cost_price: '', stock_quantity: '', low_stock_threshold: ''
      });
      loadProducts();
      loadAnalytics();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteProduct = async (id) => {
    if (!window.confirm('⚠️ Are you absolutely sure you want to delete this product?')) return;

    try {
      const response = await fetch(`${API_URL}/api/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (response.ok) {
        loadProducts();
        loadAnalytics();
      } else {
        throw new Error(data.error || 'Could not delete product.');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // Stock Adjustment Handler (requires PIN)
  const handleStockAdjust = async (e) => {
    e.preventDefault();
    setStockAdjustError('');
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/products/${stockAdjustModal.product.id}/stock-adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          adjustment: parseInt(stockAdjustForm.adjustment),
          reason: stockAdjustForm.reason,
          pin: stockAdjustForm.pin
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Adjustment failed.');
      alert(`✅ Stock adjusted successfully!\n${data.product_name}: ${data.old_quantity} → ${data.new_quantity}`);
      setStockAdjustModal(null);
      setStockAdjustForm({ adjustment: '', reason: '', pin: '' });
      loadProducts();
    } catch (err) {
      setStockAdjustError(err.message);
    } finally {
      setLoading(false);
    }
  };


  // Staff CRUD Handlers
  const handleStaffSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const url = staffModal.mode === 'add' 
      ? `${API_URL}/api/users` 
      : `${API_URL}/api/users/${staffModal.data.id}`;
    
    const method = staffModal.mode === 'add' ? 'POST' : 'PUT';

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(staffForm)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save staff credentials.');
      }

      setStaffModal(null);
      setStaffForm({ username: '', password: '', full_name: '', role: 'cashier', status: 'active' });
      loadStaff();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteStaff = async (id) => {
    if (id === user.id) {
      alert('⚠️ You cannot delete your own admin profile!');
      return;
    }
    if (!window.confirm('⚠️ Are you sure you want to completely delete this user?')) return;

    try {
      const response = await fetch(`${API_URL}/api/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (response.ok) {
        loadStaff();
      } else {
        throw new Error(data.error || 'Could not remove staff.');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <>
    <div className="animate-fade-in" style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      
      {/* Admin Sidebar Navigation */}
      <nav className="glass-panel no-print" style={{
        width: '260px',
        padding: '24px',
        margin: '20px',
        marginRight: '0',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: 'calc(100vh - 40px)',
        position: 'sticky',
        top: '20px',
        zIndex: 10
      }}>
        <div>
          {/* Dashboard Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '40px' }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(0,242,254,0.1) 0%, rgba(79,172,254,0.05) 100%)',
              border: '1px solid var(--accent-cyan)',
              padding: '6px',
              borderRadius: '8px'
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="2.5">
                <rect x="3" y="3" width="7" height="9"></rect>
                <rect x="14" y="3" width="7" height="5"></rect>
                <rect x="14" y="12" width="7" height="9"></rect>
                <rect x="3" y="16" width="7" height="5"></rect>
              </svg>
            </div>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: '800' }}>DORADO ADMIN</h2>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Management Suite</p>
            </div>
          </div>

          {/* Navigation Links */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { id: 'analytics', label: 'Dashboard Overview', icon: '📊' },
              { id: 'inventory', label: 'Stock & Inventory', icon: '📦' },
              { id: 'grn', label: 'Goods Receive Notes', icon: '📥' },
              { id: 'sales', label: 'Sales & Receipts', icon: '🧾' },
              { id: 'returns', label: 'Sales Returns', icon: '🔄' },
              { id: 'reports', label: 'Financial Reports', icon: '📈' },
              { id: 'staff', label: 'Cashiers & Staff', icon: '👥' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  border: 'none',
                  borderRadius: '10px',
                  width: '100%',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '0.85rem',
                  background: activeTab === tab.id ? 'rgba(0, 242, 254, 0.1)' : 'transparent',
                  color: activeTab === tab.id ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  borderLeft: activeTab === tab.id ? '3px solid var(--accent-cyan)' : 'none',
                  transition: 'all 0.3s ease'
                }}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Profile and Logout info */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '20px' }}>
          <p style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{user.full_name}</p>
          <p style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', marginBottom: '14px' }}>Executive Manager</p>
          
          <button onClick={onLogout} className="btn-danger" style={{ width: '100%', padding: '10px', fontSize: '0.8rem' }}>
            Sign Out
          </button>
        </div>
      </nav>

      {/* Main Panel Content */}
      <main style={{
        flex: 1,
        padding: '24px 40px',
        maxHeight: '100vh',
        overflowY: 'auto'
      }}>
        {/* Dynamic content rendering based on active tab state */}

        {/* TAB 1: EXECUTIVE ANALYTICS */}
        {activeTab === 'analytics' && reports && (
          <div className="animate-fade-in no-print" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <h1 style={{ fontSize: '1.8rem', fontWeight: '800' }}>Executive Analytics</h1>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Real-time business financial metrics & sales reports</p>
            </div>

            {/* KPI Cards Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '20px'
            }}>
              {[
                { title: 'Total Revenue', value: `Rs. ${reports.summary.totalRevenue.toFixed(2)}`, accent: 'var(--accent-cyan)', shadow: 'var(--shadow-neon-cyan)' },
                { title: 'Net Profit Margin', value: `Rs. ${reports.summary.totalProfit.toFixed(2)}`, accent: 'var(--accent-emerald)', shadow: 'var(--shadow-neon-emerald)' },
                { title: 'Transactions Completed', value: reports.summary.transactionsCount, accent: 'var(--accent-blue)', shadow: 'var(--shadow-glass)' },
                { title: 'Avg Order Value (AOV)', value: `Rs. ${reports.summary.avgOrderValue.toFixed(2)}`, accent: 'var(--accent-gold)', shadow: 'var(--shadow-glass)' }
              ].map((kpi, idx) => (
                <div key={idx} className="glass-panel" style={{
                  padding: '20px',
                  borderLeft: `4px solid ${kpi.accent}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '500' }}>{kpi.title}</span>
                  <span style={{ fontSize: '1.4rem', fontWeight: '800', color: kpi.accent }}>{kpi.value}</span>
                </div>
              ))}
            </div>

            {/* Low stock critical alert */}
            {reports.lowStockProducts.length > 0 && (
              <div className="glass-panel" style={{
                border: '1px solid rgba(255, 42, 95, 0.3)',
                background: 'rgba(255, 42, 95, 0.05)',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.4rem' }}>⚠️</span>
                  <div>
                    <h4 style={{ color: 'var(--accent-rose)', fontSize: '0.9rem', fontWeight: 'bold' }}>
                      CRITICAL STOCK ALERT: {reports.lowStockProducts.length} items running low!
                    </h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Reorder products immediately to prevent sales disruption.
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
                  {reports.lowStockProducts.slice(0, 3).map(p => (
                    <span key={p.id} style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }}>
                      {p.name} ({p.stock_quantity})
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* SVG Charts section */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr',
              gap: '24px',
              alignItems: 'stretch'
            }}>
              {/* Left Column Chart: Sales Trend Area Chart */}
              <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>Sales Turnover Trend (Last 10 Days)</h3>
                <AreaChart data={reports.charts.trendData} />
              </div>

              {/* Right Column Chart: Cashier Performance */}
              <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>Sales by Cashier</h3>
                <BarChart data={reports.charts.cashierData} />
              </div>
            </div>

            {/* Donut Chart: Sales Category share */}
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>Sales Contribution by Category</h3>
              <DonutChart data={reports.charts.categoryData} />
            </div>

          </div>
        )}

        {/* TAB 2: INVENTORY STOCK CRUD */}
        {activeTab === 'inventory' && (
          <div className="animate-fade-in no-print" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h1 style={{ fontSize: '1.8rem', fontWeight: '800' }}>Inventory Control</h1>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Manage products, barcodes, pricing margins, and stock levels</p>
              </div>

              <button onClick={() => {
                setProductForm({ barcode: '', name: '', category: '', price: '', cost_price: '', stock_quantity: '', low_stock_threshold: '' });
                setProductModal({ mode: 'add' });
              }} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>➕ Add New Product</span>
              </button>
            </div>

            {/* Inventory table */}
            <div className="glass-panel" style={{ overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '16px 20px' }}>Barcode</th>
                    <th style={{ padding: '16px 20px' }}>Item Name</th>
                    <th style={{ padding: '16px 20px' }}>Category</th>
                    <th style={{ padding: '16px 20px', textAlign: 'right' }}>Cost Price</th>
                    <th style={{ padding: '16px 20px', textAlign: 'right' }}>Sell Price</th>
                    <th style={{ padding: '16px 20px', textAlign: 'center' }}>Stock Qty</th>
                    <th style={{ padding: '16px 20px', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(prod => {
                    const isLow = prod.stock_quantity <= prod.low_stock_threshold;
                    return (
                      <tr key={prod.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '16px 20px', fontFamily: 'monospace' }}>{prod.barcode}</td>
                        <td style={{ padding: '16px 20px', fontWeight: 'bold' }}>{prod.name}</td>
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '20px' }}>
                            {prod.category}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'right', color: 'var(--text-secondary)' }}>Rs. {prod.cost_price.toFixed(2)}</td>
                        <td style={{ padding: '16px 20px', textAlign: 'right', fontWeight: 'bold', color: 'var(--accent-cyan)' }}>Rs. {prod.price.toFixed(2)}</td>
                        <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                          <span style={{
                            fontWeight: 'bold',
                            color: isLow ? 'var(--accent-rose)' : 'var(--accent-emerald)',
                            background: isLow ? 'rgba(255,42,95,0.1)' : 'rgba(0,242,167,0.1)',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            display: 'inline-block',
                            minWidth: '50px'
                          }}>
                            {prod.stock_quantity}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button
                              onClick={() => {
                                setProductForm({ ...prod });
                                setProductModal({ mode: 'edit', data: prod });
                              }}
                              className="btn-secondary"
                              style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '6px' }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                setStockAdjustModal({ product: prod });
                                setStockAdjustForm({ adjustment: '', reason: '', pin: '' });
                                setStockAdjustError('');
                              }}
                              className="btn-primary"
                              style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '6px', background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
                            >
                              📦 Stock
                            </button>
                            <button
                              onClick={() => deleteProduct(prod.id)}
                              className="btn-danger"
                              style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '6px' }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: GOODS RECEIVE NOTES */}
        {activeTab === 'grn' && (
          <div className="animate-fade-in no-print" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h1 style={{ fontSize: '1.8rem', fontWeight: '800' }}>Goods Receive Notes</h1>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Manage supplier deliveries, update stock, and track costs</p>
              </div>

              <button onClick={() => {
                setGrnModal(true);
              }} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>➕ Create New GRN</span>
              </button>
            </div>

            {/* GRN table */}
            <div className="glass-panel" style={{ overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '16px 20px' }}>Date</th>
                    <th style={{ padding: '16px 20px' }}>GRN No</th>
                    <th style={{ padding: '16px 20px' }}>Supplier</th>
                    <th style={{ padding: '16px 20px', textAlign: 'right' }}>Total Value</th>
                    <th style={{ padding: '16px 20px', textAlign: 'center' }}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {grnList.map(grn => (
                    <tr key={grn.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '16px 20px' }}>{new Date(grn.created_at).toLocaleString()}</td>
                      <td style={{ padding: '16px 20px', fontFamily: 'monospace', fontWeight: 'bold' }}>{grn.grn_no}</td>
                      <td style={{ padding: '16px 20px' }}>{grn.supplier_name}</td>
                      <td style={{ padding: '16px 20px', textAlign: 'right', fontWeight: 'bold', color: 'var(--accent-cyan)' }}>Rs. {grn.total_value.toFixed(2)}</td>
                      <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                        <button
                          onClick={() => setGrnDetails(grn)}
                          className="btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '6px' }}
                        >
                          View GRN
                        </button>
                      </td>
                    </tr>
                  ))}
                  
                  {grnList.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        📥 No Goods Receive Notes found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: SALES HISTORIES & RECEIPTS VIEW */}
        {activeTab === 'sales' && (
          <div className="animate-fade-in no-print" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <h1 style={{ fontSize: '1.8rem', fontWeight: '800' }}>Sales Invoice History</h1>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Browse transactions, verify cashier receipts, and see invoice listings</p>
            </div>

            {/* Sales table */}
            <div className="glass-panel" style={{ overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '16px 20px' }}>Date</th>
                    <th style={{ padding: '16px 20px' }}>Invoice No</th>
                    <th style={{ padding: '16px 20px' }}>Cashier</th>
                    <th style={{ padding: '16px 20px', textAlign: 'center' }}>Pay Method</th>
                    <th style={{ padding: '16px 20px', textAlign: 'right' }}>Total Amount</th>
                    <th style={{ padding: '16px 20px', textAlign: 'center' }}>Invoice Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {salesHistory.map(sale => (
                    <tr key={sale.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '16px 20px' }}>{new Date(sale.created_at).toLocaleString()}</td>
                      <td style={{ padding: '16px 20px', fontFamily: 'monospace', fontWeight: 'bold' }}>{sale.invoice_no}</td>
                      <td style={{ padding: '16px 20px' }}>{sale.cashier_name}</td>
                      <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '6px' }}>
                          {sale.payment_method}
                        </span>
                      </td>
                      <td style={{ padding: '16px 20px', textAlign: 'right', fontWeight: 'bold', color: 'var(--accent-cyan)' }}>Rs. {sale.net_total.toFixed(2)}</td>
                      <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                        <button
                          onClick={() => setInvoiceDetails(sale)}
                          className="btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '6px' }}
                        >
                          View Receipt
                        </button>
                      </td>
                    </tr>
                  ))}
                  
                  {salesHistory.length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        🧾 No transactions recorded in database.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: RETURNS HISTORY */}
        {activeTab === 'returns' && (
          <div className="animate-fade-in no-print" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <h1 style={{ fontSize: '1.8rem', fontWeight: '800' }}>Sales Returns & Refunds</h1>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Track all exchanged items, refunded amounts, and credit notes issued.</p>
            </div>

            <div className="glass-panel" style={{ overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '16px 20px' }}>Date</th>
                    <th style={{ padding: '16px 20px' }}>Return No</th>
                    <th style={{ padding: '16px 20px' }}>Original Inv</th>
                    <th style={{ padding: '16px 20px', textAlign: 'center' }}>Type / Method</th>
                    <th style={{ padding: '16px 20px', textAlign: 'right' }}>Refund Amount</th>
                    <th style={{ padding: '16px 20px', textAlign: 'center' }}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {returnsList.map(ret => (
                    <tr key={ret.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '16px 20px' }}>{new Date(ret.created_at).toLocaleString()}</td>
                      <td style={{ padding: '16px 20px', fontFamily: 'monospace', fontWeight: 'bold' }}>{ret.return_no}</td>
                      <td style={{ padding: '16px 20px', fontFamily: 'monospace', color: 'var(--accent-cyan)' }}>{ret.original_invoice_no}</td>
                      <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.8rem', background: 'rgba(255,42,95,0.1)', color: 'var(--accent-rose)', padding: '4px 8px', borderRadius: '6px' }}>
                          {ret.return_type} ({ret.payment_method})
                        </span>
                      </td>
                      <td style={{ padding: '16px 20px', textAlign: 'right', fontWeight: 'bold', color: 'var(--accent-rose)' }}>Rs. {ret.total_refund.toFixed(2)}</td>
                      <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                        <button
                          onClick={() => setReturnDetails(ret)}
                          className="btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '6px' }}
                        >
                          View Note
                        </button>
                      </td>
                    </tr>
                  ))}
                  
                  {returnsList.length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        🔄 No sales returns recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: FINANCIAL REPORTS */}
        {activeTab === 'reports' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="no-print">
              <h1 style={{ fontSize: '1.8rem', fontWeight: '800' }}>📈 Financial Reports</h1>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Generate daily, monthly & yearly sales summary reports</p>
            </div>

            {/* Report Controls */}
            <div className="glass-panel no-print" style={{ padding: '24px', display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Report Type</label>
                <select
                  className="glass-input"
                  value={reportType}
                  onChange={e => { setReportType(e.target.value); setReportData(null); }}
                  style={{ padding: '10px 16px', fontSize: '0.9rem', background: 'rgba(0,0,0,0.4)', minWidth: '180px' }}
                >
                  <option value="daily">📅 Daily Report</option>
                  <option value="monthly">📆 Monthly Report</option>
                  <option value="yearly">📊 Yearly Report</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
                  {reportType === 'daily' ? 'Select Date' : reportType === 'monthly' ? 'Select Month' : 'Select Year'}
                </label>
                <input
                  type={reportType === 'daily' ? 'date' : reportType === 'monthly' ? 'month' : 'number'}
                  className="glass-input"
                  value={reportType === 'yearly' ? reportDate.slice(0, 4) : reportType === 'monthly' ? reportDate.slice(0, 7) : reportDate}
                  onChange={e => setReportDate(e.target.value)}
                  min={reportType === 'yearly' ? '2020' : undefined}
                  max={reportType === 'yearly' ? '2030' : undefined}
                  style={{ padding: '10px 16px', fontSize: '0.9rem', minWidth: '180px' }}
                />
              </div>
              <button
                className="btn-primary"
                disabled={reportLoading}
                onClick={async () => {
                  setReportLoading(true);
                  setReportData(null);
                  try {
                    const dateParam = reportType === 'yearly' ? reportDate.slice(0, 4) : reportType === 'monthly' ? reportDate.slice(0, 7) : reportDate;
                    const response = await fetch(`${API_URL}/api/sales/generate-report?type=${reportType}&date=${dateParam}`, {
                      headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const data = await response.json();
                    if (response.ok) {
                      setReportData(data);
                    } else {
                      alert(data.error || 'Failed to generate report.');
                    }
                  } catch (err) {
                    alert(err.message);
                  } finally {
                    setReportLoading(false);
                  }
                }}
                style={{ padding: '10px 24px', fontSize: '0.9rem', fontWeight: '700' }}
              >
                {reportLoading ? 'Generating...' : '📊 Generate Report'}
              </button>
            </div>

            {/* Generated Report Display */}
            {reportData && (
              <div className="print-a4-container" style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
                
                {/* Print Button */}
                <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 24px 0' }}>
                  <button onClick={() => window.print()} className="btn-primary" style={{ padding: '8px 20px', fontSize: '0.85rem' }}>🖨️ Print Report</button>
                </div>

                {/* Report Header (print only shows full header) */}
                <div style={{ padding: '24px 32px' }}>
                  <div className="print-header" style={{ display: 'none' }}>
                    <h2>DORADO ESSENCE</h2>
                    <p>Polonnaruwa, Sri Lanka</p>
                    <h3 style={{ marginTop: '8px' }}>{reportType === 'daily' ? 'DAILY' : reportType === 'monthly' ? 'MONTHLY' : 'YEARLY'} SALES REPORT</h3>
                    <br/>
                  </div>

                  <div className="no-print" style={{ marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: '800' }}>
                      {reportType === 'daily' ? '📅 Daily' : reportType === 'monthly' ? '📆 Monthly' : '📊 Yearly'} Sales Report
                    </h2>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '24px', flexWrap: 'wrap', gap: '8px' }}>
                    <span><strong>Period:</strong> {reportData.periodLabel}</span>
                    <span><strong>Generated:</strong> {new Date(reportData.generatedAt).toLocaleString()}</span>
                  </div>

                  {/* Financial Summary KPIs */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '28px' }}>
                    {[
                      { label: 'Total Revenue', value: reportData.summary.totalRevenue, color: '#00f2fe' },
                      { label: 'Total Cost', value: reportData.summary.totalCost, color: '#ff6b6b' },
                      { label: 'Gross Profit', value: reportData.summary.totalProfit, color: '#51cf66' },
                      { label: 'Total Discounts', value: reportData.summary.totalDiscount, color: '#ffd43b' },
                      { label: 'Total Refunds', value: reportData.summary.totalRefunds, color: '#ff922b' },
                      { label: 'Net Revenue', value: reportData.summary.netRevenue, color: '#845ef7' }
                    ].map((kpi, idx) => (
                      <div key={idx} style={{
                        padding: '16px', borderRadius: '12px',
                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                        textAlign: 'center'
                      }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{kpi.label}</div>
                        <div style={{ fontSize: '1.3rem', fontWeight: '800', color: kpi.color }}>Rs. {kpi.value.toFixed(2)}</div>
                      </div>
                    ))}
                  </div>

                  {/* Transaction Summary */}
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '28px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '140px', padding: '14px', borderRadius: '10px', background: 'rgba(0,242,254,0.05)', border: '1px solid rgba(0,242,254,0.15)', textAlign: 'center' }}>
                      <div style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--accent-cyan)' }}>{reportData.summary.transactionCount}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Transactions</div>
                    </div>
                    <div style={{ flex: 1, minWidth: '140px', padding: '14px', borderRadius: '10px', background: 'rgba(255,107,107,0.05)', border: '1px solid rgba(255,107,107,0.15)', textAlign: 'center' }}>
                      <div style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--accent-rose)' }}>{reportData.summary.returnCount}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Returns</div>
                    </div>
                  </div>

                  {/* Payment Method Breakdown */}
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '14px', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>💳 Payment Method Breakdown</h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '28px', fontSize: '0.9rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}>
                        <th style={{ padding: '10px 12px', textAlign: 'left' }}>Payment Method</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center' }}>Transactions</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>Amount (Rs.)</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>% of Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: '💵 Cash', data: reportData.paymentBreakdown.cash, color: '#51cf66' },
                        { label: '💳 Card', data: reportData.paymentBreakdown.card, color: '#339af0' },
                        { label: '📱 QR Payment', data: reportData.paymentBreakdown.qr, color: '#845ef7' },
                        { label: '📋 Other', data: reportData.paymentBreakdown.other, color: '#868e96' }
                      ].map((pm, idx) => {
                        const percentage = reportData.summary.totalRevenue > 0 ? ((pm.data.amount / reportData.summary.totalRevenue) * 100) : 0;
                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <td style={{ padding: '12px', fontWeight: '600' }}>{pm.label}</td>
                            <td style={{ padding: '12px', textAlign: 'center' }}>{pm.data.count}</td>
                            <td style={{ padding: '12px', textAlign: 'right', fontWeight: '700', color: pm.color }}>Rs. {pm.data.amount.toFixed(2)}</td>
                            <td style={{ padding: '12px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                                <div style={{ width: '60px', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                                  <div style={{ width: `${percentage}%`, height: '100%', background: pm.color, borderRadius: '3px' }}></div>
                                </div>
                                <span style={{ minWidth: '42px', fontSize: '0.8rem' }}>{percentage.toFixed(1)}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {/* Grand Total Row */}
                      <tr style={{ borderTop: '2px solid rgba(255,255,255,0.15)', fontWeight: '800' }}>
                        <td style={{ padding: '12px' }}>GRAND TOTAL</td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>{reportData.summary.transactionCount}</td>
                        <td style={{ padding: '12px', textAlign: 'right', color: 'var(--accent-cyan)', fontSize: '1.05rem' }}>Rs. {reportData.summary.totalRevenue.toFixed(2)}</td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>100%</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Daily Breakdown Table (for monthly/yearly) */}
                  {reportData.dailyData.length > 1 && (
                    <>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '14px', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>📅 Day-wise Breakdown</h3>
                      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '28px', fontSize: '0.85rem' }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}>
                            <th style={{ padding: '8px 12px', textAlign: 'left' }}>Date</th>
                            <th style={{ padding: '8px 12px', textAlign: 'center' }}>Txns</th>
                            <th style={{ padding: '8px 12px', textAlign: 'right' }}>Revenue</th>
                            <th style={{ padding: '8px 12px', textAlign: 'right' }}>Cost</th>
                            <th style={{ padding: '8px 12px', textAlign: 'right' }}>Profit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.dailyData.map((day, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                              <td style={{ padding: '8px 12px' }}>{new Date(day.date + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                              <td style={{ padding: '8px 12px', textAlign: 'center' }}>{day.transactions}</td>
                              <td style={{ padding: '8px 12px', textAlign: 'right' }}>Rs. {day.revenue.toFixed(2)}</td>
                              <td style={{ padding: '8px 12px', textAlign: 'right' }}>Rs. {day.cost.toFixed(2)}</td>
                              <td style={{ padding: '8px 12px', textAlign: 'right', color: day.profit >= 0 ? '#51cf66' : '#ff6b6b', fontWeight: '600' }}>Rs. {day.profit.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  )}

                  {/* Print Signatures */}
                  <div className="print-signatures" style={{ display: 'none', marginTop: '50px', justifyContent: 'space-between', textAlign: 'center' }}>
                    <div style={{ borderTop: '1px solid #000', paddingTop: '10px', width: '40%' }}>
                      <strong>Prepared By</strong><br/>
                      <span style={{ fontSize: '0.8rem' }}>(Accountant / Admin)</span>
                    </div>
                    <div style={{ borderTop: '1px solid #000', paddingTop: '10px', width: '40%' }}>
                      <strong>Approved By</strong><br/>
                      <span style={{ fontSize: '0.8rem' }}>(Manager)</span>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* Empty State */}
            {!reportData && !reportLoading && (
              <div className="no-print" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📊</div>
                <p style={{ fontSize: '1rem' }}>Select a report type and date, then click <strong>"Generate Report"</strong></p>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: STAFF USERS CRUD */}
        {activeTab === 'staff' && (
          <div className="animate-fade-in no-print" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', justifySelf: 'space-between', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h1 style={{ fontSize: '1.8rem', fontWeight: '800' }}>Staff Registries</h1>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Administer terminal operators, assign roles, and handle passwords</p>
              </div>

              <button onClick={() => {
                setStaffForm({ username: '', password: '', full_name: '', role: 'cashier', status: 'active' });
                setStaffModal({ mode: 'add' });
              }} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>👥 Register New Staff</span>
              </button>
            </div>

            {/* Staff list */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '20px'
            }}>
              {staffList.map(st => (
                <div key={st.id} className="glass-panel" style={{
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  border: st.id === user.id ? '1px solid var(--border-glow)' : '1px solid rgba(255,255,255,0.05)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{st.full_name}</h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>@{st.username}</p>
                    </div>
                    <span style={{
                      fontSize: '0.75rem',
                      background: st.role === 'admin' ? 'rgba(0, 242, 254, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                      color: st.role === 'admin' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontWeight: 'bold',
                      textTransform: 'uppercase'
                    }}>
                      {st.role}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Status:</span>
                    <span style={{
                      fontWeight: 'bold',
                      color: st.status === 'active' ? 'var(--accent-emerald)' : 'var(--accent-rose)'
                    }}>
                      ● {st.status === 'active' ? 'Active Account' : 'Inactive'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px', marginTop: '4px' }}>
                    <button
                      onClick={() => {
                        setStaffForm({ ...st, password: '' }); // Don't autofill hashed password
                        setStaffModal({ mode: 'edit', data: st });
                      }}
                      className="btn-secondary"
                      style={{ flex: 1, padding: '8px', fontSize: '0.8rem', borderRadius: '6px' }}
                    >
                      Update
                    </button>
                    {st.id !== user.id && (
                      <button
                        onClick={() => deleteStaff(st.id)}
                        className="btn-danger"
                        style={{ flex: 1, padding: '8px', fontSize: '0.8rem', borderRadius: '6px' }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
      </div>

      {/* ==================================================== */}
      {/* MODAL 1: ADD / EDIT PRODUCT FORM */}
      {/* ==================================================== */}
      {productModal && (
        <div className="no-print" style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100, padding: '20px'
        }}>
          <div className="glass-panel-glow animate-fade-in" style={{
            width: '100%', maxWidth: '500px', padding: '30px'
          }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '20px' }}>
              {productModal.mode === 'add' ? '➕ Register New Product' : '✏️ Update Product Specifications'}
            </h3>

            <form onSubmit={handleProductSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Barcode</label>
                  <input
                    type="text"
                    required
                    className="glass-input"
                    value={productForm.barcode}
                    onChange={(e) => setProductForm({ ...productForm, barcode: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Category</label>
                  <select
                    required
                    className="glass-input"
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                  >
                    <option value="" disabled>Select category</option>
                    <option value="Perfumes">Perfumes</option>
                    <option value="Roll on bottles">Roll on bottles</option>
                    <option value="Car Diffusers">Car Diffusers</option>
                    <option value="Reed Diffusers">Reed Diffusers</option>
                    <option value="Car Air Freshener">Car Air Freshener</option>
                    <option value="Room & Linen Spray">Room & Linen Spray</option>
                    <option value="Refill Bottles">Refill Bottles</option>
                    <option value="Toilet Deodorizer">Toilet Deodorizer</option>
                    <option value="Toilet Seat Sanitizer">Toilet Seat Sanitizer</option>
                    <option value="Essential Oil">Essential Oil</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Product Name</label>
                <input
                  type="text"
                  required
                  className="glass-input"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Cost Price (Rs.)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="glass-input"
                    value={productForm.cost_price}
                    onChange={(e) => setProductForm({ ...productForm, cost_price: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Selling Price (Rs.)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="glass-input"
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {productModal.mode === 'add' ? 'Initial Stock Quantity' : 'Current Stock Qty (read-only)'}
                  </label>
                  <input
                    type="number"
                    required={productModal.mode === 'add'}
                    readOnly={productModal.mode === 'edit'}
                    className="glass-input"
                    value={productForm.stock_quantity}
                    onChange={(e) => productModal.mode === 'add' && setProductForm({ ...productForm, stock_quantity: e.target.value })}
                    style={productModal.mode === 'edit' ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                    title={productModal.mode === 'edit' ? 'Use the 📦 Stock button to adjust stock levels' : ''}
                  />
                  {productModal.mode === 'edit' && (
                    <p style={{ fontSize: '0.72rem', color: 'var(--accent-gold)', margin: '2px 0 0 0' }}>⚠️ Use the Stock Adjustment option to change stock levels.</p>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Low Stock Warning Limit</label>
                  <input
                    type="number"
                    required
                    className="glass-input"
                    value={productForm.low_stock_threshold}
                    onChange={(e) => setProductForm({ ...productForm, low_stock_threshold: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '10px' }}>
                <button type="submit" disabled={loading} className="btn-primary">
                  {loading ? 'Saving...' : 'Save Product'}
                </button>
                <button type="button" onClick={() => setProductModal(null)} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: STOCK ADJUSTMENT (PIN PROTECTED)              */}
      {/* ==================================================== */}
      {stockAdjustModal && (
        <div className="no-print" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.88)', display: 'flex',
          alignItems: 'flex-start', justifyContent: 'center',
          zIndex: 110, padding: '40px 20px 20px 20px', overflowY: 'auto'
        }}>
          <div className="glass-panel-glow animate-fade-in" style={{
            width: '100%', maxWidth: '460px', padding: '30px',
            display: 'flex', flexDirection: 'column', gap: '18px'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '800', margin: '0 0 4px 0' }}>📦 Stock Adjustment</h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
                  {stockAdjustModal.product.name}
                </p>
              </div>
              <button onClick={() => setStockAdjustModal(null)} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                Cancel
              </button>
            </div>

            {/* Current Stock Info */}
            <div style={{
              background: 'rgba(0,242,167,0.05)', border: '1px solid rgba(0,242,167,0.2)',
              borderRadius: '8px', padding: '12px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Current Stock:</span>
              <span style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--accent-emerald)' }}>
                {stockAdjustModal.product.stock_quantity} units
              </span>
            </div>

            <form onSubmit={handleStockAdjust} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Adjustment Amount */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Adjustment Quantity <span style={{ color: 'var(--accent-cyan)' }}>(+ to add, - to remove)</span>
                </label>
                <input
                  type="number"
                  required
                  className="glass-input"
                  placeholder="e.g. +10 or -5"
                  value={stockAdjustForm.adjustment}
                  onChange={(e) => setStockAdjustForm({ ...stockAdjustForm, adjustment: e.target.value })}
                  style={{ fontSize: '1.1rem', fontWeight: '600' }}
                />
                {stockAdjustForm.adjustment && !isNaN(parseInt(stockAdjustForm.adjustment)) && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--accent-gold)', margin: '2px 0 0 0' }}>
                    New Stock: {stockAdjustModal.product.stock_quantity + parseInt(stockAdjustForm.adjustment)} units
                  </p>
                )}
              </div>

              {/* Reason */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Reason for Adjustment <span style={{ color: 'var(--accent-rose)' }}>*</span></label>
                <select
                  className="glass-input"
                  value={stockAdjustForm.reason}
                  onChange={(e) => setStockAdjustForm({ ...stockAdjustForm, reason: e.target.value })}
                  required
                >
                  <option value="">Select reason...</option>
                  <option value="Physical count correction">Physical count correction</option>
                  <option value="Damaged / expired stock removal">Damaged / expired stock removal</option>
                  <option value="Transfer to another branch">Transfer to another branch</option>
                  <option value="Initial stock setup">Initial stock setup</option>
                  <option value="Supplier return">Supplier return</option>
                  <option value="Other adjustment">Other adjustment</option>
                </select>
              </div>

              {/* Authorisation PIN */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  🔐 Authorisation PIN <span style={{ color: 'var(--accent-rose)' }}>*</span>
                </label>
                <input
                  type="password"
                  required
                  maxLength={6}
                  className="glass-input"
                  placeholder="Enter PIN to authorise"
                  value={stockAdjustForm.pin}
                  onChange={(e) => setStockAdjustForm({ ...stockAdjustForm, pin: e.target.value })}
                  autoComplete="off"
                />
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                  Contact your system administrator if you don't have the adjustment PIN.
                </p>
              </div>

              {/* Error */}
              {stockAdjustError && (
                <div style={{
                  background: 'rgba(255,42,95,0.1)', border: '1px solid var(--accent-rose)',
                  borderRadius: '8px', padding: '10px 14px', fontSize: '0.85rem', color: 'var(--accent-rose)'
                }}>
                  ⚠️ {stockAdjustError}
                </div>
              )}

              {/* Submit */}
              <button type="submit" disabled={loading} className="btn-primary" style={{ padding: '12px', fontSize: '0.9rem', fontWeight: '700' }}>
                {loading ? 'Processing...' : '✅ Confirm Stock Adjustment'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 2: ADD / EDIT STAFF FORM */}
      {/* ==================================================== */}
      {staffModal && (

        <div className="no-print" style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100, padding: '20px'
        }}>
          <div className="glass-panel-glow animate-fade-in" style={{
            width: '100%', maxWidth: '450px', padding: '30px'
          }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '20px' }}>
              {staffModal.mode === 'add' ? '👥 Register New Staff Login' : '✏️ Update Staff Privileges'}
            </h3>

            <form onSubmit={handleStaffSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Full Name</label>
                <input
                  type="text"
                  required
                  className="glass-input"
                  value={staffForm.full_name}
                  onChange={(e) => setStaffForm({ ...staffForm, full_name: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Username</label>
                <input
                  type="text"
                  required
                  className="glass-input"
                  disabled={staffModal.mode === 'edit'}
                  value={staffForm.username}
                  onChange={(e) => setStaffForm({ ...staffForm, username: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {staffModal.mode === 'add' ? 'Login Password' : 'Reset Password (Leave blank if unchanged)'}
                </label>
                <input
                  type="password"
                  required={staffModal.mode === 'add'}
                  placeholder={staffModal.mode === 'edit' ? '••••••••' : ''}
                  className="glass-input"
                  value={staffForm.password}
                  onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>System Role</label>
                  <select
                    className="glass-input"
                    value={staffForm.role}
                    onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
                  >
                    <option value="cashier">Cashier</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Account Status</label>
                  <select
                    className="glass-input"
                    value={staffForm.status}
                    onChange={(e) => setStaffForm({ ...staffForm, status: e.target.value })}
                  >
                    <option value="active">Active Login</option>
                    <option value="inactive">Disabled</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '10px' }}>
                <button type="submit" disabled={loading} className="btn-primary">
                  {loading ? 'Saving...' : 'Save User'}
                </button>
                <button type="button" onClick={() => setStaffModal(null)} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 3: INVOICE DETAILS VIEW */}
      {/* ==================================================== */}
      {invoiceDetails && (
        <div className="no-print" style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center',
          zIndex: 100, padding: '20px'
        }}>
          <div className="glass-panel-glow animate-fade-in" style={{
            width: '100%', maxWidth: '380px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px'
          }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', textAlign: 'center' }}>Invoice Log Audit</h3>

            <div style={{
              background: '#fff',
              color: '#000',
              padding: '16px',
              borderRadius: '8px',
              fontFamily: 'monospace',
              fontSize: '11px',
              lineHeight: '1.4'
            }}>
              <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 'bold', margin: '0' }}>DORADO ESSENCE</h4>
                <p style={{ margin: '0' }}>Colombo, Sri Lanka</p>
                <p style={{ borderBottom: '1px dashed #000', margin: '5px 0' }}></p>
              </div>

              <p style={{ margin: '0' }}><strong>Invoice:</strong> {invoiceDetails.invoice_no}</p>
              <p style={{ margin: '0' }}><strong>Date:</strong> {new Date(invoiceDetails.created_at).toLocaleString()}</p>
              <p style={{ margin: '0' }}><strong>Cashier:</strong> {invoiceDetails.cashier_name}</p>
              <p style={{ borderBottom: '1px dashed #000', margin: '5px 0' }}></p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {invoiceDetails.items.map((item, idx) => (
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
                  <span>Rs.{invoiceDetails.subtotal.toFixed(2)}</span>
                </div>
                {invoiceDetails.discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Discount:</span>
                    <span>-Rs.{invoiceDetails.discount.toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                  <span>Net Total:</span>
                  <span>Rs.{invoiceDetails.net_total.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#555' }}>
                  <span>Paid ({invoiceDetails.payment_method}):</span>
                  <span>Rs.{invoiceDetails.amount_received.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#555' }}>
                  <span>Change:</span>
                  <span>Rs.{invoiceDetails.change_given.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <button onClick={() => setInvoiceDetails(null)} className="btn-secondary" style={{ width: '100%', padding: '12px' }}>
              Close Auditor View
            </button>
          </div>
        </div>
      )}

      {/* MODAL: GRN FORM */}
      {grnModal && (
        <div className="no-print">
          <GrnForm 
            API_URL={API_URL} 
            token={token} 
            products={products} 
            onClose={() => setGrnModal(false)} 
            onSuccess={() => {
              setGrnModal(false);
              loadGrns();
              loadProducts();
              loadAnalytics();
            }} 
          />
        </div>
      )}

      {/* MODAL: GRN DETAILS */}
      {grnDetails && (
        <div className="print-modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 150, padding: '20px'
        }}>
          <div className="glass-panel-glow animate-fade-in print-a4-container" style={{
            width: '100%', maxWidth: '600px', padding: '30px', maxHeight: '90vh', display: 'flex', flexDirection: 'column'
          }}>
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.4rem', fontWeight: '800' }}>GRN Details</h3>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => window.print()} className="btn-primary" style={{ padding: '6px 12px' }}>🖨️ Print A4</button>
                <button onClick={() => setGrnDetails(null)} className="btn-secondary" style={{ padding: '6px 12px' }}>Close</button>
              </div>
            </div>
            
            <div style={{ overflowY: 'auto', paddingRight: '10px' }}>
              <div className="print-header" style={{ display: 'none' }}>
                <h2>GOODS RECEIVE NOTE</h2>
                <h3>DORADO ESSENCE</h3>
                <p>Polonnaruwa, Sri Lanka</p>
                <br/>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px', fontSize: '0.9rem' }}>
                <div><strong className="text-muted" style={{ color: 'var(--text-muted)' }}>GRN No:</strong><br/>{grnDetails.grn_no}</div>
                <div><strong className="text-muted" style={{ color: 'var(--text-muted)' }}>Date:</strong><br/>{new Date(grnDetails.created_at).toLocaleString()}</div>
                <div><strong className="text-muted" style={{ color: 'var(--text-muted)' }}>Supplier Name:</strong><br/>{grnDetails.supplier_name}</div>
                <div><strong className="text-muted" style={{ color: 'var(--text-muted)' }}>Supplier Contact:</strong><br/>{grnDetails.supplier_contact || 'N/A'}</div>
                <div><strong className="text-muted" style={{ color: 'var(--text-muted)' }}>Invoice / Bill No:</strong><br/>{grnDetails.reference_no || 'N/A'}</div>
                <div><strong className="text-muted" style={{ color: 'var(--text-muted)' }}>PO Number:</strong><br/>{grnDetails.po_number || 'N/A'}</div>
                <div><strong className="text-muted" style={{ color: 'var(--text-muted)' }}>Store / Branch:</strong><br/>{grnDetails.store_name || 'N/A'}</div>
                <div><strong className="text-muted" style={{ color: 'var(--text-muted)' }}>Created By:</strong><br/>{grnDetails.created_by}</div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '8px' }}>Product</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Unit Cost</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>Qty Ord.</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>Qty Rec.</th>
                    <th style={{ padding: '8px', textAlign: 'center' }}>Condition</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {grnDetails.items.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '8px' }}>{item.product_name}<br/><span style={{fontSize:'10px', color:'var(--text-muted)'}} className="text-muted">{item.barcode}</span></td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>Rs. {item.cost_price.toFixed(2)}</td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>{item.quantity_ordered || '-'}</td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>{item.quantity}</td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>{item.condition || 'Good'}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>Rs. {item.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <strong style={{ fontSize: '1.1rem' }}>Total Value:</strong>
                <strong style={{ fontSize: '1.3rem', color: 'var(--accent-cyan)' }} className="text-muted">Rs. {grnDetails.total_value.toFixed(2)}</strong>
              </div>

              {grnDetails.remarks && (
                <div style={{ marginTop: '20px', padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                  <strong className="text-muted" style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Remarks: </strong>
                  <span style={{ fontSize: '0.9rem' }}>{grnDetails.remarks}</span>
                </div>
              )}

              {/* Print Only Signatures */}
              <div className="print-signatures" style={{ display: 'none', marginTop: '60px', justifyContent: 'space-between', textAlign: 'center' }}>
                <div style={{ borderTop: '1px solid #000', paddingTop: '10px', width: '40%' }}>
                  <strong>Checked By</strong><br/>
                  <span style={{ fontSize: '0.8rem' }}>(Storekeeper / Cashier)</span>
                </div>
                <div style={{ borderTop: '1px solid #000', paddingTop: '10px', width: '40%' }}>
                  <strong>Approved By</strong><br/>
                  <span style={{ fontSize: '0.8rem' }}>(Manager)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RETURN DETAILS */}
      {returnDetails && (
        <div className="no-print" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 150, padding: '20px'
        }}>
          <div className="glass-panel-glow animate-fade-in" style={{
            width: '100%', maxWidth: '380px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px'
          }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', textAlign: 'center' }}>Return Credit Note Audit</h3>

            <div style={{
              background: '#fff', color: '#000', padding: '16px', borderRadius: '8px',
              fontFamily: 'monospace', fontSize: '11px', lineHeight: '1.4'
            }}>
              <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 'bold', margin: '0' }}>DORADO ESSENCE</h4>
                <p style={{ margin: '0', fontWeight: 'bold' }}>CREDIT NOTE / RETURN RECEIPT</p>
                <p style={{ borderBottom: '1px dashed #000', margin: '5px 0' }}></p>
              </div>

              <p style={{ margin: '0' }}><strong>Return No:</strong> {returnDetails.return_no}</p>
              <p style={{ margin: '0' }}><strong>Original Inv:</strong> {returnDetails.original_invoice_no}</p>
              <p style={{ margin: '0' }}><strong>Date:</strong> {new Date(returnDetails.created_at).toLocaleString()}</p>
              <p style={{ margin: '0' }}><strong>Cashier:</strong> {returnDetails.cashier_name}</p>
              <p style={{ borderBottom: '1px dashed #000', margin: '5px 0' }}></p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {returnDetails.items.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{item.product_name} x{item.quantity}</span>
                    <span>Rs.{item.refund_amount.toFixed(2)}</span>
                  </div>
                ))}
                <p style={{ borderBottom: '1px dashed #000', margin: '5px 0' }}></p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'right' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                  <span>Total Refund:</span>
                  <span>Rs.{returnDetails.total_refund.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#555' }}>
                  <span>Method:</span>
                  <span>{returnDetails.return_type} ({returnDetails.payment_method})</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#555', fontSize: '10px' }}>
                  <span>Reason:</span>
                  <span>{returnDetails.reason}</span>
                </div>
              </div>
            </div>

            <button onClick={() => setReturnDetails(null)} className="btn-secondary" style={{ width: '100%', padding: '12px' }}>
              Close View
            </button>
          </div>
        </div>
      )}
    </>
  );
}
