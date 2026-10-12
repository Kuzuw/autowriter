# Değişiklik günlüğü

Bu projedeki önemli değişiklikler burada tutulur.
Biçim [Keep a Changelog](https://keepachangelog.com/tr-TR/1.1.0/) esaslıdır, sürümler [SemVer](https://semver.org/lang/tr/) izler.

## [1.1.0] - 2026-10-13

### Eklenenler
- Popup'ta canlı önizleme: gerçek yazma motoru, ayarlarınla birlikte hata yapıp düzelterek yazar.
- Dört hazır yazış tarzı: Sakin, Doğal, Hızlı, Usta. Ayrıntılı ayarlar "İnce ayar" altında.
- Panodaki metnin uzunluğu ve ilk kelimeleri popup'ta görünür.
- Sayfa içi durum balonu: ilerleme çubuğu, yüzde, `Esc` ile durdurma, bitince karakter ve düzeltme sayısı.
- Alan seçerken "Buraya yaz" etiketi.
- Açık ve koyu tema (sistem ayarını izler).
- Yeni ikon ve görsel kimlik.
- `npm test`, `npm run build`, manifest doğrulaması, GitHub Actions ile CI ve sürüm paketleme.
- `test/playground.html` deneme sayfası.

### Değişenler
- Durum balonu Shadow DOM içinde çizilir; sitelerin CSS'i görünümünü bozmaz.

## [1.0.0] - 2026-10-13

### Eklenenler
- İlk sürüm: panodaki metni seçilen alana insan gibi yazma.
- Komşu tuş, çift basma, harf yer değiştirme ve harf atlama hataları; fark edip silme ve düzeltme.
- Popup, `Alt+Shift+W` kısayolu ve sağ tık menüsü.

[1.1.0]: https://github.com/Kuzuw/autowriter/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/Kuzuw/autowriter/releases/tag/v1.0.0
