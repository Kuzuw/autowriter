# Gizlilik

Autowriter hiçbir veri toplamaz, saklamaz ya da bir sunucuya göndermez.

- **Pano:** Panodaki metin yalnızca sen yazmayı başlattığında okunur ve sadece seçtiğin alana yazılır.
- **Ayarlar:** Hız, hata oranı, bekleme süresi ve "Kendi metnim" alanı tarayıcının yerel depolamasında (`chrome.storage.local`) tutulur. Bilgisayarından dışarı çıkmaz.
- **Ağ:** Eklenti hiçbir ağ isteği yapmaz. Analitik, takip ya da reklam yoktur.
- **Şifre alanları:** Güvenlik için şifre alanlarına yazmaz.

## İzinler ve nedenleri

| İzin | Neden |
| --- | --- |
| `activeTab`, `scripting` | Popup'tan başlattığında, eklenti kurulmadan önce açılmış sekmeye betiği ekleyebilmek için |
| `storage` | Ayarlarını hatırlamak için |
| `contextMenus` | Sağ tık menüsündeki "Autowriter: metni buraya yaz" seçeneği için |
| `clipboardRead` | Kopyaladığın metni okuyabilmek için |
| `<all_urls>` içerik betiği | Her sitedeki yazı alanlarında çalışabilmek için |

Sorun ya da soruların için: [GitHub Issues](https://github.com/Kuzuw/autowriter/issues)
