import React, { useState, useEffect, useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Label } from 'recharts';

function App() {
  const [page, setPage] = useState('dashboard'); 
  const [pos, setPos] = useState({ x: 350, y: 300 });
  const [stats, setStats] = useState({ 
    rsrp: -70, distance: 0, decision: 'LTE', throughput: 120, 
    packetLoss: 0.02, latency: 25, needlePos: 140, nearestTower: 'BASE_01'
  });
  const [history, setHistory] = useState([]);
  const [logs, setLogs] = useState([]);
  
  // NEW: Interactive AI State
  const [aiMessage, setAiMessage] = useState("System initialized. Monitoring dual-band link integrity...");
  const aiCooldown = useRef(false);

  const towers = [
    { id: 'BASE_01', x: 80, y: 80, name: 'LTE_NORTH_WEST' },
    { id: 'BASE_02', x: 820, y: 520, name: 'LTE_SOUTH_EAST' }
  ];

  const LTE_RANGE_PX = 222; 

  useEffect(() => {
    const interval = setInterval(() => {
      updateNetworkPhysics();
    }, 800);
    return () => clearInterval(interval);
  }, [pos, stats.decision]);

  const updateNetworkPhysics = () => {
    const towerData = towers.map(t => {
      const dx = pos.x - t.x;
      const dy = pos.y - t.y;
      const pixelDist = Math.sqrt(dx*dx + dy*dy);
      return { ...t, pixelDist, km: (pixelDist * 0.045).toFixed(2) };
    });

    const nearest = towerData.reduce((prev, curr) => (prev.pixelDist < curr.pixelDist) ? prev : curr);
    const inRangeOfAny = towerData.some(t => t.pixelDist <= LTE_RANGE_PX);
    let currentMode = inRangeOfAny ? 'LTE' : 'UHF';
    
    const noise = (Math.random() - 0.5) * 5;
    let speed;

    if (currentMode === 'LTE') {
      speed = Math.max(40, 150 - (nearest.km * 8)) + noise;
    } else {
      speed = Math.max(0.1, 0.8 - (nearest.km * 0.01)) + (noise / 50);
    }

    const speedNeedle = Math.min(180, (speed / 150) * 180);

    // AI INTERACTIVE LOGIC
    if (!aiCooldown.current) {
        if (currentMode === 'UHF') {
            setAiMessage(`Warning: LTE Link Lost. Switching to UHF Relay. Throughput dropped to ${speed.toFixed(2)} kbps. Recommend moving towards ${nearest.id}.`);
        } else if (parseFloat(nearest.km) > 7) {
            setAiMessage(`Signal degrading at ${nearest.km}km. We are approaching the 10km LTE boundary. Monitor packet loss.`);
        } else {
            setAiMessage(`Optimal LTE link established with ${nearest.name}. Performance is nominal at ${speed.toFixed(1)} Mbps.`);
        }
        aiCooldown.current = true;
        setTimeout(() => aiCooldown.current = false, 3000); // Only "talks" every 3 seconds to avoid spam
    }

    if (stats.decision !== currentMode) {
        setLogs(prev => [{
          time: new Date().toLocaleTimeString(),
          event: "PROTOCOL_SWITCH",
          details: `${stats.decision} ➔ ${currentMode}`,
          reason: currentMode === 'UHF' ? "Signal Out of Range" : "LTE Re-entry"
        }, ...prev].slice(0, 5));
    }

    setStats({
      distance: nearest.km,
      rsrp: (-50 - (20 * Math.log10(parseFloat(nearest.km) + 1)) + noise).toFixed(1),
      decision: currentMode,
      throughput: speed.toFixed(3),
      packetLoss: (currentMode === 'LTE' ? nearest.km * 0.03 : nearest.km * 0.15).toFixed(2),
      needlePos: speedNeedle,
      nearestTower: nearest.id,
      targetX: nearest.x,
      targetY: nearest.y
    });

    setHistory(prev => [...prev, { dist: parseFloat(nearest.km), speed: parseFloat(speed) }].slice(-30));
  };

  const isHealthy = stats.decision === 'LTE';

  return (
    <div style={{ backgroundColor: '#020617', color: '#94a3b8', minHeight: '100vh', padding: '20px', fontFamily: 'monospace' }}>
      
      <header style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '15px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: isHealthy ? '#22c55e' : '#ef4444', boxShadow: isHealthy ? '0 0 10px #22c55e' : '0 0 10px #ef4444' }}></div>
          <h1 style={{ color: '#f8fafc', margin: 0, fontSize: '18px' }}>APEX HYBRID COMMAND [v4.5.1]</h1>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setPage('dashboard')} style={navBtnStyle(page === 'dashboard')}>DASHBOARD.EXE</button>
          <button onClick={() => setPage('navigation')} style={navBtnStyle(page === 'navigation')}>NAVIGATOR.EXE</button>
        </div>
      </header>

      {/* NEW: INTERACTIVE AI ADVISOR BAR */}
      <div style={{ backgroundColor: '#0f172a', border: '1px solid #38bdf8', padding: '12px', marginBottom: '20px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ color: '#38bdf8', fontWeight: 'bold', fontSize: '12px', borderRight: '1px solid #1e293b', paddingRight: '15px' }}>COMMS_AI:</div>
          <div style={{ color: '#f8fafc', fontSize: '12px', fontStyle: 'italic' }}>"{aiMessage}"</div>
      </div>

      {page === 'dashboard' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div style={panelStyle}>
            <div style={labelStyle}>THROUGHPUT GAUGE (Mbps)</div>
            <div style={gaugeContainer}>
                <div style={gaugeArc}></div>
                <div style={needleStyle(stats.needlePos)}></div>
                <div style={{ position: 'absolute', bottom: '10px', width: '100%', textAlign: 'center', fontSize: '20px', color: '#f8fafc' }}>{stats.throughput}</div>
            </div>
          </div>

          <div style={panelStyle}>
            <div style={labelStyle}>LIVE TRACE: SPEED vs DISTANCE</div>
            <div style={{ height: '180px', marginTop: '20px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="dist" stroke="#475569" fontSize={10}>
                    <Label value="Distance (KM)" offset={-10} position="insideBottom" fill="#475569" fontSize={10} />
                  </XAxis>
                  <YAxis stroke="#475569" fontSize={10}>
                    <Label value="Mbps" angle={-90} position="insideLeft" fill="#475569" fontSize={10} />
                  </YAxis>
                  <Area type="monotone" dataKey="speed" stroke={isHealthy ? "#22c55e" : "#f59e0b"} fill={isHealthy ? "#22c55e22" : "#f59e0b22"} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ ...panelStyle, gridColumn: 'span 2' }}>
            <div style={labelStyle}>PROTOCOL STACK LOG</div>
            {logs.map((l, i) => (
              <div key={i} style={{ fontSize: '11px', padding: '5px 0', borderBottom: '1px solid #1e293b', color: '#38bdf8' }}>
                [{l.time}] {l.event}: {l.details} — {l.reason}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={mapContainerStyle} onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }}>
          <div style={gridOverlayStyle}></div>
          {towers.map(t => (
            <React.Fragment key={t.id}>
              <div style={{ position: 'absolute', left: t.x, top: t.y, width: LTE_RANGE_PX * 2, height: LTE_RANGE_PX * 2, border: '1px dashed #ef444466', borderRadius: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }}></div>
              <div style={{ position: 'absolute', left: t.x - 15, top: t.y - 30, color: '#38bdf8', textAlign: 'center' }}>
                <div style={{ fontSize: '24px' }}>📡</div>
                <div style={{ fontSize: '8px' }}>{t.name}</div>
              </div>
            </React.Fragment>
          ))}
          {stats.decision === 'UHF' && (
            <svg style={{ position: 'absolute', width: '100%', height: '100%', pointerEvents: 'none' }}>
              <line x1={pos.x} y1={pos.y} x2={stats.targetX} y2={stats.targetY} stroke="#38bdf8" strokeDasharray="8,8" strokeWidth="2" />
            </svg>
          )}
          <div style={{ position: 'absolute', left: pos.x - 15, top: pos.y - 15, transition: '0.4s ease-out' }}>
              <div style={{ padding: '5px', border: `2px solid ${isHealthy ? '#22c55e' : '#f59e0b'}`, backgroundColor: '#020617', color: isHealthy ? '#22c55e' : '#f59e0b', fontSize: '10px' }}>UE-01</div>
          </div>
          <div style={telemetryBoxStyle}>
              <div style={labelStyle}>NAVIGATOR_ASSIST</div>
              <div style={{ fontSize: '11px', marginTop: '5px' }}>MODE: {stats.decision}</div>
              <div style={{ fontSize: '11px' }}>KM_TO_NEAREST: {stats.distance}</div>
          </div>
        </div>
      )}
    </div>
  );
}

const panelStyle = { backgroundColor: '#0f172a', padding: '20px', borderRadius: '4px', border: '1px solid #1e293b' };
const labelStyle = { color: '#38bdf8', fontSize: '11px', fontWeight: 'bold', borderBottom: '1px solid #1e293b', paddingBottom: '8px', letterSpacing: '1px' };
const navBtnStyle = (active) => ({ padding: '8px 15px', backgroundColor: active ? '#1e293b' : 'transparent', color: active ? '#38bdf8' : '#64748b', border: `1px solid ${active ? '#38bdf8' : '#1e293b'}`, cursor: 'pointer' });
const mapContainerStyle = { width: '100%', height: '600px', backgroundColor: '#020617', position: 'relative', border: '1px solid #1e293b', cursor: 'crosshair', overflow: 'hidden' };
const gridOverlayStyle = { position: 'absolute', width: '100%', height: '100%', backgroundImage: 'linear-gradient(#0f172a 1px, transparent 1px), linear-gradient(90deg, #0f172a 1px, transparent 1px)', backgroundSize: '40px 40px', opacity: 0.3 };
const telemetryBoxStyle = { position: 'absolute', bottom: '20px', right: '20px', width: '220px', backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid #1e293b', padding: '10px' };
const gaugeContainer = { width: '200px', height: '100px', margin: '20px auto', position: 'relative', overflow: 'hidden' };
const gaugeArc = { width: '200px', height: '200px', border: '10px solid #1e293b', borderRadius: '50%' };
const needleStyle = (rot) => ({ width: '2px', height: '80px', backgroundColor: '#38bdf8', position: 'absolute', bottom: 0, left: '50%', transformOrigin: 'bottom center', transform: `translateX(-50%) rotate(${rot - 90}deg)`, transition: '0.2s linear' });

export default App;
