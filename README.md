# ✍️ Autowriter

Kopyaladığın metni seçtiğin alana **insan gibi** yazan Chrome eklentisi (Manifest V3).
Harfleri tek tek yazar; arada yanlış tuşa basar, farkına varır, siler ve doğrusunu yazar.

## Özellikler

- Değişken yazma hızı (kelime/dk), ritim dalgalanması, noktalama ve satır sonlarında duraklama, ara sıra "düşünme" molası
- Gerçekçi yazım hataları (Türkçe Q klavye komşuluğuna göre):
  - yanındaki tuşa basma
  - harfi iki kez yazma
  - iki harfin yerini değiştirme
  - harf atlama
  - birkaç harf sonra fark edip silme ve doğrusunu yeniden yazma
- `input`, `textarea` ve `contenteditable` alanlarında çalışır (iframe ve shadow DOM dahil)
- Metin kaynağı: panodaki metin veya popup'ta yazdığın özel metin
- Ayarlanabilir hız, hata oranı ve başlamadan önce bekleme süresi
- `Esc` ile her an durdurma

## Kurulum

1. Repoyu indir: `git clone https://github.com/Kuzuw/autowriter`
2. Chrome'da `chrome://extensions` aç, sağ üstten **Geliştirici modu**'nu aç
3. **Paketlenmemiş öğe yükle** → `autowriter` klasörünü seç

(Edge, Brave gibi Chromium tabanlı tarayıcılarda da aynı şekilde çalışır.)

## Kullanım

Üç yol var:

1. **Popup ile alan seç:** Metni kopyala → eklenti ikonuna tıkla → **Alan seç ve yaz** → yazılmasını istediğin kutuya tıkla.
2. **Kısayol:** Metni kopyala, yazı alanına tıkla, `Alt+Shift+W` bas. Yazma sırasında tekrar basarsan durur.
   Kısayolu `chrome://extensions/shortcuts` adresinden değiştirebilirsin.
3. **Sağ tık:** Yazı alanına sağ tıkla → **Autowriter: metni buraya yaz**.

Durdurmak için `Esc`, ekrandaki **Durdur** düğmesi veya popup'taki **Durdur**.

## Notlar ve sınırlar

- Şifre alanlarına yazmaz.
- Tek satırlı `input` alanlarında satır sonu boşluğa çevrilir (formu yanlışlıkla göndermemek için).
- `chrome://` sayfaları ve Chrome Web Store gibi sayfalarda eklentiler çalışamaz.
- Canvas tabanlı özel editörlerde (ör. bazı çevrimiçi ofis uygulamaları) tuş olayları sayfaya
  farklı işlendiği için sonuç değişebilir.
- Eklentiyi yüklemeden önce açık olan sekmelerde popup'tan başlatınca içerik betiği otomatik eklenir;
  kısayol ve sağ tık için o sekmeyi yenilemek gerekebilir.

## Geliştirme

Yazma motoru (`engine.js`) DOM'dan bağımsızdır ve Node ile test edilir:

```bash
node test/engine.test.js
```

Dosyalar:

| Dosya | Görev |
| --- | --- |
| `engine.js` | İnsan gibi yazma algoritması (hız, duraklamalar, hata + düzeltme) |
| `content.js` | Sayfada alan seçme, metni alana yazma, durum balonu |
| `background.js` | Kısayol ve sağ tık menüsü |
| `popup.html/css/js` | Ayarlar ve başlatma arayüzü |

## Sorumlu kullanım

Bu araç; demo, test, ekran kaydı, erişilebilirlik ve kendi metinlerini daha doğal yazdırma gibi
amaçlar için. Ödev, sınav veya işveren/okul kurallarının yasakladığı yerlerde kullanmak sana ait sorumluluktur.
