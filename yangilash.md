# Yangilash rejasi — autotestlar.uz tahlili asosida

Bu hujjat `autotestlar-funksional-xarita.html` faylidagi tahlilni **saytning
o'zida tekshirib** va **bizning kodimizning haqiqiy holati bilan solishtirib**
tayyorlangan. Fayldagi ba'zi da'volar noto'g'ri chiqdi — quyida ular alohida
belgilangan.

Sana: 2026-09-08 · Tekshirilgan: autotestlar.uz (jonli), Testify `main` tarmog'i

---

## 0. Eng muhim xulosa

Saytdan nusxa oladigan funksiyalardan **oldin** hal qilinishi kerak bo'lgan
uchta narsa bor. Bular raqobatchidan o'rganish emas — bizning o'z
bo'shliqlarimiz, va ular hal qilinmasa qolgan hamma narsa ma'nosiz:

| # | Muammo | Nega bloklovchi |
|---|---|---|
| B1 | **Ommaviy import yo'q** — savol faqat modal orqali bittalab qo'shiladi | Bazada 64 ta demo savol bor. Raqobatchida 1220 ta. 1220 ta savolni modal orqali kiritish real emas. Avtomaktab 64 ta o'ylab topilgan savol uchun pul to'lamaydi. |
| B2 | **Owner rasm yuklay olmaydi** | Savol formasida `imageAlt` maydoni bor, lekin rasmning o'zini biriktirish yo'li yo'q. Rasmlar `public/questions/` da qo'lda yotibdi (6 ta SVG) va git'ga tushadi. YHQ savollarining katta qismi rasmsiz ma'nosiz. |
| B3 | **Variantlar soni 4 ta deb qattiq kodlangan** | Haqiqiy YHQ savollarida 2, 3, 4 va 5 variant bor (saytda o'z ko'zim bilan tasdiqladim). Real bazani import qilsak, savollarni buzib 4 taga moslashtirishga majbur bo'lamiz. |

**B3 — fayldagi eng jiddiy xato.** Faylda "baza sxemasi buni allaqachon
qo'llab-quvvatlaydi (options massiv)" deyilgan. Sxema (Json) qo'llab-quvvatlaydi,
lekin **kod yo'q**. Qattiq kodlangan 7 ta joy:

| Fayl | Joy | Nima qiladi |
|---|---|---|
| `services/questions.ts:94` | `options.length !== 4` | 4 tadan boshqasini rad etadi |
| `services/questions.ts:103` | `correctOptionIndex > 3` | indeksni 0–3 bilan cheklaydi |
| `services/attempts.ts:150` | `selectedOptionIndex > 3` | javobni 0–3 bilan cheklaydi |
| `TestRunner.tsx:255` | `key >= "1" && key <= "4"` | klaviatura faqat 1–4 |
| `NewQuestionModal.tsx:13,26` | `["", "", "", ""]` | forma doim 4 ta maydon |
| `NewQuestionModal.tsx:116-119` | `<option value="0..3">` | to'g'ri javob tanlash 4 ta |
| `EditQuestionModal.tsx` | yuqoridagi bilan bir xil | — |

---

## 1. Saytda o'zim ko'rgan narsalar (fayldan tashqari yoki unga zid)

| Kuzatuv | Faylda nima yozilgan | Haqiqatda (jonli sessiyada tekshirildi) |
|---|---|---|
| **Imtihon rejimida javob** | "Oxirida ko'rsatiladi" | **Darhol ko'rsatiladi** — javob tanlanishi bilan to'g'risi yashil belgilanadi va IZOH ochiladi. Ikki marta qayta tekshirildi. Ya'ni ularning "imtihon" rejimi haqiqiy imtihon sharoitini taqlid qilmaydi. |
| **Mashq rejimida taymer** | Aytilmagan | **Bor** — 20:00 (20 savolga) |
| **Imtihon taymeri** | Aytilmagan | 25:00 — bizniki bilan bir xil |
| **Imtihonda xato limiti** | Aytilmagan | 2 tagacha ruxsat, **3-xatoda imtihon darhol to'xtaydi** — bizning `EXAM_MAX_WRONG = 2` bilan bir xil |
| **O'tish chegarasi** | Aytilmagan | Rejimga qarab har xil: mashq **70%**, bilet **90%**. Bizda EXAM = 90% (20 savol, 2 xato) — bilet bilan mos. |
| **Variantlar soni** | 2–5 ta | Tasdiqlandi va **5 tagacha borligi ko'rildi**. Bitta 20 savollik sessiyada ketma-ket: `3,2,2,3,3,3,3,4,5,5,4,4,3,3,2,3,5,3,3,3` |
| **Biletlar guruhlanishi** | Aytilmagan | Biletlar mavzu bo'yicha **guruhlanmagan** — 1 dan 122 gacha tekis raqamlash |
| **Biletda taymer** | Aytilmagan | **Yo'q** — biletda na taymer, na xato limiti. Faqat 10 savol + izoh. |
| **YHQ havolasi qamrovi** | "Har bir izohda" | **Qisman** — ba'zi izohlar shunchaki to'g'ri javob matnini takrorlaydi, qonun bandiga havolasiz |

**Bu bizga nima beradi:** ularning imtihon rejimi javobni darhol ochgani uchun
haqiqiy imtihonni taqlid qilmaydi. Bizniki (javob faqat yakunda) bu jihatdan
**kuchliroq** — buni o'zgartirmaymiz.

### 1.1 Ularda topilgan xatolik — biz takrorlamasligimiz kerak

Imtihon 3-xatoda to'xtaganda natija ekrani `1 TO'G'RI / 2 XATO / 17 JAVOBSIZ`
ko'rsatdi — ya'ni **halokatli 3-xato "xato" emas, "javobsiz" deb sanaldi**.
Sarlavhada esa "3 ta xato qilindi" yozilgan. Bitta ekranda ikkita zid raqam.

Biz 2.3-bandni (javobsizni ajratish) bajarganda aynan shu tuzoqqa tushmasligimiz
kerak: **yakunlash sababi bo'lgan javob ham hisobga kirishi shart**.

### 1.2 Bizda bor, ularda yo'q

Bularni saqlab qolamiz — allaqachon ustunligimiz:

| Bizda | Ularda |
|---|---|
| Yakunlashdan oldin tasdiqlash modali | Yo'q — tasodifan bosilsa test tugaydi |
| "Javobsiz savollar bor" ogohlantirishi | Yo'q |
| Javobni o'zgartirish imkoni | Yo'q — birinchi bosishdan keyin variantlar `disabled` |
| Imtihonda javob yakunda ochiladi | Yo'q — darhol ochiladi |
| Server tomonida taymer nazorati | Tekshira olmadim, lekin mehmon rejimida hamma narsa `localStorage`da — ya'ni klient nazorati |

---

## 2. Olish kerak bo'lgan funksiyalar

### 2.1 YHQ band raqami — izohda huquqiy asos ⭐ ustuvor

Ularning har bir izohi qonun bandiga ishora qiladi:

> "YHQ 21-bobi 128-bandiga asosan: Yo'lning 1.13 va 1.14 yo'l belgilari bilan
> belgilangan qiyaliklarida…"
>
> "YHQ 24-bobi 145-bandining oltinchi xatboshisiga asosan…"
>
> "YHQ 1-ilovasi 3.27"

**Nega B2B'da bu bizga ulardan ham muhimroq:** ustoz o'quvchi bilan bahslashganda
("nega bu javob to'g'ri?") qonun bandiga ko'rsata olishi kerak. Bu bizning
mijozimiz — avtomaktab — uchun sotuv argumenti. Bepul B2C saytda bu shunchaki
qulaylik, o'quv markazida esa metodik zarurat.

**Ish hajmi:** kichik. `Question` modeliga bitta maydon (`legalReference String?`),
migratsiya, Owner formasiga maydon, natija va mashq izohida ko'rsatish.
**Eslatma:** hozir `Question.category` degan **umuman ishlatilmaydigan** maydon
bor — uni o'chirish yoki shu maqsadda qayta ishlatish kerak.

### 2.2 Variantlar sonini moslashuvchan qilish ⭐ ustuvor

Yuqorida B3 da tavsiflangan. Real savollar bazasini olib kelishning sharti.

**Ish hajmi:** o'rta. 7 ta joy + Owner formasini "variant qo'shish / o'chirish"
qilib qayta yozish + klaviatura yorlig'ini variantlar soniga moslash.

### 2.3 Natijada "xato" va "javobsiz" ni ajratish ⭐ arzon va foydali

Ularning natija ekrani uchta raqam ko'rsatadi: **TO'G'RI · XATO · JAVOBSIZ**.

Bizda javobsiz qolgan savol shunchaki xato deb sanaladi va natijada ham
ko'rinmaydi. Lekin bu ikki xil muammo: 18 tasiga noto'g'ri javob bergan o'quvchi
bilimsiz, 18 tasiga ulgurmagan o'quvchi esa sekin. Ustozga bu farq kerak —
birinchisiga mavzuni qayta tushuntirish, ikkinchisiga vaqtni boshqarishni
o'rgatish kerak.

**Ish hajmi:** kichik. Ball hisoblash o'zgarmaydi (javobsiz baribir xato),
faqat `getAttemptResult` ga `unansweredCount` qo'shiladi va natija sahifasida
uchinchi raqam sifatida ko'rsatiladi.

### 2.4 Butun urinishni qayta ko'rish ("Ko'rib chiqish")

Ularda natijadan keyin ikkita tugma: **"Ko'rib chiqish"** (hamma savol) va
**"Xatolarim"** (faqat xatolar). "Ko'rib chiqish" alohida sahifa
(`/review/<attemptId>`) — savolma-savol o'tiladi, har birida tanlangan javob,
to'g'ri javob va izoh ko'rsatiladi.

Bizda faqat xatolar ko'rsatiladi. To'g'ri javob bergan savolni ham ko'rish
kerak — o'quvchi taxmin qilib to'g'ri tushgan bo'lishi mumkin va izohni o'qishi
kerak.

**Ish hajmi:** kichik-o'rta. `getAttemptResult` allaqachon hamma ma'lumotni
oladi, faqat `missedQuestions` bilan cheklab qo'yilgan.

### 2.5 Eski natijani qayta ochish 🔧 bizning kamchiligimiz

O'quvchi panelidagi "Urinishlar tarixi" jadvali **bosiladigan emas**. Natija
sahifasi (`/student/test/[attemptId]/natija`) mavjud, lekin unga tarixdan
havola yo'q — ya'ni o'quvchi kechagi imtihonini qayta ocha olmaydi.

**Ish hajmi:** juda kichik. Jadval qatorini havolaga aylantirish.

### 2.6 Klaviatura yorliqlarini ko'rsatish

Ularda test ekranining pastida doim yozilib turadi:
`←/A oldingi · →/D keyingi · 1–3 javob tanlash` — va **variantlar soniga
moslashadi**.

Bizda klaviatura ishlaydi (1–4, Enter), lekin foydalanuvchi bu haqda bilmaydi.
Ularda `1`–`5` raqamlari ham, `A`/`D` harflari ham ishlaydi (tekshirildi:
5 variantli savolda `5` bosilganda E tanlandi).

**Ish hajmi:** juda kichik. Lekin 2.2 (variantlar soni) bilan bog'liq — yorliq
matni variantlar soniga qarab yozilishi kerak.

### 2.8 Rasmni kattalashtirish 🔧 ikkalamizda ham yo'q

Ularda rasm bosilganda hech narsa bo'lmaydi — na lightbox, na zoom. Mobil
ekranda (390px) yo'l belgilari rasmi ~330px ga siqiladi va mayda detallar
(masalan, chorraha chizmasidagi strelkalar) ko'rinmaydi.

Bu **ularning kamchiligi**, nusxa oladigan narsa emas — lekin bizda ham yo'q.
O'quvchilarning katta qismi telefondan ishlaydi, shuning uchun rasmni bosib
kattalashtirish arzon va sezilarli yaxshilanish.

**Ish hajmi:** kichik.

### 2.7 Savoldagi xatoni bildirish 🔧

Ularda bu faqat Telegram/email orqali. **Bizda umuman yo'q.**

B2B'da bu ulardagidan muhimroq: ustoz noto'g'ri savolni ko'rsa, Owner'ga
xabar qila olishi kerak. Bu yaqinda kiritilgan "javob berilgan savolning kaliti
muzlatiladi" qoidasi bilan ham bog'lanadi — muzlatilgan savolni tuzatish uchun
Owner'ga signal kerak.

Yana: **Owner qaysi savol yomon ekanini umuman ko'ra olmaydi.** Ustoz panelida
"eng ko'p xato qilingan savollar" bor, lekin Owner'da yo'q — holbuki savollar
bazasini u boshqaradi. 90% o'quvchi xato qiladigan savol — ehtimol savolning
o'zi noto'g'ri.

**Ish hajmi:** o'rta.

---

## 3. Keyinroq

### 3.1 "Bilet" tushunchasi

Rasmiy format — 122 bilet × 10 savol. O'quvchi bu tuzilishni kutadi.

**Muhim nuans (faylda yo'q):** ularning biletlari mavzu bo'yicha guruhlanmagan,
tekis 1–122 raqamlash. Bizning model esa mavzu bo'yicha (`Topic → Question`).
Ya'ni bilet — mavzuning o'rniga emas, **uning yoniga qo'shiladigan ikkinchi,
mustaqil guruhlash**. Savolda ham `ticketNumber`, ham `topicId` bo'ladi.

Bu savollar bazasi tuzilishiga ta'sir qiladi, shuning uchun **import
formatini loyihalashda birga hal qilish kerak** (B1 bilan bitta ishda).

Bilet rejimining qoidalari ularda uchinchi rejim sifatida: 10 savol, **taymer
yo'q, xato limiti yo'q**, o'tish 90%, har bilet bo'yicha "Yangi / Jarayonda /
Tugatilgan" holati saqlanadi. Ya'ni bilet — imtihon emas, **tuzilgan mashq**.
Bizda buni PRACTICE'ning ichida "bilet tanlash" sifatida qilsa bo'ladi, yangi
rejim ochmasdan.

### 3.2 Maraton

Ularda: 20 / 50 / 100 / 200 savol tanlanadi, taymer yo'q, nuqta yo'lakchasi
yo'q, birinchi savoldanoq "Yakunlash" mavjud. Ya'ni bu — imtihon emas, cheksiz
mashq.

B2B'da qiymati cheklangan: ustoz uchun "200 savol yechdi" ko'rsatkichi
"20 savollik imtihonda 92% oldi" dan kamroq ma'no beradi. **Past ustuvorlik.**

### 3.3 Kunlik o'rganish — bu test emas, kurs

Faylda "kunlik test" deb yozilgan, lekin `/kunlik-test` aslida **strukturaviy
kurs**: "Yo'l belgilari kursi — 20 ta qisqa dars", har dars belgilar soni va
taxminiy vaqti bilan (masalan "1. Temir yo'l va kesishmalar — 16 belgi —
~32 daq").

Bu bizning mahsulotimizga eng yaqin g'oya, chunki avtomaktabda **o'quv rejasi
bor**. Ustoz "shu hafta 3-4-darslarni o'ting" deya tayinlay olsa — bu bizning
mijozimiz uchun haqiqiy qiymat. Lekin bu katta ish (dars kontenti + biriktirish
+ nazorat) va savollar bazasi hal bo'lmaguncha boshlanmaydi.

### 3.4 Til almashtirgichi

Ularda uchta: UZ Lotin / UZ Kirill / RU. Muhim nuans — **Kirill alohida tarjima
emas, klient tomonida transliteratsiya**, va nuqsonlari ko'rinib turadi
(variant harfi "C" А/Б orasida lotincha qolgan, "эга" → "ега"). Rus tili esa
faqat interfeysni almashtiradi; savol tarjima qilinmagan bo'lsa
*"Этот вопрос пока доступен только на узбекском языке"* deb yozadi.

Xulosa: **transliteratsiya usulini takrorlamaymiz** — u sifatsiz ko'rinadi.
Agar kirill kerak bo'lsa, `Question` ga alohida maydon sifatida saqlanadi.
Avval mijozdan so'rash kerak — taxmin qilib qurmaslik.

---

## 4. Olmaymiz

| Nima | Nega |
|---|---|
| SEO landing sahifalari (~1350 ta) | Ularning mijozi — Google'da "bilet 47" qidirayotgan o'quvchi. Bizniki — avtomaktab direktori. U bizni savol matnidan qidirib topmaydi. |
| Bepul model | Obuna asosida sotamiz. |
| Mehmon rejimi (to'liq) | Ularda mehmonning butun natijasi — savol matni, variantlar va izohlar bilan birga — `localStorage`da saqlanadi (`autotestlar_guest_attempt_reviews_v1`). Ya'ni savollar bazasi klientda ochiq yotadi. Bizda savollar bazasi — sotiladigan aktiv, uni klientga bermaymiz. **Lekin:** direktorga sotishda cheklangan demo (5–10 savol) foydali bo'lishi mumkin — bu mahsulot emas, sotuv vositasi. |
| To'liq ekran tugmasi | Ularda bor. Bizda test ekrani allaqachon toza — foyda kam. |
| Imtihonda javobni darhol ko'rsatish | Ularda shunday, lekin bu haqiqiy imtihonni taqlid qilmaydi. Bizniki to'g'riroq. |

---

## 5. Taklif qilinayotgan tartib

**1-bosqich — kontent bloklovchilari (bularsiz mahsulot sotilmaydi)**
1. Variantlar sonini moslashuvchan qilish (2.2)
2. `legalReference` maydoni (2.1)
3. Import formati + ommaviy import skripti (B1) — bilet raqamini ham shu yerda hal qilish (3.1)
4. Rasm yuklash (B2)

**2-bosqich — arzon va sezilarli yaxshilanishlar**
5. Natijada "javobsiz" ni ajratish (2.3) — 1.1 dagi tuzoqqa e'tibor
6. Eski natijani tarixdan ochish (2.5)
7. Klaviatura yorliqlarini ko'rsatish (2.6)
8. Rasmni bosib kattalashtirish (2.8)
9. Butun urinishni ko'rib chiqish (2.4)

**3-bosqich — sifat va nazorat**
10. Savol xatosini bildirish + Owner uchun savol sifati statistikasi (2.7)

**Keyinroq:** bilet rejimi (3.1), kunlik kurs (3.3), til almashtirgichi (3.4).
**Past ustuvorlik:** maraton (3.2).

---

## 6. Ochiq savollar (mahsulot qarori kerak)

1. **Savollar bazasi qayerdan keladi?** O'zimiz yozamizmi, sotib olamizmi,
   ochiq manbadan olamizmi? Import formati shunga bog'liq. Bu 1-bosqichning
   eng katta noaniqligi.
2. **Bilet kerakmi?** Rasmiy formatga moslik foydali, lekin savollar bazasi
   biletlarga bo'lingan holda kelmasa, biz uni sun'iy ravishda bo'lishimiz
   kerak — bunda bilet raqamining ma'nosi qolmaydi.
3. **Rasmlar qayerda saqlanadi?** 1220 savolning rasmlari `public/` da git
   ichida yotolmaydi. Alohida papka + Nginx, yoki S3/CDN kerak.
