# 🛡️ SECURITY AUDIT & REMEDIATION GUIDE — ANGOR AGRO STAR PORTAL

**Hujjat sanasi:** 24-Avgust, 2026  
**Standart:** OWASP Top 10, ISO 27001 Security Best Practices  
**Status:** Barcha backend va frontend zaifliklar kodi to'liq tuzatildi.  

---

## 🚨 OShKOR BO'LGAN MAXFIY MA'LUMOTLAR VA CHORA-TADBIRLAR

Loyiha tarixida (eski git commit'larida) kod tarkibida qattiq yozilgan (hardcoded) maxfiy kalitlar va parollar bo'lgan. Ushbu ma'lumotlar **kompromentatsiya qilingan (compromised)** deb hisoblanadi va zudlik bilan quyidagi choralarni ko'rish shart:

### 1. Telegram Bot Tokenini Bekor Qilish (Revoke)
- **Muammo:** Telegram bot tokeni va Chat ID kodi ochiq git commit'larida mavjud bo'lgan.
- **Zudlik bilan qilinadigan ish:**
  1. Telegram'da **@BotFather** botiga kiring.
  2. `/mybots` buyrug'ini tanlang va foydalanilayotgan botni tanlang.
  3. **API Token** -> **Revoke current token** tugmasini bosing.
  4. Yaratilgan yangi token olinsin va **hech qachon kod ichiga yozilmasin**.

### 2. JWT_SECRET Sozlash (Render.com Dashboard)
- **Muammo:** Standart JWT secret kaliti kodda saqlangan edi.
- **Zudlik bilan qilinadigan ish:**
  1. Render.com profilingizga kiring -> **Angor Agro Star** web service-ni tanlang.
  2. **Environment** bo'limiga o'ting.
  3. Yangi muhit o'zgaruvchisini qo'shing:
     - **Key:** `JWT_SECRET`
     - **Value:** Kamida 32 belgidan iborat tasodifiy xavfsiz kalit (masalan: `ags_prod_SECURE_983475928374109283749821374`)
  4. Shuningdek Telegram uchun:
     - **Key:** `TELEGRAM_BOT_TOKEN` -> (BotFather bergan yangi token)
     - **Key:** `TELEGRAM_CHAT_ID` -> (Admin Chat ID)
  5. **Save Changes** tugmasini bosing.

---

## 🧹 GIT TARIXINI TOZALASH (GIT HISTORY CLEANUP)

Eski git commit'larida parollar va tokenlar saqlanib qolganligi sababli, GitHub tarixini tozalash zarur.

### Option A: `git filter-repo` yordamida tozalash (Tavsiya etiladi)

1. **`git-filter-repo` vositasini o'rnating:**
   ```bash
   pip install git-filter-repo
   ```

2. **Maxfiy matnlarni o'chiruvchi fayl yarating (`expressions.txt`):**
   ```text
   REDACTED_OLD_TELEGRAM_TOKEN==>REDACTED_TELEGRAM_TOKEN
   REDACTED_OLD_JWT_SECRET==>REDACTED_JWT_SECRET
   REDACTED_OLD_PASSWORD==>REDACTED_PASSWORD
   REDACTED_OLD_PASSWORD==>REDACTED_PASSWORD
   REDACTED_OLD_PASSWORD==>REDACTED_PASSWORD
   ```

3. **Git tarixidan barcha maxfiy qiymatlarni tozalang:**
   ```bash
   git filter-repo --replace-text expressions.txt --force
   ```

4. **Yangilangan toza tarixni GitHub'ga majburiy (force) push qiling:**
   ```bash
   git push origin main --force --all
   ```

---

## 📋 BO'LAJAK DASTURLASH QOIDALARI

1. **Maxfiy qiymatlar joylashuvi:** Barcha API tokenlar, DB parollari, JWT maxfiy kalitlari FAQAT `.env` faylida saqlanishi kerak.
2. **.gitignore nazorati:** `.env` fayli har doim `.gitignore` ro'yxatida bo'lishi shart va hech qachon repository'ga push qilinmasligi kerak.
3. **Bypass va Fallback taqiqi:** Auth/RBAC tekshiruvlarida muvaffaqiyatsizlik yuz berganda hech qachon standart rol yoki soxta token (local fallback) berilmasligi shart.
