import sys
import os
import math
import pandas as pd
import matplotlib.pyplot as plt
from matplotlib.gridspec import GridSpec
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader

# ---------------- Settings ----------------
BASE_DIR     = os.path.dirname(os.path.abspath(__file__))
BATCH_SIZE   = 30                 # rows per page (tune 30–40)
FIGSIZE      = (16, 10)           # crisp A4-friendly figure
MAX_XLABELS  = 20                 # show at most this many x labels
AXIS_FONTSZ  = 11
TABLE_FONTSZ = 7

COLORS = {"GL": "red", "CBL": "cyan", "FSL": "green", "TBL": "blue"}
TABLE_ROWS = [("GL", "red"), ("TBL", "blue"), ("FSL", "green"), ("CBL", "cyan"), ("Chainage (m)", "black")]

# ------------- Helpers -------------
def ch_label(meters: int) -> str:
    """Format chainage like 23+546."""
    km, m = divmod(int(meters), 1000)
    return f"{km}+{m:03d}"

def nice_y_ticks(vmin: float, vmax: float):
    lo = math.floor(vmin) - 1
    hi = math.ceil(vmax) + 1
    return list(range(lo, hi + 1, 1))

# ------------- Core plotting (INDEX-BASED X) -------------
def render_page(dfb: pd.DataFrame, page_no: int, out_png: str):
    req = ["CH", "GL", "CBL", "FSL", "TBL"]
    missing = [c for c in req if c not in dfb.columns]
    if missing:
        raise ValueError(f"Missing columns: {missing}")

    dfb = dfb.dropna(subset=req).copy()

    # Normalize CH to meters only for labels
    if dfb["CH"].max() < 1000:
        dfb["CH"] = (dfb["CH"] * 1000).round().astype(int)
    else:
        dfb["CH"] = dfb["CH"].round().astype(int)

    dfb = dfb.sort_values("CH").reset_index(drop=True)

    # Index-based x for equal spacing (prevents clustering)
    n = len(dfb)
    x_idx = list(range(n))  # 0..n-1
    ch_text = [ch_label(v) for v in dfb["CH"].values]

    fig = plt.figure(figsize=FIGSIZE, constrained_layout=False)
    gs = GridSpec(2, 1, height_ratios=[3.4, 1.15], hspace=0.18, figure=fig)

    # -------- Top plot --------
    ax = fig.add_subplot(gs[0])
    for col, color in COLORS.items():
        ax.plot(x_idx, dfb[col].values, label=col, color=color, linewidth=2.0)

    ax.set_title(f"Canal Longitudinal Section – Batch {page_no}", fontsize=AXIS_FONTSZ+2, weight="bold")
    ax.set_xlabel("Chainage (m)", fontsize=AXIS_FONTSZ)
    ax.set_ylabel("Level (m)", fontsize=AXIS_FONTSZ)

    # Y ticks @ 1 m
    y_min = float(dfb[list(COLORS.keys())].min().min())
    y_max = float(dfb[list(COLORS.keys())].max().max())
    ax.set_yticks(nice_y_ticks(y_min, y_max + 5))
    ax.tick_params(axis="y", labelsize=AXIS_FONTSZ-1)

    # X range and grid
    ax.set_xlim(-0.5, n - 0.5)

    # Minor ticks at every reading (vertical tracing lines)
    ax.set_xticks(x_idx, minor=True)
    ax.grid(axis="x", which="minor", linestyle=":", linewidth=0.35, alpha=0.55)

    # Major ticks: at most MAX_XLABELS labels, evenly spaced
    if n <= MAX_XLABELS:
        major_idx = x_idx
    else:
        step = math.ceil(n / MAX_XLABELS)
        major_idx = x_idx[::step]
    ax.set_xticks(major_idx)
    ax.set_xticklabels([ch_text[i] for i in major_idx], rotation=90, fontsize=7)

    ax.grid(True, which="major", linestyle="--", linewidth=0.6, alpha=0.7)
    ax.legend(loc="upper left", fontsize=AXIS_FONTSZ-2, frameon=True)

    # -------- Bottom table (shares index spacing) --------
    ax_tbl = fig.add_subplot(gs[1], sharex=ax)
    ax_tbl.set_xlim(ax.get_xlim())
    ax_tbl.set_ylim(0, len(TABLE_ROWS))  # 0..5 rows
    ax_tbl.axis("off")

    # Column verticals (align table to plot)
    for xv in x_idx:
        ax_tbl.axvline(xv, color="#E3E3E3", linewidth=0.5, zorder=0)

    rows_data = {
        "GL":  [f"{v:.2f}" for v in dfb["GL"].values],
        "TBL": [f"{v:.2f}" for v in dfb["TBL"].values],
        "FSL": [f"{v:.2f}" for v in dfb["FSL"].values],
        "CBL": [f"{v:.2f}" for v in dfb["CBL"].values],
        "Chainage (m)": ch_text,
    }

    # Render rows (top-to-bottom, colored)
    for r_idx, (label, color) in enumerate(TABLE_ROWS):
        y = len(TABLE_ROWS) - 1 - r_idx + 0.5
        # row header at left
        ax_tbl.text(-1.0, y, label, color=color, fontsize=TABLE_FONTSZ+1,
                    ha="right", va="center", transform=ax_tbl.get_yaxis_transform())

        vals = rows_data[label]
        for xv, txt in zip(x_idx, vals):
            ax_tbl.text(xv, y, txt, color=color, fontsize=TABLE_FONTSZ,
                        ha="center", va="center", clip_on=False)

        ax_tbl.hlines(y - 0.48, -0.5, n - 0.5, colors="#C9C9C9", linewidth=0.6)

    fig.subplots_adjust(left=0.06, right=0.985, top=0.90, bottom=0.10)
    fig.savefig(out_png, dpi=300)
    plt.close(fig)

# ------------- PDF assembly -------------
def build_pdf(imgs, out_pdf):
    c = canvas.Canvas(out_pdf, pagesize=A4)
    w, h = A4
    for p in imgs:
        img = ImageReader(p)
        iw, ih = img.getSize()
        aspect = ih / float(iw)
        disp_w = w - 80
        disp_h = disp_w * aspect
        c.drawImage(p, 40, h - 60 - disp_h, width=disp_w, height=disp_h)
        c.showPage()
    c.save()

# ------------- Driver -------------
def main():
    if len(sys.argv) != 3:
        print("Usage: python generate_pdf.py <input_file> <output_file>")
        return

    in_path, out_pdf = sys.argv[1], sys.argv[2]
    ext = os.path.splitext(in_path)[1].lower()
    if ext == ".csv":
        df = pd.read_csv(in_path)
    elif ext in (".xls", ".xlsx"):
        df = pd.read_excel(in_path)
    else:
        raise ValueError("Unsupported file type")

    needed = ["CH", "GL", "CBL", "FSL", "TBL"]
    df = df[[c for c in needed if c in df.columns]].dropna(subset=needed).reset_index(drop=True)

    images = []
    for i in range(0, len(df), BATCH_SIZE):
        batch = df.iloc[i:i+BATCH_SIZE]
        img = os.path.join(BASE_DIR, f"page_{i//BATCH_SIZE+1}.png")
        render_page(batch, i//BATCH_SIZE+1, img)
        images.append(img)

    build_pdf(images, out_pdf)
    print("PDF generated:", out_pdf)

if __name__ == "__main__":
    main()
