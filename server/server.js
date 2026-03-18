const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { spawn } = require('child_process');   // FIX: was execFile — buffers all stdout/stderr in heap
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 5000;

app.use(cors({ origin: '*' }));
app.use(express.json());

const UPLOAD_DIR = path.join(__dirname, 'uploads');
const OUTPUT_DIR = path.join(__dirname, 'output');
[UPLOAD_DIR, OUTPUT_DIR].forEach(d => fs.mkdirSync(d, { recursive: true }));

const ALLOWED_EXTS = ['.csv', '.xls', '.xlsx'];
const MAX_SIZE_MB = 20;

const storage = multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const base = `upload_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        cb(null, base + ext);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ALLOWED_EXTS.includes(ext)) return cb(null, true);
        cb(new Error(`Unsupported file type "${ext}". Allowed: ${ALLOWED_EXTS.join(', ')}`));
    },
});

function safeDelete(...files) {
    for (const f of files) {
        try { if (f && fs.existsSync(f)) fs.unlinkSync(f); } catch (_) { }
    }
}

function getPython() {
    const { execSync } = require('child_process');
    for (const cmd of ['python3', 'python']) {
        try { execSync(`${cmd} --version`, { stdio: 'ignore' }); return cmd; }
        catch (_) { }
    }
    throw new Error('Python not found.');
}

let PYTHON_CMD;
try { PYTHON_CMD = getPython(); }
catch (e) { console.error(e.message); process.exit(1); }

const PYTHON_SCRIPT = path.join(__dirname, 'python', 'generate_pdf.py');

// ── Concurrent request guard ──────────────────────────────────────
// Render free tier: 512 MB total. Node ~150 MB + Python ~250 MB = 400 MB.
// A second simultaneous Python process would guarantee OOM.
let isProcessing = false;

// ── Core fix: spawn() instead of execFile() ───────────────────────
// execFile() buffers ALL stdout+stderr in Node's heap until Python exits.
// spawn() streams it directly — zero heap buffering.
function runPython(args, timeoutMs) {
    return new Promise((resolve, reject) => {
        const py = spawn(PYTHON_CMD, args);

        // Stream Python output directly to Node's console — no buffering
        py.stdout.on('data', (d) => process.stdout.write(d));
        py.stderr.on('data', (d) => process.stderr.write(d));

        // Hard timeout — kill Python if it hangs
        const timer = setTimeout(() => {
            py.kill('SIGKILL');
            reject(new Error('Python process timed out.'));
        }, timeoutMs);

        py.on('close', (code) => {
            clearTimeout(timer);
            if (code === 0) resolve();
            else reject(new Error(`Python exited with code ${code}`));
        });

        py.on('error', (err) => {
            clearTimeout(timer);
            reject(err);
        });
    });
}

app.post('/api/upload', (req, res) => {
    // Reject concurrent requests immediately
    if (isProcessing) {
        return res.status(503).json({
            error: 'Server is busy. Please wait a moment and try again.',
        });
    }

    upload.single('file')(req, res, async (multerErr) => {
        if (multerErr) return res.status(400).json({ error: multerErr.message });
        if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

        isProcessing = true;

        const inputPath = req.file.path;
        const baseName = req.file.filename;
        const outputPath = path.join(OUTPUT_DIR, `${baseName}.pdf`);
        const metaPath = path.join(UPLOAD_DIR, `${baseName}_meta.json`);

        let drawingInfo = {};
        try {
            const raw = req.body.drawing_info;
            if (raw) drawingInfo = JSON.parse(raw);
        } catch (e) {
            console.warn('Could not parse drawing_info:', e.message);
        }

        fs.writeFileSync(metaPath, JSON.stringify(drawingInfo, null, 2), 'utf8');
        console.log(`[${new Date().toISOString()}] Processing: ${req.file.originalname}`);

        try {
            await runPython(
                [PYTHON_SCRIPT, inputPath, outputPath, metaPath],
                10 * 60 * 1000   // 10 min timeout
            );

            safeDelete(metaPath);

            if (!fs.existsSync(outputPath)) {
                safeDelete(inputPath);
                return res.status(500).json({ error: 'PDF was not created.' });
            }

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition',
                `attachment; filename="canal_report_${Date.now()}.pdf"`);

            // Stream PDF from disk — never loaded into Node heap
            const stream = fs.createReadStream(outputPath);
            stream.pipe(res);
            stream.on('close', () => safeDelete(inputPath, outputPath));
            stream.on('error', (e) => {
                console.error('Stream error:', e);
                safeDelete(inputPath, outputPath);
            });

        } catch (err) {
            console.error('Python error:', err.message);
            safeDelete(inputPath, outputPath, metaPath);
            if (!res.headersSent) {
                res.status(500).json({
                    error: 'PDF generation failed.',
                    detail: err.message,
                });
            }
        } finally {
            isProcessing = false;
        }
    });
});

app.get('/api/health', (req, res) => res.json({
    status: 'ok',
    python: PYTHON_CMD,
    busy: isProcessing,
}));

app.use((err, req, res, _next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () =>
    console.log(`Server running on http://localhost:${PORT}  (python: ${PYTHON_CMD})`)
);