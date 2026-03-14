import React, { useState, useRef, useCallback } from 'react';
import axios from 'axios';

/* ── Icons ─────────────────────────────────────────────────────── */
const Ico = ({ d, size = 20, fill = 'none', sw = '1.8' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}
        stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
        <path d={d} />
    </svg>
);
const IcoUpload = ({ s = 20 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>;
const IcoFile = ({ s = 20 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>;
const IcoCheck = ({ s = 20 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>;
const IcoX = ({ s = 18 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
const IcoDownload = ({ s = 18 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>;
const IcoEye = ({ s = 18 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>;
const IcoPlus = ({ s = 16 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
const IcoTrash = ({ s = 16 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" /></svg>;
const IcoChevron = ({ s = 18, up = false }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points={up ? "18 15 12 9 6 15" : "6 9 12 15 18 9"} /></svg>;
const IcoDraft = ({ s = 48 }) => <svg width={s} height={s} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="4" width="32" height="40" rx="2" fill="#E8F0FE" stroke="#1A3A6B" /><line x1="14" y1="14" x2="34" y2="14" stroke="#1A3A6B" strokeWidth="1" /><line x1="14" y1="20" x2="34" y2="20" stroke="#1A3A6B" strokeWidth="1" /><line x1="14" y1="26" x2="26" y2="26" stroke="#1A3A6B" strokeWidth="1" /><polyline points="26 30 34 22 38 26 30 38 22 38 22 30 26 30" fill="#C7D9F5" stroke="#1A3A6B" strokeWidth="1.2" /></svg>;

const Spinner = ({ size = 32 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ animation: 'spin 0.9s linear infinite' }}>
        <circle cx="12" cy="12" r="9" stroke="#C8D8F0" strokeWidth="2.5" fill="none" />
        <path d="M12 3 a9 9 0 0 1 9 9" stroke="#1A3A6B" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </svg>
);

/* ── Design tokens ──────────────────────────────────────────────── */
const T = {
    bg: '#F5F1EB',      // warm parchment
    bgCard: '#FDFAF6',      // lighter card
    bgInput: '#FFFFFF',
    bgSection: '#F0EBE3',      // slightly warm tint
    border: '#D4C9B8',      // warm stone
    borderFocus: '#1A3A6B',
    ink: '#1C1A17',      // near-black warm
    inkMid: '#4A4640',
    inkLight: '#8C7F72',
    accent: '#1A3A6B',      // deep blueprint blue
    accentHov: '#102856',
    accentLt: '#E8F0FE',      // light blue tint
    gold: '#B5860D',      // engineering gold
    goldLt: '#FEF3C7',
    green: '#166534',
    greenLt: '#DCFCE7',
    red: '#991B1B',
    redLt: '#FEE2E2',
    gridLine: 'rgba(26,58,107,0.06)',
    footer: '#B8AFA4',
};

/* ── Field component ───────────────────────────────────────────── */
const Field = ({ label, value, onChange, placeholder = '', multiline = false, mono = false, cols = 1 }) => (
    <div style={{ marginBottom: 14, gridColumn: cols > 1 ? `span ${cols}` : undefined }}>
        <label style={{
            display: 'block', fontSize: 10, color: T.inkLight,
            letterSpacing: '0.12em', marginBottom: 5, fontWeight: 700,
            fontFamily: "'DM Mono', monospace", textTransform: 'uppercase',
        }}>{label}</label>
        {multiline
            ? <textarea value={value} onChange={e => onChange(e.target.value)}
                placeholder={placeholder} rows={3}
                style={{ ...fieldBase, resize: 'vertical', fontFamily: mono ? "'DM Mono', monospace" : 'inherit' }} />
            : <input value={value} onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                style={{ ...fieldBase, fontFamily: mono ? "'DM Mono', monospace" : 'inherit' }} />
        }
    </div>
);

const fieldBase = {
    width: '100%', padding: '9px 12px',
    background: T.bgInput, border: `1.5px solid ${T.border}`,
    borderRadius: 6, color: T.ink, fontSize: 13,
    outline: 'none', boxSizing: 'border-box',
    fontFamily: "'Lora', Georgia, serif",
    transition: 'border-color 0.18s, box-shadow 0.18s',
};

/* ── Collapsible section ────────────────────────────────────────── */
const Section = ({ icon, label, desc, open, onToggle, children, accent = false }) => (
    <div style={{
        border: `1.5px solid ${open ? T.accent : T.border}`,
        borderRadius: 8, marginBottom: 8, overflow: 'hidden',
        background: open ? T.bgCard : T.bg,
        transition: 'all 0.2s',
        boxShadow: open ? '0 2px 12px rgba(26,58,107,0.08)' : 'none',
    }}>
        <button onClick={onToggle} style={{
            width: '100%', display: 'flex', alignItems: 'center',
            gap: 12, padding: '12px 16px',
            background: 'none', border: 'none', cursor: 'pointer',
            color: T.ink, textAlign: 'left',
        }}>
            <div style={{
                width: 32, height: 32, borderRadius: 6,
                background: open ? T.accentLt : T.bgSection,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, flexShrink: 0,
                border: `1px solid ${open ? '#C7D9F5' : T.border}`,
                transition: 'all 0.2s',
            }}>{icon}</div>
            <div style={{ flex: 1 }}>
                <div style={{
                    fontWeight: 700, fontSize: 13, color: T.ink,
                    fontFamily: "'DM Mono', monospace",
                    letterSpacing: '0.02em',
                }}>{label}</div>
                <div style={{ fontSize: 11, color: T.inkLight, marginTop: 2 }}>{desc}</div>
            </div>
            <div style={{
                color: open ? T.accent : T.inkLight,
                transition: 'transform 0.2s, color 0.2s',
                transform: open ? 'rotate(180deg)' : 'none',
            }}>
                <IcoChevron />
            </div>
        </button>
        {open && (
            <div style={{
                padding: '4px 16px 18px',
                borderTop: `1px solid ${T.border}`,
                background: T.bgCard,
            }}>
                <div style={{ height: 14 }} />
                {children}
            </div>
        )}
    </div>
);

/* ── Step pill ──────────────────────────────────────────────────── */
const StepPill = ({ n, label, status }) => {
    const bg = status === 'done' ? T.green : status === 'active' ? T.accent : T.border;
    const txtBg = status === 'done' ? T.greenLt : status === 'active' ? T.accentLt : '#F0EBE3';
    const txt = status === 'done' ? T.green : status === 'active' ? T.accent : T.inkLight;
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
                width: 28, height: 28, borderRadius: '50%', background: bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 11, fontWeight: 800, flexShrink: 0,
                transition: 'all 0.3s',
                boxShadow: status === 'active' ? `0 0 0 4px ${T.accentLt}` : 'none',
            }}>
                {status === 'done' ? <IcoCheck s={13} /> : n}
            </div>
            <span style={{
                fontSize: 12, fontWeight: 600, color: txt,
                fontFamily: "'DM Mono', monospace", letterSpacing: '0.04em',
                whiteSpace: 'nowrap',
            }}>{label}</span>
        </div>
    );
};

/* ══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════ */
export default function UploadFile() {
    const [file, setFile] = useState(null);
    const [dragging, setDragging] = useState(false);
    const [stage, setStage] = useState('idle');
    const [progress, setProgress] = useState(0);
    const [pdfUrl, setPdfUrl] = useState(null);
    const [pdfName, setPdfName] = useState('');
    const [error, setError] = useState('');
    const [showPreview, setShowPreview] = useState(false);
    const [openSec, setOpenSec] = useState('drawing');
    const inputRef = useRef(null);

    const [notes, setNotes] = useState(['ALL DIMENSION AND LEVELS ARE IN METRE.', 'PARAMETERS MAY CHANGE AS PER ACTUAL SITE CONDITION.']);
    const [drawnBy, setDrawnBy] = useState('');
    const [designedBy, setDesignedBy] = useState('');
    const [checkedBy, setCheckedBy] = useState('');
    const [revisions, setRevisions] = useState([]);
    const [clientName, setClientName] = useState('');
    const [contractorName, setContractorName] = useState('');
    const [contractorAddr, setContractorAddr] = useState('');
    const [consultantName, setConsultantName] = useState('');
    const [consultantAddr, setConsultantAddr] = useState('');
    const [projectText, setProjectText] = useState('');
    const [title, setTitle] = useState('');
    const [sheetSize, setSheetSize] = useState('A1');
    const [dwgNo, setDwgNo] = useState('');
    const [scale, setScale] = useState('1:1350');
    const [date, setDate] = useState('');

    const validate = f => {
        if (!f) return 'No file selected.';
        const ext = f.name.split('.').pop().toLowerCase();
        if (!['csv', 'xls', 'xlsx'].includes(ext)) return `".${ext}" not supported. Use CSV or Excel.`;
        if (f.size > 20 * 1024 * 1024) return 'File too large (max 20 MB).';
        return null;
    };
    const acceptFile = f => { const e = validate(f); if (e) { setError(e); return; } setError(''); setFile(f); setStage('idle'); };
    const onDrop = useCallback(e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) acceptFile(f); }, []);

    const handleGenerate = () => { setStage('form'); setOpenSec('drawing'); };

    const handleSubmit = async () => {
        if (!file) return;
        setStage('uploading'); setProgress(0); setPdfUrl(null); setError('');
        const drawingInfo = {
            notes: notes.filter(n => n.trim()),
            drawn_by: drawnBy, designed_by: designedBy, checked_by: checkedBy,
            revisions, client_name: clientName,
            contractor_name: contractorName, contractor_address: contractorAddr,
            consultant_name: consultantName, consultant_address: consultantAddr,
            project_text: projectText, title, sheet_size: sheetSize,
            dwg_no: dwgNo, scale, date,
        };
        const formData = new FormData();
        formData.append('file', file);
        formData.append('drawing_info', JSON.stringify(drawingInfo));
        const fakeTimer = setInterval(() => setProgress(p => p < 85 ? p + Math.random() * 3.5 : p), 700);
        try {
            const res = await axios.post('https://civil-draft.onrender.com/api/upload', formData, {
                responseType: 'blob',
                onUploadProgress: e => setProgress(Math.round((e.loaded / e.total) * 20)),
            });
            clearInterval(fakeTimer); setProgress(100);
            const blob = new Blob([res.data], { type: 'application/pdf' });
            setPdfUrl(URL.createObjectURL(blob));
            setPdfName(`canal_report_${file.name.replace(/\.[^.]+$/, '')}.pdf`);
            setStage('done');
        } catch (err) {
            clearInterval(fakeTimer); setProgress(0); setStage('error');
            let msg = 'Generation failed. Check the server and try again.';
            try { const t = await err.response.data.text(); msg = JSON.parse(t).error || msg; } catch (_) { }
            setError(msg);
        }
    };

    const reset = () => { setFile(null); setStage('idle'); setPdfUrl(null); setError(''); setProgress(0); setShowPreview(false); if (inputRef.current) inputRef.current.value = ''; };
    const fmtBytes = b => b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${(b / 1e3).toFixed(0)} KB`;

    const addRev = () => setRevisions(r => [...r, { rev: '', date: '', description: '', remarks: '' }]);
    const updateRev = (i, k, v) => setRevisions(r => r.map((x, j) => j === i ? { ...x, [k]: v } : x));
    const removeRev = i => setRevisions(r => r.filter((_, j) => j !== i));
    const updateNote = (i, v) => setNotes(n => n.map((x, j) => j === i ? v : x));
    const addNote = () => setNotes(n => [...n, '']);
    const removeNote = i => setNotes(n => n.filter((_, j) => j !== i));
    const tog = id => setOpenSec(s => s === id ? null : id);

    const stepStatus = n => {
        if (stage === 'done') return 'done';
        if (stage === 'uploading') return n <= 2 ? 'done' : 'active';
        if (stage === 'form') return n === 1 ? 'done' : 'active' === undefined ? 'idle' : n === 2 ? 'active' : 'idle';
        if (['idle', 'error'].includes(stage)) return n === 1 ? 'active' : 'idle';
        return 'idle';
    };

    /* ── Shared card style ── */
    const card = {
        background: T.bgCard,
        border: `1.5px solid ${T.border}`,
        borderRadius: 12,
        boxShadow: '0 4px 24px rgba(26,58,107,0.07), 0 1px 4px rgba(0,0,0,0.04)',
    };

    return (
        <>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;600;700&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:${T.bg}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        .fade-up{animation:fadeUp 0.4s ease both}
        .slide-in{animation:slideIn 0.28s ease both}
        input:focus,textarea:focus{
          border-color:${T.borderFocus} !important;
          box-shadow:0 0 0 3px ${T.accentLt} !important;
          outline:none;
        }
        input::placeholder,textarea::placeholder{color:#B8AFA4}
        textarea{resize:vertical}
        ::-webkit-scrollbar{width:6px}
        ::-webkit-scrollbar-track{background:${T.bg}}
        ::-webkit-scrollbar-thumb{background:${T.border};border-radius:3px}
        button{font-family:"DM Mono",monospace}
        .btn-primary{transition:all 0.18s}
        .btn-primary:hover:not(:disabled){background:${T.accentHov} !important;transform:translateY(-1px);box-shadow:0 6px 20px rgba(26,58,107,0.25) !important}
        .btn-ghost:hover{background:${T.bgSection} !important;border-color:${T.accent} !important;color:${T.accent} !important}
        .add-btn:hover{border-color:${T.accent} !important;color:${T.accent} !important;background:${T.accentLt} !important}
        .del-btn:hover{color:${T.red} !important;background:${T.redLt} !important}
      `}</style>

            {/* ── Blueprint grid background ── */}
            <div style={{
                position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
                backgroundImage: `
          linear-gradient(${T.gridLine} 1px, transparent 1px),
          linear-gradient(90deg, ${T.gridLine} 1px, transparent 1px)`,
                backgroundSize: '40px 40px',
            }} />

            <div style={{
                position: 'relative', zIndex: 1,
                minHeight: '100vh', background: 'transparent',
                fontFamily: "'Lora', Georgia, serif",
                color: T.ink,
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '48px 16px 100px',
            }}>

                {/* ── Header ── */}
                <div style={{ textAlign: 'center', marginBottom: 44 }} className="fade-up">
                    {/* Decorative rule */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', marginBottom: 20 }}>
                        <div style={{ height: 1, width: 60, background: `linear-gradient(to right, transparent, ${T.border})` }} />
                        <div style={{
                            border: `1.5px solid ${T.accent}`, borderRadius: 4,
                            padding: '3px 14px', fontSize: 10, fontWeight: 500,
                            color: T.accent, letterSpacing: '0.18em',
                            fontFamily: "'DM Mono', monospace",
                            background: T.accentLt,
                        }}>CIVIL DRAFT TOOL</div>
                        <div style={{ height: 1, width: 60, background: `linear-gradient(to left, transparent, ${T.border})` }} />
                    </div>
                    <h1 style={{
                        fontSize: 'clamp(24px,4vw,38px)', fontWeight: 700,
                        color: T.ink, letterSpacing: '-0.02em',
                        marginBottom: 10, lineHeight: 1.2,
                    }}>
                        Canal L-Section<br />
                        <span style={{ color: T.accent }}>Report Generator</span>
                    </h1>
                    <p style={{ fontSize: 14, color: T.inkMid, maxWidth: 400, lineHeight: 1.8, margin: '0 auto' }}>
                        Upload survey data, fill drawing block details,<br />generate a professional multi-page PDF.
                    </p>
                </div>

                {/* ── Step indicators ── */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 0,
                    marginBottom: 36, background: T.bgCard,
                    border: `1.5px solid ${T.border}`, borderRadius: 40,
                    padding: '10px 24px',
                    boxShadow: '0 2px 8px rgba(26,58,107,0.06)',
                }} className="fade-up">
                    {[['Upload File', 1], ['Drawing Details', 2], ['Generate PDF', 3]].map(([lbl, n], i) => (
                        <React.Fragment key={i}>
                            <StepPill n={n} label={lbl} status={
                                (n === 1 && ['form', 'uploading', 'done'].includes(stage)) ? 'done' :
                                    (n === 2 && ['uploading', 'done'].includes(stage)) ? 'done' :
                                        (n === 3 && stage === 'done') ? 'done' :
                                            (n === 1 && ['idle', 'error'].includes(stage)) ? 'active' :
                                                (n === 2 && stage === 'form') ? 'active' :
                                                    (n === 3 && stage === 'uploading') ? 'active' : 'idle'
                            } />
                            {i < 2 && <div style={{ width: 40, height: 1.5, background: T.border, margin: '0 12px' }} />}
                        </React.Fragment>
                    ))}
                </div>

                {/* ════════════════ UPLOAD STAGE ════════════════ */}
                {['idle', 'error'].includes(stage) && (
                    <div style={{ width: '100%', maxWidth: 500 }} className="fade-up">
                        <div style={{ ...card, padding: 28 }}>

                            {/* Drop zone */}
                            <div
                                onDrop={onDrop}
                                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                                onDragLeave={() => setDragging(false)}
                                onClick={() => !file && inputRef.current?.click()}
                                style={{
                                    border: `2px dashed ${dragging ? T.accent : T.border}`,
                                    borderRadius: 10, padding: '36px 24px',
                                    textAlign: 'center', cursor: 'pointer',
                                    background: dragging ? T.accentLt : '#FDFAF6',
                                    transition: 'all 0.22s',
                                    position: 'relative', overflow: 'hidden',
                                }}>
                                {/* subtle watermark */}
                                <div style={{
                                    position: 'absolute', inset: 0,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    opacity: 0.04, pointerEvents: 'none',
                                }}>
                                    <IcoDraft s={160} />
                                </div>
                                <div style={{ position: 'relative', zIndex: 1 }}>
                                    <div style={{
                                        width: 56, height: 56, borderRadius: 12,
                                        background: T.accentLt, border: `1.5px solid #C7D9F5`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: T.accent, margin: '0 auto 14px',
                                    }}>
                                        <IcoUpload s={26} />
                                    </div>
                                    <div style={{ fontSize: 15, color: T.ink, fontWeight: 600, marginBottom: 6 }}>
                                        {dragging ? 'Release to upload' : 'Drop your survey data file here'}
                                    </div>
                                    <div style={{ fontSize: 12, color: T.inkLight, fontFamily: "'DM Mono', monospace" }}>
                                        or{' '}
                                        <span style={{ color: T.accent, cursor: 'pointer', textDecoration: 'underline' }}
                                            onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}>
                                            browse files
                                        </span>
                                        {' '}— CSV · XLS · XLSX — max 20 MB
                                    </div>
                                </div>
                            </div>
                            <input ref={inputRef} type="file" accept=".csv,.xls,.xlsx"
                                style={{ display: 'none' }}
                                onChange={e => { const f = e.target.files?.[0]; if (f) acceptFile(f); }} />

                            {/* File chip */}
                            {file && (
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: 10,
                                    background: T.accentLt, border: `1px solid #C7D9F5`,
                                    borderRadius: 8, padding: '10px 14px', marginTop: 14,
                                }}>
                                    <span style={{ color: T.accent }}><IcoFile s={18} /></span>
                                    <span style={{
                                        flex: 1, fontSize: 13, color: T.accent, fontWeight: 600,
                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                        fontFamily: "'DM Mono', monospace"
                                    }}>
                                        {file.name}
                                    </span>
                                    <span style={{
                                        fontSize: 11, color: T.inkLight,
                                        fontFamily: "'DM Mono', monospace", flexShrink: 0
                                    }}>
                                        {fmtBytes(file.size)}
                                    </span>
                                    <button className="del-btn" onClick={reset} style={{
                                        background: 'none', border: 'none', color: T.inkLight,
                                        cursor: 'pointer', padding: 4, borderRadius: 4,
                                        display: 'flex', transition: 'all 0.15s',
                                    }}><IcoX s={16} /></button>
                                </div>
                            )}

                            {error && (
                                <div style={{
                                    marginTop: 12, background: T.redLt,
                                    border: `1px solid #FCA5A5`, borderRadius: 8,
                                    padding: '10px 14px', fontSize: 12, color: T.red,
                                    fontFamily: "'DM Mono', monospace",
                                }}>⚠ {error}</div>
                            )}

                            <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
                                {file && (
                                    <button className="btn-ghost" onClick={reset} style={{
                                        padding: '12px 18px', background: T.bg,
                                        border: `1.5px solid ${T.border}`, borderRadius: 8,
                                        color: T.inkMid, cursor: 'pointer', fontSize: 12,
                                        letterSpacing: '0.06em', transition: 'all 0.18s',
                                    }}>CLEAR</button>
                                )}
                                <button className="btn-primary" onClick={handleGenerate}
                                    disabled={!file}
                                    style={{
                                        flex: 1, padding: '13px 0',
                                        background: !file ? T.border : T.accent,
                                        color: !file ? T.inkLight : '#FFFFFF',
                                        border: 'none', borderRadius: 8,
                                        fontSize: 13, fontWeight: 500,
                                        letterSpacing: '0.07em', cursor: !file ? 'not-allowed' : 'pointer',
                                        boxShadow: !file ? 'none' : '0 4px 16px rgba(26,58,107,0.22)',
                                        transition: 'all 0.18s',
                                    }}>
                                    NEXT — FILL DRAWING DETAILS →
                                </button>
                            </div>
                        </div>

                        {/* Supported formats hint */}
                        <div style={{
                            textAlign: 'center', marginTop: 16,
                            fontSize: 11, color: T.inkLight, fontFamily: "'DM Mono', monospace"
                        }}>
                            Required columns in file: CH · GL · CBL · FSL · TBL
                        </div>
                    </div>
                )}

                {/* ════════════════ FORM STAGE ════════════════ */}
                {stage === 'form' && (
                    <div style={{ width: '100%', maxWidth: 660 }} className="slide-in">

                        {/* File chip banner */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            background: T.accentLt, border: `1.5px solid #C7D9F5`,
                            borderRadius: 8, padding: '10px 16px', marginBottom: 16,
                        }}>
                            <span style={{ color: T.accent }}><IcoFile s={18} /></span>
                            <span style={{
                                flex: 1, fontSize: 13, color: T.accent, fontWeight: 600,
                                fontFamily: "'DM Mono', monospace",
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                            }}>
                                {file.name}
                            </span>
                            <span style={{ fontSize: 11, color: T.inkLight, fontFamily: "'DM Mono', monospace" }}>
                                {fmtBytes(file.size)}
                            </span>
                        </div>

                        {/* Form card */}
                        <div style={{ ...card, padding: '24px 22px 22px', marginBottom: 14 }}>
                            {/* Header row */}
                            <div style={{
                                display: 'flex', alignItems: 'center',
                                justifyContent: 'space-between', marginBottom: 20
                            }}>
                                <div>
                                    <div style={{ fontSize: 16, fontWeight: 700, color: T.ink }}>
                                        Drawing Block Details
                                    </div>
                                    <div style={{
                                        fontSize: 12, color: T.inkLight, marginTop: 3,
                                        fontFamily: "'DM Mono', monospace"
                                    }}>
                                        All fields are optional — leave blank to omit from PDF
                                    </div>
                                </div>
                                <div style={{
                                    background: T.goldLt, border: `1px solid #FCD34D`,
                                    borderRadius: 6, padding: '4px 10px',
                                    fontSize: 10, color: T.gold, fontWeight: 700,
                                    fontFamily: "'DM Mono', monospace", letterSpacing: '0.1em',
                                }}>OPTIONAL</div>
                            </div>

                            {/* ── Drawing Info ── */}
                            <Section icon="📄" label="DRAWING INFO" desc="Title, DWG No., scale, sheet size, date"
                                open={openSec === 'drawing'} onToggle={() => tog('drawing')}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 18px' }}>
                                    <Field label="Drawing Title" value={title} onChange={setTitle}
                                        placeholder="L- SECTION OF DUDHAI SUB BRANCH CANAL" cols={2} />
                                    <Field label="DWG No." value={dwgNo} onChange={setDwgNo}
                                        placeholder="HCA-1179-CL-LS-DWG-01" mono />
                                    <Field label="Sheet Size" value={sheetSize} onChange={setSheetSize}
                                        placeholder="A1" />
                                    <Field label="Scale" value={scale} onChange={setScale}
                                        placeholder="1:1350" mono />
                                    <Field label="Date" value={date} onChange={setDate}
                                        placeholder="18-10-2024" />
                                </div>
                            </Section>

                            {/* ── Notes ── */}
                            <Section icon="📋" label="NOTES" desc="Shown in the NOTE:- section of the drawing"
                                open={openSec === 'notes'} onToggle={() => tog('notes')}>
                                {notes.map((n, i) => (
                                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
                                        <div style={{
                                            paddingTop: 10, fontSize: 11, color: T.inkLight,
                                            fontFamily: "'DM Mono', monospace", minWidth: 20
                                        }}>{i + 1}.</div>
                                        <input value={n} onChange={e => updateNote(i, e.target.value)}
                                            placeholder="Enter note..."
                                            style={{ ...fieldBase, flex: 1 }} />
                                        <button className="del-btn" onClick={() => removeNote(i)} style={{
                                            background: 'none', border: `1px solid ${T.border}`,
                                            borderRadius: 6, color: T.inkLight, cursor: 'pointer',
                                            padding: '8px', display: 'flex', marginTop: 0,
                                            transition: 'all 0.15s',
                                        }}><IcoTrash s={14} /></button>
                                    </div>
                                ))}
                                <button className="add-btn" onClick={addNote} style={{
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    background: T.bg, border: `1.5px dashed ${T.border}`,
                                    borderRadius: 6, color: T.inkLight, padding: '7px 14px',
                                    cursor: 'pointer', fontSize: 11, marginTop: 6,
                                    fontFamily: "'DM Mono', monospace", letterSpacing: '0.05em',
                                    transition: 'all 0.15s',
                                }}><IcoPlus s={13} /> ADD NOTE</button>
                            </Section>

                            {/* ── Staff ── */}
                            <Section icon="👤" label="STAFF" desc="Drawn by / Designed by / Checked by"
                                open={openSec === 'staff'} onToggle={() => tog('staff')}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 18px' }}>
                                    <Field label="Drawn By" value={drawnBy} onChange={setDrawnBy} placeholder="SP" />
                                    <Field label="Designed By" value={designedBy} onChange={setDesignedBy} placeholder="AS" />
                                    <Field label="Checked By" value={checkedBy} onChange={setCheckedBy} placeholder="PNR" />
                                </div>
                            </Section>

                            {/* ── Revisions ── */}
                            <Section icon="🔄" label="REVISIONS" desc="Revision history table rows"
                                open={openSec === 'revisions'} onToggle={() => tog('revisions')}>
                                {revisions.length === 0 && (
                                    <div style={{
                                        fontSize: 12, color: T.inkLight, textAlign: 'center',
                                        padding: '12px 0 8px', fontFamily: "'DM Mono', monospace"
                                    }}>
                                        No revisions added yet
                                    </div>
                                )}
                                {revisions.map((r, i) => (
                                    <div key={i} style={{
                                        background: T.bg, border: `1px solid ${T.border}`,
                                        borderRadius: 8, padding: '12px 14px 4px',
                                        marginBottom: 10,
                                    }}>
                                        <div style={{
                                            display: 'flex', justifyContent: 'space-between',
                                            alignItems: 'center', marginBottom: 10
                                        }}>
                                            <span style={{
                                                fontSize: 10, color: T.inkLight,
                                                fontFamily: "'DM Mono', monospace", fontWeight: 600,
                                                letterSpacing: '0.1em'
                                            }}>REVISION {i + 1}</span>
                                            <button className="del-btn" onClick={() => removeRev(i)} style={{
                                                background: 'none', border: `1px solid ${T.border}`,
                                                borderRadius: 6, color: T.inkLight, cursor: 'pointer',
                                                padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4,
                                                fontSize: 11, fontFamily: "'DM Mono', monospace",
                                                transition: 'all 0.15s',
                                            }}><IcoTrash s={12} /> Remove</button>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '0.4fr 0.6fr 1fr 0.7fr', gap: '0 14px' }}>
                                            <Field label="Rev" value={r.rev} onChange={v => updateRev(i, 'rev', v)} placeholder="P0" mono />
                                            <Field label="Date" value={r.date} onChange={v => updateRev(i, 'date', v)} placeholder="18-10-2024" />
                                            <Field label="Description" value={r.description} onChange={v => updateRev(i, 'description', v)} placeholder="Issued for Review" />
                                            <Field label="Remarks" value={r.remarks} onChange={v => updateRev(i, 'remarks', v)} placeholder="—" />
                                        </div>
                                    </div>
                                ))}
                                <button className="add-btn" onClick={addRev} style={{
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    background: T.bg, border: `1.5px dashed ${T.border}`,
                                    borderRadius: 6, color: T.inkLight, padding: '7px 14px',
                                    cursor: 'pointer', fontSize: 11,
                                    fontFamily: "'DM Mono', monospace", letterSpacing: '0.05em',
                                    transition: 'all 0.15s',
                                }}><IcoPlus s={13} /> ADD REVISION</button>
                            </Section>

                            {/* ── Client ── */}
                            <Section icon="🏢" label="CLIENT" desc="Client name and organisation"
                                open={openSec === 'client'} onToggle={() => tog('client')}>
                                <Field label="Client Name" value={clientName} onChange={setClientName}
                                    placeholder="Sardar Sarovar Narmada Nigam Limited, Gujrat" multiline />
                            </Section>

                            {/* ── Contractor ── */}
                            <Section icon="🔧" label="CONTRACTOR" desc="Contractor name and address"
                                open={openSec === 'contractor'} onToggle={() => tog('contractor')}>
                                <Field label="Contractor Name" value={contractorName} onChange={setContractorName}
                                    placeholder="Contractor Pvt. Ltd." />
                                <Field label="Contractor Address" value={contractorAddr} onChange={setContractorAddr}
                                    placeholder={"Building Name, Street\nCity, State PIN"} multiline />
                            </Section>

                            {/* ── Consultant ── */}
                            <Section icon="📐" label="CONSULTANT" desc="Consulting firm name and address"
                                open={openSec === 'consultant'} onToggle={() => tog('consultant')}>
                                <Field label="Consultant Name" value={consultantName} onChange={setConsultantName}
                                    placeholder="Hindustan Consulting Associates Pvt. Ltd." />
                                <Field label="Consultant Address" value={consultantAddr} onChange={setConsultantAddr}
                                    placeholder={"405, 4th Floor, Surya Kiran Building\n19 KG Marg, New Delhi 110001"} multiline />
                            </Section>

                            {/* ── Project ── */}
                            <Section icon="🗂" label="PROJECT" desc="Full project description text"
                                open={openSec === 'project'} onToggle={() => tog('project')}>
                                <Field label="Project Description" value={projectText} onChange={setProjectText}
                                    placeholder="EPC contract for construction of..." multiline />
                            </Section>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button className="btn-ghost" onClick={() => setStage('idle')} style={{
                                padding: '13px 22px', background: T.bgCard,
                                border: `1.5px solid ${T.border}`, borderRadius: 8,
                                color: T.inkMid, cursor: 'pointer', fontSize: 12,
                                letterSpacing: '0.06em', transition: 'all 0.18s', flexShrink: 0,
                            }}>← BACK</button>
                            <button className="btn-primary" onClick={handleSubmit} style={{
                                flex: 1, padding: '13px 0',
                                background: T.accent, color: '#FFFFFF',
                                border: 'none', borderRadius: 8,
                                fontSize: 13, fontWeight: 500,
                                letterSpacing: '0.07em', cursor: 'pointer',
                                boxShadow: '0 4px 16px rgba(26,58,107,0.22)',
                                transition: 'all 0.18s',
                            }}>
                                GENERATE PDF REPORT →
                            </button>
                        </div>
                    </div>
                )}

                {/* ════════════════ UPLOADING STAGE ════════════════ */}
                {stage === 'uploading' && (
                    <div style={{ width: '100%', maxWidth: 480, textAlign: 'center' }} className="fade-up">
                        <div style={{ ...card, padding: '52px 32px' }}>
                            <Spinner size={52} />
                            <div style={{ marginTop: 22, fontSize: 18, fontWeight: 700, color: T.ink }}>
                                {progress < 25 ? 'Uploading file…' : progress < 60 ? 'Processing data…' : 'Rendering pages…'}
                            </div>
                            <div style={{
                                marginTop: 6, fontSize: 12, color: T.inkLight,
                                fontFamily: "'DM Mono', monospace"
                            }}>
                                {Math.round(progress)}% complete
                            </div>
                            <div style={{
                                marginTop: 24, height: 5, background: T.bgSection,
                                borderRadius: 3, overflow: 'hidden',
                                border: `1px solid ${T.border}`,
                            }}>
                                <div style={{
                                    height: '100%', borderRadius: 3,
                                    background: `linear-gradient(90deg, ${T.accent}, #2E5BB8)`,
                                    width: `${progress}%`, transition: 'width 0.35s ease',
                                }} />
                            </div>
                            <div style={{
                                marginTop: 18, fontSize: 11, color: T.inkLight,
                                fontFamily: "'DM Mono', monospace", lineHeight: 2
                            }}>
                                Generating {Math.ceil(progress / 2)} of ~68 sheets…
                            </div>
                        </div>
                    </div>
                )}

                {/* ════════════════ DONE STAGE ════════════════ */}
                {stage === 'done' && pdfUrl && (
                    <div style={{ width: '100%', maxWidth: 500 }} className="fade-up">
                        <div style={{
                            ...card,
                            border: `1.5px solid #86EFAC`,
                            background: '#F0FDF4',
                            padding: 24,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                                <div style={{
                                    width: 38, height: 38, borderRadius: '50%',
                                    background: T.greenLt, display: 'flex',
                                    alignItems: 'center', justifyContent: 'center',
                                    color: T.green, flexShrink: 0,
                                    border: `1.5px solid #86EFAC`,
                                }}>
                                    <IcoCheck s={18} />
                                </div>
                                <div>
                                    <div style={{ fontWeight: 700, color: T.green, fontSize: 15 }}>
                                        Report Generated
                                    </div>
                                    <div style={{
                                        fontSize: 11, color: T.green, opacity: 0.8, marginTop: 2,
                                        fontFamily: "'DM Mono', monospace"
                                    }}>
                                        {pdfName}
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                                <a href={pdfUrl} download={pdfName} style={{ flex: 1, textDecoration: 'none' }}>
                                    <button style={{
                                        width: '100%', padding: '11px 0',
                                        background: T.green, color: '#fff',
                                        border: 'none', borderRadius: 7,
                                        fontSize: 12, fontWeight: 500,
                                        letterSpacing: '0.07em', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                        boxShadow: '0 3px 12px rgba(22,101,52,0.2)',
                                        transition: 'all 0.18s',
                                    }}>
                                        <IcoDownload s={15} /> DOWNLOAD PDF
                                    </button>
                                </a>
                                <button onClick={() => setShowPreview(v => !v)} style={{
                                    flex: 1, padding: '11px 0',
                                    background: T.bgCard, color: T.inkMid,
                                    border: `1.5px solid #86EFAC`, borderRadius: 7,
                                    fontSize: 12, fontWeight: 500,
                                    letterSpacing: '0.07em', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                    transition: 'all 0.18s',
                                }}>
                                    <IcoEye s={15} /> {showPreview ? 'HIDE' : 'PREVIEW'}
                                </button>
                            </div>

                            {showPreview && (
                                <div style={{
                                    borderRadius: 8, overflow: 'hidden',
                                    border: `1.5px solid #86EFAC`,
                                    height: 500, marginBottom: 12,
                                    boxShadow: '0 4px 16px rgba(22,101,52,0.1)',
                                }}>
                                    <iframe src={pdfUrl} title="PDF Preview"
                                        width="100%" height="100%"
                                        style={{ border: 'none', display: 'block' }} />
                                </div>
                            )}

                            <button onClick={reset} style={{
                                width: '100%', padding: '9px 0',
                                background: 'none', border: `1.5px solid #86EFAC`,
                                borderRadius: 7, color: T.green,
                                fontSize: 12, cursor: 'pointer',
                                letterSpacing: '0.06em', transition: 'all 0.18s',
                            }}>↺ UPLOAD ANOTHER FILE</button>
                        </div>
                    </div>
                )}

                {/* ── Footer ── */}
                <div style={{
                    marginTop: 60, textAlign: 'center',
                    fontSize: 11, color: T.footer,
                    fontFamily: "'DM Mono', monospace", letterSpacing: '0.08em',
                }}>
                    Engineered for Engineers<br />
                </div>

            </div>
        </>
    );
}