import React, { useState } from 'react';

export default function GrnForm({ API_URL, token, products, onClose, onSuccess }) {
  const [supplierName, setSupplierName] = useState('');
  const [supplierContact, setSupplierContact] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [storeName, setStoreName] = useState('');
  const [remarks, setRemarks] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const addItem = () => {
    setItems([...items, { _id: Date.now(), product_id: '', quantity_ordered: '', quantity: 1, cost_price: 0, condition: 'Good' }]);
  };

  const removeItem = (id) => {
    setItems(items.filter(i => i._id !== id));
  };

  const updateItem = (id, field, value) => {
    setItems(items.map(item => {
      if (item._id === id) {
        const updated = { ...item, [field]: value };
        // Auto-fill cost price if product is selected
        if (field === 'product_id') {
          const prod = products.find(p => p.id === Number(value));
          if (prod) {
            updated.product_name = prod.name;
            updated.cost_price = prod.cost_price;
          }
        }
        return updated;
      }
      return item;
    }));
  };

  const totalValue = items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.cost_price)), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (items.length === 0) return alert('Please add at least one item.');
    if (items.some(i => !i.product_id || i.quantity <= 0)) return alert('Please fill in valid product and quantity for all items.');

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/grn`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          supplier_name: supplierName,
          supplier_contact: supplierContact,
          reference_no: referenceNo,
          po_number: poNumber,
          store_name: storeName,
          remarks: remarks,
          items: items.map(i => ({ 
            product_id: i.product_id, 
            quantity_ordered: i.quantity_ordered,
            quantity: i.quantity, 
            cost_price: i.cost_price,
            condition: i.condition 
          }))
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit GRN.');
      }
      onSuccess();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 150, padding: '20px'
    }}>
      <div className="glass-panel-glow animate-fade-in" style={{
        width: '100%', maxWidth: '800px', padding: '30px', maxHeight: '90vh', display: 'flex', flexDirection: 'column'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1.4rem', fontWeight: '800' }}>📥 Create Goods Receive Note</h3>
          <button type="button" onClick={onClose} className="btn-secondary" style={{ padding: '6px 12px' }}>Close</button>
        </div>

        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', paddingRight: '10px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Supplier Name</label>
              <input type="text" required className="glass-input" value={supplierName} onChange={e => setSupplierName(e.target.value)} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Supplier Contact</label>
              <input type="text" className="glass-input" value={supplierContact} onChange={e => setSupplierContact(e.target.value)} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Supplier Invoice / Bill No</label>
              <input type="text" required className="glass-input" value={referenceNo} onChange={e => setReferenceNo(e.target.value)} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>PO Number (Optional)</label>
              <input type="text" className="glass-input" value={poNumber} onChange={e => setPoNumber(e.target.value)} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Store / Branch Name</label>
              <input type="text" required className="glass-input" value={storeName} onChange={e => setStoreName(e.target.value)} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Remarks</label>
              <input type="text" className="glass-input" value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Short supply, etc." />
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 'bold' }}>Received Items</h4>
              <button type="button" onClick={addItem} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>+ Add Row</button>
            </div>

            {items.map((item, index) => (
              <div key={item._id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 30px', gap: '10px', alignItems: 'end', marginBottom: '10px', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Product</label>
                  <select required className="glass-input" value={item.product_id} onChange={e => updateItem(item._id, 'product_id', e.target.value)} style={{ padding: '8px', fontSize: '0.85rem', background: 'rgba(0,0,0,0.4)' }}>
                    <option value="" disabled>Select a product...</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.barcode})</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Unit Cost</label>
                  <input type="number" step="0.01" required className="glass-input" value={item.cost_price} onChange={e => updateItem(item._id, 'cost_price', e.target.value)} style={{ padding: '8px', fontSize: '0.85rem' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Qty Ordered</label>
                  <input type="number" className="glass-input" value={item.quantity_ordered} onChange={e => updateItem(item._id, 'quantity_ordered', e.target.value)} style={{ padding: '8px', fontSize: '0.85rem' }} placeholder="Optional" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Qty Received</label>
                  <input type="number" required className="glass-input" value={item.quantity} onChange={e => updateItem(item._id, 'quantity', e.target.value)} style={{ padding: '8px', fontSize: '0.85rem' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Condition</label>
                  <input type="text" className="glass-input" value={item.condition} onChange={e => updateItem(item._id, 'condition', e.target.value)} style={{ padding: '8px', fontSize: '0.85rem' }} placeholder="Good" />
                </div>
                <button type="button" onClick={() => removeItem(item._id)} style={{ padding: '8px', background: 'transparent', border: 'none', color: 'var(--accent-rose)', cursor: 'pointer' }}>
                  ✖
                </button>
              </div>
            ))}
            {items.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '10px' }}>No items added yet. Click "+ Add Row" to begin.</p>}
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Total GRN Value:</span>
            <span style={{ fontSize: '1.4rem', fontWeight: '900', color: 'var(--accent-cyan)' }}>Rs. {totalValue.toFixed(2)}</span>
          </div>

          <button type="submit" disabled={loading} className="btn-primary" style={{ padding: '14px', fontSize: '1rem', marginTop: '10px' }}>
            {loading ? 'Submitting GRN & Updating Stock...' : 'Confirm & Save GRN'}
          </button>
        </form>
      </div>
    </div>
  );
}
