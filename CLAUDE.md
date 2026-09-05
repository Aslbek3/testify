# Testify — loyiha konteksti

## Nima bu
Avtomaktablar uchun obuna asosidagi PDD (haydovchilik) test tayyorgarlik 
SaaS platformasi. 4 darajali rol tizimi bor.

## Stack
- Next.js 14+ (App Router), TypeScript — frontend va backend (API routes) 
  bitta loyihada
- PostgreSQL + Prisma ORM
- Tailwind CSS

## Rollar (ierarxik)
1. App Owner — barcha tashkilotlarni (avtomaktablarni) boshqaradi
2. Direktor — bitta tashkilot ichidagi ustozlar va guruhlarni ko'radi
3. Ustoz (Tutor) — o'z guruhidagi o'quvchilarni va ularning progressini ko'radi
4. O'quvchi (Student) — o'z natijalari va progressini ko'radi

## Auth
Hozircha email + parol (bcrypt hash). Kelajakda telefon+SMS OTP qo'shiladi — 
shuning uchun User modelida `phone` maydoni ham bo'lsin (hozir ishlatilmasa ham).

## Dizayn qoidasi
Standart AI-generatsiya uslubidan (krem fon+terracotta rang, bir xil radiusli 
kartochkalar, ALL CAPS yorliqlar) qat'iyan qoch. Flat, professional, 
funksional dizayn. Rang va shrift tokenlari alohida promptda beriladi.

## Umumiy qoida
Har bir katta qadamdan oldin qisqacha reja yoz, tasdiqlanmaguncha davom etma. 
Oddiy va soddadan boshla, keraksiz murakkablik kiritma.

## Arxitektura qoidalari

Qatlamlar bir yo'nalishda bog'liq: **API route → service → Prisma**. 
Route'lar hech qachon to'g'ridan-to'g'ri Prisma'ga murojaat qilmaydi.



Qoidalar:
- **Har bir API route** boshida `permissions.ts` orqali tekshiruv bo'lishi shart — 
  tekshiruvsiz route yozilmaydi.
- Route'lar Prisma'ni bevosita chaqirmaydi — faqat `services/` funksiyalarini chaqiradi. 
  Prisma import'i faqat `services/` va `lib/prisma.ts` ichida bo'ladi.
- Bir xil kod (jadval render qilish, xato xabari, sana formatlash va h.k.) ikki joyda 
  qayta yozilmaydi — umumiy funksiya (`lib/`) yoki komponentga (`components/`) chiqariladi.

## Test hisoblari (faqat lokal dev baza — seed skript, `prisma/seed.ts`)

Parol hammasida bir xil: **testify123**

| Rol | Email |
|---|---|
| App Owner | owner@testify.dev |
| Direktor | director@testify.dev |
| Ustoz | tutor@testify.dev |
| O'quvchi | student1@testify.dev ... student8@testify.dev |

Bular faqat rivojlantirish (Neon dev) bazasidagi test ma'lumotlari — 
production'ga hech qachon shu holicha ko'chirilmaydi.
