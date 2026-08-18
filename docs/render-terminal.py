"""
docs/render-terminal.py: turns the saved vitest output (run-red.txt, run-green.txt)
into PNGs for the README, so the "before" and "after" are the real output and
not a mock-up. Requires Pillow. Re-run after regenerating the .txt files:

    npx vitest run --reporter=verbose 2>&1 | sed 's/\\x1b\\[[0-9;]*m//g' > docs/run-green.txt
    python docs/render-terminal.py
"""
from PIL import Image, ImageDraw, ImageFont
import os, re

HERE = os.path.dirname(os.path.abspath(__file__))
FONT = None
for cand in (r"C:\Windows\Fonts\consola.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
             "/System/Library/Fonts/Menlo.ttc"):
    if os.path.exists(cand):
        FONT = ImageFont.truetype(cand, 15); break
if FONT is None:
    FONT = ImageFont.load_default()

# GitHub-dark palette so the PNGs sit naturally in a README rendered on GitHub.
BG = (13, 17, 23); FG = (230, 237, 243); DIM = (145, 152, 161)
GREEN = (63, 185, 80); RED = (248, 81, 73); YELLOW = (210, 153, 34)

def colour_for(line: str):
    """Pick a colour by what kind of vitest line this is (pass, fail, diff, meta)."""
    s = line.strip()
    if s.startswith("✓") or " passed" in s and "Tests" in s: return GREEN
    if s.startswith("×") or s.startswith("FAIL") or "failed" in s and "Tests" in s: return RED
    if s.startswith("AssertionError") or s.startswith("- Expected") or s.startswith("+ Received"): return YELLOW
    if s.startswith("Test Files") or s.startswith("Duration") or s.startswith("Start at"): return DIM
    return FG

def render(src: str, out: str, keep):
    """Read a saved vitest transcript, filter it with `keep`, paint one line per row."""
    lines = open(os.path.join(HERE, src), encoding="utf-8").read().splitlines()
    lines = keep(lines)
    pad, lh = 18, 22
    width = 900
    img = Image.new("RGB", (width, pad * 2 + lh * len(lines)), BG)
    d = ImageDraw.Draw(img)
    for i, line in enumerate(lines):
        # Consolas has no check-mark / pointer glyphs; swap for ASCII so the
        # PNG never shows tofu boxes.
        shown = line.replace("✓", "PASS").replace("×", "FAIL").replace("❯", ">").replace("⎯", "-")
        d.text((pad, pad + i * lh), shown[:110], font=FONT, fill=colour_for(line))
    img.save(os.path.join(HERE, out))
    print("wrote", out, img.size)

def red_keep(lines):
    """For the red image: every PASS/FAIL line, then the first failure's
    assertion detail (the $10-three-ways one, which is the story), then the
    summary. The other seven failure details would make the image a scroll."""
    out = [l for l in lines if l.strip().startswith(("✓", "×"))]
    out.append("")
    grab, first = False, []
    for l in lines:
        if l.startswith(" FAIL") and "$10 three ways" in l: grab = True
        if grab:
            first.append(l)
            if l.strip().startswith("⎯") and "[1/" in l: break
    out += first[:12]
    out.append("")
    out += [l for l in lines if l.strip().startswith(("Test Files", "Tests "))]
    return out

def green_keep(lines):
    """For the green image: every PASS line and the summary, including Duration
    so the "tests 7ms" figure is on the record."""
    out = [l for l in lines if l.strip().startswith(("✓", "×"))]
    out.append("")
    out += [l for l in lines if l.strip().startswith(("Test Files", "Tests ", "Duration"))]
    return out

render("run-red.txt", "tests-red.png", red_keep)
render("run-green.txt", "tests-green.png", green_keep)
