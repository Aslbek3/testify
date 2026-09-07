-- Attempt.groupId — urinish qaysi guruhda topshirilganining "surati".
--
-- Bu maydon avvaldan yozilar edi, lekin hech qayerda o'qilmasdi: guruh va
-- ustoz kesimidagi barcha hisob-kitoblar faqat studentId bo'yicha ishlardi.
-- Natijada o'quvchi boshqa guruhga ko'chirilsa, uning butun tarixi yangi
-- ustozga o'tib ketardi — ustozlar o'zlari qilmagan ish uchun baholanardi.
--
-- Endi guruh kesimidagi so'rovlar groupId bo'yicha filtrlanadi. Eski
-- yozuvlarda (seed va migratsiyagacha yaratilganlarida) groupId bo'sh,
-- shuning uchun ularni mavjud eng yaxshi taxmin bilan — o'quvchining
-- hozirgi guruhi bilan — to'ldiramiz. Aks holda barcha tarixiy statistika
-- panellardan yo'qolib qolar edi.
UPDATE "Attempt" a
SET "groupId" = sp."groupId"
FROM "StudentProfile" sp
WHERE a."studentId" = sp."userId"
  AND a."groupId" IS NULL;
