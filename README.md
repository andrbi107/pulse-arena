# Pulse Arena

> یک شوتر بقا دوگانه‌چوب (twin-stick) نئونی top-down که با نقاط نورانی در یک آرنا می‌جنگد — PWA با Vanilla JS.

[![Version](https://img.shields.io/badge/version-v0.0.5-blue)](https://github.com/andrbi107/pulse-arena/releases/tag/v0.0.5) [![PWA](https://img.shields.io/badge/PWA-installable-purple)](https://andrbi107.github.io/pulse-arena/) [![deps](https://img.shields.io/badge/deps-Howler.js_local-blueviolet)](https://github.com/andrbi107/pulse-arena) [![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

🎮 **[بازی کن](https://andrbi107.github.io/pulse-arena/)** — نسخه‌ی آنلاین روی GitHub Pages
📦 **[مخزن گیت‌هاب](https://github.com/andrbi107/pulse-arena)** · 🏷️ **[Release v0.0.5](https://github.com/andrbi107/pulse-arena/releases/tag/v0.0.5)**

## تغییرات v0.0.5 (جدید)

**همه‌ی بازی‌ها (v0.0.5)** — لایه‌ی متای محصول افزوده شد: **صفحه‌ی لودینگ** برندشده، **منوی اصلی** (راهنما / آمار و تاریخچه / امتیازات و رقابت / تنظیمات)، **تاریخچه و آمار** (آخرین بازی‌ها + مجموع/میانگین/بهترین + دستاوردها)، **جدول امتیازات و رقابت** (مدال‌های 🥇🥈🥉 + تیرهای Bronze→Diamond + کد اشتراک رکورد)، و **بروزرسانی خودکار PWA** (بنر «نسخه‌ی جدید آماده است» → با یک کلیک بروزرسانی، نسخه‌ی جدید جایگزین می‌شود). `sw.js` بازنویسی شد: cache v5 + network-first برای صفحات (دریافت خودکار HTML جدید) + skipWaiting از طریق بنر + رفع باگ cache آفلاین SFX (پسوند .wav).

---

## تغییرات v0.0.4

pickupهای **Shield** (۶s آسیب‌ناپذیری + حلقه‌ی نورانی) و **Overcharge** (۶s شلیک سه‌راه + نرخ آتش بالاتر) — متمایز از arena-blaster. دستاوردهای Wave 10 / Boss Slayer.

**همه‌ی بازی‌ها (v0.0.4)** — `gamekit.js` مشترک + `vendor/howler.min.js` محلی: صدای Howler با SFX خودکار (pickup/collision/game-over از طریق پل MUX)، صفحه‌ی **راهنما**، صفحه‌ی **تنظیمات** (قطع/وصل صدا)، قلاب‌های تست (`render_game_to_text`/`advanceTime`)، **فول‌اسکرین** (کلید F)، و سیستم **دستاوردها**. cache سرویس‌ورکر به v4 ارتقا یافت (آفلاین کامل با vendor).

---

---

## تغییرات v0.0.2 (جدید)

**Pulse Arena** — kill-combo multiplier: killهای پشت‌سرهم در ۱.۵s یک ضریب امتیاز ×۱ → ×۲.۷۵ می‌سازند. به‌علاوه haptic feedback روی kill و game-over.

**همه‌ی بازی‌ها** — فایل مشترک `mobile-ux.js` اضافه شد: haptics خودکار روی دکمه/canvas، prompt نصب PWA (دکمه‌ی «نصب بازی» هنگام eligible)، و badge نسخه در گوشه. cache سرویس‌ورکر به v2 bump شد.

---

## معرفی

Pulse Arena یک شوتر آرنا top-down با دید کاملاً نئونی است که روی یک HTML5 `<canvas>` رسم می‌شود. شما یک نقطه‌ی سین درخشان در مرکز آرنا هستید؛ دشمنان از لبه‌ها وارد می‌شوند و شما باید با حرکت در یک جهت و نشانه‌گیری/شلیک در جهت دیگر، تا حد ممکن زنده بمانید. هیچ تصویر، فونت یا کتابخانه‌ای استفاده نشده — همه‌چیز با primitives کانواس و `shadowBlur` طراحی شده.

هر موج دشمن بیشتری می‌آورد و سریع‌تر/سخت‌تر می‌شود؛ هر پنجمین مرحله یک باس بزرگ با نوار HP اختصاصی است. هدف: زنده ماندن و کسب بیشترین امتیاز که در `localStorage` ذخیره می‌شود.

## ویژگی‌ها

- **شوتر twin-stick واقعی** — حرکت با یک چوب (WASD/D-pad) و نشانه‌گیری/شلیک با چوب دیگر (موس/FIRE).
- **سه آرک‌تایپ دشمن** — نقطه‌ی magenta (عادی)، مربع orange (سریع)، مثلث red (تانک، 3 HP).
- **باس هر ۵ مرحله** — دایره‌ی red بزرگ با HP مقیاس‌پذیر و نوار سلامت.
- **۳ جان + ۱ ثانیه invulnerability** بعد از هر برخورد (با افکت چشمک‌زن).
- **افکت‌ها** — ذرات مرگ به‌رنگ دشمن، screen shake و فلش red روی damage، grid پس‌زمینه‌ی متحرک.
- **کنترل کامل تاچ + کیبورد + موس** — روی موبایل D-pad + دکمه‌ی FIRE auto-aim.
- **PWA آفلاین** — پس از اولین بارگذاری بدون اینترنت اجرا می‌شود و قابل نصب روی خانه‌ی موبایل است.
- **صدا با WebAudio** — بیپ‌های oscillator برای شلیک/کشتن/برخورد/level-up/باس/گیم‌اور (با دکمه‌ی mute).

## نحوه‌ی بازی

| دستگاه | حرکت | نشانه‌گیری/شلیک | توقف/صدا |
|---|---|---|---|
| **کیبورد** | WASD یا Arrow keys | Space شلیک به سمت آخرین جهت حرکت | P/Esc توقف · M mute |
| **موس** | WASD | حرکت موس نشانه‌گیری · نگه‌داشتن کلیک چپ = auto-fire | — |
| **تاچ** | D-pad چپ (analog) | دکمه‌ی FIRE راست = auto-aim به نزدیک‌ترین دشمن + auto-fire | دکمه‌های HUD |

### مکانیک بازی

- **بازیکن**: دایره‌ی cyan (r=14px)، سرعت 250 px/s، clamped به لبه‌های آرنا، با یک turret-line زرد.
- **شلیک**: گلوله سرعت 560 px/s و عمر ~1s دارد؛ فاصله‌ی شلیک 0.16s.
- **دشمنان**: `normal` (magenta، hp 1)، `fast` (orange، hp 1، 1.7× سرعت)، `tank` (red، hp 3، 0.65× سرعت).
- **باس**: هر ۵ مرحله، HP = 18 + 10×cycle؛ برخورد به بازیکن آسیب می‌زند اما خودش از بین نمی‌رود.
- **موج‌ها**: مرحله‌ی N ام → `5 + N*2` دشمن عادی؛ کلیر کردن صف اسپاون + همه‌ی دشمنان زنده = مرحله‌ی بعد.
- **امتیاز**: +10 هر کشت · +100 هر موج · +500 هر باس. رکورد در `localStorage['pulseArena.best']`.
- **دشواری**: سرعت دشمن = `75 + (level-1)*7` px/s؛ تعداد اسپاون خطی رشد می‌کند.

## نصب روی موبایل/دسکتاپ (PWA)

1. لینک بازی را در **Chrome** یا **Edge** باز کنید (اندروید/دسکتاپ) یا **Safari** (iOS).
2. منوی مرورگر → **Install app** / **Add to Home screen** (اندروید) یا **Share → Add to Home Screen** (iOS).
3. آیکن روی صفحه‌ی اصلی ظاهر می‌شود؛ اجرای آن تمام‌صفحه و مستقل از مرورگر است.
4. پس از اولین بارگذاری، بازی **بدون اینترنت** هم کار می‌کند (service worker کل shell را cache کرده است).

## تکنولوژی

- **HTML5 `<canvas>`** — تمام رندر با primitives (`arc`, `fillRect`, `translate`, `rotate`, `shadowBlur`).
- **Vanilla JavaScript** — بدون هیچ کتابخانه، framework یا CDN.
- **CSS** با `clamp()` برای تایپوگرافی responsive، `safe-area-inset` برای notch موبایل، و `100dvh`.
- **PWA**: `manifest.json` + `sw.js` (service worker که کل shell را precache می‌کند) → بازی پس از اولین بارگذاری **کاملاً آفلاین** و **قابل نصب** روی اندروید/iOS/دسکتاپ است.
- بدون تصویر، فونت یا فایل صوتی خارجی — همه‌چیز با کد تولید می‌شود.

## ساختار پروژه

| فایل | نقش |
|---|---|
| `index.html` | نقطه‌ی ورود؛ canvas، HUD، کنترل‌های تاچ، صفحه‌های start/pause/game-over |
| `styles.css` | استایل responsive (clamp، safe-area، کنترل‌های تاچ، overlayها) |
| `main.js` | کل بازی: config، state، input، audio، spawning، update، render، loop |
| `manifest.json` | PWA manifest با `start_url`/`scope` = `./` و icon |
| `sw.js` | service worker که shell را precache و آفلاین سرو می‌کند |
| `icon.svg` | نقطه‌ی cyan درخشان روی پس‌زمینه‌ی تیره — آیکن برنامه |

## شخصی‌سازی

تمام تنظیمات gameplay در شیء `CFG` بالای `main.js` قرار دارد:

- `playerSpeed`, `playerRadius` — حس حرکت بازیکن.
- `bulletSpeed`, `bulletLife`, `fireInterval` — رفتار سلاح.
- `enemyBaseSpeed`, `enemySpeedPerLevel` — منحنی دشواری.
- `bossEvery`, `bossBaseHp`, `bossHpPerCycle` — کاتدنس و سختی باس.
- `startLives`, `invulnDuration` — جان و پنجره‌ی invuln.
- `scorePerKill`, `scorePerWave`, `scorePerBoss` — امتیازدهی.
- `ENEMY_TYPES` — رنگ/radius/hp/ضریب سرعت هر آرک‌تایپ.
- `gridSize` — تراکم grid پس‌زمینه.

رنگ‌ها به‌صورت hex literal در `CFG`/`ENEMY_TYPES` و توابع render هستند؛ پالت UI به‌صورت متغیر CSS در `styles.css` (`--player`, `--bullet`, `--enemy-*`, `--bg`) آینه شده است.

## توسعه و اجرای محلی

```bash
git clone https://github.com/andrbi107/pulse-arena.git
cd pulse-arena
# سرویس‌ورکر فقط روی http(s) ثبت می‌شود، پس یک سرور محلی راه بیندازید:
python3 -m http.server 8080
# سپس http://localhost:8080/ را در مرورگر باز کنید
```

برای آزمایش روی موبایل، می‌توانید پوشه را روی گوشی با یک سرور استاتیک سرو کنید یا از `ngrok`/مرورگر موبایل روی همان شبکه استفاده کنید.

## استقرار

محتوای شاخه‌ی `main` به‌صورت خودکار از طریق **GitHub Pages** سرو می‌شود:

**https://andrbi107.github.io/pulse-arena/**

هیچ build stepی لازم نیست — همه‌ی مسیرها relative هستند (`./`)، پس بازی هم از root مخزن و هم از زیرپوشه کار می‌کند.

## نسخه‌گذاری (SemVer)

این پروژه از [Semantic Versioning](https://semver.org/lang/fa/) پیروی می‌کند:

- نسخه‌ها از **`0.0.1`** آغاز می‌شوند (مرحله‌ی پیش از پایداری نهایی؛ هر تغییر می‌تواند breaking باشد).
- قالب: `MAJOR.MINOR.PATCH` → در فاز 0.x: `0.MINOR.PATCH`.
- **هر توسعه یا شخصی‌سازی** در یک شاخه‌ی جداگانه انجام می‌شود:
  - `feat/<name>` برای قابلیت جدید یا شخصی‌سازی
  - `fix/<name>` برای رفع باگ
  - `docs/<name>` برای مستندسازی
  - `refactor/<name>` برای بازسازمان‌دهی کد
- پس از merge به `main`، تگ SemVer بعدی زده می‌شود و یک **GitHub Release** منتشر می‌گردد.
- RELEASE NOTES هر بار در صفحه‌ی Releases مخزن ثبت می‌شود.

### نقشه‌ی نسخه‌بندی پیشنهادی برای توسعه‌های بعدی

| نوع تغییر | bump | مثال |
|---|---|---|
| رفع باگ کوچک، tweak رنگ/عدد | PATCH | `0.0.1` → `0.0.2` |
| قابلیت جدید، مکانیک جدید، level جدید | MINOR | `0.0.1` → `0.1.0` |
| بازنویسی API/ساختار، تغییر breaking | MAJOR (هنوز در 0.x) | `0.1.0` → `0.2.0` |
| رسیدن به پایداری نهایی | — | `0.x.0` → `1.0.0` |

## لایسنس

MIT — استفاده، تغییر و بازنشر آزاد. ساختهشده بهعنوان یک مهارت/قالب آموزشی برای بازی‌سازی PWA با Vanilla JS.
