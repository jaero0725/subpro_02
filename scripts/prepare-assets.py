"""One-time source-artwork extraction. Requires Pillow (pip install Pillow).

Run from any directory: python scripts/prepare-assets.py
Committed assets are ready to use; this is not needed for the normal build.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / 'public' / 'assets'
OUTPUT.mkdir(parents=True, exist_ok=True)

for language, number in [('ko', 11), ('zh', 1)]:
    with Image.open(ROOT / 'docs' / f'THEMAN QR-{number:02}.png') as source:
        artwork = source.convert('RGB')
        artwork.crop((0, 0, 813, 1230)).save(OUTPUT / f'landing-{language}.webp', quality=96, method=6)
        artwork.crop((0, 2125, 813, 2459)).save(OUTPUT / f'footer-{language}.webp', quality=96, method=6)

for number in [*range(2, 11), *range(12, 21)]:
    with Image.open(ROOT / 'docs' / f'THEMAN QR-{number:02}.png') as source:
        source.convert('RGB').save(OUTPUT / f'result-{number:02}.webp', quality=95, method=6)

with Image.open(ROOT / 'docs' / 'THEMAN QR-11.png') as source:
    source.crop((30, 54, 316, 170)).save(OUTPUT / 'logo.png')

print('Prepared design assets in public/assets/')
