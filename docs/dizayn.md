# Dizayn tizimi

Oxirgi yangilanish: 2026-09-21

Bu hujjat — dizaynning **yagona manbasi**. Kod shunga qarab yoziladi,
aksincha emas. Tokenlarning o'zi `src/app/globals.css` da; bu yerda ular
nima uchun shunday ekani va qaysi qoidalar amal qilishi yozilgan.

Manba: `Testify production frontend design specification` hujjati va
unga ilova qilingan maketlar (kirish sahifasi, direktor paneli).

---

## 1. Ranglar

Barcha ranglar `globals.css` dagi CSS tokenlaridan olinadi. **Komponentda
bevosita hex yozilmaydi** — istisno faqat test ekrani (pastga qara).

| Token | Yorug' | Vazifasi |
|---|---|---|
| `--bg` | `#ffffff` | Kartochka/sirt. Nomi tarixiy: 100+ joyda ishlatilgan |
| `--bg-subtle` | `#f4f7fb` | Sahifa foni |
| `--surface-2` | `#edf3f8` | Kartochka ICHIDAGI to'ldirish (shkala yo'li, jadval sarlavhasi) |
| `--border` | `#dfe8f0` | Asosiy chegara |
| `--border-subtle` | `#edf2f6` | Ro'yxat qatorlari orasidagi ajratgich |
| `--text` | `#112337` | Asosiy matn |
| `--text-muted` | `#718297` | Ikkinchi daraja |
| `--text-faint` | `#93a3b6` | Uchinchi daraja: izoh, birlik, vaqt |
| `--brand` | `#0ea79a` | Turkuaz — asosiy amal |
| `--brand-hover` | `#0c8f84` | Bosilganda |
| `--brand-soft` | `#dff6f2` | Yumshoq fon |
| `--navy` | `#0b1930` | Sidebar, to'q bloklar, test ekrani |
| `--info` / `--purple` | `#367fd4` / `#765ac8` | **Faqat** ko'rsatkichlarni ajratish uchun |
| `--success` | `#0ea79a` | Brend bilan bir xil — spetsifikatsiyada `Faol/Tasdiqlangan/To'langan` aynan shu rangda |
| `--warning` | `#b87911` | E'tibor kerak |
| `--danger` | `#c74352` | **Faqat haqiqiy muammo** |

### Qorong'i rejim

Qiymatlar `:root` da `--d-*` prefiksi bilan **bir marta** e'lon qilinadi,
keyin ikkita selektor (tizim afzalligi va qo'lda tanlangan `dark`) ularni
ulaydi. Ilgari palitra ikki joyda to'liq takrorlanardi va biri
o'zgartirilganda ikkinchisi orqada qolardi.

Spetsifikatsiya "faqat yorug' mavzu" degan, lekin ilovada ishlayotgan
`ThemeToggle` bor — uni olib tashlash orqaga qadam bo'lardi.

### Rang qoidalari

1. **Rang — ma'no, bezak emas.** Qizil faqat pul yoki kirish bloklangan
   holat uchun. Sariq — e'tibor kerak. Ko'k — bilib qo'yish uchun.
2. **Yordamchi ranglar** (`info`, `purple`) uzun matnga ham, holatga ham
   ishlatilmaydi — faqat ikonka doirasi.
3. **Faqat bitta to'ldirilgan tugma** bir blokda. Qolganlari oq yoki
   ko'rinmas.

---

## 2. Tipografika

| Rol | Shrift | Ishlatilishi |
|---|---|---|
| Sarlavha, katta raqam | **Space Grotesk** | `font-display` |
| Matn | **DM Sans** | `font-sans` (standart) |
| Jadvaldagi raqam | **JetBrains Mono** | `font-mono` |

O'lchamlar:

- Sahifa sarlavhasi — 26px mobil / 30px desktop, `tracking-[-0.04em]`
- Bo'lim sarlavhasi (`CardTitle`) — 16px, 700
- Matn — 13-14px
- Izoh — 11-12px

⚠️ **ALL CAPS yorliqlar ishlatilmaydi.** Ajratish rang, qalinlik va fon
bilan qilinadi. Bu `CLAUDE.md` qoidasi va u istisnosiz amal qiladi.

---

## 3. Shakl va chuqurlik

| Token | Qiymat | Nima uchun |
|---|---|---|
| `rounded-sm` | 8px | Ikonka kvadrati, kichik belgi |
| `rounded-md` | 11px | Tugma, kiritish maydoni |
| `rounded-lg` | 17px | Kartochka |
| `rounded-xl` | 20px | Modal, hero blok |
| `shadow-card` | `0 12px 30px rgb(16 32 51 / .055)` | Oq sirtni fondan ajratadi |
| `shadow-raised` | `0 18px 50px rgb(16 32 51 / .08)` | Ko'tarilgan blok |
| `shadow-pop` | `0 24px 70px rgb(16 32 51 / .16)` | Modal |

Qoida: **ajratish uchun chegara, ierarxiya uchun soya — ikkalasi ham
keskin emas.**

---

## 4. Ikonkalar

Yagona to'plam: `src/components/Icon.tsx` (~40 ta). Kutubxona
ishlatilmaydi — `lucide-react` 1400+ ikonka va yangi bog'liqlik olib
kelardi, bizga esa 40 tasi yetadi.

- 24×24 katak, chiziq uslubi, qalinligi 1.75
- Rang `currentColor` dan — ikonka o'zi turgan matn rangiga ergashadi

**Uslub qoidasi:** pastel doira ichidagi ikonka ham chiziqli qoladi.
(Maketda ular to'ldirilgan edi, lekin ikki xil uslubni aralashtirish
to'plamni ikkiga bo'lib yuborardi.)

---

## 5. Komponentlar

| Komponent | Vazifasi |
|---|---|
| `PageHeader` | Sahifa sarlavhasining yagona tuzilishi: kontekst → sarlavha → bir jumla → amal |
| `Card` · `CardHeader` · `CardTitle` · `CardNote` | Bazaviy konteyner |
| `Button` | 6 variant (`primary`, `secondary`, `ghost`, `danger`, `ghost-dark`, `outline-dark`), 3 o'lcham |
| `Badge` | Holat yorlig'i — rang + nuqta + matn |
| `StatTile` | Ko'rsatkich: rangli ikonka doirasi + yorliq + katta raqam |
| `Table` | Jadval; mobilda gorizontal scroll ishorasi bilan |
| `Field` · `PasswordField` | Kiritish maydonlari, umumiy `INPUT_CLASS` |
| `Modal` | Yopish tugmasi bilan; `md` va `lg` |
| `EmptyState` | Bo'sh holat: ikonka + sabab + keyingi qadam |
| `TaskCard` | "Bugungi ish" — barcha rollar uchun (`lib/tasks.ts`) |
| `CompareBar` | Taqqoslash shkalasi, o'rtacha chizig'i bilan |
| `SummaryStrip` | Jurnal tepasidagi xulosa raqamlari |
| `Breadcrumb` | Yo'l ko'rsatkich |
| `JournalToolbar` | Filtr va qidiruv — server komponenti, URL orqali |
| `Icon` | Ikonka to'plami |

### Qoidalar

1. **Kartochkaga o'z-o'zidan ishlaydigan hover-animatsiya qo'shilmaydi.**
   Harakat faqat foydalanuvchi harakatiga javoban. Istisno — kartochkaning
   o'zi havola bo'lsa (u bosiladigan element, bezak emas).
2. **Har bir bo'sh holatda keyingi qadam tugmasi bo'ladi** (`EmptyState`).
3. **Klient komponentiga funksiya prop uzatilmaydi** — React uni
   seriyalay olmaydi. Havola kerak bo'lsa PREFIKS satri uzatiladi
   (`studentBasePath="/oquvchi"`).

---

## 6. Ekranlarning o'ziga xos qoidalari

### Jurnallar (`/director/guruhlar`, `/ustozlar`, `/oquvchilar`)

Jurnalning ishi — **taqqoslash**. Har bir shkalada o'rtacha qiymat qora
vertikal chiziq bilan belgilanadi va u **hamma qatorda bir xil joyda**
turadi. Foizlarni bir-biriga solishtirib chiqish shart emas.

Filtr va qidiruv URL orqali: filtrlangan ro'yxatni havola sifatida
yuborish mumkin, "orqaga" tugmasi ishlaydi, JavaScriptsiz ham ochiladi.

### Obyekt sahifalari (`/guruh/[id]`, `/ustoz/[id]`, `/oquvchi/[id]`)

Bitta obyekt — bitta sahifa, **barcha rollar uchun**. Mazmun bir xil,
amallar `lib/permissions.ts` javoblariga qarab qo'shiladi. Havola hamma
joydan bir xil: `/guruh/{id}`.

### Test ekrani

Yagona **to'q (navy)** ekran. Sabab: test ishlash — diqqat talab
qiladigan yagona ish, oq panelda esa savol bilan birga boshqa hamma narsa
ko'rinadi.

Bu ekranda ranglar ataylab **bevosita yoziladi** (`#34d399`, `#f87171`,
`#fbbf24`): tokenlardagi qiymatlar (masalan `--success` = `#0ea79a`) navy
fonda yetarlicha ajralib turmaydi.

### "Bugungi ish" paneli

Yozish qoidalari `src/lib/tasks.ts` izohida:

1. Sarlavha — **muammoning o'zi, son bilan**. «3 ta chek tasdiq kutmoqda»,
   «To'lovlarni tekshirish» emas
2. Izoh — qaror uchun kerakli fakt
3. Tugma — **fe'l**. «Tasdiqlash», «Ko'rish» emas
4. Daraja chap chiziq bilan beriladi, faqat rang bilan emas
5. Bo'sh bo'lsa ham chiziladi — aksariyat kunlari ro'yxat bo'sh bo'ladi

---

## 7. Mobil

- Barmoq nishoni kamida **44px** (`py-3`, desktopda `pointer-fine:py-2`)
- Sahifa hech qachon gorizontal scroll bermaydi; jadval o'z konteyneri
  ichida suriladi
- O'quvchida pastki panel (Umumiy · Mashq · Imtihon · Xatolarim · Menyu)
- Jurnal jadvallari 720px dan tor ekranda ham surilishi mumkin, lekin
  taqqoslash chizig'i saqlanadi

---

## 8. Chop etish

`@media print` (`globals.css`): sidebar, tugmalar va soyalar olib
tashlanadi, havolalar oddiy matnga aylanadi, jadval qatori sahifa
chegarasida bo'linmaydi.

Sabab: jurnal qog'ozda ham ishlatiladi — avtomaktabda yig'ilishga chop
etilgan ro'yxat bilan kiriladi.
