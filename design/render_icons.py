"""İkonları (icons/*.png) ve README banner'ını (docs/banner.png) yeniden üretir.

Gerekenler: pip install playwright pillow && playwright install chromium
Kullanım:  python3 design/render_icons.py
"""
import pathlib
import tempfile

from PIL import Image
from playwright.sync_api import sync_playwright

DESIGN = pathlib.Path(__file__).resolve().parent
ROOT = DESIGN.parent

with sync_playwright() as p, tempfile.TemporaryDirectory() as tmp:
    browser = p.chromium.launch()

    page = browser.new_page(viewport={"width": 512, "height": 512})
    page.goto((DESIGN / "icon.html").as_uri())
    page.wait_for_timeout(300)
    icon = page.locator("#i")
    icon.screenshot(path=str(DESIGN / "icon-512.png"), omit_background=True)
    # Küçük boyutlar için sadeleştirilmiş çizim (dalgalı çizgi yok, harf daha büyük)
    page.evaluate("document.getElementById('i').classList.add('small')")
    small_path = pathlib.Path(tmp) / "icon-small.png"
    icon.screenshot(path=str(small_path), omit_background=True)

    big, small = Image.open(DESIGN / "icon-512.png"), Image.open(small_path)
    for size in (16, 32, 48, 128):
        src = big if size >= 48 else small
        src.resize((size, size), Image.LANCZOS).save(ROOT / "icons" / f"icon{size}.png", optimize=True)
    big.save(ROOT / "docs" / "icon.png", optimize=True)

    page = browser.new_page(viewport={"width": 1280, "height": 640})
    page.goto((DESIGN / "banner.html").as_uri())
    page.wait_for_timeout(500)
    page.locator("#b").screenshot(path=str(ROOT / "docs" / "banner.png"))

    browser.close()

print("icons/ ve docs/banner.png güncellendi")
