import React, { useState, useEffect } from 'react';

export default function CashBoxCalculator({ title, onConfirm, confirmText, defaultCounts }) {
  const notes = [5000, 2000, 1000, 500, 100, 50, 20];
  const coins = [10, 5, 2, 1];

  const initialCounts = defaultCounts || {
    5000: 0, 2000: 0, 1000: 0, 500: 0, 100: 0, 50: 0, 20: 0,
    10: 0, 5: 0, 2: 0, 1: 0
  };

  const [counts, setCounts] = useState(initialCounts);
  const [total, setTotal] = useState(0);

  // Recalculate grand total in real-time
  useEffect(() => {
    let sum = 0;
    Object.entries(counts).forEach(([denom, count]) => {
      sum += Number(denom) * Number(count || 0);
    });
    setTotal(sum);
  }, [counts]);

  const handleChange = (denom, val) => {
    const qty = Math.max(0, parseInt(val) || 0);
    setCounts({ ...counts, [denom]: qty });
  };

  const adjustQty = (denom, delta) => {
    const qty = Math.max(0, (counts[denom] || 0) + delta);
    setCounts({ ...counts, [denom]: qty });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(total, counts);
  };

  const autofillDemo = () => {
    // Fill in a reasonable opening drawer amount, e.g., Rs. 10,000 in starting change
    setCounts({
      5000: 1, // 5000
      2000: 1, // 2000
      1000: 2, // 2000
      500: 1,  // 500
      100: 3,  // 300
      50: 2,   // 100
      20: 5,   // 100
      10: 5,   // 50
      5: 6,    // 30
      2: 7,    // 14
      1: 6     // 6
    }); // Sum = 5000 + 2000 + 2000 + 500 + 300 + 100 + 100 + 50 + 30 + 14 + 6 = Rs. 10,100
  };

  return (
    <form onSubmit={handleSubmit} className="animate-fade-in" style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '20px'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '4px' }}>{title}</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Please input note and coin counts to calculate aggregate balance.
        </p>
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        padding: '12px 16px',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: '10px',
        margin: '10px 0'
      }}>
        <span style={{ fontSize: '0.95rem', fontWeight: '500', color: 'var(--text-secondary)' }}>Calculated Total:</span>
        <span style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--accent-cyan)' }}>
          Rs. {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>

      {/* Columns: Notes and Coins side by side */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px',
        maxHeight: '340px',
        overflowY: 'auto',
        paddingRight: '6px'
      }}>
        
        {/* Notes Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h4 style={{ fontSize: '0.85rem', color: 'var(--accent-blue)', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
            💵 Notes (Rs.)
          </h4>
          
          {notes.map(note => (
            <div key={note} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <span style={{ fontSize: '0.85rem', width: '55px', fontWeight: '500' }}>Rs. {note}</span>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => adjustQty(note, -1)}
                  style={{ width: '22px', height: '22px', borderRadius: '4px', border: 'none', background: 'rgba(255,255,255,0.05)', color: '#fff', cursor: 'pointer' }}
                >
                  -
                </button>
                <input
                  type="number"
                  min="0"
                  className="glass-input"
                  style={{ width: '60px', padding: '4px 6px', textAlign: 'center', fontSize: '0.85rem' }}
                  value={counts[note]}
                  onChange={(e) => handleChange(note, e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => adjustQty(note, 1)}
                  style={{ width: '22px', height: '22px', borderRadius: '4px', border: 'none', background: 'rgba(255,255,255,0.05)', color: '#fff', cursor: 'pointer' }}
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Coins Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h4 style={{ fontSize: '0.85rem', color: 'var(--accent-emerald)', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
            🪙 Coins (Rs.)
          </h4>
          
          {coins.map(coin => (
            <div key={coin} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <span style={{ fontSize: '0.85rem', width: '55px', fontWeight: '500' }}>Rs. {coin}</span>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => adjustQty(coin, -1)}
                  style={{ width: '22px', height: '22px', borderRadius: '4px', border: 'none', background: 'rgba(255,255,255,0.05)', color: '#fff', cursor: 'pointer' }}
                >
                  -
                </button>
                <input
                  type="number"
                  min="0"
                  className="glass-input"
                  style={{ width: '60px', padding: '4px 6px', textAlign: 'center', fontSize: '0.85rem' }}
                  value={counts[coin]}
                  onChange={(e) => handleChange(coin, e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => adjustQty(coin, 1)}
                  style={{ width: '22px', height: '22px', borderRadius: '4px', border: 'none', background: 'rgba(255,255,255,0.05)', color: '#fff', cursor: 'pointer' }}
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px', marginTop: '10px' }}>
        <button type="submit" className="btn-primary" style={{ padding: '12px' }}>
          {confirmText}
        </button>
        <button type="button" onClick={autofillDemo} className="btn-secondary" style={{ padding: '12px', fontSize: '0.85rem' }}>
          ⚡ Auto-Count Shift
        </button>
      </div>
    </form>
  );
}
