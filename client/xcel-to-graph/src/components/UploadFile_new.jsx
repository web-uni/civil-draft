import React, { useState, useRef, useCallback, useEffect } from 'react';
import { inspectSurvey, generateLSectionPdf, DEFAULT_META } from '../lsection/index.js';

/* ── Icons ─────────────────────────────────────────────────────── */
const IcoUpload = ({ s = 20 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>;
const IcoFile = ({ s = 20 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>;
const IcoCheck = ({ s = 20 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>;
const IcoX = ({ s = 18 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
const IcoDownload = ({ s = 18 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>;
const IcoEye = ({ s = 18 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>;
const IcoPlus = ({ s = 16 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
const IcoTrash = ({ s = 16 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" /></svg>;
const IcoChevron = ({ s = 18 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>;
const IcoDraft = ({ s = 48 }) => <svg width={s} height={s} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="4" width="32" height="40" rx="2" fill="#E8F0FE" stroke="#1A3A6B" /><line x1="14" y1="14" x2="34" y2="14" stroke="#1A3A6B" strokeWidth="1" /><line x1="14" y1="20" x2="34" y2="20" stroke="#1A3A6B" strokeWidth="1" /><line x1="14" y1="26" x2="26" y2="26" stroke="#1A3A6B" strokeWidth="1" /><polyline points="26 30 34 22 38 26 30 38 22 38 22 30 26 30" fill="#C7D9F5" stroke="#1A3A6B" strokeWidth="1.2" /></svg>;

const Spinner = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ animation: 'spin 0.9s linear infinite' }}>
    <circle cx="12" cy="12" r="9" stroke="#C8D8F0" strokeWidth="2.5" fill="none" />
    <path d="M12 3 a9 9 0 0 1 9 9" stroke="#1A3A6B" strokeWidth="2.5" fill="none" strokeLinecap="round" />
  </svg>
);

/* ── Design tokens ──────────────────────────────────────────────── */
const T = {
  bg: '#F5F1EB', bgCard: '#FDFAF6', bgInput: '#FFFFFF', bgSection: '#F0EBE3',
  border: '#D4C9B8', borderFocus: '#1A3A6B', ink: '#1C1A17', inkMid: '#4A4640',
  inkLight: '#8C7F72', accent: '#1A3A6B', accentHov: '#102856', accentLt: '#E8F0FE',
  gold: '#B5860D', goldLt: '#FEF3C7', green: '#166534', greenLt: '#DCFCE7',
  red: '#991B1B', redLt: '#FEE2E2', gridLine: 'rgba(26,58,107,0.06)', footer: '#B8AFA4',
};

const fieldBase = {
  width: '100%', padding: '9px 12px', background: T.bgInput,
  border: `1.5px solid ${T.border}`, borderRadius: 6, color: T.ink, fontSize: 13,
  outline: 'none', boxSizing: 'border-box', fontFamily: "'Lora', Georgia, serif",
  transition: 'border-color 0.18s, box-shadow 0.18s',
};

const Field = ({ label, value, onChange, placeholder = '', multiline = false, mono = false, cols = 1, hint = '' }) => (
  <div style={{ marginBottom: 14, gridColumn: cols > 1 ? `span ${cols}` : undefined }}>
    <label style={{ display: 'block', fontSize: 10, color: T.inkLight, letterSpacing: '0.12em', marginBottom: 5, fontWeight: 700, fontFamily: "'DM Mono', monospace", textTransform: 'uppercase' }}>{label}</label>
    {multiline
      ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3} style={{ ...fieldBase, resize: 'vertical', fontFamily: mono ? "'DM Mono', monospace" : 'inherit' }} />
      : <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ ...fieldBase, fontFamily: mono ? "'DM Mono', monospace" : 'inherit' }} />}
    {hint && <div style={{ fontSize: 10, color: T.inkLight, marginTop: 4, fontFamily: "'DM Mono', monospace" }}>{hint}</div>}
  </div>
);

const Select = ({ label, value, onChange, options, hint = '' }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{ display: 'block', fontSize: 10, color: T.inkLight, letterSpacing: '0.12em', marginBottom: 5, fontWeight: 700, fontFamily: "'DM Mono', monospace", textTransform: 'uppercase' }}>{label}</label>
    <select value={value} onChange={e => onChange(e.target.value)} style={{ ...fieldBase, fontFamily: "'DM Mono', monospace", cursor: 'pointer' }}>
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
    {hint && <div style={{ fontSize: 10, color: T.inkLight, marginTop: 4, fontFamily: "'DM Mono', monospace" }}>{hint}</div>}
  </div>
);

const Section = ({ icon, label, desc, open, onToggle, children }) => (
  <div style={{
    border: `1.5px solid ${open ? T.accent : T.border}`, borderRadius: 8, marginBottom: 8,
    overflow: 'hidden', background: open ? T.bgCard : T.bg, transition: 'all 0.2s',
    boxShadow: open ? '0 2px 12px rgba(26,58,107,0.08)' : 'none',
  }}>
    <button onClick={onToggle} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', color: T.ink, textAlign: 'left' }}>
      <div style={{ width: 32, height: 32, borderRadius: 6, background: open ? T.accentLt : T.bgSection, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0, border: `1px solid ${open ? '#C7D9F5' : T.border}` }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: T.ink, fontFamily: "'DM Mono', monospace", letterSpacing: '0.02em' }}>{label}</div>
        <div style={{ fontSize: 11, color: T.inkLight, marginTop: 2 }}>{desc}</div>
      </div>
      <div style={{ color: open ? T.accent : T.inkLight, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }}><IcoChevron /></div>
    </button>
    {open && (
      <div style={{ padding: '18px 16px', borderTop: `1px solid ${T.border}`, background: T.bgCard }}>{children}</div>
    )}
  </div>
);

const StepPill = ({ n, label, status }) => {
  const bg = status === 'done' ? T.green : status === 'active' ? T.accent : T.border;
  const txt = status === 'done' ? T.green : status === 'active' ? T.accent : T.inkLight;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 800, flexShrink: 0, transition: 'all 0.3s', boxShadow: status === 'active' ? `0 0 0 4px ${T.accentLt}` : 'none' }}>
        {status === 'done' ? <IcoCheck s={13} /> : n}
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color: txt, fontFamily: "'DM Mono', monospace", letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{label}</span>
    </div>
  );
};

/** A single logo slot: pick an image, see it, clear it. */
const LogoSlot = ({ label, file, onPick, onClear }) => {
  const ref = useRef(null);
  const [preview, setPreview] = useState(null);
  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 10, color: T.inkLight, letterSpacing: '0.12em', marginBottom: 5, fontWeight: 700, fontFamily: "'DM Mono', monospace", textTransform: 'uppercase' }}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, border: `1.5px solid ${T.border}`, borderRadius: 6, padding: 8, background: T.bgInput }}>
        <div style={{ width: 56, height: 40, border: `1px dashed ${T.border}`, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0, background: T.bg }}>
          {preview
            ? <img src={preview} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            : <span style={{ color: T.inkLight }}><IcoPlus s={14} /></span>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, color: file ? T.ink : T.inkLight, fontFamily: "'DM Mono', monospace", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {file ? file.name : 'PNG or JPEG'}
          </div>
        </div>
        <button onClick={() => ref.current?.click()} style={{ padding: '6px 12px', background: T.bg, border: `1.5px solid ${T.border}`, borderRadius: 6, color: T.inkMid, cursor: 'pointer', fontSize: 11 }}>
          {file ? 'Replace' : 'Choose'}
        </button>
        {file && (
          <button className="del-btn" onClick={onClear} style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 6, color: T.inkLight, cursor: 'pointer', padding: 6, display: 'flex' }}><IcoTrash s={13} /></button>
        )}
      </div>
      <input ref={ref} type="file" accept="image/png,image/jpeg" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = ''; }} />
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════ */
export default function UploadFile_new() {
  const [file, setFile] = useState(null);
  const [buffer, setBuffer] = useState(null);
  const [inspection, setInspection] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [stage, setStage] = useState('idle');
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfName, setPdfName] = useState('');
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [openSec, setOpenSec] = useState('drawing');
  const inputRef = useRef(null);

  // Title block fields
  const [notes, setNotes] = useState(DEFAULT_META.notes);
  const [drawnBy, setDrawnBy] = useState('');
  const [designedBy, setDesignedBy] = useState('');
  const [checkedBy, setCheckedBy] = useState('');
  const [clientName, setClientName] = useState('');
  const [contractorName, setContractorName] = useState('');
  const [contractorAddr, setContractorAddr] = useState('');
  const [consultantName, setConsultantName] = useState('');
  const [consultantAddr, setConsultantAddr] = useState('');
  const [projectText, setProjectText] = useState('');
  const [title, setTitle] = useState('');
  const [sheetSize, setSheetSize] = useState('A1');
  const [scale, setScale] = useState('1:1350');
  const [date, setDate] = useState('');
  const [chainagePrefix, setChainagePrefix] = useState('DSBC');
  const [pointsPerSheet, setPointsPerSheet] = useState('45');
  const [datumMode, setDatumMode] = useState('perSheet');
  const [logos, setLogos] = useState({ client: null, contractor: null, consultant: null });

  const meta = {
    notes: notes.filter(n => n.trim()),
    drawn_by: drawnBy, designed_by: designedBy, checked_by: checkedBy,
    client_name: clientName,
    contractor_name: contractorName, contractor_address: contractorAddr,
    consultant_name: consultantName, consultant_address: consultantAddr,
    project_text: projectText, title, sheet_size: sheetSize, scale, date,
    chainage_prefix: chainagePrefix || 'CH',
    points_per_sheet: Number(pointsPerSheet) || 45,
    datum_mode: datumMode,
  };

  // Re-inspect whenever a setting that changes the sheet count or scale changes.
  useEffect(() => {
    if (!buffer) { setInspection(null); return; }
    try {
      setInspection(inspectSurvey(buffer, meta));
    } catch (e) {
      setInspection({ ok: false, errors: [e.message], warnings: [] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buffer, sheetSize, pointsPerSheet, datumMode]);

  const validate = f => {
    if (!f) return 'No file selected.';
    const ext = f.name.split('.').pop().toLowerCase();
    if (!['csv', 'xls', 'xlsx'].includes(ext)) return `".${ext}" is not supported. Upload a CSV or Excel file.`;
    if (f.size > 25 * 1024 * 1024) return 'That file is over 25 MB. Trim unused sheets and try again.';
    return null;
  };

  const acceptFile = async f => {
    const e = validate(f);
    if (e) { setError(e); return; }
    setError('');
    setFile(f);
    setStage('idle');
    setBuffer(await f.arrayBuffer());
  };

  const onDrop = useCallback(e => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) acceptFile(f);
  }, []);

  const handleGenerate = async () => {
    if (!buffer) return;
    setStage('rendering');
    setProgress({ done: 0, total: inspection?.sheetCount || 0 });
    setPdfUrl(null); setError(''); setWarnings([]);

    try {
      const logoBuffers = {};
      for (const [slot, f] of Object.entries(logos)) {
        if (f) logoBuffers[slot] = await f.arrayBuffer();
      }
      const res = await generateLSectionPdf(buffer, meta, logoBuffers,
        (done, total) => setProgress({ done, total }));

      if (!res.ok) {
        setError(res.errors.join(' '));
        setWarnings(res.warnings);
        setStage('error');
        return;
      }
      const blob = new Blob([res.bytes], { type: 'application/pdf' });
      setPdfUrl(URL.createObjectURL(blob));
      setPdfName(`${(title || 'canal_l_section').replace(/[^\w-]+/g, '_').toLowerCase()}.pdf`);
      setWarnings(res.warnings);
      setStage('done');
    } catch (err) {
      console.error(err);
      setError(`The drawing could not be generated: ${err.message}`);
      setStage('error');
    }
  };

  const reset = () => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setFile(null); setBuffer(null); setInspection(null); setStage('idle');
    setPdfUrl(null); setError(''); setWarnings([]); setShowPreview(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const fmtBytes = b => b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${(b / 1e3).toFixed(0)} KB`;
  const updateNote = (i, v) => setNotes(n => n.map((x, j) => j === i ? v : x));
  const addNote = () => setNotes(n => [...n, '']);
  const removeNote = i => setNotes(n => n.filter((_, j) => j !== i));
  const tog = id => setOpenSec(s => s === id ? null : id);

  const card = {
    background: T.bgCard, border: `1.5px solid ${T.border}`, borderRadius: 12,
    boxShadow: '0 4px 24px rgba(26,58,107,0.07), 0 1px 4px rgba(0,0,0,0.04)',
  };

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;600;700&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:${T.bg}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        .fade-up{animation:fadeUp 0.4s ease both}
        input:focus,textarea:focus,select:focus{border-color:${T.borderFocus} !important;box-shadow:0 0 0 3px ${T.accentLt} !important;outline:none}
        input::placeholder,textarea::placeholder{color:#B8AFA4}
        ::-webkit-scrollbar{width:6px}
        ::-webkit-scrollbar-thumb{background:${T.border};border-radius:3px}
        button{font-family:"DM Mono",monospace}
        .btn-primary{transition:all 0.18s}
        .btn-primary:hover:not(:disabled){background:${T.accentHov} !important;transform:translateY(-1px)}
        .btn-ghost:hover{background:${T.bgSection} !important;border-color:${T.accent} !important;color:${T.accent} !important}
        .add-btn:hover{border-color:${T.accent} !important;color:${T.accent} !important;background:${T.accentLt} !important}
        .del-btn:hover{color:${T.red} !important;background:${T.redLt} !important}
        @media (prefers-reduced-motion: reduce){*{animation:none !important;transition:none !important}}
      `}</style>

      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, backgroundImage: `linear-gradient(${T.gridLine} 1px, transparent 1px), linear-gradient(90deg, ${T.gridLine} 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />

      <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', fontFamily: "'Lora', Georgia, serif", color: T.ink, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 16px 100px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 44 }} className="fade-up">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', marginBottom: 20 }}>
            <div style={{ height: 1, width: 60, background: `linear-gradient(to right, transparent, ${T.border})` }} />
            <div style={{ border: `1.5px solid ${T.accent}`, borderRadius: 4, padding: '3px 14px', fontSize: 10, color: T.accent, letterSpacing: '0.18em', fontFamily: "'DM Mono', monospace", background: T.accentLt }}>CIVIL DRAFT TOOL</div>
            <div style={{ height: 1, width: 60, background: `linear-gradient(to left, transparent, ${T.border})` }} />
          </div>
          <h1 style={{ fontSize: 'clamp(24px,4vw,38px)', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 10, lineHeight: 1.2 }}>
            Canal L-Section<br /><span style={{ color: T.accent }}>Drawing Generator</span>
          </h1>
          <p style={{ fontSize: 14, color: T.inkMid, maxWidth: 430, lineHeight: 1.8, margin: '0 auto' }}>
            Upload survey levels, fill in the title block, get a vector A1 drawing set. Everything runs in your browser — the file never leaves this device.
          </p>
        </div>

        {/* Steps */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 36, background: T.bgCard, border: `1.5px solid ${T.border}`, borderRadius: 40, padding: '10px 24px' }} className="fade-up">
          {[['Upload levels', 1], ['Title block', 2], ['Generate', 3]].map(([lbl, n], i) => (
            <React.Fragment key={i}>
              <StepPill n={n} label={lbl} status={
                (n === 1 && ['form', 'rendering', 'done'].includes(stage)) ? 'done'
                  : (n === 2 && ['rendering', 'done'].includes(stage)) ? 'done'
                    : (n === 3 && stage === 'done') ? 'done'
                      : (n === 1 && ['idle', 'error'].includes(stage)) ? 'active'
                        : (n === 2 && stage === 'form') ? 'active'
                          : (n === 3 && stage === 'rendering') ? 'active' : 'idle'
              } />
              {i < 2 && <div style={{ width: 40, height: 1.5, background: T.border, margin: '0 12px' }} />}
            </React.Fragment>
          ))}
        </div>

        {/* ════════ UPLOAD ════════ */}
        {['idle', 'error'].includes(stage) && (
          <div style={{ width: '100%', maxWidth: 520 }} className="fade-up">
            <div style={{ ...card, padding: 28 }}>
              <div
                onDrop={onDrop}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onClick={() => !file && inputRef.current?.click()}
                style={{ border: `2px dashed ${dragging ? T.accent : T.border}`, borderRadius: 10, padding: '36px 24px', textAlign: 'center', cursor: 'pointer', background: dragging ? T.accentLt : '#FDFAF6', transition: 'all 0.22s', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.04, pointerEvents: 'none' }}><IcoDraft s={160} /></div>
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 12, background: T.accentLt, border: '1.5px solid #C7D9F5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.accent, margin: '0 auto 14px' }}><IcoUpload s={26} /></div>
                  <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{dragging ? 'Release to upload' : 'Drop your survey levels here'}</div>
                  <div style={{ fontSize: 12, color: T.inkLight, fontFamily: "'DM Mono', monospace" }}>
                    or <span style={{ color: T.accent, textDecoration: 'underline' }} onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}>browse files</span> — CSV · XLS · XLSX
                  </div>
                </div>
              </div>
              <input ref={inputRef} type="file" accept=".csv,.xls,.xlsx" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) acceptFile(f); }} />

              {file && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: T.accentLt, border: '1px solid #C7D9F5', borderRadius: 8, padding: '10px 14px', marginTop: 14 }}>
                  <span style={{ color: T.accent }}><IcoFile s={18} /></span>
                  <span style={{ flex: 1, fontSize: 13, color: T.accent, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'DM Mono', monospace" }}>{file.name}</span>
                  <span style={{ fontSize: 11, color: T.inkLight, fontFamily: "'DM Mono', monospace" }}>{fmtBytes(file.size)}</span>
                  <button className="del-btn" onClick={reset} style={{ background: 'none', border: 'none', color: T.inkLight, cursor: 'pointer', padding: 4, borderRadius: 4, display: 'flex' }}><IcoX s={16} /></button>
                </div>
              )}

              {inspection?.ok && <Readout inspection={inspection} />}

              {(error || inspection?.errors?.length > 0) && (
                <div style={{ marginTop: 12, background: T.redLt, border: '1px solid #FCA5A5', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: T.red, fontFamily: "'DM Mono', monospace", lineHeight: 1.6 }}>
                  {error || inspection.errors.join(' ')}
                </div>
              )}

              <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
                {file && <button className="btn-ghost" onClick={reset} style={{ padding: '12px 18px', background: T.bg, border: `1.5px solid ${T.border}`, borderRadius: 8, color: T.inkMid, cursor: 'pointer', fontSize: 12, letterSpacing: '0.06em' }}>CLEAR</button>}
                <button className="btn-primary" onClick={() => { setStage('form'); setOpenSec('drawing'); }}
                  disabled={!inspection?.ok}
                  style={{ flex: 1, padding: '13px 0', background: !inspection?.ok ? T.border : T.accent, color: !inspection?.ok ? T.inkLight : '#fff', border: 'none', borderRadius: 8, fontSize: 13, letterSpacing: '0.07em', cursor: !inspection?.ok ? 'not-allowed' : 'pointer' }}>
                  NEXT — TITLE BLOCK →
                </button>
              </div>
            </div>
            <div style={{ textAlign: 'center', marginTop: 16, fontSize: 11, color: T.inkLight, fontFamily: "'DM Mono', monospace" }}>
              Required columns: CH · GL · CBL · FSL · TBL
            </div>
          </div>
        )}

        {/* ════════ FORM ════════ */}
        {stage === 'form' && (
          <div style={{ width: '100%', maxWidth: 680 }} className="fade-up">
            {inspection?.ok && <div style={{ marginBottom: 14 }}><Readout inspection={inspection} compact /></div>}

            <div style={{ ...card, padding: '24px 22px 22px', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>Title block</div>
                  <div style={{ fontSize: 12, color: T.inkLight, marginTop: 3, fontFamily: "'DM Mono', monospace" }}>
                    Blank fields are left off the drawing
                  </div>
                </div>
                <div style={{ background: T.goldLt, border: '1px solid #FCD34D', borderRadius: 6, padding: '4px 10px', fontSize: 10, color: T.gold, fontWeight: 700, fontFamily: "'DM Mono', monospace", letterSpacing: '0.1em' }}>OPTIONAL</div>
              </div>

              <Section icon="📐" label="DRAWING SETUP" desc="Title, sheet size, scale, sheet division" open={openSec === 'drawing'} onToggle={() => tog('drawing')}>
                <Field label="Drawing Title" value={title} onChange={setTitle} placeholder="L-SECTION OF DUDHAI SUB BRANCH CANAL" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 18px' }}>
                  <Select label="Sheet Size" value={sheetSize} onChange={setSheetSize} options={[['A0', 'A0 — 1189 × 841'], ['A1', 'A1 — 841 × 594'], ['A2', 'A2 — 594 × 420'], ['A3', 'A3 — 420 × 297']]} />
                  <Field label="Horizontal Scale" value={scale} onChange={setScale} placeholder="1:1350" mono hint="Printed as given. The vertical scale is measured and printed alongside it." />
                  <Field label="Date" value={date} onChange={setDate} placeholder="18-10-2024" />
                  <Field label="Chainage Label" value={chainagePrefix} onChange={setChainagePrefix} placeholder="DSBC" mono hint="Used in the table row and the profile caption." />
                  <Field label="Points Per Sheet" value={pointsPerSheet} onChange={setPointsPerSheet} placeholder="45" mono hint="Columns of survey data on each sheet." />
                  <Select label="Level Datum" value={datumMode} onChange={setDatumMode}
                    options={[['perSheet', 'Per sheet (fills the paper)'], ['global', 'Same on every sheet']]}
                    hint="The vertical scale stays fixed either way." />
                </div>
              </Section>

              <Section icon="📋" label="NOTES" desc="Printed in the NOTE block" open={openSec === 'notes'} onToggle={() => tog('notes')}>
                {notes.map((n, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                    <div style={{ fontSize: 11, color: T.inkLight, fontFamily: "'DM Mono', monospace", minWidth: 20 }}>{i + 1}.</div>
                    <input value={n} onChange={e => updateNote(i, e.target.value)} placeholder="Enter note" style={{ ...fieldBase, flex: 1 }} />
                    <button className="del-btn" onClick={() => removeNote(i)} style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 6, color: T.inkLight, cursor: 'pointer', padding: 8, display: 'flex' }}><IcoTrash s={14} /></button>
                  </div>
                ))}
                <button className="add-btn" onClick={addNote} style={{ display: 'flex', alignItems: 'center', gap: 6, background: T.bg, border: `1.5px dashed ${T.border}`, borderRadius: 6, color: T.inkLight, padding: '7px 14px', cursor: 'pointer', fontSize: 11, marginTop: 6, fontFamily: "'DM Mono', monospace" }}><IcoPlus s={13} /> ADD NOTE</button>
              </Section>

              <Section icon="🏢" label="CLIENT & CONTRACTOR" desc="Names and contractor address" open={openSec === 'parties'} onToggle={() => tog('parties')}>
                <Field label="Client Name" value={clientName} onChange={setClientName} placeholder="Sardar Sarovar Narmada Nigam Limited, Gujarat" multiline />
                <Field label="Contractor Name" value={contractorName} onChange={setContractorName} placeholder="Contractor Pvt. Ltd." />
                <Field label="Contractor Address" value={contractorAddr} onChange={setContractorAddr} placeholder={'Building, Street\nCity, State PIN'} multiline />
              </Section>

              <Section icon="✏️" label="CONSULTANT" desc="Consulting firm name and address" open={openSec === 'consultant'} onToggle={() => tog('consultant')}>
                <Field label="Consultant Name" value={consultantName} onChange={setConsultantName} placeholder="Hindustan Consulting Associates Pvt. Ltd." />
                <Field label="Consultant Address" value={consultantAddr} onChange={setConsultantAddr} placeholder={'405, 4th Floor, Surya Kiran Building\n19 KG Marg, New Delhi 110001'} multiline />
              </Section>

              <Section icon="🖼" label="LOGOS" desc="Client, contractor and consultant marks" open={openSec === 'logos'} onToggle={() => tog('logos')}>
                <LogoSlot label="Client Logo" file={logos.client} onPick={f => setLogos(l => ({ ...l, client: f }))} onClear={() => setLogos(l => ({ ...l, client: null }))} />
                <LogoSlot label="Contractor Logo" file={logos.contractor} onPick={f => setLogos(l => ({ ...l, contractor: f }))} onClear={() => setLogos(l => ({ ...l, contractor: null }))} />
                <LogoSlot label="Consultant Logo" file={logos.consultant} onPick={f => setLogos(l => ({ ...l, consultant: f }))} onClear={() => setLogos(l => ({ ...l, consultant: null }))} />
              </Section>

              <Section icon="🗂" label="PROJECT" desc="Full project description" open={openSec === 'project'} onToggle={() => tog('project')}>
                <Field label="Project Description" value={projectText} onChange={setProjectText} placeholder="EPC contract for construction of…" multiline />
              </Section>

              <Section icon="👤" label="STAFF" desc="Drawn by / Designed by / Checked by" open={openSec === 'staff'} onToggle={() => tog('staff')}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 18px' }}>
                  <Field label="Drawn By" value={drawnBy} onChange={setDrawnBy} placeholder="SP" />
                  <Field label="Designed By" value={designedBy} onChange={setDesignedBy} placeholder="AS" />
                  <Field label="Checked By" value={checkedBy} onChange={setCheckedBy} placeholder="PNR" />
                </div>
                <div style={{ fontSize: 11, color: T.inkLight, fontFamily: "'DM Mono', monospace", lineHeight: 1.7, marginTop: 4 }}>
                  The drawing number and revision table are printed as blank ruled cells, to be completed on issue.
                </div>
              </Section>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn-ghost" onClick={() => setStage('idle')} style={{ padding: '13px 22px', background: T.bgCard, border: `1.5px solid ${T.border}`, borderRadius: 8, color: T.inkMid, cursor: 'pointer', fontSize: 12, letterSpacing: '0.06em', flexShrink: 0 }}>← BACK</button>
              <button className="btn-primary" onClick={handleGenerate} style={{ flex: 1, padding: '13px 0', background: T.accent, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, letterSpacing: '0.07em', cursor: 'pointer' }}>
                GENERATE {inspection?.sheetCount || ''} SHEETS →
              </button>
            </div>
          </div>
        )}

        {/* ════════ RENDERING ════════ */}
        {stage === 'rendering' && (
          <div style={{ width: '100%', maxWidth: 480, textAlign: 'center' }} className="fade-up">
            <div style={{ ...card, padding: '52px 32px' }}>
              <Spinner size={52} />
              <div style={{ marginTop: 22, fontSize: 18, fontWeight: 700 }}>Drawing sheets</div>
              <div style={{ marginTop: 6, fontSize: 12, color: T.inkLight, fontFamily: "'DM Mono', monospace" }}>
                Sheet {progress.done} of {progress.total}
              </div>
              <div style={{ marginTop: 24, height: 5, background: T.bgSection, borderRadius: 3, overflow: 'hidden', border: `1px solid ${T.border}` }}>
                <div style={{ height: '100%', borderRadius: 3, background: `linear-gradient(90deg, ${T.accent}, #2E5BB8)`, width: `${pct}%`, transition: 'width 0.2s ease' }} />
              </div>
            </div>
          </div>
        )}

        {/* ════════ DONE ════════ */}
        {stage === 'done' && pdfUrl && (
          <div style={{ width: '100%', maxWidth: 560 }} className="fade-up">
            <div style={{ ...card, border: '1.5px solid #86EFAC', background: '#F0FDF4', padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: T.greenLt, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.green, flexShrink: 0, border: '1.5px solid #86EFAC' }}><IcoCheck s={18} /></div>
                <div>
                  <div style={{ fontWeight: 700, color: T.green, fontSize: 15 }}>{progress.total} sheets ready</div>
                  <div style={{ fontSize: 11, color: T.green, opacity: 0.85, marginTop: 2, fontFamily: "'DM Mono', monospace" }}>{pdfName}</div>
                </div>
              </div>

              {warnings.length > 0 && (
                <div style={{ background: T.goldLt, border: '1px solid #FCD34D', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 11, color: '#7C5E06', fontFamily: "'DM Mono', monospace", lineHeight: 1.7 }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>CHECK BEFORE ISSUE</div>
                  {warnings.map((w, i) => <div key={i}>· {w}</div>)}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                <a href={pdfUrl} download={pdfName} style={{ flex: 1, textDecoration: 'none' }}>
                  <button style={{ width: '100%', padding: '11px 0', background: T.green, color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, letterSpacing: '0.07em', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <IcoDownload s={15} /> DOWNLOAD PDF
                  </button>
                </a>
                <button onClick={() => setShowPreview(v => !v)} style={{ flex: 1, padding: '11px 0', background: T.bgCard, color: T.inkMid, border: '1.5px solid #86EFAC', borderRadius: 7, fontSize: 12, letterSpacing: '0.07em', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <IcoEye s={15} /> {showPreview ? 'HIDE' : 'PREVIEW'}
                </button>
              </div>

              {showPreview && (
                <div style={{ borderRadius: 8, overflow: 'hidden', border: '1.5px solid #86EFAC', height: 520, marginBottom: 12 }}>
                  <iframe src={pdfUrl} title="Drawing preview" width="100%" height="100%" style={{ border: 'none', display: 'block' }} />
                </div>
              )}

              <button onClick={reset} style={{ width: '100%', padding: '9px 0', background: 'none', border: '1.5px solid #86EFAC', borderRadius: 7, color: T.green, fontSize: 12, cursor: 'pointer', letterSpacing: '0.06em' }}>↺ START ANOTHER DRAWING</button>
            </div>
          </div>
        )}

        <div style={{ marginTop: 60, textAlign: 'center', fontSize: 11, color: T.footer, fontFamily: "'DM Mono', monospace", letterSpacing: '0.08em' }}>
          Engineered for engineers
        </div>
      </div>
    </>
  );
}

/** What the file actually contains — shown before anything is generated. */
function Readout({ inspection, compact = false }) {
  const rows = [
    ['Survey points', inspection.rows.length.toLocaleString()],
    ['Chainage', `${inspection.span.fromLabel} to ${inspection.span.toLabel}`],
    ['Sheets', inspection.sheetCount],
    ['Vertical scale', `1:${inspection.scale.vScale}`],
  ];
  return (
    <div style={{ marginTop: compact ? 0 : 14, background: T.bgSection, border: `1.5px solid ${T.border}`, borderRadius: 8, padding: '12px 14px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 10 }}>
        {rows.map(([k, v]) => (
          <div key={k}>
            <div style={{ fontSize: 9, color: T.inkLight, letterSpacing: '0.12em', fontFamily: "'DM Mono', monospace", textTransform: 'uppercase' }}>{k}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.accent, fontFamily: "'DM Mono', monospace", marginTop: 2 }}>{v}</div>
          </div>
        ))}
      </div>
      {inspection.warnings?.length > 0 && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.border}`, fontSize: 11, color: '#7C5E06', fontFamily: "'DM Mono', monospace", lineHeight: 1.7 }}>
          {inspection.warnings.map((w, i) => <div key={i}>· {w}</div>)}
        </div>
      )}
    </div>
  );
}
