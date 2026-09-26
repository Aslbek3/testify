# G'oyalar yig'indisi

Boshqa ilovalardan va maketlardan yig'ilgan g'oyalar. **Bu ro'yxat — qaror
emas, xom material.** Hammasi yig'ilib bo'lgach, bir marta o'tirib
baholanadi va keyin reja tuziladi.

Har bir g'oya uchta narsa bilan yoziladi:
- **Manba** — qayerdan olindi (maket fayli, ilova nomi)
- **Bizda nima bor** — hozirgi holat, aniq fayl bilan
- **Narxi** — arzon / o'rtacha / katta (bazaga o'zgarish kerakmi?)

Baho ustuni ataylab bo'sh: uni Aslbek to'ldiradi.

---

## Manba 1 — Manus maketlari (2026-09-23)

Fayllar: `maket-ustoz.png`, `maket-oquvchi.png`, `maket-qabulxona.png`

Maketning ~70% i bizda allaqachon bor (navy sidebar, turkuaz brend, stat
plitkalar, "Bugungi ishlar" paneli, faollik grafigi). Quyidagilar —
haqiqatan yangi bo'lganlari.

| # | G'oya | Bizda nima bor | Narxi | Baho |
|---|---|---|---|---|
| 1 | **"Mening o'quv yo'lim"** — mavzular raqamlangan ketma-ketlikda: `01 Yo'l belgilari ✓ Tugallangan`, `02 Harakat qoidalari · Davom etmoqda`, `03 Birinchi yordam · 72%` | O'quvchi mavzularni tartibsiz ko'radi — "qaysi birini birinchi o'qiyman?" degan savolga javob yo'q | O'rtacha (`Topic.order` maydoni) | |
| 2 | **Telefon raqami qabulxonada** — jadvalda asosiy ustun | `User.phone` bor va `qabulxona/page.tsx:120` da ko'rsatiladi, lekin **hech qayerda to'ldirilmaydi** — doim email chiqadi | Arzon (faqat forma maydoni) | |
| 3 | **"Bo'sh joylar — 12 / 2 ta guruh"** | Guruhda sig'im tushunchasi umuman yo'q | O'rtacha (`Group.capacity`) | |
| 4 | **Kutilayotgan to'lov summasi** — "3 ta / 1 350 000 so'm" | Soni bor, summasi yo'q | Arzon | |
| 5 | **"Murojaatlar — 4 ta javob kutilmoqda"** | Yo'q. Bu aslida "Xabarlar" g'oyasi, boshqa nom bilan | Katta | |

### Shu maketdan OLINMAYDIGANLARI

| Nima | Nega |
|---|---|
| ALL CAPS yorliqlar (`MENING ISHLARIM`, `USTOZ PANELI`) | `CLAUDE.md`: "ALL CAPS yorliqlar ishlatilmaydi" — ataylab tashlangan |
| "+8% o'tgan oyga" har bir plitkada | Tarixiy sonlar bazada saqlanmaydi. Hozir yozsak — **yolg'on raqam** |
| Ikkita logo (sidebar va header) | Joy isrofi, ma'no qo'shmaydi |
| "12-may, 2025" sana plitkasi | Bosilmaydi, filtr emas — bezak |
| 4 ta stat plitkasida bitta ikonka | Bizda har biri boshqa (`trophy`, `users`, `clipboardCheck`, `chart`) — bizniki to'g'ri |

---

## Manba 2 — Oson Prava ilovasi (2026-09-26)

Fayllar: `osonprava-*.jpg` (10 ta ekran). Raqobatchi B2C mobil ilova —
bizdan farqi: u bitta o'quvchiga sotiladi, biz avtomaktabga sotamiz.
Shuning uchun har bir g'oya "avtomaktabga nima beradi?" degan savoldan
o'tkazilgan.

### A. Kontent g'oyalari — bizda bu bo'lim UMUMAN yo'q

Bizda faqat **savollar** bor. Ma'lumotnoma (o'qib yodlaydigan narsa)
yo'q. Oson Pravada esa butun bir bo'lim.

| # | G'oya | Tafsilot | Narxi | Baho |
|---|---|---|---|---|
| 6 | **Shpargalkalar** (`osonprava-shpargalkalar.jpg`) | "Imtihonda ko'p uchraydigan, yodlash qiyin ma'lumotlar": ruxsat etilgan tezlik, tezlik va reaksiya, to'xtash taqiqlangan masofa, favqulodda to'xtash belgisi, gabarit o'lchamlari, yuk joylashtirish, shatakka olish, shina naqshlari | O'rtacha (yangi model yoki statik kontent) | |
| 7 | **Jadval ko'rinishidagi shpargalka** (`osonprava-shpargalka-tezlik.jpg`, `-jarima.jpg`) | Raqam chapda katta va rangli, matn o'ngda. "100 km/soat — Yengil avto". Jarima ballari: "Kichik xatolik — 9 ta", har biri "5 ball" | Arzon (shakl, kontent alohida) | |
| 8 | **Yo'l belgilari katalogi** (`osonprava-yol-belgilari.jpg`) | Kategoriya bo'yicha, haqiqiy belgi rasmi bilan, soni ko'rsatilgan: Ogohlantiruvchi 51 ta, Taqiqlovchi 39 ta, Axborot-ishora 87 ta... | Katta (~300 ta belgi rasmi kerak) | |
| 9 | **Darslik** (`osonprava-asosiy-1.jpg`) | "1-dars. Ogohlantiruvchi..." — mavzu bo'yicha o'qish materiali. Manba 1 dagi **"Mening o'quv yo'lim"** (#1) bilan bir xil g'oya, boshqa tomondan | Katta | |

### B. Test rejimi g'oyalari

| # | G'oya | Bizda nima bor | Narxi | Baho |
|---|---|---|---|---|
| 10 | **Imtihon 3-xatoda avtomatik to'xtaydi** (`osonprava-imtihon.jpg`) | `EXAM_MAX_WRONG = 2` bor, lekin u faqat **o'tish balli** uchun ishlatiladi (`examRules.ts:22`). Imtihon oxirigacha davom etaveradi | Arzon | |
| 11 | **Savol sonini tanlash: 50 / 100 / 200 / 500** (`osonprava-savol-soni.jpg`) | Bizda "Maraton" bor, lekin soni qat'iy | Arzon | |
| 12 | **Biletlarda filtr: Barchasi / Yangi / Xatolar** (`osonprava-biletlar.jpg`) | Biletlar bor, filtr yo'q | Arzon | |
| 13 | **Mavzular kategoriyaga guruhlangan + savol soni** (`osonprava-mavzular.jpg`) | Mavzular tekis ro'yxat. "YO'L BELGILARI" kabi katta guruh yo'q | Arzon (`Topic.category`) | |
| 14 | **"Chalg'ituvchi" savollar** (`osonprava-asosiy-2.jpg`) | Yo'q. Bu — ko'pchilik qoqiladigan savollar to'plami. `docs/loyiha-holati.md` dagi "savol sifati statistikasi" g'oyasining **o'quvchi tomoni** | O'rtacha | |
| 15 | **Saqlanganlar** (xatcho'p) | Yo'q. O'quvchi savolni belgilab qo'yadi, keyin qaytadi | Arzon | |
| 16 | **Savolga shikoyat (bayroqcha)** — imtihon sarlavhasidagi flag tugmasi | Yo'q. Bu — men taklif qilgan "xabarlar"ning arzon muqobili: o'quvchi noto'g'ri savolni belgilaydi, owner ko'radi | Arzon | |
| 17 | **Raqamli savollar** | Yo'q. Ichida raqam bor savollar alohida (yodlash uchun) | Arzon | |

### C. Motivatsiya g'oyalari

| # | G'oya | Bizda nima bor | Narxi | Baho |
|---|---|---|---|---|
| 18 | **Kunlik progress paneli** (`osonprava-asosiy-1.jpg`) — `4%` · ⚡`1 kun` · ✓65 ✗6 —1189 + progress chizig'i | Streak bor (`profile.ts:83`), lekin **profil sahifasida yashiringan**, asosiy panelda yo'q | Arzon | |
| 19 | **"Sanani o'zgartirish"** — imtihon sanasini kiritish, qolgan kunlar sanaladi | Yo'q. Avtomaktab uchun juda mos: ustoz guruhning imtihon sanasini biladi | O'rtacha | |
| 20 | **Oktagon — 1x1 jang** (`osonprava-asosiy-2.jpg`) | Yo'q. **Bizda kuchliroq shakli mumkin**: guruh ichida musobaqa (ustozning 30 o'quvchisi bir-biri bilan) | Katta | |
| 21 | **"Xatolarni tuzatish" qizil badge bilan** | "Xatolarim" bor, lekin son badge'i asosiy panelda ko'rinmaydi | Arzon | |

### Shu manbadan OLINMAYDIGANLARI

| Nima | Nega |
|---|---|
| **Imtihonda yashil/qizil savol lentasi** (`osonprava-imtihon.jpg`) | Oson Prava imtihon paytida qaysi javob to'g'ri ekanini oshkor qiladi. Bizda bu ataylab qilinmagan (`TestRunner.tsx:380` izohi): imtihonda faqat "javob berilgan/berilmagan" ko'rinadi. **Bizniki to'g'ri** |
| Avtodrom, Imtihon markazlari | Amaliy haydash va manzillar — avtomaktabning o'zi biladi, platformaga aloqasi yo'q |
| Ovozli sharh | Har bir savolga audio — juda qimmat, foydasi noaniq |
| Neon-yashil + ko'k gradient ranglar | Bizning brend turkuaz. Bu ilova ranglari bir-biriga zid (yashil, ko'k, qizil, sariq bir ekranda) |

---

<!-- Keyingi manbalar shu yerga qo'shiladi: "## Manba 3 — <ilova nomi> (sana)" -->
