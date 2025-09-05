import TelegramBot from "node-telegram-bot-api";
import config from "./config.js";

const token = config.TOKEN;
const bot = new TelegramBot(token, {
    polling: {
        interval: 300,
        autoStart: true,
        params: { timeout: 10 },
    },
});

const ADMIN_ID = config.ADMIN_ID;
let questions = {};
let questionCounter = 1;

// --- Polling xatolarni ushlash ---
bot.on("polling_error", (error) => {
    console.error("❌ Polling xatosi:", error.code);
    if (
        error.code === "ETELEGRAM" &&
        error.response?.body?.error_code === 409
    ) {
        console.error(
            "🔄 Bot boshqa joyda ishlamoqda. Faqat bitta joyda ishlating."
        );
    }
});

// --- Foydalanuvchi start ---
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(
        chatId,
        `
🤖 *Anonim Savol-Javob Bot*

Siz matn, rasm, audio yoki video ko‘rinishida savol bera olasiz.
Ismingiz va ma’lumotlaringiz *anonim saqlanadi*.  

📝 Savolingizni yuboring, Suhrob tez orada javob beradi.
        `,
        { parse_mode: "Markdown" }
    );
});

// --- Savolni qabul qilish umumiy funksiya ---
function handleQuestion(chatId, type, content, fileId = null) {
    questions[questionCounter] = {
        userId: chatId,
        type,
        content,
        fileId,
        answered: false,
        timestamp: new Date(),
    };

    console.log(`📝 Yangi ${type} savol #${questionCounter}`);

    // Foydalanuvchiga tasdiq
    bot.sendMessage(
        chatId,
        `✅ Savolingiz qabul qilindi. Suhrob tez orada javob beradi.`,
        { parse_mode: "Markdown" }
    );

    // Adminga yuborish
    if (ADMIN_ID) {
        let notify = `🔔 *Yangi ${type} savol keldi!*\n\n`;
        if (type === "text") {
            notify += `📝 Savol: ${content}`;
        } else {
            notify += `📎 Fayl turi: ${type}`;
        }
        notify += `\n\nJavob berish uchun: \`/answer ${questionCounter} [javob]\``;

        bot.sendMessage(ADMIN_ID, notify, { parse_mode: "Markdown" });

        // Agar media bo‘lsa, admin uchun forward qilib yuborish
        if (type === "photo")
            bot.sendPhoto(ADMIN_ID, fileId, { caption: "📷 Yangi rasm savol" });
        if (type === "video")
            bot.sendVideo(ADMIN_ID, fileId, {
                caption: "🎥 Yangi video savol",
            });
        if (type === "voice")
            bot.sendVoice(ADMIN_ID, fileId, {
                caption: "🎤 Yangi audio savol",
            });
        if (type === "document")
            bot.sendDocument(ADMIN_ID, fileId, {
                caption: "📄 Yangi fayl savol",
            });
    }

    questionCounter++;
}

// --- Text savollar ---
bot.on("message", (msg) => {
    const chatId = msg.chat.id;
    if (
        msg.text &&
        !msg.text.startsWith("/") &&
        chatId.toString() !== ADMIN_ID
    ) {
        handleQuestion(chatId, "text", msg.text);
    }
});

// --- Rasm savollar ---
bot.on("photo", (msg) => {
    const chatId = msg.chat.id;
    if (chatId.toString() !== ADMIN_ID) {
        const fileId = msg.photo[msg.photo.length - 1].file_id; // eng sifatli rasmni olish
        handleQuestion(chatId, "photo", null, fileId);
    }
});

// --- Video savollar ---
bot.on("video", (msg) => {
    const chatId = msg.chat.id;
    if (chatId.toString() !== ADMIN_ID) {
        handleQuestion(chatId, "video", null, msg.video.file_id);
    }
});

// --- Audio (voice) savollar ---
bot.on("voice", (msg) => {
    const chatId = msg.chat.id;
    if (chatId.toString() !== ADMIN_ID) {
        handleQuestion(chatId, "voice", null, msg.voice.file_id);
    }
});

// --- Document (PDF, Word va h.k.) ---
bot.on("document", (msg) => {
    const chatId = msg.chat.id;
    if (chatId.toString() !== ADMIN_ID) {
        handleQuestion(chatId, "document", null, msg.document.file_id);
    }
});

// --- Savolga javob berish ---
bot.onText(/\/answer (\d+) (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    if (chatId.toString() !== ADMIN_ID) return;

    const questionId = match[1];
    const answer = match[2];

    if (!questions[questionId]) {
        return bot.sendMessage(chatId, "❌ Bunday savol yo‘q!");
    }

    const q = questions[questionId];
    bot.sendMessage(
        q.userId,
        `💬 *Savolingizga javob keldi:*\n\n✅ ${answer}`,
        { parse_mode: "Markdown" }
    );

    questions[questionId].answered = true;
    bot.sendMessage(chatId, `✅ #${questionId} ga javob berildi!`);
});

// --- Bot ishga tushganda ---
bot.getMe().then(() => console.log("✅ Bot starting..."));
