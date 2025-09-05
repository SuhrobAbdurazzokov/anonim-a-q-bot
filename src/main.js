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

const ADMIN_ID = String(config.ADMIN_ID); // string qilib oldik
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

// --- /start komandasi ---
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
    const qId = questionCounter++;

    questions[qId] = {
        userId: chatId,
        type,
        content,
        fileId,
        answered: false,
        timestamp: new Date(),
    };

    console.log(`📝 Yangi ${type} savol #${qId}`);

    // Foydalanuvchiga tasdiq
    bot.sendMessage(
        chatId,
        `✅ Savolingiz qabul qilindi. Suhrob tez orada javob beradi.`
    );

    // Adminga yuborish
    if (ADMIN_ID) {
        let notify = `🔔 *Yangi ${type} savol keldi!*\n\n`;
        notify +=
            type === "text" ? `📝 Savol: ${content}` : `📎 Fayl turi: ${type}`;
        notify += `\n\nJavob berish uchun: /answer ${qId} [javob]`;

        bot.sendMessage(ADMIN_ID, notify, { parse_mode: "Markdown" });

        // Media fayllar admin uchun
        if (type === "photo")
            bot.sendPhoto(ADMIN_ID, fileId, { caption: `📷 Rasm (#${qId})` });
        if (type === "video")
            bot.sendVideo(ADMIN_ID, fileId, { caption: `🎥 Video (#${qId})` });
        if (type === "voice")
            bot.sendVoice(ADMIN_ID, fileId, { caption: `🎤 Ovoz (#${qId})` });
        if (type === "document")
            bot.sendDocument(ADMIN_ID, fileId, {
                caption: `📄 Fayl (#${qId})`,
            });
    }
}

// --- Text savollar ---
bot.on("message", (msg) => {
    const chatId = String(msg.chat.id);
    if (chatId === ADMIN_ID) return; // Adminning oddiy xabarlari saqlanmaydi

    if (msg.text && !msg.text.startsWith("/")) {
        handleQuestion(chatId, "text", msg.text);
    }
});

// --- Media savollar ---
bot.on("photo", (msg) => {
    const chatId = String(msg.chat.id);
    if (chatId !== ADMIN_ID) {
        const fileId = msg.photo[msg.photo.length - 1].file_id;
        handleQuestion(chatId, "photo", null, fileId);
    }
});

bot.on("video", (msg) => {
    const chatId = String(msg.chat.id);
    if (chatId !== ADMIN_ID) {
        handleQuestion(chatId, "video", null, msg.video.file_id);
    }
});

bot.on("voice", (msg) => {
    const chatId = String(msg.chat.id);
    if (chatId !== ADMIN_ID) {
        handleQuestion(chatId, "voice", null, msg.voice.file_id);
    }
});

bot.on("document", (msg) => {
    const chatId = String(msg.chat.id);
    if (chatId !== ADMIN_ID) {
        handleQuestion(chatId, "document", null, msg.document.file_id);
    }
});

// --- Savolga javob berish (faqat admin) ---
bot.onText(/\/answer (\d+) (.+)/, (msg, match) => {
    const chatId = String(msg.chat.id);
    if (chatId !== ADMIN_ID) return;

    const questionId = match[1];
    const answer = match[2];

    if (!questions[questionId]) {
        return bot.sendMessage(chatId, "❌ Bunday savol yo‘q!");
    }

    const q = questions[questionId];
    const questionText = q.content || "[media]";

    // Foydalanuvchiga yuborish
    bot.sendMessage(
        q.userId,
        `💬 *Savolingizga javob keldi:*\n\n❓ Savol: ${questionText}\n\n✅ Javob: ${answer}`,
        { parse_mode: "Markdown" }
    );

    // Admin tasdiq
    questions[questionId].answered = true;
    bot.sendMessage(
        chatId,
        `✅ #${questionId} ga javob foydalanuvchiga yuborildi!`
    );
});

// --- Bot ishga tushganda ---
bot.getMe().then((me) => console.log(`✅ Bot @${me.username} ishga tushdi...`));
