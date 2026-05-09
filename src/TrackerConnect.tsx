import { useState, useRef } from 'react';
import { supabase } from './supabase';

// ─── SUPPORTED TRACKERS ───────────────────────────────────────────────────────
export const TRACKERS = [
  {
    id: 'apple_health',
    name: 'Apple Health',
    icon: '🍎',
    description: 'Export from iPhone Health app → Share → Export All Health Data',
    dataTypes: ['steps','heart_rate','hrv','sleep','active_calories','workout','resting_hr','vo2max','weight'],
    exportInstructions: 'Health app → your avatar → Export All Health Data → save the ZIP, upload export.xml here',
    color: '#ff6b8a',
    fileTypes: ['.xml','.csv'],
  },
  {
    id: 'oura',
    name: 'Oura Ring',
    icon: '💍',
    description: 'Best HRV, deep sleep, readiness score data available',
    dataTypes: ['hrv','deep_sleep','rem_sleep','readiness','body_temp','resting_hr','spo2'],
    exportInstructions: 'Oura app → Profile → Data Export → Download CSV',
    color: '#a78bfa',
    fileTypes: ['.csv'],
  },
  {
    id: 'whoop',
    name: 'WHOOP',
    icon: '⚡',
    description: 'Recovery, strain, sleep performance data',
    dataTypes: ['recovery','strain','hrv','sleep_performance','resting_hr','active_calories'],
    exportInstructions: 'WHOOP app → Profile → Export Data → CSV',
    color: '#00e5ff',
    fileTypes: ['.csv'],
  },
  {
    id: 'garmin',
    name: 'Garmin',
    icon: '🏃',
    description: 'VO2max, training load, steps, workouts',
    dataTypes: ['steps','vo2max','training_load','heart_rate','sleep','active_calories','workout'],
    exportInstructions: 'Garmin Connect app → More → Data Management → Export Your Data',
    color: '#00d2a5',
    fileTypes: ['.csv','.fit'],
  },
  {
    id: 'fitbit',
    name: 'Fitbit / Google Fit',
    icon: '📊',
    description: 'Steps, sleep stages, heart rate zones',
    dataTypes: ['steps','heart_rate','sleep','active_calories','resting_hr'],
    exportInstructions: 'fitbit.com → Account → Data Export → Request Data',
    color: '#64d2ff',
    fileTypes: ['.csv','.json'],
  },
  {
    id: 'manual',
    name: 'Manual Log',
    icon: '✏️',
    description: 'Log workouts, sleep, and habits manually',
    dataTypes: ['workout','sleep','diet','metrics'],
    exportInstructions: 'Log entries directly in Aellux',
    color: '#ffa040',
    fileTypes: [],
  },
];

export interface TrackerEntry {
  date: string;
  source: string;
  metrics: Record<string, number | string>;
  raw?: any;
}

// ─── CSV PARSER — handles Apple Health export.xml summary + generic CSV ──────
function parseTrackerFile(content: string, source: string, fileName: string): TrackerEntry[] {
  const entries: TrackerEntry[] = [];
  const lines = content.split('\n').filter(l => l.trim());
  if (lines.length < 2) return entries;

  // Detect CSV headers
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g,'').toLowerCase());
  const dateIdx = headers.findIndex(h => h.includes('date') || h.includes('time') || h.includes('timestamp') || h === 'starttime');
  if (dateIdx === -1) return entries;

  for (let i = 1; i < Math.min(lines.length, 1000); i++) {
    const cols = lines[i].split(',').map(c => c.trim().replace(/"/g,''));
    if (cols.length < 2) continue;
    const dateStr = cols[dateIdx];
    if (!dateStr) continue;

    const metrics: Record<string, number | string> = {};
    headers.forEach((h, idx) => {
      if (idx === dateIdx) return;
      const v = cols[idx];
      if (!v || v === 'null') return;
      const num = parseFloat(v);
      metrics[h] = isNaN(num) ? v : num;
    });

    entries.push({ date: dateStr.slice(0, 10), source, metrics });
  }
  return entries;
}

// ─── MANUAL LOG FORM ─────────────────────────────────────────────────────────
function ManualLogForm({ onLog }: { onLog: (entry: TrackerEntry) => void }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0,10));
  const [workoutType, setWorkoutType] = useState('');
  const [durationMin, setDurationMin] = useState('');
  const [hrAvg, setHrAvg] = useState('');
  const [hrMax, setHrMax] = useState('');
  const [sleepHrs, setSleepHrs] = useState('');
  const [deepSleepHrs, setDeepSleepHrs] = useState('');
  const [hrvMs, setHrvMs] = useState('');
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(false);

  function submit() {
    const metrics: Record<string, number | string> = {};
    if (workoutType) metrics['workout_type'] = workoutType;
    if (durationMin) metrics['workout_duration_min'] = parseFloat(durationMin);
    if (hrAvg) metrics['heart_rate_avg'] = parseFloat(hrAvg);
    if (hrMax) metrics['heart_rate_max'] = parseFloat(hrMax);
    if (sleepHrs) metrics['sleep_hours'] = parseFloat(sleepHrs);
    if (deepSleepHrs) metrics['deep_sleep_hours'] = parseFloat(deepSleepHrs);
    if (hrvMs) metrics['hrv_ms'] = parseFloat(hrvMs);
    if (notes) metrics['notes'] = notes;
    if (Object.keys(metrics).length === 0) return;
    onLog({ date, source: 'manual', metrics });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setWorkoutType(''); setDurationMin(''); setHrAvg(''); setHrMax('');
    setSleepHrs(''); setDeepSleepHrs(''); setHrvMs(''); setNotes('');
  }

  const S: React.CSSProperties = { fontFamily: 'EB Garamond, Georgia, serif' };
  const inp: React.CSSProperties = {
    background: 'rgba(0,8,18,.8)', border: '1px solid rgba(0,175,138,.22)',
    color: 'rgba(0,220,175,.92)', fontFamily: 'EB Garamond,Georgia,serif',
    fontSize: 14, padding: '8px 12px', borderRadius: 3, outline: 'none', width: '100%',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <div style={{ fontSize: 11, color: 'rgba(0,175,142,.5)', marginBottom: 4, ...S, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Date</div>
          <input type="date" style={inp} value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'rgba(0,175,142,.5)', marginBottom: 4, ...S, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Workout Type</div>
          <select style={{ ...inp, cursor: 'pointer' }} value={workoutType} onChange={e => setWorkoutType(e.target.value)}>
            <option value="">None today</option>
            {['Zone 2 Cardio','HIIT','Strength','Yoga','Walk','Run','Swim','Cycling','Rest'].map(w => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'rgba(0,175,142,.5)', marginBottom: 4, ...S, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Duration (min)</div>
          <input type="number" style={inp} placeholder="45" value={durationMin} onChange={e => setDurationMin(e.target.value)} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'rgba(0,175,142,.5)', marginBottom: 4, ...S, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Avg HR (bpm)</div>
          <input type="number" style={inp} placeholder="135" value={hrAvg} onChange={e => setHrAvg(e.target.value)} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'rgba(0,175,142,.5)', marginBottom: 4, ...S, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Sleep Hours</div>
          <input type="number" step="0.1" style={inp} placeholder="7.5" value={sleepHrs} onChange={e => setSleepHrs(e.target.value)} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'rgba(0,175,142,.5)', marginBottom: 4, ...S, letterSpacing: '0.1em', textTransform: 'uppercase' }}>HRV (ms)</div>
          <input type="number" style={inp} placeholder="42" value={hrvMs} onChange={e => setHrvMs(e.target.value)} />
        </div>
      </div>
      <div>
        <div style={{ fontSize: 11, color: 'rgba(0,175,142,.5)', marginBottom: 4, ...S, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Notes (optional)</div>
        <input type="text" style={inp} placeholder="Felt strong, stayed in Zone 2 the whole session..." value={notes} onChange={e => setNotes(e.target.value)} />
      </div>
      <button onClick={submit} style={{
        background: saved ? 'rgba(0,165,132,.3)' : 'rgba(0,200,160,.88)',
        color: '#020810', border: 'none', fontFamily: 'EB Garamond,serif',
        fontSize: 16, padding: '10px 0', borderRadius: 3, cursor: 'pointer', fontWeight: 500,
      }}>
        {saved ? '✓ Logged' : 'Log This Entry →'}
      </button>
    </div>
  );
}

// ─── TRACKER CONNECT COMPONENT ───────────────────────────────────────────────
interface Props {
  userId?: string;
  onDataImported: (entries: TrackerEntry[], source: string) => void;
  connectedSources: string[];
}

export default function TrackerConnect({ userId, onDataImported, connectedSources }: Props) {
  const [activeTracker, setActiveTracker] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const tracker = TRACKERS.find(t => t.id === activeTracker);

  async function handleFile(file: File) {
    if (!tracker) return;
    setUploading(true);
    setStatus(`Reading ${file.name}…`);
    try {
      const text = await file.text();
      const entries = parseTrackerFile(text, tracker.id, file.name);
      if (entries.length === 0) {
        setStatus('Could not parse file. Check format and try again.');
        setUploading(false);
        return;
      }
      setStatus(`✓ Parsed ${entries.length} days of data from ${file.name}`);
      onDataImported(entries, tracker.id);
    } catch (e: any) {
      setStatus(`Error: ${e.message}`);
    }
    setUploading(false);
  }

  const S: React.CSSProperties = { fontFamily: 'EB Garamond, Georgia, serif' };

  return (
    <div>
      {/* Tracker grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10, marginBottom: 20 }}>
        {TRACKERS.map(t => {
          const connected = connectedSources.includes(t.id);
          const active = activeTracker === t.id;
          return (
            <div key={t.id}
              onClick={() => setActiveTracker(active ? null : t.id)}
              style={{
                background: active ? `rgba(${t.id === 'manual' ? '255,160,64' : '0,210,165'},.06)` : 'rgba(0,6,14,.82)',
                border: `1px solid ${active ? t.color : connected ? `${t.color}44` : 'rgba(0,165,132,.14)'}`,
                borderRadius: 6, padding: '14px 16px', cursor: 'pointer',
                transition: 'all .18s', position: 'relative',
              }}>
              {connected && (
                <div style={{ position: 'absolute', top: 8, right: 10, fontSize: 10, color: '#00d2a5', fontFamily: 'monospace', letterSpacing: '0.1em' }}>LIVE</div>
              )}
              <div style={{ fontSize: 24, marginBottom: 8 }}>{t.icon}</div>
              <div style={{ fontSize: 15, color: active ? t.color : 'rgba(0,215,172,.88)', fontWeight: 500, ...S, marginBottom: 4 }}>{t.name}</div>
              <div style={{ fontSize: 12, color: 'rgba(0,165,132,.5)', lineHeight: 1.5, ...S }}>{t.description}</div>
            </div>
          );
        })}
      </div>

      {/* Active tracker panel */}
      {tracker && (
        <div style={{ background: 'rgba(0,6,14,.82)', border: `1px solid ${tracker.color}44`, borderTop: `2px solid ${tracker.color}`, borderRadius: 6, padding: '20px 22px' }}>
          <div style={{ ...S, fontSize: 18, color: 'rgba(0,215,172,.94)', fontWeight: 500, marginBottom: 12 }}>{tracker.icon} {tracker.name}</div>

          {tracker.id === 'manual' ? (
            <ManualLogForm onLog={(entry) => onDataImported([entry], 'manual')} />
          ) : (
            <>
              <div style={{ background: 'rgba(0,40,32,.3)', borderLeft: '3px solid rgba(0,210,165,.4)', padding: '12px 14px', borderRadius: '0 4px 4px 0', marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: '#00d2a5', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6, ...S }}>Export Instructions</div>
                <div style={{ fontSize: 14, color: 'rgba(0,195,158,.8)', lineHeight: 1.6, ...S }}>{tracker.exportInstructions}</div>
              </div>

              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  style={{
                    background: tracker.color, color: '#020810', border: 'none',
                    fontFamily: 'EB Garamond,serif', fontSize: 15, fontWeight: 500,
                    padding: '10px 22px', borderRadius: 3, cursor: 'pointer', opacity: uploading ? .5 : 1,
                  }}>
                  {uploading ? 'Reading…' : `Upload ${tracker.fileTypes.join(' / ')} →`}
                </button>
                {status && <div style={{ fontSize: 13, color: status.startsWith('✓') ? '#00d2a5' : 'rgba(255,160,100,.9)', ...S }}>{status}</div>}
              </div>

              <input
                ref={fileRef} type="file"
                accept={tracker.fileTypes.join(',')}
                style={{ display: 'none' }}
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
