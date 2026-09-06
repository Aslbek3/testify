import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;
const SEED_PASSWORD = "testify123";

// Deterministik pseudo-tasodifiy generator — har safar bir xil natija beradi,
// shu bilan seed idempotent (upsert bilan) va takrorlanuvchan bo'ladi.
function seedRandom(seedStr: string) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function next() {
    h = Math.imul(h ^ (h >>> 16), 2246822519);
    h = Math.imul(h ^ (h >>> 13), 3266489917);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

// DEMO ma'lumot: quyidagi savollar YHQ qoidalaridan umumiy tarzda olingan
// namuna kontent, rasmiy imtihon savollari EMAS — mazmunan to'g'ri bo'lishga
// harakat qilingan, lekin ishlab chiqarish (production) uchun rasmiy manba
// asosida qayta ko'rib chiqilishi kerak. imageUrl'lar ham DEMO —
// public/questions/ ichidagi sodda SVG chizmalar, keyinchalik haqiqiy
// fotosuratlar/rasmlar bilan almashtiriladi.
const TOPIC_DEFS = [
  {
    name: "Yo'l belgilari",
    questions: [
      {
        text: "Doira shaklidagi qizil ramkali \"Kirish taqiqlangan\" belgisi qanday ma'noni bildiradi?",
        options: [
          "Barcha transport vositalariga shu yo'nalishda harakatlanish taqiqlanadi",
          "Faqat yuk mashinalariga taqiqlanadi",
          "Piyodalarga taqiqlanadi",
          "Faqat tunda amal qiladi",
        ],
        correctOptionIndex: 0,
        explanation:
          "Bu taqiqlovchi belgi barcha transport turlariga ushbu yo'nalishda harakatlanishni butunlay man etadi.",
        imageUrl: "/questions/belgi-1.svg",
        imageAlt: "Qizil doira ichida oq gorizontal chiziqli \"Kirish taqiqlangan\" yo'l belgisi",
      },
      {
        text: "Uchburchak shaklidagi ogohlantiruvchi belgilar nimani bildiradi?",
        options: [
          "Taqiqlashni",
          "Yo'l sharoiti haqida oldindan ogohlantirishni",
          "Majburiy yo'nalishni",
          "To'xtash joyini",
        ],
        correctOptionIndex: 1,
        explanation:
          "Ogohlantiruvchi belgilar oldinda xavfli uchastka borligi haqida haydovchini oldindan xabardor qiladi.",
        imageUrl: "/questions/belgi-2.svg",
        imageAlt: "Qizil chegarali uchburchak shaklidagi ogohlantiruvchi yo'l belgisi, o'rtasida undov belgisi",
      },
      {
        text: "Doira shaklidagi ko'k fonli belgilar odatda nimani bildiradi?",
        options: [
          "Taqiqni",
          "Ogohlantirishni",
          "Majburiy harakatni (ko'rsatma)",
          "Ma'lumot berishni",
        ],
        correctOptionIndex: 2,
        explanation:
          "Ko'k doira shaklidagi belgilar majburiy ko'rsatma beruvchi belgilar hisoblanadi (masalan, faqat to'g'riga harakatlanish).",
      },
      {
        text: "Kvadrat yoki to'g'ri burchakli ko'k fonli belgilar qanday guruhga kiradi?",
        options: [
          "Taqiqlovchi",
          "Ma'lumot-ko'rsatma beruvchi",
          "Ustunlik belgilari",
          "Ogohlantiruvchi",
        ],
        correctOptionIndex: 1,
        explanation:
          "Kvadrat/to'rtburchak ko'k fonli belgilar odatda ma'lumot va ko'rsatma beruvchi belgilar guruhiga kiradi (masalan, to'xtash joyi, kasalxona).",
      },
      {
        text: "\"Bosh yo'l\" belgisi qachon o'rnatiladi?",
        options: [
          "Haydovchiga ustunlik huquqi borligini bildirish uchun",
          "Taqiqlash uchun",
          "Faqat shahar tashqarisida",
          "Faqat tunda amal qiladi",
        ],
        correctOptionIndex: 0,
        explanation: "\"Bosh yo'l\" belgisi ushbu yo'l kesishmalarda ustunlikka ega ekanini bildiradi.",
        imageUrl: "/questions/chorraha-1.svg",
        imageAlt: "To'rt tomonlama to'g'ri chorraha sxemasi, o'rtadan tepaga qarab strelka bilan",
      },
      {
        text: "Yo'l belgisi zarar ko'rgan yoki yaxshi ko'rinmasa, haydovchi qanday yo'l tutadi?",
        options: [
          "Uni umuman e'tiborsiz qoldiradi",
          "Umumiy qoidalar va yo'l nishonlariga tayanadi",
          "Faqat o'z bilganicha harakat qiladi",
          "To'xtab, belgini tuzatadi",
        ],
        correctOptionIndex: 1,
        explanation:
          "Belgi yaxshi ko'rinmasa ham, haydovchi umumiy YHQ qoidalari va yo'l chizig'iga (nishonlarga) amal qilishi shart.",
        imageUrl: "/questions/belgi-2.svg",
        imageAlt: "Qizil chegarali uchburchak shaklidagi ogohlantiruvchi yo'l belgisi, o'rtasida undov belgisi",
      },
      {
        text: "Bir necha belgi bir joyda qarama-qarshi ma'no bersa (masalan vaqtinchalik va doimiy), qaysi ustunlik qiladi?",
        options: [
          "Doimiy belgi",
          "Vaqtinchalik (masalan yo'l ishlari) belgisi",
          "Svetofor doim ustun",
          "Kattaroq o'lchamli belgi",
        ],
        correctOptionIndex: 1,
        explanation:
          "Vaqtinchalik belgilar (masalan, yo'l ta'mirlash paytida) doimiy belgilarga nisbatan ustunlikka ega, chunki ular joriy sharoitni aks ettiradi.",
      },
      {
        text: "\"Piyodalar o'tish joyi\" belgisi nimani anglatadi?",
        options: [
          "Piyodalar shu yerdan o'tishi mumkinligini",
          "To'xtash joyini",
          "Avtobus bekatini",
          "Velosiped yo'lini",
        ],
        correctOptionIndex: 0,
        explanation:
          "Bu belgi piyodalar yo'lni kesib o'tadigan rasmiy joyni bildiradi, haydovchi bu joyda alohida ehtiyot bo'lishi kerak.",
        imageUrl: "/questions/chorraha-2.svg",
        imageAlt: "T-shaklidagi yo'l kesishmasi (yon yo'lakash) sxemasi",
      },
    ],
  },
  {
    name: "Svetofor va nazoratchi ishoralari",
    questions: [
      {
        text: "Svetoforda sariq chiroq yonganda haydovchi qanday harakat qilishi kerak?",
        options: [
          "Tezlikni oshiradi",
          "To'xtashga tayyorlanadi",
          "Signal beradi",
          "Chapga buriladi",
        ],
        correctOptionIndex: 1,
        explanation:
          "Sariq chiroq svetofor rangi almashayotganini bildiradi, haydovchi xavfsiz to'xtashga tayyorlanishi kerak.",
        imageUrl: "/questions/svetofor-1.svg",
        imageAlt: "Qizil, sariq va yashil chiroqli svetofor ustuni",
      },
      {
        text: "Nazoratchi ishorasi svetofor ko'rsatkichiga zid bo'lsa, haydovchi kimga bo'ysunadi?",
        options: ["Svetoforga", "Nazoratchiga", "Yo'l belgisiga", "O'zi hal qiladi"],
        correctOptionIndex: 1,
        explanation:
          "Nazoratchi ishorasi har doim svetofor ko'rsatkichidan ustun turadi, chunki u vaziyatni jonli baholaydi.",
      },
      {
        text: "Svetoforda yashil chiroq yonib turganda, lekin chorrahada tirbandlik bo'lsa, haydovchi nima qiladi?",
        options: [
          "Chorrahaga kirib, tirbandlikni kutadi",
          "Chorrahaga kirmay, yo'l bo'shashini kutadi",
          "Signal berib o'tadi",
          "Tezlashib o'tib oladi",
        ],
        correctOptionIndex: 1,
        explanation:
          "Chorraha band bo'lsa, yashil chiroqqa qaramay, haydovchi chorrahani to'sib qo'ymaslik uchun kirmasligi kerak.",
      },
      {
        text: "Ko'k rangli miltillovchi svetofor nimani bildiradi?",
        options: [
          "Signal ishlamayapti, ehtiyotkorlik bilan harakatlaning",
          "To'liq to'xtash shart",
          "Faqat piyodalarga ruxsat",
          "Chorraha yopiq",
        ],
        correctOptionIndex: 0,
        explanation:
          "Miltillovchi rejim odatda svetofor tartibga solish funksiyasini bajarmayotganini bildiradi, shu bois YHQning umumiy ustunlik qoidalariga amal qilinadi.",
        imageUrl: "/questions/svetofor-1.svg",
        imageAlt: "Qizil, sariq va yashil chiroqli svetofor ustuni",
      },
      {
        text: "Qo'shimcha sektsiya (strelka) bilan yashil chiroq yonganda, u qanday harakatga ruxsat beradi?",
        options: [
          "Faqat to'g'riga",
          "Faqat strelka ko'rsatgan yo'nalishga",
          "Barcha yo'nalishlarga",
          "Faqat orqaga qaytishga",
        ],
        correctOptionIndex: 1,
        explanation:
          "Qo'shimcha strelka faqat o'zi ko'rsatgan yo'nalishdagi harakatga ruxsat beradi, boshqa yo'nalishlar taqiqlangan bo'lishi mumkin.",
      },
      {
        text: "Svetoforsiz nazoratchi qo'llarini yon tomonga yozganda, ko'krak yoki orqasi bilan turgan transportlarga qanday harakatga ruxsat bor?",
        options: [
          "To'g'riga va o'ngga",
          "Faqat chapga",
          "Hech kimga ruxsat yo'q",
          "Faqat piyodalarga",
        ],
        correctOptionIndex: 0,
        explanation:
          "Nazoratchi qo'llari yon tomonga yozilganda, ko'krak yoki orqasi bilan turgan transportlarga to'g'riga va o'ngga burilishga ruxsat beriladi.",
      },
      {
        text: "Qizil va sariq chiroq bir vaqtda yonsa, bu nimani bildiradi?",
        options: [
          "Harakatlanish mumkin",
          "Tez orada yashil yonishidan darak, lekin hali to'xtagan holda turish kerak",
          "Chorraha yopiq",
          "Faqat piyodalar o'tadi",
        ],
        correctOptionIndex: 1,
        explanation:
          "Qizil va sariq bir vaqtda yonishi yaqinda yashil yonishidan darak beradi, ammo transport hali harakatni boshlamasligi kerak.",
        imageUrl: "/questions/svetofor-1.svg",
        imageAlt: "Qizil, sariq va yashil chiroqli svetofor ustuni",
      },
      {
        text: "Svetofor butunlay o'chgan (ishlamayapti) chorrahada haydovchi qanday qoidaga amal qiladi?",
        options: [
          "Tenglashtirilgan yo'llar chorrahasi qoidasiga (o'ngdan kelayotganga yo'l berish)",
          "Har kim o'z bilganicha o'tadi",
          "Faqat kattaroq mashina o'tadi",
          "Chorraha butunlay yopiq hisoblanadi",
        ],
        correctOptionIndex: 0,
        explanation:
          "Svetofor ishlamasa, chorraha tartibga solinmagan hisoblanadi va odatiy ustunlik qoidalari (masalan, o'ngdan kelayotganga yo'l berish) qo'llaniladi.",
      },
    ],
  },
  {
    name: "Ustunlik huquqi",
    questions: [
      {
        text: "Tenglashtirilgan yo'llar chorrahasida chapdan transport kelsa, kim yo'l beradi?",
        options: [
          "Chapdan kelayotgan",
          "O'ngdan kelayotgan",
          "Kim tezroq bo'lsa",
          "Katta mashina",
        ],
        correctOptionIndex: 0,
        explanation:
          "Tenglashtirilgan yo'llarda \"o'ng qo'l qoidasi\" amal qiladi — chapdan kelayotgan haydovchi o'ngdan kelayotganga yo'l berishi shart.",
        imageUrl: "/questions/chorraha-1.svg",
        imageAlt: "To'rt tomonlama to'g'ri chorraha sxemasi, o'rtadan tepaga qarab strelka bilan",
      },
      {
        text: "Aylanma harakatga kirayotgan haydovchi kimga yo'l berishi shart?",
        options: [
          "Aylanmaga kirayotganlarga",
          "Aylanma ichidagilarga",
          "Piyodalarga",
          "Hech kimga",
        ],
        correctOptionIndex: 1,
        explanation:
          "Aylanmaga kirayotgan transport, allaqachon aylanma ichida harakatlanayotgan transport vositalariga yo'l berishi kerak.",
        imageUrl: "/questions/chorraha-2.svg",
        imageAlt: "T-shaklidagi yo'l kesishmasi (yon yo'lakash) sxemasi",
      },
      {
        text: "\"Yo'l bering\" (teskari uchburchak) belgisi o'rnatilgan chorrahada haydovchi qanday harakat qiladi?",
        options: [
          "Bosh yo'ldagi transportga yo'l beradi",
          "To'xtamasdan o'tib ketadi",
          "Faqat signal beradi",
          "Orqaga qaytadi",
        ],
        correctOptionIndex: 0,
        explanation:
          "\"Yo'l bering\" belgisi kesishayotgan bosh yo'ldagi transportlarga ustunlik berishni talab qiladi.",
        imageUrl: "/questions/chorraha-2.svg",
        imageAlt: "T-shaklidagi yo'l kesishmasi (yon yo'lakash) sxemasi",
      },
      {
        text: "\"Harakatlanishni to'xtatmasdan o'tish taqiqlanadi\" (STOP) belgisi qo'yilgan joyda haydovchi nima qiladi?",
        options: [
          "To'liq to'xtaydi, so'ng yo'l bo'sh bo'lsa harakatlanadi",
          "Sekinlashtirib o'tadi",
          "Faqat kechqurun to'xtaydi",
          "E'tiborsiz qoldiradi",
        ],
        correctOptionIndex: 0,
        explanation:
          "STOP belgisi to'liq to'xtashni talab qiladi, harakatni faqat yo'l xavfsiz bo'lgandan keyin davom ettirish mumkin.",
      },
      {
        text: "Maxsus signal (sirena va chaqnoq chiroq) yoqilgan operativ xizmat mashinasiga qanday yo'l beriladi?",
        options: [
          "Yo'l berish shart emas",
          "Darhol yo'l bo'shatiladi",
          "Faqat tungi vaqtda yo'l beriladi",
          "Faqat bo'sh yo'lda",
        ],
        correctOptionIndex: 1,
        explanation:
          "Maxsus ovozli va yorug'lik signali yoqilgan xizmat mashinalariga barcha haydovchilar darhol yo'l berishi shart.",
      },
      {
        text: "Tor ko'chada tepalikdan pastga tushayotgan va yuqoriga ko'tarilayotgan ikkita transport bir-biriga to'sqinlik qilsa, umumiy qoidaga ko'ra kim yo'l beradi?",
        options: [
          "Pastga tushayotgan transport",
          "Kattaroq transport har doim ustun",
          "Tezroq harakatlanayotgan ustun",
          "Faqat signal bergan ustun",
        ],
        correctOptionIndex: 0,
        explanation:
          "Tor yo'lda, pastga tushayotgan transport odatda yuqoriga ko'tarilayotgan transportga yo'l berishi tavsiya etiladi (xavfsizlik nuqtai nazaridan).",
      },
      {
        text: "Piyodalar o'tish joyisiz, lekin ko'chani kesib o'tayotgan piyoda bo'lsa, haydovchi qanday harakat qiladi?",
        options: [
          "E'tiborsiz o'tib ketadi",
          "Imkon qadar ehtiyot bo'lib, piyodaga xalaqit bermaydi",
          "Signal berib tezlashadi",
          "To'xtash shart emas",
        ],
        correctOptionIndex: 1,
        explanation:
          "Rasmiy o'tish joyi bo'lmasa ham, haydovchi piyodalar xavfsizligini ta'minlashga majbur va ehtiyotkorlik bilan harakatlanishi kerak.",
      },
      {
        text: "Bir xil ustunlikka ega ikkita transport bir vaqtda chorrahaga kirsa (teng sharoit), kim afzal huquqqa ega?",
        options: ["O'ngdan kelayotgan", "Chapdan kelayotgan", "Kattaroq mashina", "Tezroq kelgan"],
        correctOptionIndex: 0,
        explanation:
          "Teng sharoitlarda umumiy qoida bo'yicha o'ngdan kelayotgan transportga ustunlik beriladi.",
        imageUrl: "/questions/chorraha-1.svg",
        imageAlt: "To'rt tomonlama to'g'ri chorraha sxemasi, o'rtadan tepaga qarab strelka bilan",
      },
    ],
  },
  {
    name: "Tezlik rejimi",
    questions: [
      {
        text: "Aholi punktida, boshqacha belgi bo'lmasa, ruxsat etilgan eng yuqori tezlik?",
        options: ["40 km/soat", "60 km/soat", "80 km/soat", "90 km/soat"],
        correctOptionIndex: 1,
        explanation:
          "Boshqacha belgi qo'yilmagan bo'lsa, aholi punktlarida ruxsat etilgan standart yuqori tezlik chegarasi 60 km/soat.",
      },
      {
        text: "Yomon ob-havoda haydovchi tezlik va masofani qanday tanlashi kerak?",
        options: [
          "Har doimgidek",
          "Faqat belgiga qarab",
          "Ko'rinish va yo'l holatiga mos kamaytirib",
          "Iloji boricha tez",
        ],
        correctOptionIndex: 2,
        explanation:
          "Yomg'ir, tuman yoki qor sharoitida tormozlash masofasi oshadi, shuning uchun tezlik ko'rinish va yo'l holatiga moslashtirilishi shart.",
      },
      {
        text: "Aholi punktidan tashqarida, boshqacha belgi bo'lmasa, yengil avtomobil uchun standart eng yuqori tezlik odatda qancha?",
        options: ["60 km/soat", "90 km/soat", "110 km/soat", "130 km/soat"],
        correctOptionIndex: 1,
        explanation:
          "Aholi punktidan tashqarida oddiy yo'llarda odatda 90 km/soat chegarasi belgilanadi (avtomagistrallardan tashqari).",
      },
      {
        text: "Maktab yoki bolalar muassasasi yaqinida tezlik rejimiga qanday yondashish kerak?",
        options: [
          "Har doimgidek harakatlanish mumkin",
          "Sezilarli darajada kamaytirish kerak",
          "Faqat kechqurun kamaytiriladi",
          "Tezlikni oshirish kerak",
        ],
        correctOptionIndex: 1,
        explanation:
          "Bolalar ko'p bo'ladigan hududlarda ehtimoliy xavf yuqori bo'lgani uchun tezlikni sezilarli kamaytirish talab etiladi.",
      },
      {
        text: "Haydovchilik tajribasi 2 yildan kam bo'lgan haydovchilar uchun ba'zi yo'l turlarida tezlik cheklovi qanday bo'lishi mumkin?",
        options: [
          "Umumiy qoidadan yuqoriroq",
          "Umumiy qoidadan pastroq (masalan magistralda past chegara)",
          "Cheklov yo'q",
          "Faqat tunda cheklanadi",
        ],
        correctOptionIndex: 1,
        explanation:
          "Tajribasiz haydovchilar uchun ayrim yo'l turlarida (masalan avtomagistralda) odatdagidan pastroq tezlik chegarasi belgilanishi mumkin.",
      },
      {
        text: "Tezlikni oshirib yuborish nima uchun xavfli hisoblanadi?",
        options: [
          "Yoqilg'i tejaladi",
          "Tormozlash masofasi va reaksiya vaqti yetarli bo'lmay qoladi",
          "Mashina tezroq sovuydi",
          "Hech qanday xavf yo'q",
        ],
        correctOptionIndex: 1,
        explanation:
          "Yuqori tezlikda to'satdan to'xtash uchun kerakli masofa ortadi, bu esa YTH xavfini oshiradi.",
      },
      {
        text: "Yo'l qoplamasi muzlagan yoki sirg'anchiq bo'lsa, haydovchi qanday yo'l tutadi?",
        options: [
          "Tezlikni keskin oshiradi",
          "Tezlikni kamaytirib, keskin manevrlardan saqlanadi",
          "O'zgartirish shart emas",
          "Faqat signal beradi",
        ],
        correctOptionIndex: 1,
        explanation:
          "Sirg'anchiq yo'lda tezlik kamaytirilishi va keskin tormoz/burilishlardan saqlanish tavsiya etiladi, aks holda mashina boshqaruvdan chiqishi mumkin.",
      },
      {
        text: "Tirbandlikda (sekin harakatlanuvchi ustunda) haydovchi orasidagi masofani qanday saqlaydi?",
        options: [
          "Masofa saqlash shart emas",
          "To'satdan to'xtashga ulgurish uchun yetarli masofa qoldiradi",
          "Imkon qadar yaqin yuradi",
          "Faqat tungi vaqtda saqlaydi",
        ],
        correctOptionIndex: 1,
        explanation:
          "Oldindagi transport to'satdan to'xtasa ham to'qnashmaslik uchun xavfsiz masofa doimo saqlanishi kerak.",
      },
    ],
  },
  {
    name: "To'xtash va turish qoidalari",
    questions: [
      {
        text: "Piyodalar o'tish joyidan necha metr masofada to'xtash taqiqlanadi?",
        options: ["1 metr", "5 metr", "15 metr", "to'xtash joyi yo'q"],
        correctOptionIndex: 1,
        explanation:
          "YHQga ko'ra piyodalar o'tish joyidan kamida 5 metr masofada to'xtash va turish taqiqlanadi.",
      },
      {
        text: "Ikki qatorli sariq chiziq bilan belgilangan joyda to'xtash mumkinmi?",
        options: ["Ha, doim", "Yo'q", "Faqat 5 daqiqagacha", "Faqat kechqurun"],
        correctOptionIndex: 1,
        explanation:
          "Ikki qatorli uzluksiz sariq chiziq to'xtash va turishni taqiqlaydigan yo'l nishoni hisoblanadi.",
        imageUrl: "/questions/chiziq-1.svg",
        imageAlt: "Yo'l yuzasida ikki qatorli uzluksiz sariq chiziq nishoni",
      },
      {
        text: "Avtobus bekati yaqinida qancha masofada to'xtash taqiqlanadi (umumiy qoida)?",
        options: ["3 metr", "15 metr", "50 metr", "Cheklov yo'q"],
        correctOptionIndex: 1,
        explanation:
          "Avtobus bekatidan 15 metr radiusda to'xtash taqiqlanadi, bu jamoat transportining bemalol to'xtashi uchun zarur.",
        imageUrl: "/questions/chiziq-1.svg",
        imageAlt: "Yo'l yuzasida ikki qatorli uzluksiz sariq chiziq nishoni",
      },
      {
        text: "Nogironlar uchun ajratilgan joyga maxsus belgisiz avtomobil to'xtatish mumkinmi?",
        options: ["Ha, har doim mumkin", "Yo'q, taqiqlangan", "Faqat 5 daqiqaga mumkin", "Faqat kechqurun mumkin"],
        correctOptionIndex: 1,
        explanation: "Nogironlar uchun ajratilgan joylarga tegishli hujjatsiz to'xtash qat'iyan taqiqlangan.",
      },
      {
        text: "Temir yo'l kesishmasida transportni to'xtatish mumkinmi?",
        options: ["Ha, istalgan vaqt", "Yo'q, taqiqlangan", "Faqat poyezd ko'rinmasa", "Faqat kunduzi"],
        correctOptionIndex: 1,
        explanation:
          "Temir yo'l kesishmalarida va ularga yaqin joyda to'xtash yuqori xavf tufayli taqiqlangan.",
      },
      {
        text: "Ikki qatorli uzluksiz oq chiziq bilan bir qatorli uzluksiz sariq chiziqning farqi nimada?",
        options: [
          "Farqi yo'q",
          "Sariq chiziq to'xtash/turishni taqiqlaydi, oq chiziq harakat yo'nalishini ajratadi",
          "Oq chiziq faqat tunda amal qiladi",
          "Sariq chiziq faqat shahar tashqarisida",
        ],
        correctOptionIndex: 1,
        explanation:
          "Sariq chiziq to'xtash-turish taqiqlangan zonalarni bildiradi, oq chiziq esa harakat qatorlarini ajratish uchun ishlatiladi.",
        imageUrl: "/questions/chiziq-1.svg",
        imageAlt: "Yo'l yuzasida ikki qatorli uzluksiz sariq chiziq nishoni",
      },
      {
        text: "Avtomobilni tepalikda (nishab yo'lda) to'xtatganda qo'shimcha qanday chora ko'riladi?",
        options: [
          "Hech narsa qilish shart emas",
          "G'ildiraklar ostiga tirgovuch qo'yiladi yoki g'ildirak burchak bilan burab qo'yiladi",
          "Faqat signal beriladi",
          "Dvigatel ishlab turadi",
        ],
        correctOptionIndex: 1,
        explanation:
          "Nishab yo'lda avtomobil o'z-o'zidan siljib ketmasligi uchun g'ildiraklarni burchak bilan burish yoki tirgovuch qo'yish tavsiya etiladi.",
      },
      {
        text: "Yo'l chetidagi uzluksiz sariq chiziq bilan birga qo'yilgan belgi qanday ma'noni kuchaytiradi?",
        options: [
          "To'xtash taqiqlanganini yana bir bor tasdiqlaydi",
          "Aksincha, to'xtashga ruxsat beradi",
          "Hech qanday ta'siri yo'q",
          "Faqat tungi taqiqni bildiradi",
        ],
        correctOptionIndex: 0,
        explanation:
          "Chiziq va tegishli belgi birgalikda qo'llanilganda, taqiqlovchi ma'no ikki usulda (vizual nishon + belgi) kuchaytiriladi.",
      },
    ],
  },
  {
    name: "YTH va javobgarlik",
    questions: [
      {
        text: "YTH sodir bo'lgach, haydovchi eng avval nima qilishi shart?",
        options: [
          "Darhol joyni tark etadi",
          "Transportni to'xtatib, xavfsizlik choralarini ko'radi",
          "Guvohlarni tarqatib yuboradi",
          "Boshqa haydovchini ayblaydi",
        ],
        correctOptionIndex: 1,
        explanation:
          "Haydovchi avvalo transportni to'xtatib, ogohlantiruvchi uchburchak qo'yish va boshqa xavfsizlik choralarini ko'rishi shart.",
      },
      {
        text: "Yengil YTHda ikkala tomon rozi bo'lsa, GAIsiz hujjatlashtirish mumkinmi?",
        options: [
          "Yo'q, hech qachon",
          "Ha, qonunda belgilangan tartibda mumkin",
          "Faqat kechasi",
          "Faqat bir tomon aybdor bo'lsa",
        ],
        correctOptionIndex: 1,
        explanation:
          "Moddiy zarar yetkazilgan, tomonlar aybni tan olgan yengil YTHlarda qonunda nazarda tutilgan tartibda GAIsiz hujjatlashtirish mumkin.",
      },
      {
        text: "YTHda jabrlanuvchi bo'lsa, haydovchi nima qilishi shart?",
        options: ["Tibbiy yordam chaqiradi va yordam ko'rsatadi", "Joyni tark etadi", "Faqat guvohlarni kutadi", "Hech narsa qilmaydi"],
        correctOptionIndex: 0,
        explanation:
          "Jarohat olganlarga birinchi yordam ko'rsatish va tez tibbiy yordam chaqirish haydovchining qonuniy majburiyati hisoblanadi.",
      },
      {
        text: "YTH joyini ruxsatsiz tark etish qanday oqibatga olib kelishi mumkin?",
        options: [
          "Hech qanday oqibat yo'q",
          "Jiddiy huquqiy javobgarlikka (masalan haydovchilik guvohnomasidan mahrum qilish)",
          "Faqat ogohlantirish beriladi",
          "Jarima to'lanmaydi",
        ],
        correctOptionIndex: 1,
        explanation: "YTH joyini o'zboshimchalik bilan tark etish qonun bo'yicha jiddiy javobgarlikka sabab bo'ladi.",
      },
      {
        text: "Spirtli ichimlik ta'sirida haydovchilik qanday oqibatga olib keladi?",
        options: ["Hech qanday cheklov yo'q", "Huquqiy javobgarlik va guvohnomadan mahrum qilish xavfi", "Faqat ogohlantirish", "Jarima yo'q"],
        correctOptionIndex: 1,
        explanation: "Mast holda haydash qonun bo'yicha qattiq taqiqlangan va jiddiy huquqiy javobgarlikka olib keladi.",
      },
      {
        text: "YTHda ishtirok etgan haydovchi guvohlarning ma'lumotlarini yozib olishi kerakmi?",
        options: ["Yo'q, kerak emas", "Ha, tavsiya etiladi, chunki kelajakda kerak bo'lishi mumkin", "Faqat politsiya so'rasa", "Faqat kechasi"],
        correctOptionIndex: 1,
        explanation:
          "Guvohlarning kontakt ma'lumotlari kelgusida voqeani aniqlashtirishda muhim ahamiyatga ega bo'lishi mumkin.",
      },
      {
        text: "Sug'urta (OSAGO) mavjud bo'lsa, YTHdagi moddiy zarar qanday qoplanadi?",
        options: [
          "Faqat aybdor haydovchi o'z cho'ntagidan to'laydi",
          "Sug'urta kompaniyasi belgilangan tartibda zararni qoplaydi",
          "Hech kim qoplamaydi",
          "Davlat byudjetidan to'lanadi",
        ],
        correctOptionIndex: 1,
        explanation:
          "Majburiy sug'urta mavjud bo'lganda, aybdor tomon oldindan sug'urtalagan bo'lsa, zarar sug'urta kompaniyasi orqali qoplanadi.",
      },
      {
        text: "YTH joyidagi holatni o'zgartirishdan oldin nima qilish tavsiya etiladi?",
        options: ["Darhol hamma narsani yig'ishtirib olish", "Holatni fotosuratga olish yoki belgilash", "Hech narsa qilmaslik", "Faqat ketishga shoshilish"],
        correctOptionIndex: 1,
        explanation:
          "Keyingi tekshiruv uchun voqea joyini fotosuratga olish yoki boshqa usulda qayd etish tavsiya etiladi.",
      },
    ],
  },
  {
    name: "Texnik holat",
    questions: [
      {
        text: "Tormoz tizimi nosoz transport vositasini haydash mumkinmi?",
        options: ["Ha", "Yo'q", "Faqat shahar ichida", "Faqat kunduzi"],
        correctOptionIndex: 1,
        explanation:
          "Tormoz tizimi nosoz bo'lgan transport vositasini haydash xavfsizlikka jiddiy tahdid solgani uchun taqiqlangan.",
      },
      {
        text: "Old oyna darzli bo'lsa, transport vositasidan foydalanish mumkinmi?",
        options: [
          "Ha, cheklovsiz",
          "Ko'rinishni xalaqit bersa taqiqlanadi",
          "Faqat tungi vaqtda",
          "Faqat shahar tashqarisida",
        ],
        correctOptionIndex: 1,
        explanation:
          "Agar yorilish haydovchi ko'rish maydonini xalaqit bersa, bunday transportda harakatlanish taqiqlanadi.",
      },
      {
        text: "Old faralardan biri ishlamasa, tungi vaqtda harakatlanish mumkinmi?",
        options: ["Ha, cheklovsiz", "Yo'q, taqiqlangan", "Faqat shahar ichida mumkin", "Faqat sekin yursa mumkin"],
        correctOptionIndex: 1,
        explanation:
          "Yorug'lik asboblari nosoz bo'lgan transport vositasida, ayniqsa tungi vaqtda, harakatlanish taqiqlanadi.",
      },
      {
        text: "G'ildirak protektori chuqurligi me'yordan past bo'lsa, nima uchun xavfli?",
        options: [
          "Xavfli emas",
          "Yo'lga ilashish (tutinish) yomonlashadi, tormozlash masofasi oshadi",
          "Faqat tashqi ko'rinish buziladi",
          "Yoqilg'i sarfini kamaytiradi",
        ],
        correctOptionIndex: 1,
        explanation:
          "Yeyilgan protektor yo'l bilan aloqani (tutinishni) yomonlashtirib, ayniqsa nam yo'lda tormozlash masofasini oshiradi.",
      },
      {
        text: "Signal (klakson) ishlamasa, transport vositasidan foydalanish mumkinmi?",
        options: [
          "Ha, muammo emas",
          "Nosozlikni tezroq tuzatish tavsiya etiladi, garchi bu boshqa jiddiy nosozliklarga qaraganda kamroq xavfli bo'lsa ham",
          "Umuman haydash mumkin emas",
          "Faqat kechasi ishlatiladi",
        ],
        correctOptionIndex: 1,
        explanation:
          "Klakson nosozligi tormoz yoki rulga qaraganda kamroq kritik hisoblansa-da, tezroq tuzatilishi tavsiya etiladi.",
      },
      {
        text: "Ekspluatatsiyaga ruxsat etilmagan (masalan rul boshqaruvi nosoz) avtomobilni haydash oqibati qanday?",
        options: [
          "Hech qanday oqibat",
          "Yo'l harakati xavfsizligiga tahdid va huquqiy javobgarlik",
          "Faqat ogohlantirish beriladi",
          "Muammo yo'q, davom etilaveradi",
        ],
        correctOptionIndex: 1,
        explanation:
          "Rul boshqaruvi kabi hayotiy muhim tizim nosoz bo'lsa, transportni haydash qat'iyan man etiladi va javobgarlikka sabab bo'ladi.",
      },
      {
        text: "Egzoz tizimidan ortiqcha tutun chiqishi nimani anglatishi mumkin?",
        options: ["Hech narsani anglatmaydi", "Dvigatelda texnik nosozlik bo'lishi mumkinligini", "Faqat sovuq havoda normal holat", "Yoqilg'i sifatli ekanini"],
        correctOptionIndex: 1,
        explanation:
          "Ortiqcha tutun ko'pincha dvigatel yoki yoqilg'i tizimidagi nosozlik alomati bo'lib, texnik ko'rikdan o'tkazish tavsiya etiladi.",
      },
      {
        text: "Shinalar mavsumga mos (qish/yoz) bo'lishi nima uchun muhim?",
        options: [
          "Muhim emas, farq yo'q",
          "Yo'l bilan tutinish va tormozlash xavfsizligini ta'minlash uchun",
          "Faqat tashqi ko'rinish uchun",
          "Faqat narxi past bo'lgani uchun",
        ],
        correctOptionIndex: 1,
        explanation:
          "Mavsumga mos shinalar turli harorat va yo'l sharoitida optimal tutinish va tormozlash xususiyatini ta'minlaydi.",
      },
    ],
  },
  {
    name: "Piyodalar xavfsizligi",
    questions: [
      {
        text: "Piyodalar o'tish joyida to'xtagan piyoda oldida haydovchi qanday harakat qiladi?",
        options: [
          "Signal berib o'tadi",
          "Piyoda o'tib bo'lguncha kutadi",
          "Tezlikni oshiradi",
          "Chap tomondan aylanib o'tadi",
        ],
        correctOptionIndex: 1,
        explanation: "Piyodalar o'tish joyida piyoda bo'lsa, haydovchi to'liq o'tib bo'lguncha kutishi shart.",
        imageUrl: "/questions/chorraha-2.svg",
        imageAlt: "T-shaklidagi yo'l kesishmasi (yon yo'lakash) sxemasi",
      },
      {
        text: "Maktab oldidagi hududda haydovchi qanday ehtiyot chorasini ko'radi?",
        options: [
          "Hech qanday maxsus chora kerak emas",
          "Tezlikni kamaytirib, alohida diqqat bilan harakatlanadi",
          "Signal berib o'tishni tezlashtiradi",
          "Faqat kechqurun ehtiyot bo'ladi",
        ],
        correctOptionIndex: 1,
        explanation:
          "Bolalar to'satdan yo'lga chiqishi ehtimoli yuqori bo'lgani uchun maktab hududida alohida ehtiyotkorlik zarur.",
      },
      {
        text: "Avtobusdan tushayotgan yo'lovchilar yoniga yaqinlashganda haydovchi nima qiladi?",
        options: ["Tezlikni oshiradi", "Tezlikni kamaytirib, ehtiyot bo'ladi", "E'tibor bermaydi", "Signal berib o'tib ketadi"],
        correctOptionIndex: 1,
        explanation: "Avtobus atrofida piyodalar to'satdan yo'lga chiqishi mumkin, shu sabab tezlik kamaytirilishi kerak.",
      },
      {
        text: "Piyodalar o'tish joyiga yaqinlashayotganda, agar oldingi qatordagi mashina to'xtagan bo'lsa, haydovchi nima qiladi?",
        options: [
          "Uni chetlab o'tib, tezda harakatlanadi",
          "O'zi ham to'xtaydi, chunki piyoda ko'rinmasligi mumkin",
          "Signal berib o'tadi",
          "Hech narsa qilish shart emas",
        ],
        correctOptionIndex: 1,
        explanation:
          "Oldingi mashina to'xtagan bo'lsa, ko'rinish cheklangan bo'lishi mumkin va piyoda yashiringan bo'lishi ehtimoli bor, shu bois xavfsiz to'xtash zarur.",
        imageUrl: "/questions/chorraha-1.svg",
        imageAlt: "To'rt tomonlama to'g'ri chorraha sxemasi, o'rtadan tepaga qarab strelka bilan",
      },
      {
        text: "Piyodalar o'tish joyisiz ko'chada bir guruh piyoda kesib o'tayotgan bo'lsa nima qilinadi?",
        options: ["To'xtamasdan o'tiladi", "Imkon qadar tezlik kamaytirilib, ehtiyot bo'linadi", "Signal berib tezlashiladi", "Bu holatda qoida yo'q"],
        correctOptionIndex: 1,
        explanation:
          "Rasmiy o'tish joyi bo'lmasa ham piyodalar xavfsizligi ustuvor, shuning uchun ehtiyotkorlik bilan harakatlanish lozim.",
        imageUrl: "/questions/chorraha-2.svg",
        imageAlt: "T-shaklidagi yo'l kesishmasi (yon yo'lakash) sxemasi",
      },
      {
        text: "Ko'r nuqta (piyoda ko'rinmaydigan hudud) tufayli qaysi joylarda alohida ehtiyot kerak?",
        options: ["Katta avtoturargohlar va tor ko'chalarda", "Faqat avtomagistralda", "Faqat tungi vaqtda", "Hech qaerda kerak emas"],
        correctOptionIndex: 0,
        explanation:
          "Tor ko'cha va avtoturargohlarda piyodalar, ayniqsa bolalar, mashinalar orasidan to'satdan chiqishi mumkin.",
      },
      {
        text: "Nogironlar aravachasida harakatlanayotgan piyoda yo'lni kesib o'tayotganda haydovchi qanday harakat qiladi?",
        options: [
          "Odatdagidek harakat qiladi",
          "Qo'shimcha vaqt va ehtiyot bilan to'liq o'tib bo'lishini kutadi",
          "Signal berib shoshiltiradi",
          "E'tibor bermaydi",
        ],
        correctOptionIndex: 1,
        explanation: "Harakatlanish tezligi past bo'lgan piyodalarga yetarlicha vaqt va ehtiyotkorlik ko'rsatish zarur.",
      },
      {
        text: "Piyodalar o'tish joyida velosipedchi piyoda kabi huquqqa egami?",
        options: ["Ha, agar velosipeddan tushib, uni yetaklab o'tsa", "Yo'q, hech qachon", "Faqat kattalar uchun", "Faqat maxsus yo'lda"],
        correctOptionIndex: 0,
        explanation:
          "Velosipedchi velosipeddan tushib, uni qo'lda yetaklab o'tsa, piyoda maqomida hisoblanadi va tegishli huquqlardan foydalanadi.",
      },
    ],
  },
];

const STUDENT_NAMES = [
  "Dilnoza Egamberdiyeva",
  "Javlon Mirzayev",
  "Gulbahor Tosheva",
  "Sevinch Qodirova",
  "Farrux Abdullayev",
  "Malika Umarova",
  "Otabek Ergashev",
  "Madina Yusupova",
];

async function upsertUser(input: {
  email: string;
  name: string;
  role: "OWNER" | "DIRECTOR" | "TUTOR";
  organizationId?: string;
}) {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, SALT_ROUNDS);
  return prisma.user.upsert({
    where: { email: input.email },
    update: {},
    create: {
      email: input.email,
      name: input.name,
      passwordHash,
      role: input.role,
      organizationId: input.organizationId,
    },
  });
}

async function main() {
  const owner = await upsertUser({
    email: "owner@testify.dev",
    name: "Aslbek (App Owner)",
    role: "OWNER",
  });

  const organization = await prisma.organization.upsert({
    where: { id: "seed-org-1" },
    update: {},
    create: {
      id: "seed-org-1",
      name: "Nam-Avto O'quv Markazi",
      city: "Namangan",
      plan: "STANDARD",
      status: "ACTIVE",
    },
  });

  const director = await upsertUser({
    email: "director@testify.dev",
    name: "Otabek Yusupov",
    role: "DIRECTOR",
    organizationId: organization.id,
  });

  const tutor = await upsertUser({
    email: "tutor@testify.dev",
    name: "Sardor Islomov",
    role: "TUTOR",
    organizationId: organization.id,
  });

  const group = await prisma.group.upsert({
    where: { id: "seed-group-1" },
    update: {},
    create: {
      id: "seed-group-1",
      name: "Guruh #14",
      tutorId: tutor.id,
      organizationId: organization.id,
    },
  });

  // ---- Mavzular va savollar ----
  const topics = [];
  for (const t of TOPIC_DEFS) {
    const topic = await prisma.topic.upsert({
      where: { id: `seed-topic-${slugify(t.name)}` },
      update: {},
      create: { id: `seed-topic-${slugify(t.name)}`, name: t.name },
    });
    const questions = [];
    for (let i = 0; i < t.questions.length; i++) {
      const q = t.questions[i];
      // `update` ham to'liq to'ldirilgan — aks holda TOPIC_DEFS'dagi matn/izoh/
      // rasm o'zgarishlari allaqachon mavjud qatorlarga hech qachon
      // yetib bormas edi (upsert faqat yangi qator yaratganda ishlardi).
      const questionData = {
        topicId: topic.id,
        text: q.text,
        options: q.options,
        correctOptionIndex: q.correctOptionIndex,
        explanation: q.explanation,
        imageUrl: q.imageUrl,
        imageAlt: q.imageAlt,
      };
      const question = await prisma.question.upsert({
        where: { id: `${topic.id}-q${i}` },
        update: questionData,
        create: { id: `${topic.id}-q${i}`, ...questionData },
      });
      questions.push(question);
    }
    topics.push({ topic, questions });
  }
  const allQuestions = topics.flatMap((t) => t.questions);

  // ---- O'quvchilar ----
  const students = [];
  for (let i = 0; i < STUDENT_NAMES.length; i++) {
    const name = STUDENT_NAMES[i];
    const email = `student${i + 1}@testify.dev`;
    const passwordHash = await bcrypt.hash(SEED_PASSWORD, SALT_ROUNDS);
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name,
        passwordHash,
        role: "STUDENT",
        organizationId: organization.id,
      },
    });
    await prisma.studentProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, groupId: group.id },
    });
    students.push(user);
  }

  // ---- Urinishlar (Attempt + AttemptAnswer) ----
  // Har bir o'quvchining har mavzudagi "ko'nikma darajasi" (0..1) seed'dan
  // hosil qilinadi, shu asosda javoblar to'g'ri/xato bo'ladi — natijada
  // real ma'lumotga o'xshash, lekin har doim bir xil chiqadigan taqsimot olinadi.
  for (const student of students) {
    const skillRand = seedRandom(`skill-${student.email}`);
    const topicSkill = new Map<string, number>();
    for (const { topic } of topics) {
      topicSkill.set(topic.id, 0.4 + skillRand() * 0.55);
    }

    const attemptCount = 2;
    for (let a = 0; a < attemptCount; a++) {
      const daysAgo = a === 0 ? 10 : 2;
      const startedAt = new Date(Date.now() - daysAgo * 86400000);
      const finishedAt = new Date(startedAt.getTime() + 12 * 60000);

      // Har bir o'quvchiga bittadan EXAM va bittadan PRACTICE urinish —
      // aks holda (mode ko'rsatilmasa, standart PRACTICE bo'lgani uchun)
      // demo bazada birorta ham EXAM urinish bo'lmay qolar edi, bu esa
      // "faqat EXAM'dan hisoblash" mantig'ini ko'rsatib bo'lmas edi.
      const attempt = await prisma.attempt.create({
        data: {
          studentId: student.id,
          startedAt,
          finishedAt,
          score: 0,
          mode: a === 0 ? "EXAM" : "PRACTICE",
        },
      });

      const answerRand = seedRandom(`answers-${student.email}-${a}`);
      let correctCount = 0;
      for (const { topic, questions } of topics) {
        const skill = topicSkill.get(topic.id)!;
        for (const question of questions) {
          const isCorrect = answerRand() < skill;
          if (isCorrect) correctCount++;
          const wrongIndex = (question.correctOptionIndex + 1) % 4;
          await prisma.attemptAnswer.create({
            data: {
              attemptId: attempt.id,
              questionId: question.id,
              selectedOptionIndex: isCorrect
                ? question.correctOptionIndex
                : wrongIndex,
              isCorrect,
            },
          });
        }
      }

      const score = Math.round((correctCount / allQuestions.length) * 100);
      await prisma.attempt.update({ where: { id: attempt.id }, data: { score } });
    }
  }

  console.log("Seed tayyor. Test hisoblari (parol hammasida bir xil):");
  console.log(`  Parol: ${SEED_PASSWORD}`);
  console.log(`  Owner:    ${owner.email}`);
  console.log(`  Director: ${director.email}`);
  console.log(`  Tutor:    ${tutor.email}`);
  console.log(`  Guruh (register uchun): ${group.name}`);
  console.log(`  O'quvchilar: student1@testify.dev ... student8@testify.dev`);
  console.log(`  Mavzular: ${topics.length}, savollar: ${allQuestions.length}`);
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/['".]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
