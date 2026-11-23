# ishlab-chiqarish

Ishlab chiqarish zavodi (sexi) uchun boshqaruv dasturi. Xomashyo ombori, ishlab chiqarish, brak, sotuv, qarzlar, xarajatlar, ish haqi va foydani bitta joyda yuritadi.

O'rnatish talab qilinmaydi: dastur brauzerda ishlaydi, server va internet kerak emas.

## Ishga tushirish

1. Repozitoriyni yuklab oling (**Code → Download ZIP**) va arxivdan chiqaring.
2. `index.html` faylini brauzerda (Chrome, Edge, Firefox) oching.
3. Sinab ko'rish uchun bosh sahifada **«Namuna ma'lumotlarni yuklash»** tugmasini bosing.

Yoki GitHub Pages orqali internetda oching: **Settings → Pages → Branch: main → Save**.

## Imkoniyatlar

| Bo'lim | Nima qiladi |
|---|---|
| 🏠 **Bosh sahifa** | Oylik tushum, sof foyda, ombor qiymati, qarzlar, 14 kunlik grafik, kam qolgan xomashyo, so'nggi amallar |
| 📦 **Xomashyo ombori** | Qoldiq, o'rtacha narx, minimal qoldiq (kam qolsa ogohlantiradi) |
| 🚚 **Xomashyo kirimi** | Yetkazib beruvchidan kirim. Qoldiq va o'rtacha narx avtomatik yangilanadi, qarzga olish ham mumkin |
| 🤝 **Yetkazib beruvchilar** | Ro'yxat, ularga qarzimiz, to'lovlar tarixi |
| 🏷️ **Mahsulotlar va ombor** | Tayyor mahsulot qoldig'i, retsept (tarkib), avtomatik tannarx va 1 birlikdan foyda |
| 🏭 **Ishlab chiqarish** | Jurnal: sana, mahsulot, sifatli miqdor, brak, xodim. Retsept bo'yicha xomashyo avtomatik ayiriladi, yetmasa ogohlantiradi |
| ⚠️ **Brak va isrof** | Ishlab chiqarishdagi brak va hisobdan chiqarilgan (yaroqsiz, muddati o'tgan, shikastlangan) xomashyo yoki mahsulot, zarar summasi bilan |
| 💰 **Sotuv** | Sotuv, to'lov yoki qarz, har bir sotuvdan foyda |
| 👥 **Mijozlar va qarzlar** | Mijozlar, ularning qarzi, to'lov qabul qilish |
| 🧾 **Xarajatlar** | Svet, gaz, ijara, transport, ish haqi va boshqalar, turlar bo'yicha taqsimot |
| 📊 **Hisobotlar** | Foyda va zarar, pul oqimi, mahsulotlar bo'yicha sotuv, ishlab chiqarish, xomashyo sarfi. Chop etish mumkin |
| 👷 **Xodimlar va ish haqi** | Oylik yoki ishbay (dona uchun) ish haqi, avtomatik hisoblash va to'lash |
| ⚙️ **Sozlamalar** | Zavod nomi, kirish paroli, zaxira nusxa (yuklab olish va tiklash), hammasini Excelga yuklash |

Har bir sahifadagi jadvallarni yuqoridagi **📊 Excel** tugmasi bilan yuklab olish mumkin. Internet bo'lmasa fayl CSV formatda saqlanadi, uni ham Excel ochadi.

## Muhim

- Ma'lumotlar **shu kompyuterning shu brauzerida** saqlanadi (`localStorage`). Boshqa kompyuterda ular ko'rinmaydi.
- Brauzer tarixini ("sayt ma'lumotlari"ni) tozalasangiz, ma'lumotlar o'chib ketadi. Shuning uchun **Sozlamalar → Zaxira nusxani yuklab olish** orqali muntazam (masalan, har kuni) zaxira oling.
- Kirish paroli begona odamlar dasturni ochmasligi uchun. U kuchli himoya emas: ma'lumotlar shifrlanmaydi.

## Tuzilishi

```
index.html        — asosiy sahifa
css/style.css     — dizayn (yorug' va qorong'i rejim, telefonga moslashgan)
js/core.js        — ma'lumotlar bazasi, hisob-kitoblar, amallar (kirim, ishlab chiqarish, sotuv...)
js/ui.js          — oyna, forma, jadval, Excel eksport
js/pages.js       — barcha sahifalar
js/demo.js        — namuna ma'lumotlar
js/app.js         — menyu, sahifalar almashinuvi, parol
```
