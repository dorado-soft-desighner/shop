import React from 'react';

// ==========================================
// 1. Sleek SVG Area Chart (Sales Trend)
// ==========================================
export function AreaChart({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifySelf: 'center', color: 'var(--text-muted)' }}>
        No sales trend data available yet.
      </div>
    );
  }

  const width = 600;
  const height = 200;
  const paddingLeft = 60;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 40;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const maxVal = Math.max(...data.map(d => d.amount), 1000);
  
  // Coordinate calculations
  const points = data.map((d, index) => {
    const x = paddingLeft + (index / Math.max(1, data.length - 1)) * chartWidth;
    const y = paddingTop + chartHeight - (d.amount / maxVal) * chartHeight;
    return { x, y, label: d.date, value: d.amount };
  });

  const pathD = points.length > 0 
    ? `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')
    : '';

  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`
    : '';

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="220" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00f2fe" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#00f2fe" stopOpacity="0.0" />
          </linearGradient>
          <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Horizontal grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
          const y = paddingTop + chartHeight * ratio;
          const val = Math.round(maxVal * (1 - ratio));
          return (
            <g key={i}>
              <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
              <text x={paddingLeft - 10} y={y + 4} fill="var(--text-muted)" fontSize="10" textAnchor="end">
                Rs. {val}
              </text>
            </g>
          );
        })}

        {/* Shaded Area */}
        {areaD && <path d={areaD} fill="url(#areaGrad)" />}

        {/* Glowing Line */}
        {pathD && (
          <path d={pathD} fill="none" stroke="#00f2fe" strokeWidth="3" filter="url(#neonGlow)" strokeLinecap="round" strokeLinejoin="round" />
        )}

        {/* Data points (Glowing Dots) */}
        {points.map((p, i) => (
          <g key={i} className="chart-dot-group" style={{ cursor: 'pointer' }}>
            <circle cx={p.x} cy={p.y} r="5" fill="#12121e" stroke="#00f2fe" strokeWidth="2.5" />
            <circle cx={p.x} cy={p.y} r="10" fill="#00f2fe" opacity="0" className="hover-trigger" />
            
            {/* Tooltip on hover */}
            <title>{`${p.label}: Rs. ${p.value.toFixed(2)}`}</title>
          </g>
        ))}

        {/* X-axis Labels */}
        {points.map((p, i) => {
          // Only render every alternate label if data is too dense
          if (data.length > 7 && i % 2 !== 0 && i !== data.length - 1) return null;
          // Format date to show short version
          const shortDate = p.label.substring(5); // e.g. "05-19" from "2026-05-19"
          return (
            <text key={i} x={p.x} y={height - 15} fill="var(--text-secondary)" fontSize="10.5" textAnchor="middle">
              {shortDate}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

// ==========================================
// 2. High-Tech Donut Ring Chart (Category Sales)
// ==========================================
export function DonutChart({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifySelf: 'center', color: 'var(--text-muted)' }}>
        No category statistics available.
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const size = 160;
  const radius = 55;
  const circumference = 2 * Math.PI * radius;
  const strokeWidth = 14;
  const center = size / 2;

  const colors = ['#00f2fe', '#00f2a7', '#ffd000', '#ff2a5f', '#4facfe', '#9b5de5'];

  const segments = data.reduce((acc, d, index) => {
    const percentage = total > 0 ? (d.value / total) : 0;
    const strokeDash = percentage * circumference;
    const currentOffset = acc.length > 0 ? acc[acc.length - 1].nextOffset : 0;
    const strokeOffset = circumference - strokeDash + currentOffset;
    
    acc.push({
      ...d,
      strokeDash: `${strokeDash} ${circumference}`,
      strokeOffset,
      color: colors[index % colors.length],
      percentage: (percentage * 100).toFixed(1),
      nextOffset: currentOffset - strokeDash
    });
    return acc;
  }, []);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '30px', flexWrap: 'wrap', justifyContent: 'center' }}>
      {/* SVG Ring */}
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Base Circle */}
          <circle cx={center} cy={center} r={radius} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth={strokeWidth} />
          
          {/* Segments */}
          {segments.map((seg, i) => (
            <circle
              key={i}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeDasharray={seg.strokeDash}
              strokeDashoffset={seg.strokeOffset}
              transform={`rotate(-90 ${center} ${center})`}
              strokeLinecap={seg.value > 0 ? 'round' : 'butt'}
              style={{ transition: 'stroke-dashoffset 0.8s ease' }}
            >
              <title>{`${seg.name}: Rs. ${seg.value.toFixed(2)} (${seg.percentage}%)`}</title>
            </circle>
          ))}
        </svg>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none'
        }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Sales</span>
          <span style={{ fontSize: '1.05rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>Rs. {Math.round(total)}</span>
        </div>
      </div>

      {/* Legends */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '150px' }}>
        {segments.map((seg, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: seg.color, display: 'inline-block' }}></span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {seg.name} ({seg.percentage}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// 3. High-Tech Bar Chart (Cashier Sales)
// ==========================================
export function BarChart({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifySelf: 'center', color: 'var(--text-muted)' }}>
        No cashier performance statistics.
      </div>
    );
  }

  const maxVal = Math.max(...data.map(d => d.value), 1000);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '10px 0' }}>
      {data.map((item, index) => {
        const percentage = maxVal > 0 ? (item.value / maxVal) * 100 : 0;
        const colors = ['var(--accent-cyan)', 'var(--accent-emerald)', 'var(--accent-blue)'];
        const barColor = colors[index % colors.length];

        return (
          <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {/* Top Label info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{item.name}</span>
              <span style={{ fontWeight: 'bold', color: 'var(--text-secondary)' }}>Rs. {item.value.toFixed(2)}</span>
            </div>
            
            {/* Custom Bar Tracker */}
            <div style={{ height: '12px', width: '100%', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{
                height: '100%',
                width: `${percentage}%`,
                background: `linear-gradient(90deg, ${barColor} 0%, rgba(255,255,255,0.8) 100%)`,
                borderRadius: '6px',
                boxShadow: `0 0 10px ${barColor}aa`,
                transition: 'width 1s cubic-bezier(0.19, 1, 0.22, 1)'
              }}></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
