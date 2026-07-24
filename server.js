const express = require("express");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");
const multer = require("multer");
const fs = require("fs-extra");
const webPush = require("web-push");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const compression = require("compression");

let Client, qrcode;
try {
  const whatsappModule = require("whatsapp-web.js");
  Client = whatsappModule.Client;
  const originalSendMessage = Client.prototype.sendMessage;
  Client.prototype.sendMessage = async function(chatId, content, options = {}) {
      options = options || {};
      options.sendSeen = false;
      return originalSendMessage.call(this, chatId, content, options);
  };
  qrcode = require("qrcode-terminal");
} catch (e) {
  console.warn("WhatsApp Web.js not available:", e.message);
}

const { GoogleGenerativeAI } = require("@google/generative-ai");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const app = express();

app.use(compression());
app.set("trust proxy", 1);

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "⛔ لقد تجاوزت الحد المسموح من الطلبات، يرجى الانتظار قليلاً.",
  },
});

app.use("/api", limiter);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    message: "⛔ محاولات دخول كثيرة خاطئة، تم حظر المحاولة مؤقتاً.",
  },
});
app.use("/api/login", loginLimiter);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],

        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://accept.paymob.com",
          "https://cdnjs.cloudflare.com",
          "https://cdn.jsdelivr.net",
          "https://pagead2.googlesyndication.com",
          "https://tpc.googlesyndication.com",
          "https://esm.sh",
          "https://unpkg.com",
        ],

        scriptSrcAttr: ["'unsafe-inline'"],

        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdnjs.cloudflare.com",
          "https://fonts.googleapis.com",
          "https://cdn.jsdelivr.net",
          "https://unpkg.com",
        ],

        imgSrc: [
          "'self'",
          "data:",
          "https://res.cloudinary.com",
          "https://pagead2.googlesyndication.com",
          "https://unpkg.com",
          "https://*.basemaps.cartocdn.com",
          "https://*.openstreetmap.org",
        ],

        fontSrc: [
          "'self'",
          "data:",
          "https://cdnjs.cloudflare.com",
          "https://fonts.gstatic.com",
          "https://cdn.jsdelivr.net",
        ],

        frameSrc: [
          "'self'",
          "https://accept.paymob.com",
          "https://googleads.g.doubleclick.net",
          "https://tpc.googlesyndication.com",
        ],

        connectSrc: [
          "'self'",
          "https://accept.paymob.com",
          "https://ep1.adtrafficquality.google",
          "https://scncapmhnshjpocenqpm.supabase.co",
          "https://nominatim.openstreetmap.org",
          "https://overpass-api.de",
        ],

        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "aqarak-secure-secret-key-2025";
const APP_URL = "https://aqarak.sa";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSy_PUT_YOUR_KEY_HERE";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const modelChat = genAI.getGenerativeModel({ model: "gemma-3-12b-it" });
const DEFAULT_SYSTEM_INSTRUCTION = `
أنت المساعد الذكي ودليل الاستخدام الرسمي لمنصة "عقارك".
مهمتك الوحيدة هي مساعدة المستخدمين في كيفية استخدام الموقع وشرح وظائفه بناءً على الدليل التالي بدقة.

⚠️ قواعد صارمة:
1. إذا سألك المستخدم عن أي شيء خارج نطاق "كيفية استخدام الموقع" (مثل أسئلة عامة، سياسة، دين، نكت، نصائح استثمارية)، اعتذر بلباقة وقل: "عذراً، أنا دليل استخدام لموقع عقارك الذكي فقط."
2. تحدث بلهجة سعودية ودودة ومحترفة.

📘 دليل استخدام موقع عقارك:

1️⃣ **التسجيل والدخول:**
- التسجيل برقم هاتف عليه واتساب (الكود بيوصل عليه).
- لإنشاء حساب: الاسم > اسم مستخدم (5+ حروف إنجليزي) > الرقم > الباسورد.
- نسيان الباسورد: اضغط "نسيت كلمة المرور" وهايجيلك كود ع الواتساب.

2️⃣ **تصفح الموقع:**
- الرئيسية فيها أحدث العقارات وشريط بحث ذكي.
- أزرار: "جميع العقارات"، "شراء"، "إيجار".
- زر "القائمة": فيه إعلاناتك، المفضلة، الخدمات، وتغيير الباسورد.
- زر "الخدمات": لشركاء التشطيب والنقل والكهرباء.

3️⃣ **اعرض عقارك (للبائعين):**
- دوس "اعرض عقارك" واملى البيانات.
- حدد الموقع ع الخريطة عشان الخدمات تظهر للمشتري.
- لو عندك فيديو، ابعتهولنا واتساب على 0500000000 واحنا هنضيفه.
- النشر بيتم في ثواني بعد المراجعة.

4️⃣ **تفاصيل العقار والتواصل:**
- صفحة العقار فيها كل التفاصيل (سعر، مساحة، تشطيب..) وزر "شاهد الفيديو".
- التواصل مع المالك مباشرة عن طريق زر "واتساب".
- تقدر تعمل "مشاركة"، "تفاوض"، أو تضيفه لـ "المفضلة".
- تحت العقار بنرشحلك 3 عقارات مشابهة.

5️⃣ **الدعم والميزات:**
- زر "الشكاوي" في الرئيسية لو واجهت مشكلة.
- ميزة "احجز عقارك": اطلب مواصفات معينة، وأول ما تتوفر هنبعتلك بيانات المالك فوراً.
- **ملحوظة:** خدمتنا مجانية 100% ولا نأخذ أي عمولة.
`;
const modelVision = genAI.getGenerativeModel({ model: "gemma-3-27b-it" });

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PHONE = process.env.ADMIN_PHONE;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const SALT_ROUNDS = 10;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

const botSettingsCache = {};
async function getBotSetting(key) {
  if (botSettingsCache[key] !== undefined) return botSettingsCache[key];
  const res = await pgQuery("SELECT setting_value FROM bot_settings WHERE setting_key = $1", [key]);
  botSettingsCache[key] = res.rows.length > 0 ? res.rows[0].setting_value : null;
  return botSettingsCache[key];
}
function invalidateBotSetting(key) { delete botSettingsCache[key]; }
const PAYMOB_API_KEY = process.env.PAYMOB_API_KEY;
const PAYMOB_HMAC = process.env.PAYMOB_HMAC;
const PAYMOB_INTEGRATION_CARD = process.env.PAYMOB_INTEGRATION_CARD;
const PAYMOB_IFRAME_ID = process.env.PAYMOB_IFRAME_ID;
const PAYMOB_INTEGRATION_WALLET = process.env.PAYMOB_INTEGRATION_WALLET;

const publicVapidKey =
  "BABE4bntVm_6RWE3zuv305i65FfcTN8xd6C3d4jdEwML8d7yLwoVywbgvhS7U-q2KE3cmKqDbgvZ8rK97C3gKp4";
const privateVapidKey = "cFJCSJoigPkZb-y4CxPsY9ffahOTxdlxAec3FVC3aKI";

webPush.setVapidDetails(
  "mailto:aqarakproperty@gmail.com",
  publicVapidKey,
  privateVapidKey
);

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
});

const storageProfiles = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "aqarak_users",
    format: async () => "webp",
    public_id: (req, file) =>
      `user-${Date.now()}-${Math.round(Math.random() * 1e9)}`,
    transformation: [
      { width: 400, height: 400, crop: "fill", gravity: "face" },
    ],
  },
});

const uploadProfile = multer({
  storage: storageProfiles,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 20,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
});

dbPool.on('error', (err, client) => {
  console.error('❌ Unexpected error on idle client', err);
});

const storageServices = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "aqarak_services",
    format: async () => "webp",
    public_id: (req, file) => `service-${Date.now()}`,
  },
});
const uploadService = multer({ storage: storageServices });

function pgQuery(sql, params = []) {
  return dbPool.query(sql, params);
}
function safeInt(value) {
  return isNaN(parseInt(value)) ? 0 : parseInt(value);
}
function toEnglishDigits(str) {
  if (!str) return "0";
  return str
    .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d))
    .replace(/[^0-9.]/g, "");
}

class PostgresStore {
  constructor(pool) {
    this.pool = pool;
  }
  async sessionExists(options) {
    try {
      const res = await this.pool.query(
        "SELECT 1 FROM whatsapp_sessions WHERE session_id = $1",
        [options.session]
      );
      return res.rows.length > 0;
    } catch (e) {
      return false;
    }
  }
  async save(options) {
    const filePath = `${options.session}.zip`;
    if (await fs.pathExists(filePath)) {
      const data = await fs.readFile(filePath);
      await this.pool.query(
        `INSERT INTO whatsapp_sessions (session_id, data) VALUES ($1, $2) ON CONFLICT (session_id) DO UPDATE SET data = $2`,
        [options.session, data]
      );
    }
  }
  async extract(options) {
    const res = await this.pool.query(
      "SELECT data FROM whatsapp_sessions WHERE session_id = $1",
      [options.session]
    );
    if (res.rows.length > 0) await fs.writeFile(options.path, res.rows[0].data);
  }
  async delete(options) {
    await this.pool.query(
      "DELETE FROM whatsapp_sessions WHERE session_id = $1",
      [options.session]
    );
  }
}

const store = new PostgresStore(dbPool);

let whatsappClient = null;
try {
  if (Client) {
    whatsappClient = new Client({
      authStrategy: new RemoteAuth({
        clientId: "aqarak-session",
        store: store,
        backupSyncIntervalMs: 600000,
      }),
      puppeteer: {
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--single-process",
          "--disable-gpu",
          "--disable-extensions",
          "--disable-component-update",
          "--disable-default-apps",
          "--disable-sync",
          "--disable-background-networking",
          "--disable-software-rasterizer",
          "--mute-audio",
          "--no-default-browser-check",
          "--disable-features=AudioServiceOutOfProcess,IsolateOrigins,site-per-process",
          "--blink-settings=imagesEnabled=false",
          "--window-size=800,600"
        ],
        timeout: 180000,
      },
    });
    whatsappClient.on("qr", (qr) => {
      console.log("📱 QR Code received. Scan it NOW:");
      qrcode.generate(qr, { small: true });
    });
    whatsappClient.on("remote_session_saved", () => {
      console.log("💾 تم حفظ جلسة الواتساب في الداتابيز بنجاح!");
    });
    whatsappClient.on("ready", () => {
      console.log("✅ الواتساب متصل وجاهز!");
    });
    whatsappClient.on("disconnected", (reason) => {
      console.log("❌ تم فصل الواتساب:", reason);
      whatsappClient.initialize();
    });
    whatsappClient.initialize();
  }
} catch (e) {
  console.warn("WhatsApp client not available:", e.message);
}

async function sendWhatsAppMessage(phone, message) {
  try {
    if (!whatsappClient) return false;
    let formattedNumber = phone.replace(/\D/g, "");
    if (formattedNumber.startsWith("05"))
      formattedNumber = "966" + formattedNumber;
    const numberDetails = await whatsappClient.getNumberId(formattedNumber);
    if (numberDetails) {
      await whatsappClient.sendMessage(numberDetails._serialized, message);
      return true;
    } else {
      console.error(`❌ الرقم غير مسجل في واتساب: ${formattedNumber}`);
      return false;
    }
  } catch (error) {
    console.error("WhatsApp Send Error:", error);
    return false;
  }
}

setInterval(() => {
  fetch(`${APP_URL}/api/ping`)
    .then(() => console.log("💓 Ping"))
    .catch((e) => {});
}, 5 * 60 * 1000);

const otpStore = {};

async function deleteCloudinaryImages(imageUrls) {
  if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) return;
  const publicIds = imageUrls
    .map((url) => {
      try {
        const parts = url.split("/");
        const filename = parts.pop();
        const folder = parts.pop();
        const id = filename.split(".")[0];
        return `${folder}/${id}`;
      } catch (e) {
        return null;
      }
    })
    .filter((id) => id !== null);

  if (publicIds.length > 0) {
    try {
      await cloudinary.api.delete_resources(publicIds);
    } catch (error) {
      console.error("Cloudinary Delete Error (Ignored):", error.message);
    }
  }
}

function normalizeText(text) {
  if (!text) return "";
  return text
    .replace(/(أ|إ|آ)/g, "ا")
    .replace(/(ة)/g, "ه")
    .replace(/(ى)/g, "ي")
    .replace(/(ؤ|ئ)/g, "ء")
    .toLowerCase();
}
async function checkAndNotifyMatches(propertyDetails) {
  try {
    console.log(`🔍 جاري البحث عن مهتمين بالعقار: ${propertyDetails.title}`);

    const requests = await pgQuery(
      `
            SELECT * FROM property_requests 
            WHERE 
                ("governorate" = $1 OR "governorate" IS NULL OR "governorate" = '')
                AND ("city" = $2 OR "city" IS NULL OR "city" = '')
                AND ("req_type" = $3 OR "req_type" IS NULL)
                AND ("max_price" >= $4 * 0.9) -- السماح بفرق 10%
            ORDER BY id DESC LIMIT 50
        `,
      [
        propertyDetails.governorate || "",
        propertyDetails.city || "",
        propertyDetails.type,
        parseFloat(propertyDetails.numericPrice || 0),
      ]
    );

    console.log(`✅ وجدنا ${requests.rows.length} طلب مطابق.`);

    const notifications = [];
    for (const req of requests.rows) {
      const reportCheck = await pgQuery(
        `
                SELECT 1 FROM user_reports 
                WHERE (reporter_phone = $1 AND reported_phone = $2) 
                   OR (reporter_phone = $2 AND reported_phone = $1)
            `,
        [propertyDetails.sellerPhone, req.phone]
      );

      if (reportCheck.rows.length > 0) continue;

      const buyerMsg = `🎉 بشرى سارة يا ${req.name}!\n\nطلبك توفر عندنا في "عقارك"! 🏠\nعقار جديد: *${propertyDetails.title}*\n📍 الموقع: ${propertyDetails.city} - ${propertyDetails.governorate}\n💰 السعر: ${propertyDetails.price} ر.س\n\n🔗 التفاصيل والصور: ${APP_URL}/property-details?id=${propertyDetails.id}\n\n📞 للتواصل مع المالك: ${propertyDetails.sellerPhone}`;
      const sellerMsg = `🚀 عقارك لقطة ومطلوب!\n\nالسيستم لقى مشتري مهتم بنفس مواصفات عقارك *(${propertyDetails.title})*.\n\n👤 الاسم: ${req.name}\n📞 رقمه: ${req.phone}\n\nتواصل معاه فوراً وبالتوفيق! 😉`;
      
      notifications.push(
        sendWhatsAppMessage(req.phone, buyerMsg),
        sendWhatsAppMessage(propertyDetails.sellerPhone, sellerMsg)
      );
    }
    
    await Promise.allSettled(notifications);
  } catch (e) {
    console.error("Matching Error:", e);
  }
}

async function sendDiscordNotification(
  title,
  fields,
  color = 3447003,
  imageUrl = null
) {
  if (!DISCORD_WEBHOOK_URL || DISCORD_WEBHOOK_URL.includes("ضع_رابط")) return;
  const embed = {
    title,
    color,
    fields,
    footer: { text: "Aqarak Bot 🏠" },
    timestamp: new Date().toISOString(),
  };
  if (imageUrl) embed.image = { url: imageUrl };
  try {
    await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    });
  } catch (error) {
    console.error("Discord Error:", error.message);
  }
}

async function notifyAllUsers(title, body, url) {
  try {
    const result = await pgQuery("SELECT * FROM subscriptions");
    result.rows.forEach((sub) => {
      webPush
        .sendNotification(
          { endpoint: sub.endpoint, keys: JSON.parse(sub.keys) },
          JSON.stringify({ title, body, url, icon: "/logo.jpg" })
        )
        .catch((err) => {
          if (err.statusCode === 410 || err.statusCode === 404)
            pgQuery("DELETE FROM subscriptions WHERE id = $1", [sub.id]);
        });
    });
  } catch (err) {
    console.error("Web Push Error:", err);
  }
}

async function urlToGenerativePart(url) {
  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return {
      inlineData: {
        data: Buffer.from(arrayBuffer).toString("base64"),
        mimeType: "image/webp",
      },
    };
  } catch (error) {
    console.error("Error fetching image for AI:", error);
    return null;
  }
}

async function aiCheckProperty(title, description, price, imageUrls, category) {
  try {
    const imageParts = [];
    if (imageUrls && imageUrls.length > 0) {
      for (const url of imageUrls.slice(0, 4)) {
        const part = await urlToGenerativePart(url);
        if (part) imageParts.push(part);
      }
    }

    const prompt = `
أنت مراقب جودة لمنصة عقارية.
البيانات المقدمة:
- تصنيف العقار: "${category}" (مثل: apartment, villa, land, store, building)
- العنوان: "${title}"
- الوصف: "${description}"

المطلوب: فحص الصور ومقارنتها مع "تصنيف العقار" فقط (تجاهل هل هو بيع أم إيجار):
1. لو التصنيف "land" (أرض) والصور تحتوي على أثاث أو شقة من الداخل -> الحالة: pending، السبب: "الصور لا تطابق التصنيف (مختار أرض والصور لشقة)".
2. لو التصنيف "apartment" (شقة) والصور لأرض فضاء فقط -> الحالة: pending، السبب: "الصور لا تطابق التصنيف (مختار شقة والصور لأرض)".
3. لو التصنيف "building" (عمارة) والصور لشقة من الداخل فقط ولا توجد واجهة -> الحالة: pending، السبب: "يرجى إضافة صورة لواجهة العمارة".
4. لو الصور سوداء تماماً أو غير واضحة -> الحالة: pending، السبب: "الصور غير واضحة".
5. لو الصور تطابق التصنيف -> الحالة: approved.

رد بصيغة JSON فقط:
{
  "status": "approved" أو "pending" أو "rejected",
  "reason": "سبب التعليق باختصار للعرض للمستخدم",
  "user_message": "رسالة للمستخدم باللهجة السعودية توضح النتيجة",
  "marketing_description": "اكتب وصف تسويقي جذاب جداً لهذا العقار بناءً على الصور والبيانات"
}
`;
    const result = await modelVision.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    let text = response
      .text()
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    return JSON.parse(text);
  } catch (error) {
    console.error("AI Check Error:", error);
    return {
      status: "pending",
      reason: "خطأ تقني في الفحص",
      user_message: "جاري المراجعة اليدوية بواسطة الإدارة.",
      marketing_description: description,
    };
  }
}
function generateUniqueCode() {
  return "AQ-" + Math.floor(100000 + Math.random() * 900000);
}

async function createTables() {
  const queries = [
    `CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY, 
            name TEXT, 
            username TEXT UNIQUE, 
            phone TEXT NOT NULL UNIQUE, 
            password TEXT NOT NULL, 
            role TEXT DEFAULT 'user', 
            lifetime_posts INTEGER DEFAULT 0,
            is_banned BOOLEAN DEFAULT FALSE
        )`,

    `CREATE TABLE IF NOT EXISTS user_ratings (
    reviewer_phone TEXT,
    reviewed_phone TEXT,
    stars INTEGER CHECK (stars >= 1 AND stars <= 5),
    updated_at TEXT,
    PRIMARY KEY (reviewer_phone, reviewed_phone)
)`,

    `CREATE TABLE IF NOT EXISTS user_comments (
    id SERIAL PRIMARY KEY,
    reviewer_phone TEXT,
    reviewed_phone TEXT,
    comment TEXT,
    created_at TEXT
)`,

    `CREATE TABLE IF NOT EXISTS contact_logs (
    id SERIAL PRIMARY KEY,
    user_phone TEXT,
    owner_phone TEXT,
    contact_date TIMESTAMP DEFAULT NOW(),
    reminder_sent BOOLEAN DEFAULT FALSE
)`,
    `CREATE TABLE IF NOT EXISTS properties (
            id SERIAL PRIMARY KEY, title TEXT NOT NULL, price TEXT NOT NULL, "numericPrice" NUMERIC, 
            rooms INTEGER, bathrooms INTEGER, area INTEGER, description TEXT, 
            "imageUrl" TEXT, "imageUrls" TEXT, type TEXT NOT NULL, "hiddenCode" TEXT UNIQUE, 
            "sellerName" TEXT, "sellerPhone" TEXT, "publisherUsername" TEXT, 
            "isFeatured" BOOLEAN DEFAULT FALSE, "isLegal" BOOLEAN DEFAULT FALSE, "video_urls" TEXT[] DEFAULT '{}',
            "level" TEXT, "floors_count" INTEGER, "finishing_type" TEXT
        )`,

    `CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        reviewer_id INTEGER,
        reviewer_name TEXT,
        reviewed_phone TEXT,
        rating INTEGER,
        comment TEXT,
        created_at TEXT,
        UNIQUE(reviewer_id, reviewed_phone)
    )`,

    `CREATE TABLE IF NOT EXISTS seller_submissions (
            id SERIAL PRIMARY KEY, "sellerName" TEXT NOT NULL, "sellerPhone" TEXT NOT NULL, 
            "propertyTitle" TEXT NOT NULL, "propertyType" TEXT NOT NULL, "propertyPrice" TEXT NOT NULL, 
            "propertyArea" INTEGER, "propertyRooms" INTEGER, "propertyBathrooms" INTEGER, 
            "propertyDescription" TEXT, "imagePaths" TEXT, "submissionDate" TEXT, status TEXT DEFAULT 'pending',
            "propertyLevel" TEXT, "propertyFloors" INTEGER, "propertyFinishing" TEXT,
            "ai_review_note" TEXT
        )`,

    `CREATE TABLE IF NOT EXISTS property_requests (id SERIAL PRIMARY KEY, name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT, specifications TEXT NOT NULL, "submissionDate" TEXT)`,
    `CREATE TABLE IF NOT EXISTS favorites (id SERIAL PRIMARY KEY, user_phone TEXT NOT NULL, property_id INTEGER NOT NULL, UNIQUE(user_phone, property_id))`,
    `CREATE TABLE IF NOT EXISTS property_offers (id SERIAL PRIMARY KEY, property_id INTEGER, buyer_name TEXT, buyer_phone TEXT, offer_price TEXT, created_at TEXT)`,
    `CREATE TABLE IF NOT EXISTS subscriptions (id SERIAL PRIMARY KEY, endpoint TEXT UNIQUE, keys TEXT)`,
    `CREATE TABLE IF NOT EXISTS bot_settings (id SERIAL PRIMARY KEY, setting_key TEXT UNIQUE, setting_value TEXT)`,
    `CREATE TABLE IF NOT EXISTS whatsapp_sessions (session_id TEXT PRIMARY KEY, data BYTEA)`,
    `CREATE TABLE IF NOT EXISTS complaints (
            id SERIAL PRIMARY KEY,
            user_id INTEGER,
            user_name TEXT,
            user_phone TEXT,
            content TEXT,
            status TEXT DEFAULT 'pending',
            created_at TEXT
        )`,

    `CREATE TABLE IF NOT EXISTS services (
    id SERIAL PRIMARY KEY,
    title TEXT,
    description TEXT,
    image_url TEXT,
    link_type TEXT,
    link_url TEXT,
    created_at TEXT
)`,
  ];

  try {
    for (const query of queries) await pgQuery(query);

    await pgQuery(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE`
    );

    await pgQuery(
      `INSERT INTO bot_settings (setting_key, setting_value) VALUES ($1, $2) ON CONFLICT (setting_key) DO NOTHING`,
      ["system_prompt", DEFAULT_SYSTEM_INSTRUCTION]
    );

    await pgQuery(`
            CREATE OR REPLACE FUNCTION increment_post_count() RETURNS TRIGGER AS $$
            BEGIN
                UPDATE users SET lifetime_posts = lifetime_posts + 1 WHERE phone = NEW."sellerPhone";
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);

    await pgQuery(`DROP TRIGGER IF EXISTS trigger_post_count ON properties`);
    await pgQuery(
      `CREATE TRIGGER trigger_post_count AFTER INSERT ON properties FOR EACH ROW EXECUTE FUNCTION increment_post_count();`
    );

    console.log("✅ Tables, Triggers & Ban System synced.");

    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_properties_sellerPhone ON properties("sellerPhone")`,
      `CREATE INDEX IF NOT EXISTS idx_properties_type ON properties(type)`,
      `CREATE INDEX IF NOT EXISTS idx_properties_numericPrice ON properties("numericPrice")`,
      `CREATE INDEX IF NOT EXISTS idx_properties_governorate ON properties(governorate)`,
      `CREATE INDEX IF NOT EXISTS idx_properties_city ON properties(city)`,
      `CREATE INDEX IF NOT EXISTS idx_properties_isFeatured ON properties("isFeatured")`,
      `CREATE INDEX IF NOT EXISTS idx_favorites_user_phone ON favorites(user_phone)`,
      `CREATE INDEX IF NOT EXISTS idx_user_ratings_reviewed_phone ON user_ratings(reviewed_phone)`,
      `CREATE INDEX IF NOT EXISTS idx_user_comments_reviewed_phone ON user_comments(reviewed_phone)`,
      `CREATE INDEX IF NOT EXISTS idx_seller_submissions_status ON seller_submissions(status)`,
      `CREATE INDEX IF NOT EXISTS idx_subscriptions_endpoint ON subscriptions(endpoint)`,
      `CREATE INDEX IF NOT EXISTS idx_user_notifications_user_phone ON user_notifications(user_phone)`,
      `CREATE INDEX IF NOT EXISTS idx_transactions_user_phone ON transactions(user_phone)`,
      `CREATE INDEX IF NOT EXISTS idx_contact_logs_reminder_sent ON contact_logs(reminder_sent)`,
      `CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status)`,
    ];
    for (const idx of indexes) await pgQuery(idx);
    console.log("✅ Database indexes created.");
  } catch (err) {
    console.error("❌ Table Sync Error:", err);
  }
}
createTables();

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const storageSeller = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "aqarak_submissions",
    format: async () => "webp",
    public_id: (req, file) =>
      `seller-${Date.now()}-${Math.round(Math.random() * 1e9)}`,
  },
});
const uploadSeller = multer({
  storage: storageSeller,
  limits: { fileSize: MAX_FILE_SIZE },
});
const storageProperties = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "aqarak_properties",
    format: async () => "webp",
    public_id: (req, file) =>
      `property-${Date.now()}-${Math.round(Math.random() * 1e9)}`,
  },
});
const uploadProperties = multer({
  storage: storageProperties,
  limits: { fileSize: MAX_FILE_SIZE },
});

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.get("/property", async (req, res) => {
  const propertyId = req.query.id;

  if (!propertyId) {
    return res.sendFile(
      path.join(__dirname, "public", "property-details.html")
    );
  }

  try {
    const result = await pgQuery(
      'SELECT title, description, "imageUrl" FROM properties WHERE id = $1',
      [propertyId]
    );

    if (result.rows.length === 0) {
      return res.sendFile(
        path.join(__dirname, "public", "property-details.html")
      );
    }

    const property = result.rows[0];
    const filePath = path.join(__dirname, "public", "property-details.html");

    let htmlContent = await fs.readFile(filePath, "utf8");

    htmlContent = htmlContent
      .replace(/{{TITLE}}/g, property.title || "عقار جديد")
      .replace(
        /{{DESCRIPTION}}/g,
        (property.description || "تفاصيل العقار على موقع عقارك").substring(
          0,
          160
        )
      )
      .replace(
        /{{IMAGE}}/g,
        property.imageUrl || "https://aqarak.sa/logo.png"
      )
      .replace(/{{URL}}/g, `https://aqarak.sa/property?id=${propertyId}`);

    res.send(htmlContent);
  } catch (error) {
    console.error("Error serving dynamic property details:", error);
    res.sendFile(path.join(__dirname, "public", "property-details.html"));
  }
});

app.use(
  express.static(path.join(__dirname, "public"), {
    extensions: ["html"],
    index: false,
    maxAge: '1h',
    etag: true,
  })
);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "home.html"));
});

const SAUDI_LOCATIONS = {
  الرياض: ["الرياض", "حيدر آباد", "الظهران", "العليا", "الملز", "النسيم", "العليا", "الروضة", "الفيصلية", "الدانة", "الياسمين", "النرجس", "المحمدية", "السويدي", "حطين", "الغدير", "عرقة", "البديعة", "المروج", "الورود", "الربيع", "النزهة", "الواحة", "العزيزية", "الصفراء", "الغاط", "الدليم", "السليل", "وادي الدواسر", "الأفلاج", "المجمعة", "الخرج", "الدوادمي", "سيال", "الزلفي", "المدينة المنورة", "العلا", "بدر", "ينبع", "الحناكية", "العيسلة"],
  جدة: ["جدة", "الشاطئ", "الفيصلية", "أبحر", "الحمرا", "الروضة", "الравيع", "الصالحية", "البانوراما", "النخيل", "المرجان", "السنابل", "النعيم", "كريمي", "ال.trace", "المنار"],
  "مكة المكرمة": ["مكة المكرمة", "العزيزية", "العمرة", "النسيم", "الزاهر", "الهجرة", "الحجون", "أجياد", "الشفا", "الكعكية", "ال Rusaisy", "التنعيم", "السيل الصغير", "السر", "قرن المنازل"],
  الدمام: ["الدمام", "الظهران", "الخبر", "القطيف", "سيهات", "تاروت", "الجبيل", "الصفوى", "رأس تنورة", "الظهران", "الفيصلية", "المزروعية", "الهدا"],
  الطائف: ["الطائف", "الهدا", "الشmiss", "الروضة", "العقيق"],
  أبها: ["أبها", "خميس مشيط", "النماص", "بيشة", "تنومة", "الحرجة", "سراة عبيدة", "بلجرشي", "العرين"],
  تبوك: ["تبوك", "العلا", "ضباء", "الشقيق", "تيماء", "الحمراء"],
  عنيزة: ["عنيزة", "بُريدة", "الرس", "المذنب", "الأحمدي", "القصيم"],
  حائل: ["حائل", "بقعاء", "السليمي", "الغزالة", "الحائط"],
  الجبيل: ["الجبيل", "الجبيل الصناعية", "الزور"],
  نجران: ["نجران", "صبيا", "بيشة", "الدرب", "الحرث", "شرورة"],
  ينبع: ["ينبع", "ينبع البحر", "العصافير", "الخريب"],
};

function getLevenshteinDistance(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function expandSearchKeywords(message) {
  const normalizedMsg = normalizeText(message);
  const userWords = normalizedMsg.split(/\s+/);
  let expandedKeywords = [];
  for (const [gov, cities] of Object.entries(SAUDI_LOCATIONS)) {
    for (const word of userWords) {
      if (word.length < 3) continue;
      const normGov = normalizeText(gov);
      if (
        getLevenshteinDistance(word, normGov) <= 1 ||
        normGov.includes(word)
      ) {
        expandedKeywords.push(gov);
      }
      for (const city of cities) {
        const normCity = normalizeText(city);
        const tolerance = normCity.length > 5 ? 2 : 1;
        if (
          getLevenshteinDistance(word, normCity) <= tolerance ||
          normCity.includes(word)
        ) {
          expandedKeywords.push(gov);
          expandedKeywords.push(city);
        }
      }
    }
  }
  return [...new Set(expandedKeywords)];
}

const chatHistories = {};
const TIMEOUT_MS = 15 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of Object.entries(chatHistories)) {
    if (session.lastActive && now - session.lastActive > TIMEOUT_MS)
      delete chatHistories[id];
  }
}, 5 * 60 * 1000);

app.post("/api/admin/update-prompt", async (req, res) => {
  const token = req.cookies.auth_token;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "admin")
      return res.status(403).json({ message: "غير مسموح" });
    const { newPrompt } = req.body;
    await pgQuery(
      `INSERT INTO bot_settings (setting_key, setting_value) VALUES ('system_prompt', $1) ON CONFLICT (setting_key) DO UPDATE SET setting_value = $1`,
      [newPrompt]
    );
    invalidateBotSetting('system_prompt');
    for (const id in chatHistories) delete chatHistories[id];
    res.json({ success: true, message: "تم التحديث" });
  } catch (e) {
    return res.status(401).json({ message: "خطأ" });
  }
});

app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;
    const sessionId =
      req.cookies.auth_token ||
      "guest_" + (req.headers["x-forwarded-for"] || req.socket.remoteAddress);
    if (!message) return res.json({ reply: "" });

    let systemPrompt = DEFAULT_SYSTEM_INSTRUCTION;
    const cachedPrompt = await getBotSetting('system_prompt');
    if (cachedPrompt) systemPrompt = cachedPrompt;

    if (!chatHistories[sessionId]) {
      chatHistories[sessionId] = {
        history: [
          { role: "user", parts: [{ text: systemPrompt }] },
          { role: "model", parts: [{ text: "تمام." }] },
        ],
        lastActive: Date.now(),
      };
    } else {
      chatHistories[sessionId].lastActive = Date.now();
    }

    if (chatHistories[sessionId].awaitingPassword) {
      if (message.trim() === ADMIN_PASSWORD) {
        const newInstruction = chatHistories[sessionId].pendingInstruction;
        const updatedPrompt = systemPrompt + `\n* ${newInstruction}`;
        await pgQuery(
          "INSERT INTO bot_settings (setting_key, setting_value) VALUES ('system_prompt', $1) ON CONFLICT (setting_key) DO UPDATE SET setting_value = $1",
          [updatedPrompt]
        );
        invalidateBotSetting('system_prompt');
        delete chatHistories[sessionId].awaitingPassword;
        delete chatHistories[sessionId].pendingInstruction;
        chatHistories[sessionId].history = [
          { role: "user", parts: [{ text: updatedPrompt }] },
          { role: "model", parts: [{ text: "تم حفظ التعليمات." }] },
        ];
        return res.json({ reply: "✅ تمام يا هندسة، حفظت المعلومة!" });
      } else {
        delete chatHistories[sessionId].awaitingPassword;
        delete chatHistories[sessionId].pendingInstruction;
        return res.json({ reply: "❌ الباسورد غلط." });
      }
    }

    if (
      message.trim().startsWith("تعلم ") ||
      message.trim().startsWith("learn ")
    ) {
      const instruction = message.replace(/^(تعلم|learn)\s+/i, "").trim();
      if (instruction) {
        chatHistories[sessionId].awaitingPassword = true;
        chatHistories[sessionId].pendingInstruction = instruction;
        return res.json({
          reply: "🔒 عشان أعتمد المعلومة، محتاج **باسورد الأدمن**:",
        });
      }
    }

    const phoneRegex = /^05[0-9]{8}$/;
    const phoneMatch = message.match(phoneRegex);
    if (phoneMatch) {
      const recentHistory = chatHistories[sessionId].history.slice(2).slice(-6);
      let contextText = recentHistory
        .map(
          (h) =>
            `**${
              h.role === "user" ? "👤" : "🤖"
            }:** ${h.parts[0].text.substring(0, 100)}...`
        )
        .join("\n");
      if (!contextText) contextText = "لا يوجد سياق.";
      await sendDiscordNotification(
        "🎯 Lead Alert!",
        [
          { name: "📞 الرقم", value: phoneMatch[0] },
          { name: "💬 الرسالة", value: message },
          { name: "📜 السياق", value: contextText },
        ],
        15158332
      );
    }

    let dbContext = "";
    let finalPrompt = message;
    let intendedLocation = false;
    const potentialKeywords = expandSearchKeywords(message);
    if (potentialKeywords.length > 0) intendedLocation = true;

    finalPrompt = message + dbContext;
    const chatSession = modelChat.startChat({
      history: chatHistories[sessionId].history,
      generationConfig: { maxOutputTokens: 2000, temperature: 0.0 },
    });
    const result = await chatSession.sendMessage(finalPrompt);
    let reply = result.response.text();
    reply = reply
      .replace(/```html/g, "")
      .replace(/```/g, "")
      .trim();
    chatHistories[sessionId].history.push({
      role: "user",
      parts: [{ text: finalPrompt }],
    });
    chatHistories[sessionId].history.push({
      role: "model",
      parts: [{ text: reply }],
    });
    res.json({ reply: reply });
  } catch (error) {
    console.error("Gemini Error:", error);
    res.status(500).json({ reply: "معلش يا هندسة، النت تقيل. جرب تاني!" });
  }
});

app.post("/api/check-username", async (req, res) => {
  const { username } = req.body;
  if (!username) return res.json({ available: false });
  if (username.length < 3 || username.length > 20)
    return res.json({ available: false, message: "invalid_length" });
  const validRegex = /^[a-z0-9_.]+$/;
  if (!validRegex.test(username))
    return res.json({ available: false, message: "invalid_format" });
  try {
    const result = await pgQuery("SELECT id FROM users WHERE username = $1", [
      username.toLowerCase(),
    ]);
    if (result.rows.length > 0)
      res.json({ available: false, message: "taken" });
    else res.json({ available: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/auth/send-otp", async (req, res) => {
  const { phone, type } = req.body;
  if (!phone) return res.status(400).json({ message: "رقم الهاتف مطلوب" });
  try {
    const userCheck = await pgQuery("SELECT id FROM users WHERE phone = $1", [
      phone,
    ]);
    const userExists = userCheck.rows.length > 0;
    if (type === "register" && userExists)
      return res
        .status(409)
        .json({ success: false, message: "هذا الرقم مسجل بالفعل" });
    if (type === "reset" && !userExists)
      return res.status(404).json({ success: false, message: "رقم غير مسجل" });

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    otpStore[phone] = { code: otp, expires: Date.now() + 10 * 60 * 1000 };
    const message = `🔐 كود التحقق الخاص بك في *عقارك* هو: *${otp}*`;
    const sent = await sendWhatsAppMessage(phone, message);
    if (sent) res.json({ success: true, message: "تم إرسال الكود" });
    else res.status(500).json({ success: false, message: "فشل إرسال الرسالة" });
  } catch (e) {
    res.status(500).json({ message: "خطأ في السيرفر" });
  }
});

app.post(
  "/api/register",
  uploadProfile.single("profileImage"),
  async (req, res) => {
    const { name, phone, password, otp } = req.body;
    let { username } = req.body;
    username = username ? username.toLowerCase().trim() : "";

    const profilePicUrl = req.file ? req.file.path : null;

    if (!otpStore[phone] || otpStore[phone].code !== otp) {
      if (req.file) await deleteCloudinaryImages([req.file.path]);
      return res.status(400).json({ message: "كود التحقق غير صحيح" });
    }

    try {
      const banCheck = await pgQuery(
        "SELECT is_banned FROM users WHERE phone = $1",
        [phone]
      );
      if (banCheck.rows.length > 0 && banCheck.rows[0].is_banned) {
        return res.status(403).json({ message: "⛔ هذا الرقم محظور." });
      }

      if (username.length < 3 || username.length > 20)
        return res.status(400).json({ message: "اسم المستخدم قصير" });

      const userCheck = await pgQuery(
        "SELECT id FROM users WHERE username = $1",
        [username]
      );
      if (userCheck.rows.length > 0)
        return res.status(409).json({ message: "اسم المستخدم محجوز" });

      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

      await pgQuery(
        `INSERT INTO users (name, username, phone, password, role, profile_picture, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          name,
          username,
          phone,
          hashedPassword,
          "user",
          profilePicUrl,
          new Date().toISOString(),
        ]
      );

      delete otpStore[phone];
      res.status(201).json({ success: true, message: "تم إنشاء الحساب بنجاح" });
    } catch (error) {
      console.error("Register Error:", error);
      res.status(500).json({ message: "خطأ في السيرفر" });
    }
  }
);
app.post("/api/login", async (req, res) => {
  const { phone, password } = req.body;

  if (phone === ADMIN_PHONE && password === ADMIN_PASSWORD) {
    const token = jwt.sign(
      {
        id: 1932024,
        phone: ADMIN_PHONE,
        role: "admin",
        username: "admin",
        name: "المدير العام",
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return res.json({
      success: true,
      role: "admin",
      username: "admin",
      name: "المدير العام",
    });
  }

  try {
    const r = await pgQuery(`SELECT * FROM users WHERE phone=$1`, [phone]);
    if (!r.rows[0])
      return res.status(404).json({
        success: false,
        errorType: "phone",
        message: "رقم الهاتف غير مسجل",
      });

    if (r.rows[0].is_banned) {
      return res.status(403).json({
        success: false,
        message:
          "⛔ حسابك محظور من استخدام الموقع. تواصل مع الإدارة عبر واتساب.",
      });
    }

    if (!(await bcrypt.compare(password, r.rows[0].password)))
      return res.status(401).json({
        success: false,
        errorType: "password",
        message: "كلمة المرور خطأ",
      });

    const user = r.rows[0];
    const token = jwt.sign(
      {
        id: user.id,
        phone: user.phone,
        role: user.role,
        username: user.username,
        name: user.name,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.json({
      success: true,
      role: user.role,
      username: user.username,
      name: user.name,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

app.post("/api/auth/reset-password", async (req, res) => {
  const { phone, otp, newPassword } = req.body;
  if (!otpStore[phone] || otpStore[phone].code !== otp)
    return res.status(400).json({ message: "الكود غير صحيح" });
  try {
    const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await pgQuery(`UPDATE users SET password = $1 WHERE phone = $2`, [
      hash,
      phone,
    ]);
    delete otpStore[phone];
    res.json({ success: true, message: "تم تغيير كلمة المرور" });
  } catch (err) {
    res.status(500).json({ message: "خطأ" });
  }
});

app.get("/api/auth/me", async (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) return res.json({ isAuthenticated: false, role: "guest" });

  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.id)
      return res.json({ isAuthenticated: false, role: "guest" });

    if (decoded.role === "admin" && decoded.phone === ADMIN_PHONE) {
      return res.json({
        isAuthenticated: true,
        role: "admin",
        phone: decoded.phone,
        username: "admin",
        name: "المدير العام",
        balance: 999999,
        isPaymentActive: true,
        is_verified: true,
      });
    }

    // ---------------------------------------------------------
    // التعديل هنا: تمت إضافة (cover_picture, job_title, social_links)
    // ---------------------------------------------------------
    const userRes = await pgQuery(
      `SELECT role, phone, username, name, is_banned, wallet_balance, 
      is_verified, profile_picture, bio, cover_picture, job_title, social_links 
      FROM users WHERE id = $1`,
      [decoded.id]
    );

    if (userRes.rows.length === 0)
      return res.json({ isAuthenticated: false, role: "guest" });
    const user = userRes.rows[0];

    if (user.is_banned) {
      return res.status(403).json({
        isAuthenticated: false,
        banned: true,
        username: user.username,
        phone: user.phone,
        name: user.name,
      });
    }

    let isPaymentActive = false;
    const paymentActive = await getBotSetting('payment_active');
    isPaymentActive = paymentActive === "true";

    res.json({
      isAuthenticated: true,
      role: user.role,
      phone: user.phone,
      username: user.username,
      name: user.name,
      balance: parseFloat(user.wallet_balance || 0),
      is_verified: user.is_verified,
      profile_picture: user.profile_picture,
      bio: user.bio,
      // ---------------------------------------------------------
      // وهنا أيضاً نمرر البيانات الجديدة للفرونت إند
      // ---------------------------------------------------------
      cover_picture: user.cover_picture,
      job_title: user.job_title,
      social_links: user.social_links,
      isPaymentActive: isPaymentActive,
    });
  } catch (err) {
    res.json({ isAuthenticated: false, role: "guest" });
  }
});
app.post("/api/logout", (req, res) => {
  res.clearCookie("auth_token");
  res.json({ success: true });
});

app.post(
  "/api/submit-seller-property",
  uploadSeller.array("images", 10),
  async (req, res) => {
    const token = req.cookies.auth_token;
    if (!token)
      return res
        .status(401)
        .json({ success: false, message: "سجل دخول أولاً" });

    let realUser;
    try {
      realUser = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(403).json({ success: false });
    }

    const sellerName = realUser.name || "مستخدم";
    const sellerPhone = realUser.phone;
    let isPaidSystem = false;

    if (realUser.role !== "admin") {
      try {
        const paymentActive = await getBotSetting('payment_active');
        isPaidSystem = paymentActive === "true";

        if (isPaidSystem) {
          const balanceRes = await pgQuery(
            "SELECT wallet_balance FROM users WHERE phone = $1",
            [sellerPhone]
          );
          const currentBalance = parseFloat(
            balanceRes.rows[0]?.wallet_balance || 0
          );

          if (currentBalance < 1)
            return res.status(402).json({
              success: false,
              message: "رصيدك لا يكفي.",
              needCharge: true,
            });
          await pgQuery(
            "UPDATE users SET wallet_balance = wallet_balance - 1 WHERE phone = $1",
            [sellerPhone]
          );
          await pgQuery(
            `INSERT INTO transactions (user_phone, amount, type, description, date) VALUES ($1, 1, 'withdraw', 'نشر عقار', $2)`,
            [sellerPhone, new Date().toISOString()]
          );
        }
      } catch (e) {
        return res.status(500).json({ success: false, message: "خطأ دفع" });
      }
    }

    const {
      propertyTitle,
      propertyType,
      propertyCategory,
      propertyPrice,
      propertyArea,
      propertyDescription,
      propertyRooms,
      propertyBathrooms,
      propertyLevel,
      propertyFloors,
      propertyFinishing,
      nearby_services,
      latitude,
      longitude,
      governorate,
      city,
      unitCount,
      landType,
    } = req.body;

    const files = req.files || [];
    const paths = files.map((f) => f.path).join(" | ");
    const imageUrls = files.map((f) => f.path);
    const code = "AQ-" + Math.floor(100000 + Math.random() * 900000);
    const englishPrice = toEnglishDigits(propertyPrice);

    try {
      const aiReview = await aiCheckProperty(
        propertyTitle,
        propertyDescription,
        englishPrice,
        imageUrls,
        propertyCategory
      );

      const isPublic = aiReview.status === "approved";

      const notifTitle = isPublic ? "مبروك! تم النشر ✅" : "مراجعة الإعلان ⚠️";
      const notifBody = aiReview.user_message || "تم استلام إعلانك.";

      const subRes = await pgQuery(
        `
            INSERT INTO seller_submissions 
            ("sellerName", "sellerPhone", "propertyTitle", "propertyType", "propertyPrice", "propertyArea", 
             "propertyRooms", "propertyBathrooms", "propertyDescription", "imagePaths", "submissionDate", status,
             "propertyLevel", "propertyFloors", "propertyFinishing", "ai_review_note", 
             "nearby_services", "latitude", "longitude", "governorate", "city", "unit_count") 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
            RETURNING id
        `,
        [
          sellerName,
          sellerPhone,
          propertyTitle,
          propertyType,
          englishPrice,
          safeInt(propertyArea),
          safeInt(propertyRooms),
          safeInt(propertyBathrooms),
          propertyDescription,
          paths,
          new Date().toISOString(),
          aiReview.status,
          propertyLevel || "",
          safeInt(propertyFloors),
          propertyFinishing || landType || "",
          aiReview.reason,
          nearby_services || "",
          parseFloat(latitude),
          parseFloat(longitude),
          governorate || "",
          city || "",
          safeInt(unitCount),
        ]
      );

      await createNotification(sellerPhone, notifTitle, notifBody);

      await sendDiscordNotification(
        isPublic
          ? "✅ إعلان جديد (مقبول تلقائياً)"
          : "⚠️ إعلان جديد (قيد المراجعة)",
        [
          { name: "👤 المالك", value: `${sellerName} - ${sellerPhone}` },
          {
            name: "🏠 العقار",
            value: `${propertyTitle} (${propertyType})`,
          },
          { name: "💰 السعر", value: englishPrice },
          {
            name: "🤖 قرار AI",
            value: `${aiReview.status} - ${aiReview.reason}`,
          },
        ],
        isPublic ? 3066993 : 16776960
      );

      if (isPublic) {
        const pubRes = await pgQuery(
          `
                INSERT INTO properties 
                (title, price, "numericPrice", rooms, bathrooms, area, description, "imageUrl", "imageUrls", type, 
                 "hiddenCode", "sellerName", "sellerPhone", "publisherUsername", "isFeatured", "isLegal", 
                 "level", "floors_count", "finishing_type", "nearby_services", "latitude", "longitude",
                 "governorate", "city", "unit_count")
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, false, false, $15, $16, $17, $18, $19, $20, $21, $22, $23)
                RETURNING id
            `,
          [
            propertyTitle,
            englishPrice,
            parseFloat(englishPrice),
            safeInt(propertyRooms),
            safeInt(propertyBathrooms),
            safeInt(propertyArea),
            propertyDescription,
            files.length > 0 ? files[0].path : "logo.png",
            JSON.stringify(imageUrls),
            propertyType,
            code,
            sellerName,
            sellerPhone,
            realUser.username,
            propertyLevel || "",
            safeInt(propertyFloors),
            propertyFinishing || landType || "",
            nearby_services || "",
            parseFloat(latitude),
            parseFloat(longitude),
            governorate || "",
            city || "",
            safeInt(unitCount),
          ]
        );

        checkAndNotifyMatches(
          {
            id: pubRes.rows[0].id,
            title: propertyTitle,
            description: propertyDescription,
            price: englishPrice,
            level: propertyLevel,
            sellerPhone: sellerPhone,
            type: propertyType,
          },
          code
        );
      }

      res.status(200).json({
        success: true,
        status: aiReview.status,
        title: notifTitle,
        message: notifBody,
        reason: aiReview.reason,
        marketing_desc: aiReview.marketing_description,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "خطأ فني" });
    }
  }
);
app.post(
  "/api/add-property",
  uploadProperties.array("propertyImages", 10),
  async (req, res) => {
    const files = req.files || [];
    const data = req.body;
    const urls = files.map((f) => f.path);

    const latVal = data.latitude ? parseFloat(data.latitude) : null;
    const lngVal = data.longitude ? parseFloat(data.longitude) : null;

    const sql = `
        INSERT INTO properties (
            title, price, "numericPrice", rooms, bathrooms, area, description, 
            "imageUrl", "imageUrls", type, "hiddenCode", "sellerName", "sellerPhone", "publisherUsername", 
            "isFeatured", "isLegal", "video_urls",
            "level", "floors_count", "finishing_type", "latitude", "longitude"
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, 
            $8, $9, $10, $11, $12, $13, $14, 
            $15, $16, $17,
            $18, $19, $20, $21, $22
        ) RETURNING id
    `;

    const params = [
      data.title,
      data.price,
      parseFloat((data.price || "0").replace(/[^0-9.]/g, "")),
      safeInt(data.rooms),
      safeInt(data.bathrooms),
      safeInt(data.area),
      data.description,
      urls[0] || "logo.png",
      JSON.stringify(urls),
      data.type,
      data.hiddenCode,
      "Admin",
      ADMIN_EMAIL,
      "admin",
      false,
      false,
      "{}",
      data.level || "",
      safeInt(data.floors),
      data.finishing || "",
      latVal,
      lngVal,
    ];

    try {
      const result = await pgQuery(sql, params);
      res.status(201).json({
        success: true,
        message: "تم نشر العقار بنجاح! 🎉",
        id: result.rows[0].id,
      });
    } catch (err) {
      console.error("Add Property Error:", err);
      res.status(400).json({ message: "حدث خطأ أثناء النشر: " + err.message });
    }
  }
);

app.put("/api/admin/toggle-badge/:id", async (req, res) => {
  const token = req.cookies.auth_token;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "admin")
      return res.status(403).json({ message: "غير مسموح" });
  } catch (e) {
    return res.status(401).json({ message: "سجل دخول أولاً" });
  }
  try {
    await pgQuery(
      `UPDATE properties SET "${req.body.type}" = $1 WHERE id = $2`,
      [req.body.value, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Error" });
  }
});
app.post("/api/subscribe", async (req, res) => {
  try {
    await pgQuery(
      `INSERT INTO subscriptions (endpoint, keys) VALUES ($1, $2) ON CONFLICT (endpoint) DO NOTHING`,
      [req.body.endpoint, JSON.stringify(req.body.keys)]
    );
    res.status(201).json({});
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});
app.post("/api/make-offer", async (req, res) => {
  const { propertyId, buyerName, buyerPhone, offerPrice } = req.body;
  try {
    await pgQuery(
      `INSERT INTO property_offers (property_id, buyer_name, buyer_phone, offer_price, created_at) VALUES ($1, $2, $3, $4, $5)`,
      [propertyId, buyerName, buyerPhone, offerPrice, new Date().toISOString()]
    );
    const propRes = await pgQuery(
      "SELECT title FROM properties WHERE id = $1",
      [propertyId]
    );
    await sendDiscordNotification(
      "💰 عرض سعر جديد",
      [
        { name: "🏠 العقار", value: propRes.rows[0]?.title || "غير معروف" },
        { name: "📉 العرض", value: `${offerPrice} ر.س` },
        { name: "👤 المشتري", value: `${buyerName} - ${buyerPhone}` },
      ],
      16753920
    );
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "خطأ سيرفر" });
  }
});

app.post("/api/admin/publish-submission", async (req, res) => {
  const token = req.cookies.auth_token;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "admin")
      return res.status(403).json({ message: "غير مسموح" });
  } catch (e) {
    return res.status(401).json({ message: "سجل دخول أولاً" });
  }

  const { submissionId, hiddenCode } = req.body;

  try {
    const subRes = await pgQuery(
      `SELECT * FROM seller_submissions WHERE id = $1`,
      [submissionId]
    );
    if (subRes.rows.length === 0)
      return res.status(404).json({ message: "الطلب غير موجود" });
    const sub = subRes.rows[0];

    let publisherUsername = null;
    const userCheck = await pgQuery(
      `SELECT username FROM users WHERE phone = $1`,
      [sub.sellerPhone]
    );
    if (userCheck.rows.length > 0)
      publisherUsername = userCheck.rows[0].username;

    const imageUrls = (sub.imagePaths || "").split(" | ").filter(Boolean);

    const sql = `
            INSERT INTO properties (
                title, price, "numericPrice", rooms, bathrooms, area, description, 
                "imageUrl", "imageUrls", type, "hiddenCode", "sellerName", "sellerPhone", 
                "publisherUsername", "isFeatured", "isLegal", "video_urls",
                "level", "floors_count", "finishing_type", "nearby_services", "latitude", "longitude"
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, 
                $8, $9, $10, $11, $12, $13, 
                $14, false, false, '{}',
                $15, $16, $17, $18, $19, $20
            ) RETURNING id
        `;
    const params = [
      sub.propertyTitle,
      sub.propertyPrice,
      parseFloat(sub.propertyPrice.replace(/[^0-9.]/g, "")),
      safeInt(sub.propertyRooms),
      safeInt(sub.propertyBathrooms),
      safeInt(sub.propertyArea),
      sub.propertyDescription,
      imageUrls[0] || "",
      JSON.stringify(imageUrls),
      sub.propertyType,
      hiddenCode,
      sub.sellerName,
      sub.sellerPhone,
      publisherUsername,
      sub.propertyLevel,
      safeInt(sub.propertyFloors),
      sub.propertyFinishing,
      sub.nearby_services || "",
      sub.latitude,
      sub.longitude,
    ];

    const result = await pgQuery(sql, params);

    await pgQuery(`DELETE FROM seller_submissions WHERE id = $1`, [
      submissionId,
    ]);

    await createNotification(
      sub.sellerPhone,
      "🎉 مبروك! تم قبول عقارك",
      `تمت مراجعة عقارك "${sub.propertyTitle}" والموافقة عليه. اضغط هنا لمشاهدته.`,
      `/property?id=${result.rows[0].id}`
    );

    checkAndNotifyMatches({
      id: newPropertyId,
      title: sub.propertyTitle,
      price: sub.propertyPrice,
      numericPrice: parseFloat(sub.propertyPrice.replace(/[^0-9.]/g, "")),
      type: sub.propertyType,
      governorate: sub.governorate,
      city: sub.city,
      sellerPhone: sub.sellerPhone,
    });

    notifyAllUsers(
      `عقار جديد!`,
      sub.propertyTitle,
      `/property-details?id=${result.rows[0].id}`
    );

    res.status(201).json({ success: true, id: result.rows[0].id });
  } catch (err) {
    console.error("Publish Error:", err);
    res.status(400).json({ message: "Error" });
  }
});
app.put(
  "/api/update-property/:id",
  uploadProperties.array("propertyImages", 10),
  async (req, res) => {
    const {
      title,
      price,
      rooms,
      bathrooms,
      area,
      description,
      type,
      hiddenCode,
      existingImages,
      video_urls,
      level,
      floors,
      finishing,
      latitude,
      longitude,
    } = req.body;

    let oldUrls = [];
    try {
      oldUrls = JSON.parse(
        (Array.isArray(existingImages) ? existingImages[0] : existingImages) ||
          "[]"
      );
    } catch (e) {}
    const newUrls = req.files ? req.files.map((f) => f.path) : [];
    const allUrls = [...oldUrls, ...newUrls];
    const mainImg = allUrls.length > 0 ? allUrls[0] : "logo.png";

    let videoUrlsArr = [];
    try {
      videoUrlsArr = JSON.parse(video_urls || "[]");
    } catch (e) {}

    const latVal = latitude ? parseFloat(latitude) : null;
    const lngVal = longitude ? parseFloat(longitude) : null;

    const sql = `
        UPDATE properties SET 
            title=$1, price=$2, "numericPrice"=$3, rooms=$4, bathrooms=$5, area=$6, description=$7, 
            "imageUrl"=$8, "imageUrls"=$9, type=$10, "hiddenCode"=$11, "video_urls"=$12,
            "level"=$13, "floors_count"=$14, "finishing_type"=$15, "latitude"=$16, "longitude"=$17
        WHERE id=$18
    `;

    const params = [
      title,
      price,
      parseFloat((price || "0").replace(/[^0-9.]/g, "")),
      safeInt(rooms),
      safeInt(bathrooms),
      safeInt(area),
      description,
      mainImg,
      JSON.stringify(allUrls),
      type,
      hiddenCode,
      videoUrlsArr,
      level || "",
      safeInt(floors),
      finishing || "",
      latVal,
      lngVal,
      req.params.id,
    ];

    try {
      await pgQuery(sql, params);
      res.status(200).json({ message: "تم تحديث بيانات العقار بنجاح! ✅" });
    } catch (err) {
      console.error("Update Error:", err);
      res.status(400).json({ message: `فشل التحديث: ${err.message}` });
    }
  }
);
app.post("/api/request-property", async (req, res) => {
  const {
    name,
    phone,
    email,
    specifications,
    type,
    maxPrice,
    location,
    governorate,
    city,
  } = req.body;
  try {
    await pgQuery(
      `INSERT INTO property_requests 
            (name, phone, email, specifications, "req_type", "max_price", "governorate", "city", "submissionDate") 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        name,
        phone,
        email,
        specifications,
        type,
        parseFloat(maxPrice || 0),
        governorate,
        city,
        new Date().toISOString(),
      ]
    );

    await sendDiscordNotification(
      "📩 طلب عقار مخصص جديد",
      [
        { name: "👤 الاسم", value: name },
        { name: "📍 المنطقة", value: `${city} - ${governorate}` },
        { name: "💰 الميزانية", value: `${maxPrice}` },
      ],
      15158332
    );
    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "خطأ" });
  }
});
app.get("/api/admin/seller-submissions", async (req, res) => {
  try {
    const r = await pgQuery(
      "SELECT * FROM seller_submissions WHERE status = 'pending' ORDER BY \"submissionDate\" DESC"
    );
    res.json(r.rows);
  } catch (err) {
    throw err;
  }
});
app.get("/api/admin/property-requests", async (req, res) => {
  try {
    const r = await pgQuery(
      'SELECT * FROM property_requests ORDER BY "submissionDate" DESC'
    );
    res.json(r.rows);
  } catch (err) {
    throw err;
  }
});
app.delete("/api/admin/seller-submission/:id", async (req, res) => {
  try {
    const r = await pgQuery(
      `SELECT "imagePaths" FROM seller_submissions WHERE id = $1`,
      [req.params.id]
    );
    if (r.rows[0])
      await deleteCloudinaryImages((r.rows[0].imagePaths || "").split(" | "));
    await pgQuery(`DELETE FROM seller_submissions WHERE id = $1`, [
      req.params.id,
    ]);
    res.json({ message: "تم الحذف" });
  } catch (err) {
    console.error("Delete Error:", err);
    res.status(500).json({ message: "فشل الحذف" });
  }
});
app.delete("/api/admin/property-request/:id", async (req, res) => {
  try {
    await pgQuery(`DELETE FROM property_requests WHERE id = $1`, [
      req.params.id,
    ]);
    res.json({ message: "تم الحذف" });
  } catch (err) {
    throw err;
  }
});

app.get("/update-db-featured", async (req, res) => {
  try {
    await pgQuery(
      `ALTER TABLE properties ADD COLUMN IF NOT EXISTS "featured_expires_at" TEXT`
    );
    res.send("✅ تم تحديث قاعدة البيانات لإضافة تاريخ انتهاء التميز.");
  } catch (error) {
    res.status(500).send("❌ خطأ: " + error.message);
  }
});

async function checkExpiredFeatured() {
  try {
    const now = new Date().toISOString();
    await pgQuery(
      `UPDATE properties SET "isFeatured" = FALSE, "featured_expires_at" = NULL WHERE "isFeatured" = TRUE AND "featured_expires_at" < $1`,
      [now]
    );
  } catch (e) {
    console.error("Expiration Check Error:", e);
  }
}

app.get("/api/properties", async (req, res) => {
  await checkExpiredFeatured();

  let excludePhones = [];

  const token = req.cookies.auth_token;
  if (token) {
    try {
      const decoded = jwt.decode(token);
      if (decoded && decoded.phone) {
        const reports = await pgQuery(
          `
                    SELECT reported_phone FROM user_reports WHERE reporter_phone = $1
                    UNION
                    SELECT reporter_phone FROM user_reports WHERE reported_phone = $1
                `,
          [decoded.phone]
        );
        excludePhones = reports.rows.map((r) => r.reported_phone);
      }
    } catch (e) {}
  }

  let sql = `
        SELECT p.id, p.title, p.price, p.rooms, p.bathrooms, p.area, p."imageUrl", p.type, p."isFeatured", p."isLegal", p."sellerPhone", u.is_verified, p.governorate, p.city 
        FROM properties p
        LEFT JOIN users u ON p."sellerPhone" = u.phone
    `;

  const params = [];
  let idx = 1;
  const filters = [];

  const { type, limit, offset, keyword, minPrice, maxPrice, rooms, sort } =
    req.query;

  filters.push(`(u.is_banned IS FALSE OR u.is_banned IS NULL)`);

  if (excludePhones.length > 0) {
    const placeholders = excludePhones.map((_, i) => `$${idx + i}`).join(",");
    filters.push(`p."sellerPhone" NOT IN (${placeholders})`);
    excludePhones.forEach((ph) => params.push(ph));
    idx += excludePhones.length;
  }

  if (type) {
    filters.push(`p.type = $${idx++}`);
    params.push(type === "buy" ? "بيع" : "إيجار");
  }
  if (keyword) {
    filters.push(
      `(p.title ILIKE $${idx} OR p.description ILIKE $${idx} OR p."hiddenCode" ILIKE $${idx})`
    );
    params.push(`%${keyword}%`);
    idx++;
  }
  if (minPrice) {
    filters.push(`p."numericPrice" >= $${idx++}`);
    params.push(Number(minPrice));
  }
  if (maxPrice) {
    filters.push(`p."numericPrice" <= $${idx++}`);
    params.push(Number(maxPrice));
  }
  if (rooms) {
    if (rooms === "4+") {
      filters.push(`p.rooms >= $${idx++}`);
      params.push(4);
    } else {
      filters.push(`p.rooms = $${idx++}`);
      params.push(Number(rooms));
    }
  }

  if (filters.length > 0) sql += " WHERE " + filters.join(" AND ");

  let orderBy = 'ORDER BY p."isFeatured" DESC, p.id DESC';
  if (sort === "price_asc")
    orderBy = 'ORDER BY p."isFeatured" DESC, p."numericPrice" ASC';
  else if (sort === "price_desc")
    orderBy = 'ORDER BY p."isFeatured" DESC, p."numericPrice" DESC';
  else if (sort === "oldest")
    orderBy = 'ORDER BY p."isFeatured" DESC, p.id ASC';

  sql += ` ${orderBy}`;

  if (limit) {
    sql += ` LIMIT $${idx++}`;
    params.push(parseInt(limit));
  }
  if (offset) {
    sql += ` OFFSET $${idx++}`;
    params.push(parseInt(offset));
  }

  try {
    const result = await pgQuery(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching properties" });
  }
});
app.get("/api/property/:id", async (req, res) => {
  try {
    const sql = `
            SELECT p.*, u.is_verified, u.profile_picture 
            FROM properties p
            LEFT JOIN users u ON p."sellerPhone" = u.phone
            WHERE p.id = $1
        `;

    const r = await pgQuery(sql, [req.params.id]);

    if (r.rows[0]) {
      try {
        r.rows[0].imageUrls = JSON.parse(r.rows[0].imageUrls);
      } catch (e) {
        r.rows[0].imageUrls = r.rows[0].imageUrl ? [r.rows[0].imageUrl] : [];
      }

      res.json(r.rows[0]);
    } else {
      res.status(404).json({ message: "غير موجود" });
    }
  } catch (e) {
    console.error("Property Fetch Error:", e);
    res.status(500).json({ message: "خطأ في السيرفر" });
  }
});
app.get("/api/property-by-code/:code", async (req, res) => {
  try {
    const r = await pgQuery(
      `SELECT id, title, price, "hiddenCode" FROM properties WHERE UPPER("hiddenCode") LIKE UPPER($1)`,
      [`%${req.params.code}%`]
    );
    if (r.rows[0]) res.json(r.rows[0]);
    else res.status(404).json({ message: "غير موجود" });
  } catch (e) {
    throw e;
  }
});
app.delete("/api/property/:id", async (req, res) => {
  try {
    const resGet = await pgQuery(
      `SELECT "imageUrls" FROM properties WHERE id=$1`,
      [req.params.id]
    );
    if (resGet.rows[0])
      await deleteCloudinaryImages(JSON.parse(resGet.rows[0].imageUrls));
    await pgQuery(`DELETE FROM properties WHERE id=$1`, [req.params.id]);
    res.json({ message: "تم الحذف" });
  } catch (e) {
    throw e;
  }
});
app.post("/api/favorites", async (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ message: "يجب تسجيل الدخول" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    await pgQuery(
      `INSERT INTO favorites (user_phone, property_id) VALUES ($1, $2)`,
      [decoded.phone, req.body.propertyId]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    if (err.code === "23505")
      return res.status(409).json({ message: "موجودة بالفعل" });
    res.status(500).json({ error: "خطأ سيرفر" });
  }
});
app.delete("/api/favorites/:propertyId", async (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ message: "يجب تسجيل الدخول" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    await pgQuery(
      `DELETE FROM favorites WHERE user_phone = $1 AND property_id = $2`,
      [decoded.phone, req.params.propertyId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "خطأ" });
  }
});
app.get("/api/favorites", async (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ message: "يجب تسجيل الدخول" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const sql = `SELECT p.id, p.title, p.price, p.rooms, p.bathrooms, p.area, p."imageUrl", p.type, f.id AS favorite_id FROM properties p JOIN favorites f ON p.id = f.property_id WHERE f.user_phone = $1 ORDER BY f.id DESC`;
    const result = await pgQuery(sql, [decoded.phone]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get("/api/user/my-properties", async (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ message: "غير مصرح" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const publishedRes = await pgQuery(
      `SELECT id, title, price, type, "imageUrl", 'active' as status FROM properties WHERE "sellerPhone" = $1`,
      [decoded.phone]
    );
    const pendingRes = await pgQuery(
      `SELECT id, "propertyTitle" as title, "propertyPrice" as price, "propertyType" as type, 'pending' as status FROM seller_submissions WHERE "sellerPhone" = $1 AND status = 'pending'`,
      [decoded.phone]
    );
    const allProperties = [...publishedRes.rows, ...pendingRes.rows];
    allProperties.sort((a, b) => b.id - a.id);
    res.json(allProperties);
  } catch (error) {
    res.status(500).json({ message: "خطأ سيرفر" });
  }
});
app.get("/api/properties/suggested/:id", async (req, res) => {
  try {
    const propId = req.params.id;

    let excludePhones = [];
    const token = req.cookies.auth_token;
    if (token) {
      try {
        const decoded = jwt.decode(token);
        if (decoded && decoded.phone) {
          const reports = await pgQuery(
            `
                        SELECT reported_phone FROM user_reports WHERE reporter_phone = $1
                        UNION
                        SELECT reporter_phone FROM user_reports WHERE reported_phone = $1
                    `,
            [decoded.phone]
          );
          excludePhones = reports.rows.map((r) => r.reported_phone);
        }
      } catch (e) {}
    }

    const currentRes = await pgQuery("SELECT * FROM properties WHERE id = $1", [
      propId,
    ]);
    if (currentRes.rows.length === 0) return res.status(404).json([]);

    const current = currentRes.rows[0];

    const locationKeyword = current.title.split(" ")[0] || "";

    const minPrice = Number(current.numericPrice) * 0.7;
    const maxPrice = Number(current.numericPrice) * 1.3;

    let sql = `
            SELECT p.id, p.title, p.price, p."imageUrl", p.type, p."isFeatured",
            (
                (CASE WHEN p.type = $1 THEN 30 ELSE 0 END) +
                (CASE WHEN p.title ILIKE $2 OR p.description ILIKE $2 THEN 50 ELSE 0 END) +
                (CASE WHEN p."numericPrice" BETWEEN $3 AND $4 THEN 20 ELSE 0 END)
            ) as match_score
            FROM properties p
            LEFT JOIN users u ON p."sellerPhone" = u.phone
            WHERE p.id != $5
            AND (u.is_banned IS FALSE OR u.is_banned IS NULL) -- 🔥 استبعاد المحظورين إدارياً (Global Ban)
        `;

    const params = [
      current.type,
      `%${locationKeyword}%`,
      minPrice,
      maxPrice,
      propId,
    ];

    let paramIdx = 6;

    if (excludePhones.length > 0) {
      const placeholders = excludePhones
        .map((_, i) => `$${paramIdx + i}`)
        .join(",");
      sql += ` AND p."sellerPhone" NOT IN (${placeholders})`;
      excludePhones.forEach((ph) => params.push(ph));
    }

    sql += ` ORDER BY match_score DESC, "isFeatured" DESC LIMIT 3`;

    const result = await pgQuery(sql, params);

    res.json(result.rows);
  } catch (error) {
    console.error("Suggestion Error:", error);
    res.status(500).json([]);
  }
});
app.get("/api/admin/counts", async (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ message: "غير مصرح" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "admin")
      return res.status(403).json({ message: "للأدمن فقط" });
    const pendingRes = await pgQuery(
      `SELECT COUNT(*) FROM seller_submissions WHERE status = 'pending'`
    );
    const requestsRes = await pgQuery(`SELECT COUNT(*) FROM property_requests`);
    res.json({
      pendingCount: parseInt(pendingRes.rows[0].count),
      requestsCount: parseInt(requestsRes.rows[0].count),
    });
  } catch (error) {
    res.status(500).json({ message: "خطأ سيرفر" });
  }
});

app.get("/update-db-v4", async (req, res) => {
  try {
    await pgQuery(
      `ALTER TABLE user_ratings ALTER COLUMN stars TYPE NUMERIC(3,1)`
    );
    await pgQuery(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_summary_cache TEXT`
    );
    await pgQuery(
      `ALTER TABLE user_comments ADD COLUMN IF NOT EXISTS owner_reply TEXT`
    );
    await pgQuery(
      `ALTER TABLE user_comments ADD COLUMN IF NOT EXISTS reply_date TEXT`
    );
    await pgQuery(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_rating_reminder TIMESTAMP`
    );

    res.send("✅ تم تحديث قاعدة البيانات (V4): تفعيل الكسور في التقييمات.");
  } catch (error) {
    res.status(500).send("❌ حدث خطأ: " + error.message);
  }
});

app.post("/api/reviews/reply", async (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ message: "غير مصرح" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { commentId, replyText } = req.body;

    const commentRes = await pgQuery(
      "SELECT reviewer_phone, reviewed_phone FROM user_comments WHERE id = $1",
      [commentId]
    );

    if (commentRes.rows.length === 0) {
      return res.status(404).json({ message: "التعليق غير موجود" });
    }

    const { reviewer_phone, reviewed_phone } = commentRes.rows[0];

    if (decoded.phone !== reviewed_phone && decoded.role !== "admin") {
      return res
        .status(403)
        .json({ message: "غير مسموح لك بالرد على هذا التقييم" });
    }

    const isReplyAdmin = decoded.role === "admin";
    await pgQuery(
      "UPDATE user_comments SET owner_reply = $1, reply_date = NOW(), is_reply_admin = $2 WHERE id = $3",
      [replyText, isReplyAdmin, commentId]
    );

    const notifTitle = isReplyAdmin ? "رد من الإدارة 🛡️" : "رد من المالك 🏠";
    const notifMsg = "تم الرد على تقييمك، اضغط هنا لرؤية الرد.";
    const notifLink = `/profile?u=${decoded.username}&tab=reviews`;

    await createNotification(reviewer_phone, notifTitle, notifMsg, notifLink);

    res.json({ success: true, message: "تم إضافة الرد وإشعار المستخدم" });
  } catch (error) {
    console.error("Reply Error:", error);
    res.status(500).json({ message: "خطأ في السيرفر" });
  }
});
app.get("/emergency-fix-columns", async (req, res) => {
  try {
    await pgQuery(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS lifetime_posts INTEGER DEFAULT 0`
    );
    await pgQuery(
      `UPDATE users u SET lifetime_posts = (SELECT COUNT(*) FROM properties p WHERE p."sellerPhone" = u.phone)`
    );
    res.send("✅ تم إصلاح عمود العداد التراكمي.");
  } catch (error) {
    res.status(500).send("❌ حدث خطأ: " + error.message);
  }
});

app.get("/api/ping", (req, res) => {
  res.json({ status: "OK", message: "Server is running 🚀" });
});

app.delete("/api/user/property/:id", async (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ message: "غير مصرح" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const propId = req.params.id;

    const checkSql = `SELECT "sellerPhone", "imageUrls" FROM properties WHERE id = $1`;
    const checkRes = await pgQuery(checkSql, [propId]);

    if (checkRes.rows.length === 0)
      return res.status(404).json({ message: "العقار غير موجود" });

    if (
      checkRes.rows[0].sellerPhone !== decoded.phone &&
      decoded.role !== "admin"
    ) {
      return res.status(403).json({ message: "لا تملك صلاحية حذف هذا العقار" });
    }

    const images = JSON.parse(checkRes.rows[0].imageUrls || "[]");
    await deleteCloudinaryImages(images);

    await pgQuery(`DELETE FROM properties WHERE id = $1`, [propId]);
    await pgQuery(`DELETE FROM favorites WHERE property_id = $1`, [propId]);
    await pgQuery(`DELETE FROM property_offers WHERE property_id = $1`, [
      propId,
    ]);

    res.json({ success: true, message: "تم حذف العقار بنجاح" });
  } catch (error) {
    console.error("Delete Error:", error);
    res.status(500).json({ message: "خطأ في السيرفر" });
  }
});

app.put(
  "/api/user/property/:id",
  uploadProperties.array("newImages", 10),
  async (req, res) => {
    const token = req.cookies.auth_token;
    if (!token) return res.status(401).json({ message: "غير مصرح" });

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const propId = req.params.id;

      const {
        title,
        price,
        description,
        area,
        rooms,
        bathrooms,
        level,
        floors_count,
        finishing_type,
        type,
      } = req.body;

      const keptImages = JSON.parse(req.body.keptImages || "[]");
      const newFiles = req.files || [];
      const newImageUrls = newFiles.map((f) => f.path);

      const checkRes = await pgQuery(
        `SELECT "sellerPhone" FROM properties WHERE id = $1`,
        [propId]
      );
      if (checkRes.rows.length === 0)
        return res.status(404).json({ message: "غير موجود" });
      if (
        checkRes.rows[0].sellerPhone !== decoded.phone &&
        decoded.role !== "admin"
      )
        return res.status(403).json({ message: "لا تملك الصلاحية" });

      let isPaidSystem = false;
      const paymentActive = await getBotSetting('payment_active');
      isPaidSystem = paymentActive === "true";

      if (isPaidSystem && decoded.role !== "admin") {
        const balanceRes = await pgQuery(
          "SELECT wallet_balance FROM users WHERE phone = $1",
          [decoded.phone]
        );
        if (parseFloat(balanceRes.rows[0]?.wallet_balance || 0) < 1) {
          return res.status(402).json({
            success: false,
            message: "رصيدك لا يكفي لتعديل العقار.",
            needCharge: true,
          });
        }
        await pgQuery(
          "UPDATE users SET wallet_balance = wallet_balance - 1 WHERE phone = $1",
          [decoded.phone]
        );
        await pgQuery(
          `INSERT INTO transactions (user_phone, amount, type, description, date) VALUES ($1, 1, 'withdraw', 'تعديل عقار', $2)`,
          [decoded.phone, new Date().toISOString()]
        );
      }

      const englishPrice = toEnglishDigits(price);
      const allImagesForCheck = [...keptImages, ...newImageUrls];

      const aiReview = await aiCheckProperty(
        title,
        description,
        englishPrice,
        allImagesForCheck,
        type || "apartment"
      );

      if (aiReview.status === "rejected") {
        return res.status(400).json({
          success: false,
          status: "rejected",
          title: "عذراً، التعديل مرفوض",
          message: "محتوى التعديل غير منطقي أو مخالف للسياسات.",
          reason: aiReview.reason,
        });
      }

      const finalImageUrls = [...keptImages, ...newImageUrls];
      const mainImageUrl =
        finalImageUrls.length > 0 ? finalImageUrls[0] : "logo.png";

      const sql = `UPDATE properties SET title=$1, price=$2, "numericPrice"=$3, description=$4, area=$5, rooms=$6, bathrooms=$7, "imageUrl"=$8, "imageUrls"=$9, "level"=$10, "floors_count"=$11, "finishing_type"=$12, type=$13 WHERE id=$14`;

      await pgQuery(sql, [
        title,
        englishPrice,
        parseFloat(englishPrice),
        description,
        safeInt(area),
        safeInt(rooms),
        safeInt(bathrooms),
        mainImageUrl,
        JSON.stringify(finalImageUrls),
        level || "",
        safeInt(floors_count),
        finishing_type || "",
        type,
        propId,
      ]);

      res.json({ success: true, message: "تم تحديث البيانات بنجاح ✅" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "خطأ" });
    }
  }
);

app.get("/api/admin/complaints-count", async (req, res) => {
  try {
    const result = await pgQuery(
      `SELECT COUNT(*) FROM complaints WHERE status = 'pending'`
    );
    res.json({ count: result.rows[0].count });
  } catch (e) {
    res.json({ count: 0 });
  }
});

app.post("/api/submit-complaint", async (req, res) => {
  const token = req.cookies.auth_token;
  if (!token)
    return res.status(401).json({ message: "يجب تسجيل الدخول لإرسال شكوى" });

  try {
    const user = jwt.verify(token, JWT_SECRET);
    const { content } = req.body;

    if (!content) return res.status(400).json({ message: "محتوى الشكوى فارغ" });

    await pgQuery(`CREATE TABLE IF NOT EXISTS complaints (
            id SERIAL PRIMARY KEY,
            user_id INTEGER,
            user_name TEXT,
            user_phone TEXT,
            content TEXT,
            status TEXT DEFAULT 'pending',
            created_at TEXT
        )`);

    await pgQuery(
      `INSERT INTO complaints (user_id, user_name, user_phone, content, created_at) VALUES ($1, $2, $3, $4, $5)`,
      [user.id, user.name, user.phone, content, new Date().toISOString()]
    );

    try {
      await sendDiscordNotification(
        "📢 شكوى جديدة",
        [
          { name: "👤 صاحب الشكوى", value: `${user.name} (${user.phone})` },
          { name: "📝 نص الشكوى", value: content },
        ],
        16711680
      );
    } catch (discordErr) {
      console.error("Discord Error (Ignored):", discordErr.message);
    }

    res.json({ success: true, message: "تم إرسال الشكوى بنجاح." });
  } catch (error) {
    console.error("❌ Complaint Error Details:", error);

    res.status(500).json({ message: "خطأ في السيرفر: " + error.message });
  }
});
app.get("/api/admin/users-stats", async (req, res) => {
  const token = req.cookies.auth_token;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "admin")
      return res.status(403).json({ message: "للأدمن فقط" });

    const sql = `SELECT name, phone, username, lifetime_posts as property_count, is_banned FROM users WHERE lifetime_posts >= 0 ORDER BY lifetime_posts DESC`;
    const result = await pgQuery(sql);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: "خطأ سيرفر" });
  }
});

app.get("/api/admin/complaints", async (req, res) => {
  const token = req.cookies.auth_token;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "admin")
      return res.status(403).json({ message: "للأدمن فقط" });

    const result = await pgQuery(`SELECT * FROM complaints ORDER BY id DESC`);
    res.json(result.rows);
  } catch (e) {
    console.error("❌ خطأ في جلب الشكاوي:", e.message);
    res.status(500).json([]);
  }
});

app.get("/update-db-stage2", async (req, res) => {
  try {
    await pgQuery(
      `ALTER TABLE seller_submissions ADD COLUMN IF NOT EXISTS "wants_featured" BOOLEAN DEFAULT FALSE`
    );
    res.send("✅ تم تحديث قاعدة البيانات للمرحلة الثانية (Feature Request).");
  } catch (error) {
    res.status(500).send("❌ خطأ: " + error.message);
  }
});

app.get("/rebuild-complaints-table", async (req, res) => {
  try {
    await pgQuery(`DROP TABLE IF EXISTS complaints`);

    await pgQuery(`
            CREATE TABLE complaints (
                id SERIAL PRIMARY KEY,
                user_id INTEGER,
                user_name TEXT,
                user_phone TEXT,
                content TEXT,
                status TEXT DEFAULT 'pending',
                created_at TEXT
            )
        `);

    res.send("✅ تم إعادة بناء جدول الشكاوي بنجاح! المشكلة اتحلت.");
  } catch (error) {
    res.status(500).send("❌ حدث خطأ أثناء الإصلاح: " + error.message);
  }
});

app.delete("/api/admin/complaint/:id", async (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ message: "غير مصرح" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "admin")
      return res.status(403).json({ message: "للأدمن فقط" });

    const id = req.params.id;
    await pgQuery("DELETE FROM complaints WHERE id = $1", [id]);

    res.json({ success: true, message: "تم حذف الشكوى بنجاح ✅" });
  } catch (error) {
    console.error("Delete Complaint Error:", error);
    res.status(500).json({ message: "فشل الحذف" });
  }
});

app.get("/update-db-location", async (req, res) => {
  try {
    await pgQuery(
      `ALTER TABLE properties ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION`
    );
    await pgQuery(
      `ALTER TABLE properties ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION`
    );

    await pgQuery(
      `ALTER TABLE seller_submissions ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION`
    );
    await pgQuery(
      `ALTER TABLE seller_submissions ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION`
    );

    res.send(
      "✅ تم تحديث قاعدة البيانات وإضافة خانات الموقع (Latitude/Longitude) بنجاح!"
    );
  } catch (error) {
    res.status(500).send("❌ حدث خطأ: " + error.message);
  }
});

app.get("/api/admin/payment-settings", async (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ message: "غير مصرح" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "admin")
      return res.status(403).json({ message: "للأدمن فقط" });

    const priceRes = await getBotSetting('point_price');
    const activeRes = await getBotSetting('payment_active');

    res.json({
      point_price: priceRes || 1,
      is_active: activeRes === "true",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "خطأ سيرفر" });
  }
});

app.post("/api/admin/payment-settings", async (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ message: "غير مصرح" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "admin")
      return res.status(403).json({ message: "للأدمن فقط" });

    const { point_price, is_active } = req.body;

    await pgQuery(
      `INSERT INTO bot_settings (setting_key, setting_value) VALUES ('point_price', $1) 
                       ON CONFLICT (setting_key) DO UPDATE SET setting_value = $1`,
      [point_price]
    );

    await pgQuery(
      `INSERT INTO bot_settings (setting_key, setting_value) VALUES ('payment_active', $1) 
                       ON CONFLICT (setting_key) DO UPDATE SET setting_value = $1`,
      [is_active]
    );
    invalidateBotSetting('point_price');
    invalidateBotSetting('payment_active');

    res.json({ success: true, message: "تم تحديث إعدادات الدفع بنجاح ✅" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "خطأ سيرفر" });
  }
});

app.post("/api/admin/manual-charge", async (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ message: "غير مصرح" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "admin")
      return res.status(403).json({ message: "للأدمن فقط" });

    const { phone, amount } = req.body;

    const userRes = await pgQuery("SELECT id FROM users WHERE phone = $1", [
      phone,
    ]);
    if (userRes.rows.length === 0)
      return res
        .status(404)
        .json({ success: false, message: "رقم الهاتف غير مسجل ❌" });

    const userId = userRes.rows[0].id;

    const priceRes = await getBotSetting('point_price');
    const currentPrice = parseFloat(priceRes || 1);
    const moneyValue = amount * currentPrice;

    await pgQuery(
      "UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2",
      [amount, userId]
    );

    await pgQuery(
      `INSERT INTO transactions (user_phone, amount, money_amount, type, description, date) VALUES ($1, $2, $3, 'deposit', 'مكافأة إدارية (شحن يدوي)', $4)`,
      [phone, amount, moneyValue, new Date().toISOString()]
    );

    res.json({
      success: true,
      message: `تم شحن ${amount} نقطة (بقيمة ${moneyValue} ر.س) للرقم ${phone} بنجاح 🚀`,
    });
  } catch (error) {
    console.error("Manual Charge Error:", error);
    res.status(500).json({ message: "خطأ سيرفر" });
  }
});

app.post("/api/user/feature-property", async (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ message: "غير مصرح" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { propertyId, planId } = req.body;

    const plans = {
      1: { days: 14, cost: 20, label: "أسبوعين" },
      2: { days: 30, cost: 30, label: "شهر" },
      3: { days: 42, cost: 45, label: "6 أسابيع" },
    };

    const selectedPlan = plans[planId];
    if (!selectedPlan)
      return res.status(400).json({ message: "باقة غير صحيحة" });

    const propRes = await pgQuery(
      'SELECT "sellerPhone", "title", "isFeatured" FROM properties WHERE id = $1',
      [propertyId]
    );
    if (propRes.rows.length === 0)
      return res.status(404).json({ message: "العقار غير موجود" });

    if (
      propRes.rows[0].sellerPhone !== decoded.phone &&
      decoded.role !== "admin"
    ) {
      return res.status(403).json({ message: "لا تملك هذا العقار" });
    }

    if (propRes.rows[0].isFeatured) {
      return res.status(400).json({ message: "هذا العقار مميز بالفعل!" });
    }

    if (decoded.role !== "admin") {
      const userRes = await pgQuery(
        "SELECT wallet_balance FROM users WHERE phone = $1",
        [decoded.phone]
      );
      const balance = parseFloat(userRes.rows[0].wallet_balance || 0);

      if (balance < selectedPlan.cost) {
        return res.status(402).json({
          success: false,
          message: `رصيدك غير كافي (${balance} نقطة). تكلفة الباقة ${selectedPlan.cost} نقطة.`,
          needCharge: true,
        });
      }
    }

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + selectedPlan.days);

    await pgQuery("BEGIN");

    if (decoded.role !== "admin") {
      await pgQuery(
        "UPDATE users SET wallet_balance = wallet_balance - $1 WHERE phone = $2",
        [selectedPlan.cost, decoded.phone]
      );

      await pgQuery(
        `INSERT INTO transactions (user_phone, amount, type, description, date) VALUES ($1, $2, 'withdraw', $3, $4)`,
        [
          decoded.phone,
          selectedPlan.cost,
          `ترقية عقار لمميز (${selectedPlan.label})`,
          new Date().toISOString(),
        ]
      );
    }

    await pgQuery(
      `UPDATE properties SET "isFeatured" = TRUE, "featured_expires_at" = $1 WHERE id = $2`,
      [expiryDate.toISOString(), propertyId]
    );

    await pgQuery("COMMIT");

    await sendDiscordNotification(
      "🌟 عملية تمييز عقار ناجحة",
      [
        { name: "👤 المستخدم", value: decoded.phone },
        {
          name: "👑 الدور",
          value: decoded.role === "admin" ? "Admin (مجاني)" : "User (مدفوع)",
        },
        { name: "🏠 العقار", value: propRes.rows[0].title },
        { name: "⏳ الباقة", value: selectedPlan.label },
        {
          name: "💰 الخصم",
          value:
            decoded.role === "admin" ? "0 (أدمن)" : `${selectedPlan.cost} نقطة`,
        },
      ],
      16776960
    );

    res.json({
      success: true,
      message: `تم تمييز العقار لمدة ${selectedPlan.label} بنجاح! 🎉`,
    });
  } catch (error) {
    await pgQuery("ROLLBACK");
    console.error("Feature Error:", error);
    res.status(500).json({ message: "خطأ سيرفر" });
  }
});
app.post("/api/payment/charge", async (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ message: "غير مصرح" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { points, method, mobileNumber } = req.body;

    if (!points || points < 1)
      return res.status(400).json({ message: "أقل عدد نقاط هو 1" });

    const settingRes = await getBotSetting('point_price');
    const pricePerPoint = parseFloat(settingRes || 1);

    const amountSAR = points * pricePerPoint;

    let integrationId;
    if (method === "wallet") {
      integrationId = process.env.PAYMOB_INTEGRATION_WALLET;
      if (!mobileNumber)
        return res
          .status(400)
          .json({ message: "رقم المحفظة مطلوب لفودافون كاش" });
    } else {
      integrationId = process.env.PAYMOB_INTEGRATION_CARD;
    }

    const authRes = await axios.post(
      "https://accept.paymob.com/api/auth/tokens",
      { api_key: process.env.PAYMOB_API_KEY }
    );
    const authToken = authRes.data.token;

    const orderRes = await axios.post(
      "https://accept.paymob.com/api/ecommerce/orders",
      {
        auth_token: authToken,
        delivery_needed: "false",
        amount_cents: amountSAR * 100,
        currency: "SAR",
        items: [],
      }
    );
    const paymobOrderId = orderRes.data.id;

    await pgQuery(
      `INSERT INTO payment_orders (user_id, paymob_order_id, amount_sar, points_amount, payment_method, status) 
             VALUES ($1, $2, $3, $4, $5, 'pending')`,
      [decoded.id, paymobOrderId, amountSAR, points, method]
    );

    const userRes = await pgQuery("SELECT * FROM users WHERE id = $1", [
      decoded.id,
    ]);
    const user = userRes.rows[0];

    const keyRes = await axios.post(
      "https://accept.paymob.com/api/acceptance/payment_keys",
      {
        auth_token: authToken,
        amount_cents: amountSAR * 100,
        expiration: 3600,
        order_id: paymobOrderId,
        billing_data: {
          apartment: "NA",
          email: "user@aqarak.com",
          floor: "NA",
          first_name: user.name || "Client",
          street: "NA",
          building: "NA",
          phone_number: mobileNumber || user.phone || "0500000000",
          shipping_method: "NA",
          postal_code: "NA",
          city: "Cairo",
          country: "EG",
          last_name: "Aqarak",
          state: "NA",
        },
        currency: "SAR",
        integration_id: integrationId,
      }
    );
    const paymentToken = keyRes.data.token;

    if (method === "wallet") {
      const walletPayRes = await axios.post(
        "https://accept.paymob.com/api/acceptance/payments/pay",
        {
          source: { identifier: mobileNumber, subtype: "WALLET" },
          payment_token: paymentToken,
        }
      );
      return res.json({
        success: true,
        redirectUrl: walletPayRes.data.redirect_url,
      });
    } else {
      return res.json({
        success: true,
        iframeUrl: `https://accept.paymob.com/api/acceptance/iframes/${process.env.PAYMOB_IFRAME_ID}?payment_token=${paymentToken}`,
      });
    }
  } catch (error) {
    console.error("Paymob Error:", error.response?.data || error.message);
    res.status(500).json({ message: "فشل الاتصال ببوابة الدفع" });
  }
});

function validateHMAC(queryParams, secret) {
  if (!secret || !queryParams.hmac) return false;
  const hmac = queryParams.hmac;
  const keys = [
    "amount_cents",
    "created_at",
    "currency",
    "error_occured",
    "has_parent_transaction",
    "id",
    "integration_id",
    "is_3d_secure",
    "is_auth",
    "is_capture",
    "is_refunded",
    "is_standalone_payment",
    "is_voided",
    "order",
    "owner",
    "pending",
    "source_data.pan",
    "source_data.sub_type",
    "source_data.type",
    "success",
  ];
  let concatenated = "";
  keys.sort().forEach((key) => {
    concatenated += queryParams[key] || "";
  });
  const calculated = crypto
    .createHmac("sha512", secret)
    .update(concatenated)
    .digest("hex");
  return calculated === hmac;
}

app.get("/api/payment/callback", async (req, res) => {
  try {
    const { success, order } = req.query;

    const isValid = validateHMAC(req.query, process.env.PAYMOB_HMAC);
    if (!isValid) {
      console.error("⛔ Fraud Attempt: HMAC Mismatch");
      return res.redirect("/user-dashboard?payment=error");
    }

    if (success === "true") {
      const orderRes = await pgQuery(
        `SELECT * FROM payment_orders WHERE paymob_order_id = $1`,
        [order]
      );

      if (orderRes.rows.length > 0) {
        const pendingOrder = orderRes.rows[0];

        if (pendingOrder.status === "pending") {
          await pgQuery(
            `UPDATE payment_orders SET status = 'success' WHERE id = $1`,
            [pendingOrder.id]
          );
          await pgQuery(
            `UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2`,
            [pendingOrder.points_amount, pendingOrder.user_id]
          );

          const userPhoneRes = await pgQuery(
            "SELECT phone FROM users WHERE id = $1",
            [pendingOrder.user_id]
          );

          await pgQuery(
            `INSERT INTO transactions (user_phone, amount, money_amount, type, description, date) 
                         VALUES ($1, $2, $3, 'deposit', $4, $5)`,
            [
              userPhoneRes.rows[0].phone,
              pendingOrder.points_amount,
              pendingOrder.amount_sar,
              `شحن ${pendingOrder.points_amount} نقطة (${pendingOrder.payment_method})`,
              new Date().toISOString(),
            ]
          );
          await sendDiscordNotification(
            "💰 عملية شحن ناجحة",
            [
              { name: "المستخدم", value: userPhoneRes.rows[0].phone },
              { name: "النقاط", value: `${pendingOrder.points_amount}` },
              { name: "المبلغ", value: `${pendingOrder.amount_sar} SAR` },
            ],
            3066993
          );
        }
      }
      res.redirect("/user-dashboard?payment=success");
    } else {
      res.redirect("/user-dashboard?payment=failed");
    }
  } catch (error) {
    console.error("Callback Error:", error);
    res.redirect("/user-dashboard?payment=error");
  }
});

app.post("/api/admin/settings/payment", async (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ message: "غير مصرح" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "admin")
      return res.status(403).json({ message: "للأدمن فقط" });

    const { pointPrice, isActive } = req.body;

    await pgQuery(
      `INSERT INTO bot_settings (setting_key, setting_value) VALUES ('point_price', $1) 
                       ON CONFLICT (setting_key) DO UPDATE SET setting_value = $1`,
      [pointPrice]
    );

    await pgQuery(
      `INSERT INTO bot_settings (setting_key, setting_value) VALUES ('payment_active', $1) 
                       ON CONFLICT (setting_key) DO UPDATE SET setting_value = $1`,
      [isActive]
    );
    invalidateBotSetting('point_price');
    invalidateBotSetting('payment_active');

    res.json({ success: true, message: "تم حفظ الإعدادات بنجاح ✅" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "خطأ في السيرفر" });
  }
});

app.get("/api/config/payment-price", async (req, res) => {
  try {
    const priceRes = await getBotSetting('point_price');
    const activeRes = await getBotSetting('payment_active');

    const price = parseFloat(priceRes || 1);
    const isActive = activeRes === "true";

    res.json({ pointPrice: price, isPaymentActive: isActive });
  } catch (error) {
    res.json({ pointPrice: 1, isPaymentActive: false });
  }
});

async function createNotification(phone, title, message, link = null) {
  try {
    await pgQuery(
      `INSERT INTO user_notifications (user_phone, title, message, link) VALUES ($1, $2, $3, $4)`,
      [phone, title, message, link]
    );
  } catch (e) {
    console.error("Notification Error:", e);
  }
}

app.post("/api/admin/send-notification", async (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ message: "غير مصرح" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "admin")
      return res.status(403).json({ message: "للأدمن فقط" });

    const { targetPhone, title, message, isBroadcast } = req.body;

    if (!title || !message)
      return res.status(400).json({ message: "البيانات ناقصة" });

    if (isBroadcast) {
      const usersRes = await pgQuery("SELECT phone FROM users");
      const promises = usersRes.rows.map((user) =>
        createNotification(user.phone, title, message)
      );
      await Promise.all(promises);
      res.json({
        success: true,
        message: `تم الإرسال لـ ${usersRes.rows.length} مستخدم`,
      });
    } else {
      if (!targetPhone)
        return res.status(400).json({ message: "رقم الهاتف مطلوب" });
      await createNotification(targetPhone, title, message);
      res.json({ success: true, message: "تم الإرسال للمستخدم بنجاح" });
    }
  } catch (error) {
    console.error("Admin Notif Error:", error);
    res.status(500).json({ message: "خطأ في السيرفر" });
  }
});

// في ملف server.js
app.post(
  "/api/user/update-profile",
  uploadProfile.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  async (req, res) => {
    const token = req.cookies.auth_token;
    if (!token) return res.status(401).json({ message: "سجل دخول أولاً" });

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const { newUsername, deleteProfile, deleteCover } = req.body; // استقبلنا طلبات الحذف
      const phone = decoded.phone;

      const userRes = await pgQuery("SELECT * FROM users WHERE phone = $1", [
        phone,
      ]);
      const currentUser = userRes.rows[0];

      let updateQuery = "UPDATE users SET ";
      let updateValues = [];
      let paramCounter = 1;

      // استقبال البيانات
      const { bio, job_title, facebook, instagram, website } = req.body;

      // 1. معالجة الصور والحذف
      // صورة البروفايل
      if (deleteProfile === "true") {
          // لو طلب حذف، نرجعها للوجو الافتراضي
          updateQuery += `profile_picture = $${paramCounter}, `;
          updateValues.push("logo.png"); // أو null حسب تصميمك
          paramCounter++;
      } else if (req.files && req.files['profileImage']) {
          // لو رفع صورة جديدة
          let pPath = req.files['profileImage'][0].path;
          updateQuery += `profile_picture = $${paramCounter}, `;
          updateValues.push(pPath);
          paramCounter++;
      }

      // صورة الغلاف
      if (deleteCover === "true") {
          updateQuery += `cover_picture = $${paramCounter}, `;
          updateValues.push(null); // نخليها فاضية
          paramCounter++;
      } else if (req.files && req.files['coverImage']) {
          let cPath = req.files['coverImage'][0].path;
          updateQuery += `cover_picture = $${paramCounter}, `;
          updateValues.push(cPath);
          paramCounter++;
      }

      // 2. باقي البيانات
      if (typeof bio !== "undefined") {
        updateQuery += `bio = $${paramCounter}, `;
        updateValues.push(bio);
        paramCounter++;
      }

      if (typeof job_title !== "undefined") {
        updateQuery += `job_title = $${paramCounter}, `;
        updateValues.push(job_title);
        paramCounter++;
      }

      const socialData = JSON.stringify({ facebook, instagram, website });
      updateQuery += `social_links = $${paramCounter}, `;
      updateValues.push(socialData);
      paramCounter++;

       if (newUsername && newUsername !== currentUser.username) {
        if (currentUser.last_username_change) {
          const lastChange = new Date(currentUser.last_username_change);
          const diffDays = Math.ceil(
            Math.abs(new Date() - lastChange) / (1000 * 60 * 60 * 24)
          );
          if (diffDays < 30)
            return res
              .status(400)
              .json({ message: `انتظر ${30 - diffDays} يوم لتغيير الاسم.` });
        }
        const checkUser = await pgQuery(
          "SELECT id FROM users WHERE username = $1",
          [newUsername]
        );
        if (checkUser.rows.length > 0)
          return res.status(400).json({ message: "الاسم مستخدم بالفعل." });

        updateQuery += `username = $${paramCounter}, last_username_change = NOW(), `;
        updateValues.push(newUsername);
        paramCounter++;
      }

      if (newUsername) {
        const usernameRegex = /^[a-zA-Z0-9._]+$/;
        if (!usernameRegex.test(newUsername)) {
          return res.status(400).json({
            success: false,
            message:
              "اسم المستخدم يجب أن يكون بالإنجليزية وبدون مسافات أو رموز خاصة.",
          });
        }
      }
      if (updateValues.length === 0)
        return res.json({ success: true, message: "لم يتغير شيء" });

      updateQuery =
        updateQuery.slice(0, -2) + ` WHERE phone = $${paramCounter}`;
      updateValues.push(phone);

      await pgQuery(updateQuery, updateValues);
      
      // تحديث اسم المستخدم في العقارات لو اتغير
      if (newUsername && newUsername !== currentUser.username) {
        await pgQuery(
          `UPDATE properties SET "publisherUsername" = $1 WHERE "sellerPhone" = $2`,
          [newUsername, phone]
        );
      }
      res.json({ success: true, message: "تم التحديث بنجاح ✅" });
    } catch (error) {
      console.error("Update Error:", error);
      res.status(500).json({ message: "خطأ في السيرفر" });
    }
});
app.get("/api/admin/users/search", async (req, res) => {
  const token = req.cookies.auth_token;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "admin")
      return res.status(403).json({ message: "غير مصرح" });

    const { query } = req.query;
    let sql, params;

    if (query) {
      sql = `SELECT id, name, username, phone, is_verified, profile_picture, created_at 
                   FROM users 
                   WHERE username ILIKE $1 OR phone ILIKE $1 
                   ORDER BY created_at DESC LIMIT 20`;
      params = [`%${query}%`];
    } else {
      sql = `SELECT id, name, username, phone, is_verified, profile_picture, created_at 
                   FROM users ORDER BY created_at DESC LIMIT 20`;
      params = [];
    }

    const result = await pgQuery(sql, params);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "خطأ في السيرفر" });
  }
});

app.post("/api/admin/users/verify", async (req, res) => {
  const token = req.cookies.auth_token;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "admin")
      return res.status(403).json({ message: "غير مصرح" });

    const { userId, status } = req.body;

    await pgQuery("UPDATE users SET is_verified = $1 WHERE id = $2", [
      status,
      userId,
    ]);

    res.json({
      success: true,
      message: status ? "تم توثيق الحساب ✅" : "تم إزالة التوثيق ❌",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "خطأ" });
  }
});
app.post("/api/user/delete", async (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ message: "غير مصرح" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { password } = req.body;

    const userRes = await pgQuery(
      "SELECT id, password, phone FROM users WHERE id = $1",
      [decoded.id]
    );
    if (userRes.rows.length === 0)
      return res.status(404).json({ message: "مستخدم غير موجود" });

    const user = userRes.rows[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "كلمة المرور غير صحيحة" });

    await pgQuery('DELETE FROM properties WHERE "sellerPhone" = $1', [
      user.phone,
    ]);

    try {
      await pgQuery("DELETE FROM payment_orders WHERE user_id = $1", [user.id]);
    } catch (e) {
      console.log("No payments to delete or table missing");
    }

    try {
      await pgQuery("DELETE FROM notifications WHERE user_id = $1", [user.id]);
    } catch (e) {
      console.log("No notifications to delete");
    }

    try {
      await pgQuery("DELETE FROM wallet_transactions WHERE user_id = $1", [
        user.id,
      ]);
    } catch (e) {}

    await pgQuery("DELETE FROM users WHERE id = $1", [user.id]);

    res.clearCookie("auth_token");
    res.json({
      success: true,
      message: "تم حذف الحساب وجميع البيانات المرتبطة بنجاح",
    });
  } catch (error) {
    console.error("Delete Account Error:", error);
    if (error.code === "23503") {
      return res.status(400).json({
        message:
          "لا يمكن حذف الحساب لوجود بيانات مالية أو سجلات مرتبطة أخرى لم يتم مسحها.",
      });
    }
    res.status(500).json({ message: "خطأ في السيرفر أثناء الحذف" });
  }
});

app.get("/api/user/notifications", async (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) return res.json({ unreadCount: 0, notifications: [] });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    const notifRes = await pgQuery(
      "SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20",
      [decoded.id]
    );

    const countRes = await pgQuery(
      "SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE",
      [decoded.id]
    );

    res.json({
      notifications: notifRes.rows,
      unreadCount: parseInt(countRes.rows[0].count),
    });
  } catch (error) {
    console.error("Notif Fetch Error:", error);
    res.json({ unreadCount: 0, notifications: [] });
  }
});

app.post("/api/user/notifications/read", async (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).send();

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    await pgQuery(
      "UPDATE notifications SET is_read = TRUE WHERE user_id = $1",
      [decoded.id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error("Notif Read Error:", error);
    res.status(500).send();
  }
});

async function sendNotification(userId, title, message) {
  try {
    await pgQuery(
      "INSERT INTO notifications (user_id, title, message) VALUES ($1, $2, $3)",
      [userId, title, message]
    );
  } catch (e) {
    console.error("Send Notif Error:", e);
  }
}
app.delete("/api/user/notification/:id", async (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ message: "غير مصرح" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    await pgQuery(
      "DELETE FROM user_notifications WHERE id = $1 AND user_phone = $2",
      [req.params.id, decoded.phone]
    );
    res.json({ success: true });
  } catch (error) {
    console.error("Delete Notif Error:", error);
    res.status(500).json({ message: "خطأ في السيرفر" });
  }
});

app.post("/api/user/change-password-manual", async (req, res) => {
  const token = req.cookies.auth_token;
  if (!token)
    return res
      .status(401)
      .json({ success: false, message: "غير مصرح، يرجى تسجيل الدخول" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { currentPass, newPass } = req.body;

    if (!currentPass || !newPass) {
      return res
        .status(400)
        .json({ success: false, message: "جميع الحقول مطلوبة" });
    }

    const userRes = await pgQuery(
      "SELECT id, password FROM users WHERE id = $1",
      [decoded.id]
    );
    if (userRes.rows.length === 0)
      return res
        .status(404)
        .json({ success: false, message: "مستخدم غير موجود" });

    const user = userRes.rows[0];

    const isMatch = await bcrypt.compare(currentPass, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: "كلمة المرور الحالية غير صحيحة ❌" });
    }

    const hashedPassword = await bcrypt.hash(newPass, SALT_ROUNDS);

    await pgQuery("UPDATE users SET password = $1 WHERE id = $2", [
      hashedPassword,
      decoded.id,
    ]);

    res.json({ success: true, message: "تم تغيير كلمة المرور بنجاح ✅" });
  } catch (error) {
    console.error("Change Password Error:", error);
    res.status(500).json({ success: false, message: "حدث خطأ في السيرفر" });
  }
});
app.post("/api/check-request-matches", async (req, res) => {
  try {
    const { specifications } = req.body;
    if (!specifications) return res.json({ matches: [] });

    const propsRes = await pgQuery(`
            SELECT id, title, price, description, type, "imageUrl" 
            FROM properties 
            ORDER BY id DESC LIMIT 50
        `);

    if (propsRes.rows.length === 0) return res.json({ matches: [] });

    const propsList = propsRes.rows
      .map(
        (p) =>
          `ID:${p.id} | Title:${p.title} | Price:${
            p.price
          } | Desc:${p.description.substring(0, 100)}`
      )
      .join("\n");

    const prompt = `
        You are a Real Estate Matcher.
        User Request: "${specifications}"
        
        Available Properties:
        ${propsList}

        Task: Return a JSON array of Property IDs that strongly match the User Request.
        Rules:
        - Match based on Location, Type (Apartment/Villa), and Price range.
        - If no strong match, return empty array [].
        - Return ONLY JSON: [12, 15]
        `;

    const result = await modelChat.generateContent(prompt);
    const response = await result.response;
    let text = response
      .text()
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const matchIds = JSON.parse(text);

    if (!Array.isArray(matchIds) || matchIds.length === 0) {
      return res.json({ matches: [] });
    }

    const cleanIds = matchIds.filter((id) => Number.isInteger(id));
    if (cleanIds.length === 0) return res.json({ matches: [] });

    const finalMatches = await pgQuery(
      `
            SELECT id, title, price, "imageUrl", type 
            FROM properties 
            WHERE id = ANY($1::int[])
        `,
      [cleanIds]
    );

    res.json({ matches: finalMatches.rows });
  } catch (error) {
    console.error("AI Matching Error:", error);
    res.json({ matches: [] });
  }
});

app.post("/api/report-user", async (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ message: "يجب تسجيل الدخول" });

  try {
    const reporter = jwt.verify(token, JWT_SECRET);
    const { reportedPhone, reason } = req.body;

    if (reporter.phone === reportedPhone)
      return res.status(400).json({ message: "لا يمكن الإبلاغ عن نفسك" });

    await pgQuery(
      `INSERT INTO user_reports (reporter_phone, reported_phone, reason, created_at) VALUES ($1, $2, $3, $4)`,
      [
        reporter.phone,
        reportedPhone,
        reason || "بدون سبب",
        new Date().toISOString(),
      ]
    );

    const countRes = await pgQuery(
      `SELECT COUNT(*) FROM user_reports WHERE reported_phone = $1`,
      [reportedPhone]
    );
    const reportCount = parseInt(countRes.rows[0].count);

    await sendDiscordNotification(
      "🚨 بلاغ جديد عن مستخدم",
      [
        { name: "المُبلِغ", value: reporter.phone },
        { name: "المُبلَغ عنه", value: reportedPhone },
        { name: "السبب", value: reason },
        { name: "إجمالي البلاغات", value: `${reportCount}/10` },
      ],
      15548997
    );

    if (reportCount >= 10) {
      await pgQuery(`UPDATE users SET is_banned = TRUE WHERE phone = $1`, [
        reportedPhone,
      ]);
      await sendDiscordNotification(
        "⛔ حظر تلقائي",
        [
          { name: "المستخدم المحظور", value: reportedPhone },
          { name: "السبب", value: "تجاوز 10 بلاغات" },
        ],
        0
      );
    }

    res.json({
      success: true,
      message:
        "تم إرسال البلاغ بنجاح. لن تظهر لك إعلانات هذا المستخدم مرة أخرى.",
    });
  } catch (e) {
    res.status(500).json({ message: "خطأ" });
  }
});

app.get("/api/admin/secret-logs", async (req, res) => {
  const token = req.cookies.auth_token;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "admin") return res.status(403).send();

    const result = await pgQuery(
      "SELECT * FROM transactions WHERE type = 'deposit' ORDER BY date DESC"
    );
    res.json(result.rows);
  } catch (e) {
    res.status(500).json([]);
  }
});

app.delete("/api/admin/secret-logs", async (req, res) => {
  const token = req.cookies.auth_token;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "admin") return res.status(403).send();

    await pgQuery("DELETE FROM transactions WHERE type = 'deposit'");
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({});
  }
});

setInterval(async () => {
  try {
    const today = new Date();
    if (today.getDate() === 1) {
      const logCheck = await pgQuery(
        "SELECT last_run FROM cron_logs WHERE job_name = 'monthly_points'"
      );
      const lastRunStr = logCheck.rows[0]?.last_run;
      const lastRunDate = lastRunStr ? new Date(lastRunStr) : new Date(0);

      if (
        today.getMonth() !== lastRunDate.getMonth() ||
        today.getFullYear() !== lastRunDate.getFullYear()
      ) {
        const activeRes = await getBotSetting('payment_active');
        if (activeRes === "true") {
          console.log("🎁 جاري توزيع النقاط الشهرية المجانية...");
          await pgQuery("UPDATE users SET wallet_balance = wallet_balance + 2");

          await pgQuery(
            `INSERT INTO cron_logs (job_name, last_run) VALUES ('monthly_points', $1) 
                                   ON CONFLICT (job_name) DO UPDATE SET last_run = $1`,
            [today.toISOString()]
          );
        }
      }
    }
  } catch (e) {
    console.error("Cron Job Error:", e);
  }
}, 12 * 60 * 60 * 1000);

app.get("/api/public/stats", async (req, res) => {
  try {
    const propsRes = await pgQuery("SELECT COUNT(*) FROM properties");
    const usersRes = await pgQuery("SELECT COUNT(*) FROM users");

    res.json({
      properties: parseInt(propsRes.rows[0].count),
      users: parseInt(usersRes.rows[0].count),
    });
  } catch (error) {
    console.error("Stats Error:", error);
    res.status(500).json({ properties: 50, users: 100 });
  }
});
app.post("/api/admin/toggle-ban", async (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ message: "غير مصرح" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "admin")
      return res.status(403).json({ message: "للأدمن فقط" });

    const { phone, isBanned } = req.body;

    await pgQuery("UPDATE users SET is_banned = $1 WHERE phone = $2", [
      isBanned,
      phone,
    ]);

    res.json({
      success: true,
      message: isBanned
        ? `تم حظر المستخدم ${phone} وإخفاء جميع عقاراته 🚫`
        : `تم فك الحظر عن ${phone} وإعادة إظهار عقاراته ✅`,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "خطأ في السيرفر" });
  }
});

app.get("/api/user/my-reports", async (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ message: "غير مصرح" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    const sql = `
            SELECT r.reported_phone, u.name, r.reason, r.created_at
            FROM user_reports r
            LEFT JOIN users u ON r.reported_phone = u.phone
            WHERE r.reporter_phone = $1
            ORDER BY r.created_at DESC
        `;

    const result = await pgQuery(sql, [decoded.phone]);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "خطأ في جلب القائمة" });
  }
});

app.post("/api/user/remove-report", async (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ message: "غير مصرح" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { reportedPhone } = req.body;

    await pgQuery(
      "DELETE FROM user_reports WHERE reporter_phone = $1 AND reported_phone = $2",
      [decoded.phone, reportedPhone]
    );

    res.json({ success: true, message: "تم إلغاء الحظر بنجاح ✅" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "خطأ في السيرفر" });
  }
});

async function aiParseSearchQuery(query) {
  try {
    const prompt = `
        You are a Real Estate Search Assistant for Saudi Arabia.
        User Query: "${query}"
        
        Task: Correct spelling (Arabic/Franco), extract location, property type, and price budget if found.
        
        Return JSON ONLY:
        {
            "corrected_text": "Corrected Arabic Text",
            "keywords": ["keyword1", "keyword2"],
            "location": "City/Area Name or null",
            "type": "buy/rent or null",
            "property_type": "apartment/villa/shop or null",
            "max_price": number or null
        }
        `;

    const result = await modelChat.generateContent(prompt);
    const response = await result.response;
    let text = response
      .text()
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    return JSON.parse(text);
  } catch (error) {
    console.error("AI Search Parse Error:", error);
    return null;
  }
}

app.get("/api/ai-search", async (req, res) => {
  const { query, limit = 6, offset = 0 } = req.query;

  if (!query) return res.json([]);

  try {
    const aiData = await aiParseSearchQuery(query);
    console.log("🤖 AI Search Analysis:", aiData);

    let sql = `
            SELECT p.id, p.title, p.price, p.rooms, p.bathrooms, p.area, p."imageUrl", p.type, p."isFeatured", p."isLegal", p."sellerPhone", u.is_verified 
            FROM properties p
            LEFT JOIN users u ON p."sellerPhone" = u.phone
            WHERE (u.is_banned IS FALSE OR u.is_banned IS NULL)
        `;

    const params = [];
    let idx = 1;
    const filters = [];

    if (aiData) {
      if (aiData.keywords && aiData.keywords.length > 0) {
        const textConditions = aiData.keywords.map((k) => {
          params.push(`%${k}%`);
          return `(p.title ILIKE $${idx++} OR p.description ILIKE $${
            idx - 1
          } OR p.nearby_services ILIKE $${idx - 1})`;
        });
        filters.push(`(${textConditions.join(" OR ")})`);
      }

      if (aiData.location) {
        filters.push(
          `(p.title ILIKE $${idx} OR p.description ILIKE $${idx} OR p.nearby_services ILIKE $${idx})`
        );
        params.push(`%${aiData.location}%`);
        idx++;
      }

      if (aiData.type) {
        const opType =
          aiData.type === "buy" || aiData.type === "بيع" ? "بيع" : "إيجار";
        filters.push(`p.type = $${idx++}`);
        params.push(opType);
      }

      if (aiData.max_price) {
        filters.push(`p."numericPrice" <= $${idx++}`);
        params.push(aiData.max_price * 1.2);
      }
    } else {
      filters.push(`(p.title ILIKE $${idx} OR p.description ILIKE $${idx})`);
      params.push(`%${query}%`);
      idx++;
    }

    if (filters.length > 0) sql += " AND " + filters.join(" AND ");

    sql += ` ORDER BY p."isFeatured" DESC, p.id DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pgQuery(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Search Error:", err);
    res.status(500).json({ message: "Search Failed" });
  }
});

app.get("/init-contact-table", async (req, res) => {
  try {
    await pgQuery(`
            CREATE TABLE IF NOT EXISTS contact_messages (
                id SERIAL PRIMARY KEY,
                name TEXT,
                phone TEXT,
                subject TEXT,
                message TEXT,
                created_at TEXT
            )
        `);
    res.send("✅ تم إنشاء جدول رسائل التواصل بنجاح");
  } catch (e) {
    res.status(500).send("❌ خطأ: " + e.message);
  }
});

app.post("/api/contact-us", async (req, res) => {
  const { name, phone, subject, message } = req.body;

  if (!name || !phone || !message) {
    return res.status(400).json({ message: "يرجى ملء كافة البيانات المطلوبة" });
  }

  try {
    await pgQuery(
      `INSERT INTO contact_messages (name, phone, subject, message, created_at) VALUES ($1, $2, $3, $4, $5)`,
      [name, phone, subject, message, new Date().toISOString()]
    );

    await sendDiscordNotification(
      "📩 رسالة تواصل جديدة",
      [
        { name: "👤 الاسم", value: name },
        { name: "📱 الهاتف", value: phone },
        { name: "📌 الموضوع", value: subject },
        { name: "📝 الرسالة", value: message },
      ],
      3447003
    );

    res.json({ success: true, message: "تم استلام رسالتك بنجاح" });
  } catch (error) {
    console.error("Contact Error:", error);
    res.status(500).json({ message: "حدث خطأ في السيرفر" });
  }
});
app.get("/update-db-geo", async (req, res) => {
  try {
    await pgQuery(
      `ALTER TABLE properties ADD COLUMN IF NOT EXISTS "governorate" TEXT`
    );
    await pgQuery(
      `ALTER TABLE properties ADD COLUMN IF NOT EXISTS "city" TEXT`
    );
    await pgQuery(
      `ALTER TABLE properties ADD COLUMN IF NOT EXISTS "unit_count" INTEGER`
    );

    await pgQuery(
      `ALTER TABLE seller_submissions ADD COLUMN IF NOT EXISTS "governorate" TEXT`
    );
    await pgQuery(
      `ALTER TABLE seller_submissions ADD COLUMN IF NOT EXISTS "city" TEXT`
    );
    await pgQuery(
      `ALTER TABLE seller_submissions ADD COLUMN IF NOT EXISTS "unit_count" INTEGER`
    );

    res.send(
      "✅ تم تحديث قاعدة البيانات: أضيفت المحافظة، المدينة، وعدد الوحدات."
    );
  } catch (error) {
    res.status(500).send("❌ خطأ: " + error.message);
  }
});
app.post(
  "/api/admin/add-service",
  uploadService.single("image"),
  async (req, res) => {
    const token = req.cookies.auth_token;
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded.role !== "admin")
        return res.status(403).json({ message: "غير مصرح" });

      const { title, description, linkType, linkUrl } = req.body;
      const imageUrl = req.file ? req.file.path : "";

      await pgQuery(
        `INSERT INTO services (title, description, image_url, link_type, link_url, created_at) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          title,
          description,
          imageUrl,
          linkType,
          linkUrl,
          new Date().toISOString(),
        ]
      );

      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "خطأ سيرفر" });
    }
  }
);

app.get("/api/services", async (req, res) => {
  try {
    const result = await pgQuery(
      "SELECT * FROM services ORDER BY is_pinned DESC, id DESC"
    );
    res.json(result.rows);
  } catch (e) {
    console.error("Fetch Services Error:", e);
    res.status(500).json([]);
  }
});

app.delete("/api/admin/service/:id", async (req, res) => {
  const token = req.cookies.auth_token;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "admin")
      return res.status(403).json({ message: "غير مصرح" });

    const id = req.params.id;

    const srvRes = await pgQuery(
      "SELECT image_url FROM services WHERE id = $1",
      [id]
    );
    if (srvRes.rows.length > 0) {
      const imgUrl = srvRes.rows[0].image_url;
      if (imgUrl) await deleteCloudinaryImages([imgUrl]);
    }

    await pgQuery("DELETE FROM services WHERE id = $1", [id]);

    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "خطأ سيرفر" });
  }
});
app.put("/api/admin/service/pin/:id", async (req, res) => {
  const token = req.cookies.auth_token;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "admin")
      return res.status(403).json({ message: "غير مصرح" });

    const { isPinned } = req.body;
    await pgQuery("UPDATE services SET is_pinned = $1 WHERE id = $2", [
      isPinned,
      req.params.id,
    ]);

    res.json({ success: true });
  } catch (e) {
    console.error("Pin Error:", e);
    res.status(500).json({ message: "Error" });
  }
});

const requireAdmin = (req, res, next) => {
  const token = req.cookies.auth_token;
  if (!token) return res.redirect("/");

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role === "admin" && decoded.phone === ADMIN_PHONE) {
      return next();
    } else {
      return res.redirect("/");
    }
  } catch (err) {
    return res.redirect("/");
  }
};

app.get("/api/public/faqs", async (req, res) => {
  try {
    const result = await pgQuery(
      "SELECT * FROM faqs WHERE status = 'published' ORDER BY id ASC"
    );
    res.json(result.rows);
  } catch (e) {
    res.status(500).json([]);
  }
});

app.post("/api/public/ask", async (req, res) => {
  const { question, name } = req.body;
  if (!question) return res.status(400).json({ message: "السؤال مطلوب" });

  try {
    await pgQuery(
      "INSERT INTO faqs (question, asked_by, status, created_at) VALUES ($1, $2, 'pending', $3)",
      [question, name || "مجهول", new Date().toISOString()]
    );
    sendDiscordNotification(
      "❓ سؤال جديد من مستخدم",
      [{ name: "السؤال", value: question }],
      16776960
    );

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: "خطأ سيرفر" });
  }
});

app.get("/api/admin/faqs", async (req, res) => {
  try {
    const result = await pgQuery(
      "SELECT * FROM faqs ORDER BY status ASC, id DESC"
    );
    res.json(result.rows);
  } catch (e) {
    res.status(500).json([]);
  }
});

app.post("/api/admin/faqs/publish", async (req, res) => {
  const { id, answer } = req.body;
  try {
    await pgQuery(
      "UPDATE faqs SET answer = $1, status = 'published' WHERE id = $2",
      [answer, id]
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: "Error" });
  }
});

app.delete("/api/admin/faqs/:id", async (req, res) => {
  try {
    await pgQuery("DELETE FROM faqs WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: "Error" });
  }
});

app.post("/api/reviews", async (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ message: "يجب تسجيل الدخول" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { reviewedPhone, rating, comment } = req.body;
    const reviewerPhone = decoded.phone;

    if (reviewerPhone === reviewedPhone) {
      return res.status(400).json({ message: "لا يمكن تقييم نفسك" });
    }

    if (rating) {
      await pgQuery(
        `INSERT INTO user_ratings (reviewer_phone, reviewed_phone, stars, updated_at) 
         VALUES ($1, $2, $3, $4) 
         ON CONFLICT (reviewer_phone, reviewed_phone) 
         DO UPDATE SET stars = $3, updated_at = $4`,
        [reviewerPhone, reviewedPhone, rating, new Date().toISOString()]
      );
    }

    if (comment && comment.trim() !== "") {
      const commentsCountRes = await pgQuery(
        `SELECT COUNT(*) FROM user_comments WHERE reviewer_phone = $1 AND reviewed_phone = $2`,
        [reviewerPhone, reviewedPhone]
      );

      if (parseInt(commentsCountRes.rows[0].count) >= 5) {
        return res.status(403).json({
          errorType: "LIMIT_EXCEEDED",
          message:
            "لقد وصلت للحد الأقصى من التعليقات المكتوبة لهذا المستخدم (5 تعليقات).",
        });
      }

      await pgQuery(
        `INSERT INTO user_comments (reviewer_phone, reviewed_phone, comment, created_at) VALUES ($1, $2, $3, $4)`,
        [reviewerPhone, reviewedPhone, comment, new Date().toISOString()]
      );
    }

    await createNotification(
      reviewedPhone,
      "⭐ تقييم جديد!",
      `في حد قيمك ${
        rating ? rating + " نجوم" : ""
      } وكتب رأيه فيك. ادخل شوف التقييم.`
    );

    const totalReviewsRes = await pgQuery(
      `SELECT comment FROM user_comments WHERE reviewed_phone = $1 ORDER BY id DESC LIMIT 20`,
      [reviewedPhone]
    );

    if (totalReviewsRes.rows.length >= 5) {
      const textComments = totalReviewsRes.rows
        .map((r) => `- ${r.comment}`)
        .join("\n");
      const prompt = `
        أنت خبير علاقات عامة. دي آراء عملاء عن (سمسار/مالك عقارات):
        ${textComments}
        المطلوب: اكتب "كبسولة سمعة" (سطرين بالكتير) باللهجة السعودية الشيك.
        عايز الخلاصة: هل هو "ثقة وأمين" ولا "مماطل"؟ وايه أبرز ميزة؟
        بدون مقدمات زي "بناء على الآراء..". ادخل في الموضوع علطول.
        مثال: "شخص محترم جداً في المواعيد وأمين في الوصف، بس بيأخر الرد على الواتساب شوية."
        `;
      modelChat
        .generateContent(prompt)
        .then(async (result) => {
          const response = await result.response;
          const summary = response.text().replace(/\*/g, "").trim();
          await pgQuery(
            "UPDATE users SET ai_summary_cache = $1 WHERE phone = $2",
            [summary, reviewedPhone]
          );
        })
        .catch(console.error);
    }

    await sendDiscordNotification(
      "⭐ تقييم جديد",
      [
        { name: "المُقيِّم", value: reviewerPhone },
        { name: "المُقيَّم", value: reviewedPhone },
        { name: "النجوم", value: `${rating || 0} نجوم` },
        { name: "التعليق", value: comment || "بدون تعليق" },
      ],
      16776960
    );

    res.json({ success: true, message: "تم حفظ التقييم بنجاح ✅" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "خطأ في السيرفر" });
  }
});
app.get("/api/reviews/stats/:phone", async (req, res) => {
  try {
    const result = await pgQuery(
      `SELECT AVG(stars::numeric) as average, COUNT(*) as count FROM user_ratings WHERE reviewed_phone = $1`,
      [req.params.phone]
    );
    const stats = result.rows[0];
    res.json({
      average: parseFloat(stats.average || 0).toFixed(1),
      count: parseInt(stats.count || 0),
    });
  } catch (e) {
    res.json({ average: 0, count: 0 });
  }
});

app.get("/api/reviews/:phone", async (req, res) => {
  try {
    const sql = `
        SELECT 
            c.id as comment_id,
            c.comment, 
            c.created_at,
            c.owner_reply,
            c.reply_date,
            c.is_reply_admin,
            r.reviewer_phone,
            r.stars as rating,
            u.name as reviewer_name, 
            u.username as reviewer_username,
            u.profile_picture as reviewer_pic,
            u.is_verified,
            u.role
        FROM user_comments c
        LEFT JOIN user_ratings r ON (c.reviewer_phone = r.reviewer_phone AND c.reviewed_phone = r.reviewed_phone)
        LEFT JOIN users u ON c.reviewer_phone = u.phone
        WHERE c.reviewed_phone = $1
        ORDER BY c.created_at DESC
    `;
    const result = await pgQuery(sql, [req.params.phone]);

    const finalRows = result.rows.map((row) => {
      if (
        row.reviewer_phone === process.env.ADMIN_PHONE ||
        row.role === "admin"
      ) {
        row.reviewer_name = "موقع عقارك";
        row.is_admin = true;
        row.is_verified = true;
      }
      return row;
    });

    res.json(finalRows);
  } catch (e) {
    console.error("Fetch Reviews Error:", e);
    res.status(500).json([]);
  }
});

app.delete("/api/admin/reviews/full/:reviewer/:reviewed", async (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ message: "غير مصرح" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "هذا الإجراء للأدمن فقط" });
    }

    const { reviewer, reviewed } = req.params;

    await pgQuery(
      "DELETE FROM user_comments WHERE reviewer_phone = $1 AND reviewed_phone = $2",
      [reviewer, reviewed]
    );

    await pgQuery(
      "DELETE FROM user_ratings WHERE reviewer_phone = $1 AND reviewed_phone = $2",
      [reviewer, reviewed]
    );

    res.json({
      success: true,
      message: "تم حذف التقييم والنجوم بالكامل.",
    });
  } catch (error) {
    console.error("Delete Full Review Error:", error);
    res.status(500).json({ message: "خطأ في السيرفر" });
  }
});

app.get("/api/reviews/my-rating/:targetPhone", async (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) return res.json({ found: false });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const reviewerPhone = decoded.phone;
    const targetPhone = req.params.targetPhone;

    const ratingRes = await pgQuery(
      `SELECT stars FROM user_ratings WHERE reviewer_phone = $1 AND reviewed_phone = $2`,
      [reviewerPhone, targetPhone]
    );

    const commentRes = await pgQuery(
      `SELECT comment FROM user_comments WHERE reviewer_phone = $1 AND reviewed_phone = $2 ORDER BY id DESC LIMIT 1`,
      [reviewerPhone, targetPhone]
    );

    if (ratingRes.rows.length > 0) {
      res.json({
        found: true,
        rating: ratingRes.rows[0].stars,
        comment: commentRes.rows.length > 0 ? commentRes.rows[0].comment : "",
      });
    } else {
      res.json({ found: false });
    }
  } catch (e) {
    res.json({ found: false });
  }
});
app.post("/api/reviews/summarize", async (req, res) => {
  const { reviews } = req.body;
  if (!reviews || reviews.length === 0)
    return res.json({ summary: "لا توجد تقييمات كافية للتلخيص." });

  const textComments = reviews
    .map((r) => `- ${r.comment} (التقييم: ${r.rating}/5)`)
    .join("\n");

  const prompt = `
    أنت مساعد ذكي لمنصة عقارية. دي مجموعة تقييمات لمكتب عقاري/سمسار:
    ${textComments}
    
    المطلوب:
    اكتب ملخص قصير جداً (لا يزيد عن سطرين) باللهجة السعودية يوضح سمعة هذا الشخص، وأبرز مميزاته وعيوبه بناءً على كلام الناس.
    ابدأ الملخص بـ "خلاصة رأي الناس:" واكتب بإيجابية وموضوعية.
    `;

  try {
    const result = await modelChat.generateContent(prompt);
    const response = await result.response;
    const summary = response.text().replace(/\*/g, "").trim();
    res.json({ summary });
  } catch (error) {
    console.error("AI Summary Error:", error);
    res.json({ summary: "لم نتمكن من تلخيص التقييمات حالياً." });
  }
});

app.get("/update-db-bio", async (req, res) => {
  try {
    await pgQuery(`ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT`);
    res.send("✅ تم تحديث قاعدة البيانات وإضافة خانة النبذة الشخصية (Bio).");
  } catch (error) {
    res.status(500).send("❌ خطأ: " + error.message);
  }
});
app.get("/api/public/profile/:username", async (req, res) => {
  const { username } = req.params;
  try {
    const userRes = await pgQuery(
      "SELECT name, phone, is_verified, profile_picture, cover_picture, job_title, social_links, created_at, ai_summary_cache, bio FROM users WHERE username = $1",
      [username.toLowerCase()]
    );

    if (userRes.rows.length === 0)
      return res.status(404).json({ message: "المستخدم غير موجود" });

    const user = userRes.rows[0];

    const propsRes = await pgQuery(
      `SELECT id, title, price, rooms, bathrooms, area, "imageUrl", type, "isFeatured" 
       FROM properties 
       WHERE "publisherUsername" = $1 OR "sellerPhone" = $2 
       ORDER BY id DESC`,
      [username.toLowerCase(), user.phone]
    );

   res.json({
      name: user.name,
      phone: user.phone,
      is_verified: user.is_verified,
      profile_picture: user.profile_picture,
      created_at: user.created_at,
      ai_summary: user.ai_summary_cache,
      bio: user.bio,
      // البيانات الجديدة التي كانت ناقصة:
      cover_picture: user.cover_picture,
      job_title: user.job_title,
      social_links: user.social_links,
      // ------------------------------------
      properties: propsRes.rows,
    });
  } catch (error) {
    console.error("Profile Error:", error);
    res.status(500).json({ message: "خطأ سيرفر" });
  }
});
app.delete("/api/admin/reviews/:id", async (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ message: "غير مصرح" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "هذا الإجراء للأدمن فقط" });
    }

    await pgQuery("DELETE FROM user_comments WHERE id = $1", [req.params.id]);
    res.json({
      success: true,
      message: "تم حذف التعليق الكتابي بنجاح.",
    });
  } catch (error) {
    console.error("Delete Review Error:", error);
    res.status(500).json({ message: "خطأ في السيرفر" });
  }
});

app.post("/api/log-contact", async (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) return res.json({ success: false });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { ownerPhone } = req.body;

    await pgQuery(
      `INSERT INTO contact_logs (user_phone, owner_phone) VALUES ($1, $2)`,
      [decoded.phone, ownerPhone]
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({});
  }
});

setInterval(async () => {
  try {
    const result = await pgQuery(`
            SELECT c.*, u.username as owner_username 
            FROM contact_logs c
            LEFT JOIN users u ON c.owner_phone = u.phone
            WHERE c.reminder_sent = FALSE 
            AND c.contact_date < NOW() - INTERVAL '2 hours'
            AND c.contact_date > NOW() - INTERVAL '24 hours' 
            LIMIT 20
        `);
    for (const log of result.rows) {
      const userCheck = await pgQuery(
        `SELECT last_rating_reminder FROM users WHERE phone = $1`,
        [log.user_phone]
      );

      const lastReminder = userCheck.rows[0]?.last_rating_reminder;
      let shouldSend = true;

      if (lastReminder) {
        const daysSinceLast =
          (new Date() - new Date(lastReminder)) / (1000 * 60 * 60 * 24);
        if (daysSinceLast < 30) {
          shouldSend = false;
        }
      }

      if (shouldSend) {
        const msg = `👋 أهلاً يا هندسة،\n\nمن ساعتين تواصلت مع المالك بخصوص عقار. يهمنا نعرف تجربتك! ⭐\n\nلو التعامل تم، يا ريت تقيمه عشان تفيد غيرك:\n${APP_URL}/profile?u=${log.owner_username}&tab=reviews\n\n(رأيك بيفرق جداً في مجتمع عقارك)`;

        const sent = await sendWhatsAppMessage(log.user_phone, msg);

        if (sent) {
          console.log(`✅ Monthly Reminder sent to ${log.user_phone}`);
          await pgQuery(
            `UPDATE users SET last_rating_reminder = NOW() WHERE phone = $1`,
            [log.user_phone]
          );
        }
      }

      await pgQuery(
        "UPDATE contact_logs SET reminder_sent = TRUE WHERE id = $1",
        [log.id]
      );
    }
  } catch (e) {
    console.error("Reminder Cron Error:", e);
  }
}, 10 * 60 * 1000);

app.delete("/api/reviews/delete/:id", async (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ message: "غير مصرح" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const commentId = req.params.id;

    const checkRes = await pgQuery(
      "SELECT reviewer_phone, reviewed_phone FROM user_comments WHERE id = $1",
      [commentId]
    );

    if (checkRes.rows.length === 0)
      return res.status(404).json({ message: "التقييم غير موجود" });

    const reviewData = checkRes.rows[0];

    if (
      reviewData.reviewer_phone !== decoded.phone &&
      decoded.role !== "admin"
    ) {
      return res
        .status(403)
        .json({ message: "لا تملك صلاحية حذف هذا التقييم" });
    }

    await pgQuery("DELETE FROM user_comments WHERE id = $1", [commentId]);

    const countRes = await pgQuery(
      "SELECT COUNT(*) FROM user_comments WHERE reviewed_phone = $1",
      [reviewData.reviewed_phone]
    );
    const currentCount = parseInt(countRes.rows[0].count);

    if (currentCount < 5) {
      await pgQuery(
        "UPDATE users SET ai_summary_cache = NULL WHERE phone = $1",
        [reviewData.reviewed_phone]
      );
    }

    res.json({ success: true, message: "تم حذف التقييم وتحديث البيانات" });
  } catch (error) {
    console.error("Delete Review Error:", error);
    res.status(500).json({ message: "خطأ في السيرفر" });
  }
});
app.put("/api/reviews/edit/:id", async (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ message: "غير مصرح" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { comment } = req.body;

    const checkRes = await pgQuery(
      "SELECT reviewer_phone, reviewed_phone FROM user_comments WHERE id = $1",
      [req.params.id]
    );

    if (checkRes.rows.length === 0)
      return res.status(404).json({ message: "غير موجود" });

    const reviewData = checkRes.rows[0];

    if (
      reviewData.reviewer_phone !== decoded.phone &&
      decoded.role !== "admin"
    ) {
      return res.status(403).json({ message: "غير مسموح" });
    }

    await pgQuery("UPDATE user_comments SET comment = $1 WHERE id = $2", [
      comment,
      req.params.id,
    ]);

    await sendDiscordNotification(
      "✏️ تعديل تقييم",
      [
        { name: "المُقيِّم", value: reviewData.reviewer_phone },
        { name: "المُقيَّم", value: reviewData.reviewed_phone },
        { name: "التعليق الجديد", value: comment },
      ],
      16776960
    );

    res.json({ success: true, message: "تم تعديل التقييم" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "خطأ" });
  }
});

app.get("/admin-home", requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "protected_pages", "admin-home.html"));
});

app.get("/admin-submissions", requireAdmin, (req, res) => {
  res.sendFile(
    path.join(__dirname, "protected_pages", "admin-submissions.html")
  );
});

app.get("/admin-requests", requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "protected_pages", "admin-requests.html"));
});

app.get("/admin-complaints", requireAdmin, (req, res) => {
  res.sendFile(
    path.join(__dirname, "protected_pages", "admin-complaints.html")
  );
});
app.get("/admin-complaints.html", requireAdmin, (req, res) => {
  res.sendFile(
    path.join(__dirname, "protected_pages", "admin-complaints.html")
  );
});

app.get("/admin-users", requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "protected_pages", "admin-users.html"));
});

app.get("/admin-user-stats", requireAdmin, (req, res) => {
  res.sendFile(
    path.join(__dirname, "protected_pages", "admin-user-stats.html")
  );
});

app.get("/admin-add-property", requireAdmin, (req, res) => {
  res.sendFile(
    path.join(__dirname, "protected_pages", "admin-add-property.html")
  );
});

app.get("/admin-edit-property", requireAdmin, (req, res) => {
  res.sendFile(
    path.join(__dirname, "protected_pages", "admin-edit-property.html")
  );
});

app.get("/admin-services", requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "protected_pages", "admin-services.html"));
});

app.get("/authentication", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get(["/", "/home"], (req, res) => {
  res.sendFile(path.join(__dirname, "public", "home.html"));
});

app.get("/about-us", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "about.html"));
});

app.get("/contact-us", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "contact.html"));
});

app.get("/terms", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "terms.html"));
});

app.get("/services", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "service.html"));
});

app.get("/properties", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "all-properties.html"));
});

app.get("/request", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "request-property.html"));
});

app.get("/watch", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "video-player.html"));
});

app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "user-dashboard.html"));
});

app.get("/my-properties", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "my-ads.html"));
});

app.get("/settings", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "edit-profile.html"));
});

app.get("/sell", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "seller-dashboard.html"));
});

app.get("/profile", async (req, res) => {
  const username = req.query.u;
  const filePath = path.join(__dirname, "public", "user-profile.html");

  try {
    let html = await fs.readFile(filePath, "utf8");

    if (!username) throw new Error("No user specified");

    const sql = `
      SELECT name, profile_picture, created_at,
      (SELECT COUNT(*) FROM properties WHERE "sellerPhone" = users.phone) as prop_count,
      (SELECT COUNT(*) FROM user_ratings WHERE reviewed_phone = users.phone) as rating_count
      FROM users WHERE username = $1
    `;

    const result = await pgQuery(sql, [username.toLowerCase()]);

    if (result.rows.length > 0) {
      const user = result.rows[0];
      const joinYear = new Date(user.created_at).getFullYear();

      const title = `عقارك | حساب ${user.name}`;
      const description = `تصفح ${user.prop_count} عقار و ${user.rating_count} تقييم للمستخدم ${user.name}. عضو في عقارك منذ ${joinYear}.`;

      let image = user.profile_picture;
      if (!image || image.includes("logo.png")) {
        image = "https://www.aqarak.sa/logo.png";
      } else if (!image.startsWith("http")) {
        image = `https://www.aqarak.sa${image}`;
      }

      const url = `https://www.aqarak.sa/profile?u=${username}`;

      html = html
        .replace(/{{OG_TITLE}}/g, title)
        .replace(/{{OG_DESCRIPTION}}/g, description)
        .replace(/{{OG_IMAGE}}/g, image)
        .replace(/{{OG_URL}}/g, url);

      res.send(html);
    } else {
      throw new Error("User not found");
    }
  } catch (e) {
    res.sendFile(filePath);
  }
});
app.get("/faq", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "faq.html"))
);
app.get("/admin-faq", requireAdmin, (req, res) =>
  res.sendFile(path.join(__dirname, "protected_pages", "admin-faq.html"))
);

app.get("/update-db-premium", async (req, res) => {
  try {
    await pgQuery(`ALTER TABLE users ADD COLUMN IF NOT EXISTS cover_picture TEXT`);
    await pgQuery(`ALTER TABLE users ADD COLUMN IF NOT EXISTS job_title TEXT`);
    await pgQuery(`ALTER TABLE users ADD COLUMN IF NOT EXISTS social_links TEXT`); // JSON format
    res.send("✅ تم تحديث قاعدة البيانات للمميزات البريميوم بنجاح!");
  } catch (error) {
    res.status(500).send("❌ خطأ: " + error.message);
  }
});

app.get("*", (req, res) => {
  res.redirect("/");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
