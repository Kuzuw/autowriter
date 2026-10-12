# Katkıda bulunma

Autowriter'a katkı yapmak istediğin için teşekkürler. Hata bildirimleri, öneriler ve pull request'ler açıktır.

## Geliştirme ortamı

Derleme adımı yok; eklenti düz JavaScript, HTML ve CSS'ten oluşur.

1. Repoyu klonla: `git clone https://github.com/Kuzuw/autowriter`
2. `chrome://extensions` sayfasında **Geliştirici modu**'nu aç, **Paketlenmemiş öğe yükle** ile klasörü seç.
3. Kodu değiştirdikten sonra eklenti kartındaki yenile düğmesine bas ve denediğin sekmeyi yenile.
4. Denemek için `test/playground.html` dosyasını tarayıcıda aç (dosya URL'lerinde çalışması için eklenti ayrıntılarından "Dosya URL'lerine erişime izin ver"i aç) ya da `python3 -m http.server` ile sun.

## Testler

```bash
npm test         # yazma motoru testleri + manifest kontrolü
npm run build    # dist/autowriter-<sürüm>.zip üretir
```

Yazma motoru (`engine.js`) DOM'dan bağımsızdır. Motoru değiştirirsen `test/engine.test.js` içindeki temel kural hep geçmeli: hatalar ne olursa olsun, sonuçta yazılan metin kaynak metinle birebir aynı olmalı.

## Pull request kuralları

- Bir PR tek bir konuyu çözsün.
- Kullanıcıya görünen metinler Türkçe, kısa ve net olsun.
- Yeni bir izin (`permissions`) eklemen gerekiyorsa PR açıklamasında nedenini yaz.
- `CHANGELOG.md` dosyasının en üstüne bir satır ekle.

## Görseller

İkon ve banner `design/` klasöründeki HTML dosyalarından üretilir:

```bash
python3 design/render_icons.py
```
