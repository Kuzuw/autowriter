"""Source of truth for UI strings. Run `python3 scripts/locales.py` to regenerate _locales/*/messages.json."""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent

# key: (English, Turkish)
M = {
    "extName": ("Autowriter", "Autowriter"),
    "extDescription": (
        "Types your copied text into any field like a real person: uneven rhythm, realistic typos and corrections.",
        "Kopyaladığın metni seçtiğin alana insan gibi yazar: değişken hız, gerçekçi yazım hataları ve düzeltmeler.",
    ),
    "cmdStart": (
        "Type the copied text into the focused field (press again to stop)",
        "Kopyalanan metni odaktaki alana yaz (tekrar basınca durur)",
    ),
    "menuTypeHere": ("Autowriter: type here", "Autowriter: metni buraya yaz"),

    # popup
    "githubTitle": ("Open on GitHub", "GitHub'da aç"),
    "previewLabel": ("Live preview", "Canlı önizleme"),
    "previewSample": (
        "Hi! I'm not the one typing these lines, Autowriter is. Now and then it misses a key, notices, and fixes it.",
        "Merhaba! Bu satırları ben yazmıyorum, Autowriter yazıyor. Arada bir tuşu kaçırıyor, fark edip düzeltiyor.",
    ),
    "metaSpeed": ("$1 wpm, $2% typos", "$1 kelime/dk, %$2 hata"),
    "fixesOne": ("1 fix", "1 düzeltme"),
    "fixesMany": ("$1 fixes", "$1 düzeltme"),
    "sourceLabel": ("Text source", "Metin kaynağı"),
    "sourceClipboard": ("Copied text", "Kopyaladığım metin"),
    "sourceCustom": ("My own text", "Kendi metnim"),
    "clipReading": ("Reading the clipboard…", "Panodaki metin okunuyor…"),
    "clipEmpty": ("The clipboard is empty. Copy the text you want typed first.", "Pano boş. Önce yazdırmak istediğin metni kopyala."),
    "clipChars": ("$1 characters: ", "$1 karakter: "),
    "customPlaceholder": ("Paste the text to type here", "Yazılacak metni buraya yapıştır"),
    "styleHead": ("Typing style", "Yazış tarzı"),
    "presetCalm": ("Calm", "Sakin"),
    "presetNatural": ("Natural", "Doğal"),
    "presetFast": ("Fast", "Hızlı"),
    "presetPro": ("Pro", "Usta"),
    "layoutLabel": ("Keyboard", "Klavye"),
    "layout_en": ("English (QWERTY)", "İngilizce (QWERTY)"),
    "layout_tr_q": ("Turkish Q", "Türkçe Q"),
    "layout_tr_f": ("Turkish F", "Türkçe F"),
    "layout_de": ("German (QWERTZ)", "Almanca (QWERTZ)"),
    "layout_fr": ("French (AZERTY)", "Fransızca (AZERTY)"),
    "layout_es": ("Spanish (QWERTY)", "İspanyolca (QWERTY)"),
    "layout_dvorak": ("Dvorak", "Dvorak"),
    "tune": ("Fine-tune", "İnce ayar"),
    "speed": ("Speed", "Hız"),
    "typoRate": ("Typo rate", "Hata oranı"),
    "startDelay": ("Delay before typing", "Başlamadan önce bekle"),
    "wpmValue": ("$1 wpm", "$1 kelime/dk"),
    "percentValue": ("$1%", "%$1"),
    "delayNow": ("none", "hemen"),
    "delaySeconds": ("$1 s", "$1 sn"),
    "startBtn": ("Pick a field and type", "Alan seç ve yaz"),
    "stopBtn": ("Stop", "Durdur"),
    "errCustomEmpty": ("Your text is empty. Paste something into the box.", "Yazılacak metin boş. Kutucuğa bir metin yapıştır."),
    "errNoTab": ("No open tab found.", "Açık bir sekme bulunamadı."),
    "errRestricted": (
        "The browser doesn't allow extensions on this page. Try a regular web page.",
        "Tarayıcı bu sayfada eklentilere izin vermiyor. Normal bir web sayfasında dene.",
    ),
    "stoppedMsg": ("Typing stopped.", "Yazma durduruldu."),
    "scFocused": ("Type into the focused field", "Odaktaki alana yaz"),
    "scStop": ("Stop", "Durdur"),
    "scRightClick": ("Right-click", "Sağ tık"),

    # page overlay
    "statusTyping": ("Typing", "Yazıyor"),
    "statusCountdown": ("Starting in $1 s", "$1 saniye sonra başlıyor"),
    "statusDone": ("Done: $1 characters", "Bitti: $1 karakter"),
    "statusDoneFixes": ("Done: $1 characters, $2 fixes", "Bitti: $1 karakter, $2 düzeltme"),
    "statusStopped": ("Typing stopped", "Yazma durduruldu"),
    "statusFailed": ("Couldn't type: $1", "Yazılamadı: $1"),
    "pickPrompt": ("Click the field to type into", "Yazılacak alana tıkla"),
    "pickNotField": ("That's not a text field. Click a text box", "Burası bir yazı alanı değil. Bir metin kutusuna tıkla"),
    "pickTag": ("Type here", "Buraya yaz"),
    "btnStop": ("Stop", "Durdur"),
    "btnCancel": ("Cancel", "İptal"),
    "toastPassword": ("Password fields are skipped for safety.", "Güvenlik için şifre alanlarına yazmıyorum."),
    "toastFocusFirst": ("Click into a text field first, then press the shortcut.", "Önce yazılacak alana tıkla, sonra kısayola bas."),
    "toastNoField": ("No editable field found.", "Yazılabilir bir alan bulunamadı."),
}

for i, lang in enumerate(("en", "tr")):
    out = {k: {"message": v[i]} for k, v in M.items()}
    d = ROOT / "_locales" / lang
    d.mkdir(parents=True, exist_ok=True)
    (d / "messages.json").write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"{len(M)} messages written for en, tr")
