import React, { useState, useRef, useCallback, useEffect } from 'react';
import axios from 'axios';

/* ── useWindowSize hook ─────────────────────────────────────────── */
function useWindowSize() {
    const [size, setSize] = useState({ w: typeof window !== 'undefined' ? window.innerWidth : 1200 });
    useEffect(() => {
        const handler = () => setSize({ w: window.innerWidth });
        window.addEventListener('resize', handler);
        return () => window.removeEventListener('resize', handler);
    }, []);
    return size;
}

/* ── Responsive helpers ─────────────────────────────────────────── */
// bp(w) returns breakpoint label
const bp = w => w < 480 ? 'xs' : w < 640 ? 'sm' : w < 768 ? 'md' : w < 1024 ? 'lg' : 'xl';
// rv = responsive value: pass object {xs, sm, md, lg, xl} and current width
const rv = (w, map) => {
    const b = bp(w);
    const order = ['xs', 'sm', 'md', 'lg', 'xl'];
    const idx = order.indexOf(b);
    for (let i = idx; i >= 0; i--) {
        if (map[order[i]] !== undefined) return map[order[i]];
    }
    return map[order[0]];
};

/* ── Icons ─────────────────────────────────────────────────────── */
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
    bg: '#F5F1EB',
    bgCard: '#FDFAF6',
    bgInput: '#FFFFFF',
    bgSection: '#F0EBE3',
    border: '#D4C9B8',
    borderFocus: '#1A3A6B',
    ink: '#1C1A17',
    inkMid: '#4A4640',
    inkLight: '#8C7F72',
    accent: '#1A3A6B',
    accentHov: '#102856',
    accentLt: '#E8F0FE',
    gold: '#B5860D',
    goldLt: '#FEF3C7',
    green: '#166534',
    greenLt: '#DCFCE7',
    red: '#991B1B',
    redLt: '#FEE2E2',
    gridLine: 'rgba(26,58,107,0.06)',
    footer: '#B8AFA4',
};

/* ── Field component ───────────────────────────────────────────── */
const Field = ({ label, value, onChange, placeholder = '', multiline = false, mono = false, span = 1, w }) => (
    <div style={{
        marginBottom: 14,
        gridColumn: span > 1 ? `span ${Math.min(span, bp(w) === 'xs' || bp(w) === 'sm' ? 1 : span)}` : undefined,
    }}>
        <label style={{
            display: 'block', fontSize: 10, color: T.inkLight,
            letterSpacing: '0.12em', marginBottom: 5, fontWeight: 700,
            fontFamily: "'DM Mono', monospace", textTransform: 'uppercase',
        }}>{label}</label>
        {multiline
            ? <textarea value={value} onChange={e => onChange(e.target.value)}
                placeholder={placeholder} rows={3}
                style={{
                    ...fieldBase, resize: 'vertical',
                    fontFamily: mono ? "'DM Mono', monospace" : 'inherit'
                }} />
            : <input value={value} onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                style={{
                    ...fieldBase,
                    fontFamily: mono ? "'DM Mono', monospace" : 'inherit'
                }} />
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
const Section = ({ icon, label, desc, open, onToggle, children, w }) => (
    <div style={{
        border: `1.5px solid ${open ? T.accent : T.border}`,
        borderRadius: 8, marginBottom: 8, overflow: 'hidden',
        background: open ? T.bgCard : T.bg,
        transition: 'all 0.2s',
        boxShadow: open ? '0 2px 12px rgba(26,58,107,0.08)' : 'none',
    }}>
        <button onClick={onToggle} style={{
            width: '100%', display: 'flex', alignItems: 'center',
            gap: rv(w, { xs: 8, sm: 10, md: 12 }),
            padding: rv(w, { xs: '10px 12px', sm: '11px 14px', md: '12px 16px' }),
            background: 'none', border: 'none', cursor: 'pointer',
            color: T.ink, textAlign: 'left',
        }}>
            <div style={{
                width: rv(w, { xs: 28, md: 32 }), height: rv(w, { xs: 28, md: 32 }),
                borderRadius: 6,
                background: open ? T.accentLt : T.bgSection,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: rv(w, { xs: 14, md: 16 }), flexShrink: 0,
                border: `1px solid ${open ? '#C7D9F5' : T.border}`,
                transition: 'all 0.2s',
            }}>{icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    fontWeight: 700,
                    fontSize: rv(w, { xs: 12, md: 13 }),
                    color: T.ink,
                    fontFamily: "'DM Mono', monospace",
                    letterSpacing: '0.02em',
                }}>{label}</div>
                {/* hide desc on xs to save space */}
                {bp(w) !== 'xs' && (
                    <div style={{
                        fontSize: 11, color: T.inkLight, marginTop: 2,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                    }}>
                        {desc}
                    </div>
                )}
            </div>
            <div style={{
                color: open ? T.accent : T.inkLight,
                transition: 'transform 0.2s, color 0.2s',
                transform: open ? 'rotate(180deg)' : 'none',
                flexShrink: 0,
            }}>
                <IcoChevron s={rv(w, { xs: 16, md: 18 })} />
            </div>
        </button>
        {open && (
            <div style={{
                padding: rv(w, { xs: '0 12px 14px', sm: '0 14px 16px', md: '0 16px 18px' }),
                borderTop: `1px solid ${T.border}`,
                background: T.bgCard,
            }}>
                <div style={{ height: rv(w, { xs: 10, md: 14 }) }} />
                {children}
            </div>
        )}
    </div>
);

/* ── Step indicator ─────────────────────────────────────────────── */
const StepPill = ({ n, label, status, w }) => {
    const isXs = bp(w) === 'xs';
    const bg = status === 'done' ? T.green : status === 'active' ? T.accent : T.border;
    const txt = status === 'done' ? T.green : status === 'active' ? T.accent : T.inkLight;
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: isXs ? 5 : 8 }}>
            <div style={{
                width: isXs ? 24 : 28, height: isXs ? 24 : 28,
                borderRadius: '50%', background: bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: isXs ? 10 : 11, fontWeight: 800, flexShrink: 0,
                transition: 'all 0.3s',
                boxShadow: status === 'active' ? `0 0 0 3px ${T.accentLt}` : 'none',
            }}>
                {status === 'done' ? <IcoCheck s={isXs ? 11 : 13} /> : n}
            </div>
            {/* On xs show only active/done labels, hide idle ones */}
            {(!isXs || status !== 'idle') && (
                <span style={{
                    fontSize: isXs ? 10 : 12, fontWeight: 600, color: txt,
                    fontFamily: "'DM Mono', monospace",
                    letterSpacing: isXs ? '0.02em' : '0.04em',
                    whiteSpace: 'nowrap',
                    // On xs hide text for idle steps to save space
                    display: isXs && status === 'idle' ? 'none' : 'block',
                }}>{isXs ? label.split(' ')[0] : label}</span>
            )}
        </div>
    );
};

/* ════════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════════ */
export default function UploadFile() {
    const { w } = useWindowSize();

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

    // Responsive derived values
    const isXs = bp(w) === 'xs';
    const isSm = bp(w) === 'sm';
    const isMobile = isXs || isSm;
    const rootPad = rv(w, { xs: '24px 12px 80px', sm: '32px 16px 80px', md: '40px 20px 80px', lg: '48px 24px 100px' });
    const cardPad = rv(w, { xs: 16, sm: 20, md: 24, lg: 28 });
    const maxWCard = rv(w, { xs: '100%', sm: 480, md: 500, lg: 500 });
    const maxWForm = rv(w, { xs: '100%', sm: '100%', md: 620, lg: 660 });

    const card = {
        background: T.bgCard,
        border: `1.5px solid ${T.border}`,
        borderRadius: rv(w, { xs: 10, md: 12 }),
        boxShadow: '0 4px 24px rgba(26,58,107,0.07), 0 1px 4px rgba(0,0,0,0.04)',
    };

    // Grid columns for form sections
    const grid2 = { display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: `0 ${isMobile ? 0 : 18}px` };
    const grid3 = { display: 'grid', gridTemplateColumns: isXs ? '1fr' : isSm ? '1fr 1fr' : '1fr 1fr 1fr', gap: `0 ${isMobile ? 12 : 18}px` };
    const gridRev = { display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '0.4fr 0.6fr 1fr 0.7fr', gap: `0 ${isMobile ? 10 : 14}px` };

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;600;700&family=DM+Mono:wght@400;500&display=swap');
                *{box-sizing:border-box;margin:0;padding:0}
                html{-webkit-text-size-adjust:100%}
                body{background:${T.bg};overflow-x:hidden}
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
                ::-webkit-scrollbar{width:5px}
                ::-webkit-scrollbar-track{background:${T.bg}}
                ::-webkit-scrollbar-thumb{background:${T.border};border-radius:3px}
                button{font-family:"DM Mono",monospace;-webkit-tap-highlight-color:transparent}
                .btn-primary{transition:all 0.18s}
                .btn-primary:hover:not(:disabled){background:${T.accentHov} !important;transform:translateY(-1px);box-shadow:0 6px 20px rgba(26,58,107,0.25) !important}
                .btn-ghost:hover{background:${T.bgSection} !important;border-color:${T.accent} !important;color:${T.accent} !important}
                .add-btn:hover{border-color:${T.accent} !important;color:${T.accent} !important;background:${T.accentLt} !important}
                .del-btn:hover{color:${T.red} !important;background:${T.redLt} !important}
                /* Touch-friendly tap targets */
                @media (hover:none){
                    .btn-primary:hover:not(:disabled){transform:none !important}
                }
            `}</style>

            {/* Blueprint grid background */}
            <div style={{
                position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
                backgroundImage: `linear-gradient(${T.gridLine} 1px, transparent 1px),linear-gradient(90deg, ${T.gridLine} 1px, transparent 1px)`,
                backgroundSize: rv(w, { xs: '28px 28px', md: '40px 40px' }),
            }} />

            <div style={{
                position: 'relative', zIndex: 1,
                minHeight: '100vh', background: 'transparent',
                fontFamily: "'Lora', Georgia, serif",
                color: T.ink,
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: rootPad,
            }}>

                {/* ── Header ── */}
                <div style={{ textAlign: 'center', marginBottom: rv(w, { xs: 28, sm: 32, md: 40, lg: 44 }), width: '100%' }} className="fade-up">
                    <div style={{ display: 'flex', alignItems: 'center', gap: rv(w, { xs: 8, md: 12 }), justifyContent: 'center', marginBottom: rv(w, { xs: 14, md: 20 }) }}>
                        <div style={{ height: 1, width: rv(w, { xs: 30, md: 60 }), background: `linear-gradient(to right, transparent, ${T.border})` }} />
                        <div style={{
                            border: `1.5px solid ${T.accent}`, borderRadius: 4,
                            padding: rv(w, { xs: '2px 10px', md: '3px 14px' }),
                            fontSize: rv(w, { xs: 9, md: 10 }), fontWeight: 500,
                            color: T.accent, letterSpacing: '0.14em',
                            fontFamily: "'DM Mono', monospace",
                            background: T.accentLt, whiteSpace: 'nowrap',
                        }}>CIVIL DRAFT TOOL</div>
                        <div style={{ height: 1, width: rv(w, { xs: 30, md: 60 }), background: `linear-gradient(to left, transparent, ${T.border})` }} />
                    </div>
                    <h1 style={{
                        fontSize: rv(w, { xs: '22px', sm: '26px', md: '30px', lg: '38px' }),
                        fontWeight: 700, color: T.ink,
                        letterSpacing: '-0.02em', marginBottom: 10, lineHeight: 1.25,
                    }}>
                        Canal L-Section{isMobile ? ' ' : <br />}
                        <span style={{ color: T.accent }}>Report Generator</span>
                    </h1>
                    <p style={{
                        fontSize: rv(w, { xs: 12, sm: 13, md: 14 }),
                        color: T.inkMid, maxWidth: 380, lineHeight: 1.8, margin: '0 auto',
                    }}>
                        Upload survey data, fill drawing block details, generate a professional multi-page PDF.
                    </p>
                </div>

                {/* ── Step indicators ── */}
                <div style={{
                    display: 'flex', alignItems: 'center',
                    marginBottom: rv(w, { xs: 24, md: 36 }),
                    background: T.bgCard,
                    border: `1.5px solid ${T.border}`,
                    borderRadius: 40,
                    padding: rv(w, { xs: '8px 14px', sm: '9px 18px', md: '10px 24px' }),
                    boxShadow: '0 2px 8px rgba(26,58,107,0.06)',
                    maxWidth: '100%',
                    overflowX: 'auto',
                }} className="fade-up">
                    {[['Upload File', 1], ['Drawing Details', 2], ['Generate PDF', 3]].map(([lbl, n], i) => (
                        <React.Fragment key={i}>
                            <StepPill n={n} label={lbl} w={w} status={
                                (n === 1 && ['form', 'uploading', 'done'].includes(stage)) ? 'done' :
                                    (n === 2 && ['uploading', 'done'].includes(stage)) ? 'done' :
                                        (n === 3 && stage === 'done') ? 'done' :
                                            (n === 1 && ['idle', 'error'].includes(stage)) ? 'active' :
                                                (n === 2 && stage === 'form') ? 'active' :
                                                    (n === 3 && stage === 'uploading') ? 'active' : 'idle'
                            } />
                            {i < 2 && <div style={{ width: rv(w, { xs: 16, sm: 24, md: 40 }), height: 1.5, background: T.border, margin: rv(w, { xs: '0 6px', md: '0 12px' }), flexShrink: 0 }} />}
                        </React.Fragment>
                    ))}
                </div>

                {/* ════════ UPLOAD STAGE ════════ */}
                {['idle', 'error'].includes(stage) && (
                    <div style={{ width: '100%', maxWidth: maxWCard }} className="fade-up">
                        <div style={{ ...card, padding: cardPad }}>

                            {/* Drop zone */}
                            <div
                                onDrop={onDrop}
                                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                                onDragLeave={() => setDragging(false)}
                                onClick={() => !file && inputRef.current?.click()}
                                style={{
                                    border: `2px dashed ${dragging ? T.accent : T.border}`,
                                    borderRadius: 10,
                                    padding: rv(w, { xs: '24px 16px', sm: '28px 20px', md: '36px 24px' }),
                                    textAlign: 'center', cursor: 'pointer',
                                    background: dragging ? T.accentLt : '#FDFAF6',
                                    transition: 'all 0.22s',
                                    position: 'relative', overflow: 'hidden',
                                }}>
                                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.04, pointerEvents: 'none' }}>
                                    <IcoDraft s={rv(w, { xs: 100, md: 160 })} />
                                </div>
                                <div style={{ position: 'relative', zIndex: 1 }}>
                                    <div style={{
                                        width: rv(w, { xs: 44, md: 56 }), height: rv(w, { xs: 44, md: 56 }),
                                        borderRadius: 12, background: T.accentLt,
                                        border: `1.5px solid #C7D9F5`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: T.accent, margin: '0 auto 12px',
                                    }}>
                                        <IcoUpload s={rv(w, { xs: 20, md: 26 })} />
                                    </div>
                                    <div style={{ fontSize: rv(w, { xs: 13, md: 15 }), color: T.ink, fontWeight: 600, marginBottom: 6 }}>
                                        {dragging ? 'Release to upload' : 'Drop your survey data file here'}
                                    </div>
                                    <div style={{ fontSize: rv(w, { xs: 11, md: 12 }), color: T.inkLight, fontFamily: "'DM Mono', monospace" }}>
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
                                    borderRadius: 8, padding: '10px 12px', marginTop: 12,
                                }}>
                                    <span style={{ color: T.accent, flexShrink: 0 }}><IcoFile s={16} /></span>
                                    <span style={{
                                        flex: 1, fontSize: rv(w, { xs: 11, md: 13 }), color: T.accent, fontWeight: 600,
                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                        fontFamily: "'DM Mono', monospace"
                                    }}>
                                        {file.name}
                                    </span>
                                    <span style={{ fontSize: 11, color: T.inkLight, fontFamily: "'DM Mono', monospace", flexShrink: 0 }}>
                                        {fmtBytes(file.size)}
                                    </span>
                                    <button className="del-btn" onClick={reset} style={{
                                        background: 'none', border: 'none', color: T.inkLight,
                                        cursor: 'pointer', padding: 4, borderRadius: 4,
                                        display: 'flex', transition: 'all 0.15s', flexShrink: 0,
                                    }}><IcoX s={15} /></button>
                                </div>
                            )}

                            {error && (
                                <div style={{
                                    marginTop: 12, background: T.redLt,
                                    border: `1px solid #FCA5A5`, borderRadius: 8,
                                    padding: '10px 12px', fontSize: rv(w, { xs: 11, md: 12 }),
                                    color: T.red, fontFamily: "'DM Mono', monospace",
                                }}>⚠ {error}</div>
                            )}

                            <div style={{ marginTop: rv(w, { xs: 14, md: 20 }), display: 'flex', gap: 10 }}>
                                {file && (
                                    <button className="btn-ghost" onClick={reset} style={{
                                        padding: rv(w, { xs: '11px 14px', md: '12px 18px' }),
                                        background: T.bg, border: `1.5px solid ${T.border}`,
                                        borderRadius: 8, color: T.inkMid, cursor: 'pointer',
                                        fontSize: rv(w, { xs: 11, md: 12 }), letterSpacing: '0.06em',
                                        transition: 'all 0.18s', flexShrink: 0,
                                    }}>CLEAR</button>
                                )}
                                <button className="btn-primary" onClick={handleGenerate} disabled={!file}
                                    style={{
                                        flex: 1, padding: rv(w, { xs: '12px 0', md: '13px 0' }),
                                        background: !file ? T.border : T.accent,
                                        color: !file ? T.inkLight : '#FFFFFF',
                                        border: 'none', borderRadius: 8,
                                        fontSize: rv(w, { xs: 12, md: 13 }), fontWeight: 500,
                                        letterSpacing: '0.07em', cursor: !file ? 'not-allowed' : 'pointer',
                                        boxShadow: !file ? 'none' : '0 4px 16px rgba(26,58,107,0.22)',
                                        transition: 'all 0.18s',
                                    }}>
                                    {isMobile ? 'NEXT →' : 'NEXT — FILL DRAWING DETAILS →'}
                                </button>
                            </div>
                        </div>

                        <div style={{
                            textAlign: 'center', marginTop: 14, fontSize: 11,
                            color: T.inkLight, fontFamily: "'DM Mono', monospace",
                            padding: '0 8px'
                        }}>
                            Required columns: CH · GL · CBL · FSL · TBL
                        </div>
                    </div>
                )}

                {/* ════════ FORM STAGE ════════ */}
                {stage === 'form' && (
                    <div style={{ width: '100%', maxWidth: maxWForm }} className="slide-in">

                        {/* File chip banner */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            background: T.accentLt, border: `1.5px solid #C7D9F5`,
                            borderRadius: 8,
                            padding: rv(w, { xs: '8px 12px', md: '10px 16px' }),
                            marginBottom: rv(w, { xs: 10, md: 16 }),
                        }}>
                            <span style={{ color: T.accent, flexShrink: 0 }}><IcoFile s={16} /></span>
                            <span style={{
                                flex: 1, fontSize: rv(w, { xs: 11, md: 13 }), color: T.accent, fontWeight: 600,
                                fontFamily: "'DM Mono', monospace",
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                            }}>
                                {file.name}
                            </span>
                            <span style={{ fontSize: 10, color: T.inkLight, fontFamily: "'DM Mono', monospace", flexShrink: 0 }}>
                                {fmtBytes(file.size)}
                            </span>
                        </div>

                        {/* Form card */}
                        <div style={{ ...card, padding: rv(w, { xs: '16px 14px 16px', sm: '20px 18px', md: '24px 22px 22px' }), marginBottom: rv(w, { xs: 10, md: 14 }) }}>
                            {/* Header row */}
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: rv(w, { xs: 14, md: 20 }), gap: 10 }}>
                                <div>
                                    <div style={{ fontSize: rv(w, { xs: 14, md: 16 }), fontWeight: 700, color: T.ink }}>
                                        Drawing Block Details
                                    </div>
                                    <div style={{ fontSize: rv(w, { xs: 11, md: 12 }), color: T.inkLight, marginTop: 3, fontFamily: "'DM Mono', monospace" }}>
                                        All fields optional — blank = omitted from PDF
                                    </div>
                                </div>
                                <div style={{
                                    background: T.goldLt, border: `1px solid #FCD34D`,
                                    borderRadius: 5, padding: '3px 8px',
                                    fontSize: 9, color: T.gold, fontWeight: 700,
                                    fontFamily: "'DM Mono', monospace", letterSpacing: '0.1em',
                                    flexShrink: 0,
                                }}>OPTIONAL</div>
                            </div>

                            {/* Drawing Info */}
                            <Section icon="📄" label="DRAWING INFO" desc="Title, DWG No., scale, sheet size, date"
                                open={openSec === 'drawing'} onToggle={() => tog('drawing')} w={w}>
                                <div style={grid2}>
                                    <div style={{ gridColumn: isMobile ? undefined : 'span 2' }}>
                                        <Field label="Drawing Title" value={title} onChange={setTitle}
                                            placeholder="L- SECTION OF DUDHAI SUB BRANCH CANAL" w={w} />
                                    </div>
                                    <Field label="DWG No." value={dwgNo} onChange={setDwgNo} placeholder="HCA-1179-CL-LS-DWG-01" mono w={w} />
                                    <Field label="Sheet Size" value={sheetSize} onChange={setSheetSize} placeholder="A1" w={w} />
                                    <Field label="Scale" value={scale} onChange={setScale} placeholder="1:1350" mono w={w} />
                                    <Field label="Date" value={date} onChange={setDate} placeholder="18-10-2024" w={w} />
                                </div>
                            </Section>

                            {/* Notes */}
                            <Section icon="📋" label="NOTES" desc="Shown in the NOTE:- section of the drawing"
                                open={openSec === 'notes'} onToggle={() => tog('notes')} w={w}>
                                {notes.map((n, i) => (
                                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
                                        <div style={{
                                            paddingTop: 10, fontSize: 11, color: T.inkLight,
                                            fontFamily: "'DM Mono', monospace", minWidth: 18, flexShrink: 0
                                        }}>{i + 1}.</div>
                                        <input value={n} onChange={e => updateNote(i, e.target.value)}
                                            placeholder="Enter note..." style={{ ...fieldBase, flex: 1 }} />
                                        <button className="del-btn" onClick={() => removeNote(i)} style={{
                                            background: 'none', border: `1px solid ${T.border}`,
                                            borderRadius: 6, color: T.inkLight, cursor: 'pointer',
                                            padding: '8px', display: 'flex', transition: 'all 0.15s', flexShrink: 0,
                                        }}><IcoTrash s={14} /></button>
                                    </div>
                                ))}
                                <button className="add-btn" onClick={addNote} style={{
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    background: T.bg, border: `1.5px dashed ${T.border}`,
                                    borderRadius: 6, color: T.inkLight, padding: '7px 12px',
                                    cursor: 'pointer', fontSize: 11, marginTop: 4,
                                    fontFamily: "'DM Mono', monospace", letterSpacing: '0.05em',
                                    transition: 'all 0.15s',
                                }}><IcoPlus s={13} /> ADD NOTE</button>
                            </Section>

                            {/* Staff */}
                            <Section icon="👤" label="STAFF" desc="Drawn by / Designed by / Checked by"
                                open={openSec === 'staff'} onToggle={() => tog('staff')} w={w}>
                                <div style={grid3}>
                                    <Field label="Drawn By" value={drawnBy} onChange={setDrawnBy} placeholder="SP" w={w} />
                                    <Field label="Designed By" value={designedBy} onChange={setDesignedBy} placeholder="AS" w={w} />
                                    <Field label="Checked By" value={checkedBy} onChange={setCheckedBy} placeholder="PNR" w={w} />
                                </div>
                            </Section>

                            {/* Revisions */}
                            <Section icon="🔄" label="REVISIONS" desc="Revision history table rows"
                                open={openSec === 'revisions'} onToggle={() => tog('revisions')} w={w}>
                                {revisions.length === 0 && (
                                    <div style={{
                                        fontSize: 12, color: T.inkLight, textAlign: 'center',
                                        padding: '10px 0 6px', fontFamily: "'DM Mono', monospace"
                                    }}>
                                        No revisions added yet
                                    </div>
                                )}
                                {revisions.map((r, i) => (
                                    <div key={i} style={{
                                        background: T.bg, border: `1px solid ${T.border}`,
                                        borderRadius: 8, padding: rv(w, { xs: '10px 10px 4px', md: '12px 14px 4px' }),
                                        marginBottom: 10,
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                            <span style={{ fontSize: 10, color: T.inkLight, fontFamily: "'DM Mono', monospace", fontWeight: 600, letterSpacing: '0.1em' }}>
                                                REV {i + 1}
                                            </span>
                                            <button className="del-btn" onClick={() => removeRev(i)} style={{
                                                background: 'none', border: `1px solid ${T.border}`,
                                                borderRadius: 6, color: T.inkLight, cursor: 'pointer',
                                                padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 4,
                                                fontSize: 11, fontFamily: "'DM Mono', monospace", transition: 'all 0.15s',
                                            }}><IcoTrash s={12} /> {!isXs && 'Remove'}</button>
                                        </div>
                                        <div style={gridRev}>
                                            <Field label="Rev" value={r.rev} onChange={v => updateRev(i, 'rev', v)} placeholder="P0" mono w={w} />
                                            <Field label="Date" value={r.date} onChange={v => updateRev(i, 'date', v)} placeholder="18-10-2024" w={w} />
                                            <Field label="Description" value={r.description} onChange={v => updateRev(i, 'description', v)} placeholder="Issued for Review" w={w} />
                                            <Field label="Remarks" value={r.remarks} onChange={v => updateRev(i, 'remarks', v)} placeholder="—" w={w} />
                                        </div>
                                    </div>
                                ))}
                                <button className="add-btn" onClick={addRev} style={{
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    background: T.bg, border: `1.5px dashed ${T.border}`,
                                    borderRadius: 6, color: T.inkLight, padding: '7px 12px',
                                    cursor: 'pointer', fontSize: 11,
                                    fontFamily: "'DM Mono', monospace", letterSpacing: '0.05em',
                                    transition: 'all 0.15s',
                                }}><IcoPlus s={13} /> ADD REVISION</button>
                            </Section>

                            {/* Client */}
                            <Section icon="🏢" label="CLIENT" desc="Client name and organisation"
                                open={openSec === 'client'} onToggle={() => tog('client')} w={w}>
                                <Field label="Client Name" value={clientName} onChange={setClientName}
                                    placeholder="Sardar Sarovar Narmada Nigam Limited, Gujrat" multiline w={w} />
                            </Section>

                            {/* Contractor */}
                            <Section icon="🔧" label="CONTRACTOR" desc="Contractor name and address"
                                open={openSec === 'contractor'} onToggle={() => tog('contractor')} w={w}>
                                <Field label="Contractor Name" value={contractorName} onChange={setContractorName} placeholder="Contractor Pvt. Ltd." w={w} />
                                <Field label="Contractor Address" value={contractorAddr} onChange={setContractorAddr}
                                    placeholder={"Building Name, Street\nCity, State PIN"} multiline w={w} />
                            </Section>

                            {/* Consultant */}
                            <Section icon="📐" label="CONSULTANT" desc="Consulting firm name and address"
                                open={openSec === 'consultant'} onToggle={() => tog('consultant')} w={w}>
                                <Field label="Consultant Name" value={consultantName} onChange={setConsultantName}
                                    placeholder="Hindustan Consulting Associates Pvt. Ltd." w={w} />
                                <Field label="Consultant Address" value={consultantAddr} onChange={setConsultantAddr}
                                    placeholder={"405, 4th Floor, Surya Kiran Building\n19 KG Marg, New Delhi 110001"} multiline w={w} />
                            </Section>

                            {/* Project */}
                            <Section icon="🗂" label="PROJECT" desc="Full project description text"
                                open={openSec === 'project'} onToggle={() => tog('project')} w={w}>
                                <Field label="Project Description" value={projectText} onChange={setProjectText}
                                    placeholder="EPC contract for construction of..." multiline w={w} />
                            </Section>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: rv(w, { xs: 8, md: 12 }), marginBottom: rv(w, { xs: 8, md: 0 }) }}>
                            <button className="btn-ghost" onClick={() => setStage('idle')} style={{
                                padding: rv(w, { xs: '12px 14px', md: '13px 22px' }),
                                background: T.bgCard, border: `1.5px solid ${T.border}`,
                                borderRadius: 8, color: T.inkMid, cursor: 'pointer',
                                fontSize: rv(w, { xs: 11, md: 12 }), letterSpacing: '0.06em',
                                transition: 'all 0.18s', flexShrink: 0,
                            }}>← BACK</button>
                            <button className="btn-primary" onClick={handleSubmit} style={{
                                flex: 1, padding: rv(w, { xs: '12px 0', md: '13px 0' }),
                                background: T.accent, color: '#FFFFFF',
                                border: 'none', borderRadius: 8,
                                fontSize: rv(w, { xs: 12, md: 13 }), fontWeight: 500,
                                letterSpacing: '0.07em', cursor: 'pointer',
                                boxShadow: '0 4px 16px rgba(26,58,107,0.22)',
                                transition: 'all 0.18s',
                            }}>
                                {isMobile ? 'GENERATE PDF →' : 'GENERATE PDF REPORT →'}
                            </button>
                        </div>
                    </div>
                )}

                {/* ════════ UPLOADING STAGE ════════ */}
                {stage === 'uploading' && (
                    <div style={{ width: '100%', maxWidth: rv(w, { xs: '100%', sm: 400, md: 480 }), textAlign: 'center' }} className="fade-up">
                        <div style={{ ...card, padding: rv(w, { xs: '36px 20px', sm: '44px 28px', md: '52px 32px' }) }}>
                            <Spinner size={rv(w, { xs: 40, md: 52 })} />
                            <div style={{ marginTop: rv(w, { xs: 16, md: 22 }), fontSize: rv(w, { xs: 16, md: 18 }), fontWeight: 700, color: T.ink }}>
                                {progress < 25 ? 'Uploading file…' : progress < 60 ? 'Processing data…' : 'Rendering pages…'}
                            </div>
                            <div style={{ marginTop: 6, fontSize: rv(w, { xs: 11, md: 12 }), color: T.inkLight, fontFamily: "'DM Mono', monospace" }}>
                                {Math.round(progress)}% complete
                            </div>
                            <div style={{ marginTop: rv(w, { xs: 16, md: 24 }), height: 5, background: T.bgSection, borderRadius: 3, overflow: 'hidden', border: `1px solid ${T.border}` }}>
                                <div style={{ height: '100%', borderRadius: 3, background: `linear-gradient(90deg, ${T.accent}, #2E5BB8)`, width: `${progress}%`, transition: 'width 0.35s ease' }} />
                            </div>
                            <div style={{ marginTop: 14, fontSize: 11, color: T.inkLight, fontFamily: "'DM Mono', monospace", lineHeight: 2 }}>
                                Generating {Math.ceil(progress / 2)} of ~68 sheets…
                            </div>
                        </div>
                    </div>
                )}

                {/* ════════ DONE STAGE ════════ */}
                {stage === 'done' && pdfUrl && (
                    <div style={{ width: '100%', maxWidth: rv(w, { xs: '100%', sm: 460, md: 500 }) }} className="fade-up">
                        <div style={{ ...card, border: `1.5px solid #86EFAC`, background: '#F0FDF4', padding: rv(w, { xs: 16, sm: 20, md: 24 }) }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: rv(w, { xs: 14, md: 18 }) }}>
                                <div style={{
                                    width: rv(w, { xs: 32, md: 38 }), height: rv(w, { xs: 32, md: 38 }),
                                    borderRadius: '50%', background: T.greenLt,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: T.green, flexShrink: 0, border: `1.5px solid #86EFAC`,
                                }}>
                                    <IcoCheck s={rv(w, { xs: 15, md: 18 })} />
                                </div>
                                <div>
                                    <div style={{ fontWeight: 700, color: T.green, fontSize: rv(w, { xs: 14, md: 15 }) }}>
                                        Report Generated
                                    </div>
                                    <div style={{
                                        fontSize: rv(w, { xs: 10, md: 11 }), color: T.green, opacity: 0.8, marginTop: 2,
                                        fontFamily: "'DM Mono', monospace",
                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                        maxWidth: rv(w, { xs: 200, sm: 300, md: 400 }),
                                    }}>
                                        {pdfName}
                                    </div>
                                </div>
                            </div>

                            {/* On xs: stack buttons vertically */}
                            <div style={{ display: 'flex', flexDirection: isXs ? 'column' : 'row', gap: 10, marginBottom: 12 }}>
                                <a href={pdfUrl} download={pdfName} style={{ flex: 1, textDecoration: 'none' }}>
                                    <button style={{
                                        width: '100%', padding: rv(w, { xs: '12px 0', md: '11px 0' }),
                                        background: T.green, color: '#fff',
                                        border: 'none', borderRadius: 7,
                                        fontSize: rv(w, { xs: 12, md: 12 }), fontWeight: 500,
                                        letterSpacing: '0.07em', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                        boxShadow: '0 3px 12px rgba(22,101,52,0.2)',
                                    }}>
                                        <IcoDownload s={15} /> DOWNLOAD PDF
                                    </button>
                                </a>
                                <button onClick={() => setShowPreview(v => !v)} style={{
                                    flex: 1, padding: rv(w, { xs: '12px 0', md: '11px 0' }),
                                    background: T.bgCard, color: T.inkMid,
                                    border: `1.5px solid #86EFAC`, borderRadius: 7,
                                    fontSize: 12, fontWeight: 500,
                                    letterSpacing: '0.07em', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                    transition: 'all 0.18s',
                                }}>
                                    <IcoEye s={15} /> {showPreview ? 'HIDE PREVIEW' : 'PREVIEW'}
                                </button>
                            </div>

                            {showPreview && (
                                <div style={{
                                    borderRadius: 8, overflow: 'hidden',
                                    border: `1.5px solid #86EFAC`,
                                    height: rv(w, { xs: 300, sm: 380, md: 500 }),
                                    marginBottom: 12,
                                }}>
                                    <iframe src={pdfUrl} title="PDF Preview"
                                        width="100%" height="100%"
                                        style={{ border: 'none', display: 'block' }} />
                                </div>
                            )}

                            <button onClick={reset} style={{
                                width: '100%', padding: '9px 0',
                                background: 'none', border: `1.5px solid #86EFAC`,
                                borderRadius: 7, color: T.green, fontSize: 12,
                                cursor: 'pointer', letterSpacing: '0.06em', transition: 'all 0.18s',
                            }}>↺ UPLOAD ANOTHER FILE</button>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div style={{
                    marginTop: rv(w, { xs: 40, md: 60 }), textAlign: 'center',
                    fontSize: rv(w, { xs: 10, md: 11 }), color: T.footer,
                    fontFamily: "'DM Mono', monospace", letterSpacing: '0.08em',
                }}>
                    Built by an Engineer, for Engineers
                </div>
            </div>
        </>
    );
}