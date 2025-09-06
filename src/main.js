import TelegramBot from "node-telegram-bot-api";
import config from "./config.js";

const bot = new TelegramBot(config.TOKEN, {
    polling: {
        interval: 300,
        autoStart: true,
        params: { timeout: 10 },
    },
});

const ADMIN_ID = String(config.ADMIN_ID);
let questions = {};
let questionCounter = 1;
let feedbacks = {};
let feedbackCounter = 1;

// Foydalanuvchi holatlarini saqlash uchun
let userStates = {};

// Polling xatoliklari
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

// /start komandasi
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;

    // Foydalanuvchi holatini reset qilish
    userStates[chatId] = null;

    bot.sendMessage(
        chatId,
        `🤖 *Anonim Savol-Javob Bot*

Siz matn, rasm, audio yoki video ko'rinishida savol bera olasiz.
Ismingiz va ma'lumotlaringiz *anonim saqlanadi*.

📝 Savolingizni yuboring, Suhrob tez orada javob beradi.`,
        {
            parse_mode: "Markdown",
            reply_markup: {
                keyboard: [
                    ["👨‍💻 About Suhrob", "📲 Contacts"],
                    ["📝 Send Feedback"],
                ],
                resize_keyboard: true,
                one_time_keyboard: false,
            },
        }
    );
});

// Foydalanuvchi xabarlarini qabul qilish
bot.on("message", (msg) => {
    const chatId = String(msg.chat.id);
    const text = msg.text;

    if (chatId === ADMIN_ID) return;

    // Agar foydalanuvchi feedback kutayotgan holatda bo'lsa
    if (userStates[chatId] === "waiting_feedback") {
        if (!text) {
            bot.sendMessage(
                chatId,
                "❌ Iltimos, faqat matn ko'rinishida feedback yuboring."
            );
            return;
        }

        const fId = feedbackCounter++;
        feedbacks[fId] = {
            userId: chatId,
            content: text,
            answered: false,
            timestamp: new Date(),
        };

        bot.sendMessage(
            chatId,
            "✅ Fikringiz qabul qilindi. E'tiboringiz uchun rahmat!"
        );

        bot.sendMessage(
            ADMIN_ID,
            `💬 *Yangi Feedback keldi (#${fId}):*\n\n${text}\n\nJavob uchun: /f ${fId} [xabar]`,
            { parse_mode: "Markdown" }
        );

        // Holatni reset qilish
        userStates[chatId] = null;
        return;
    }

    // Feedback bo'lsa
    if (text === "📝 Send Feedback") {
        bot.sendMessage(
            chatId,
            "📝 Iltimos, o'z fikringizni yozing. Sizning fikringiz Suhrobga anonim tarzda yetkaziladi."
        );

        // Foydalanuvchi holatini o'rnatish
        userStates[chatId] = "waiting_feedback";
        return;
    }

    // About Suhrob
    if (text === "👨‍💻 About Suhrob") {
        userStates[chatId] = null; // Holatni reset qilish
        bot.sendMessage(
            chatId,
            `👨‍💻 *About Suhrob*\n\nAssalomu alaykum! Men Suhrob Abdurazzoqov, Software Engineer (Backend, NodeJS). Maqsadlarim O'zbekistonda sifatli IT auditoriyani rivojlantirish va yoshlarni qo'llab-quvvatlash.\n\nBiz yutamiz bolalar!`,
            { parse_mode: "Markdown" }
        );
        return;
    }

    // Contacts
    if (text === "📲 Contacts") {
        userStates[chatId] = null; // Holatni reset qilish
        bot.sendMessage(chatId, "📇 *Contacts:* ", {
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: "👤 Telegram Profile",
                            url: "https://t.me/suhrobswe",
                        },
                        {
                            text: "💬 Telegram Channel",
                            url: "https://t.me/abdurazzokovswe",
                        },
                    ],
                    [
                        {
                            text: "💻 Github",
                            url: "https://github.com/SuhrobAbdurazzokov",
                        },
                        {
                            text: "🔗 LinkedIn",
                            url: "https://www.linkedin.com/in/suhrob-abdurazzokov-437059376",
                        },
                    ],
                ],
            },
        });
        return;
    }

    // Oddiy savol bo'lsa
    if (text && !text.startsWith("/")) {
        userStates[chatId] = null; // Holatni reset qilish
        handleQuestion(chatId, "text", text);
    }
});

// Savolni saqlash va admin ga yuborish
function handleQuestion(chatId, type, content, fileId = null) {
    const qId = questionCounter;
    questionCounter++;
    if (questionCounter > 15) questionCounter = 1;

    questions[qId] = {
        userId: chatId,
        type,
        content,
        fileId,
        answered: false,
        timestamp: new Date(),
    };

    bot.sendMessage(
        chatId,
        `✅ Savolingiz qabul qilindi. Suhrob tez orada javob beradi.`
    );

    if (ADMIN_ID) {
        let notify = `🔔 *Yangi savol keldi (#${qId})!*\n\n`;
        notify +=
            type === "text" ? `📝 Savol: ${content}` : `📎 Fayl turi: ${type}`;
        notify += `\n\nJavob uchun: /a ${qId} [xabaringiz]`;

        bot.sendMessage(ADMIN_ID, notify, { parse_mode: "Markdown" });

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

// Admin javob berish
bot.onText(/\/a (\d+) (.+)/, (msg, match) => {
    const chatId = String(msg.chat.id);
    if (chatId !== ADMIN_ID) return;

    const questionId = match[1];
    const answer = match[2];

    if (!questions[questionId])
        return bot.sendMessage(chatId, "❌ Bunday savol yo'q!");

    const q = questions[questionId];
    bot.sendMessage(
        q.userId,
        `💬 *Savolingizga javob keldi:*\n\n✅ Suhrobning sizga yozgan javobi:\n${answer}`,
        { parse_mode: "Markdown" }
    );

    questions[questionId].answered = true;
    bot.sendMessage(chatId, `✅ Javob foydalanuvchiga yuborildi!`);
});

// Admin feedback javob berish
bot.onText(/\/f (\d+) (.+)/, (msg, match) => {
    const chatId = String(msg.chat.id);
    if (chatId !== ADMIN_ID) return;

    const fId = match[1];
    const answer = match[2];

    if (!feedbacks[fId])
        return bot.sendMessage(chatId, "❌ Bunday feedback yo'q!");

    const f = feedbacks[fId];
    bot.sendMessage(
        f.userId,
        `💬 *Feedbackingizga javob keldi:*\n\n✅ Suhrobning feedbackingizga javobi:\n${answer}`,
        { parse_mode: "Markdown" }
    );

    feedbacks[fId].answered = true;
    bot.sendMessage(chatId, `✅ Javob foydalanuvchiga yuborildi!`);
});

// Fayllar (photo, video, voice, document)
bot.on("photo", (msg) => {
    const chatId = String(msg.chat.id);
    if (chatId !== ADMIN_ID) {
        // Agar feedback kutayotgan holatda bo'lsa, rasm qabul qilmaymiz
        if (userStates[chatId] === "waiting_feedback") {
            bot.sendMessage(chatId, "❌ Feedback uchun faqat matn yuboring.");
            return;
        }

        userStates[chatId] = null; // Holatni reset qilish
        const fileId = msg.photo[msg.photo.length - 1].file_id;
        handleQuestion(chatId, "photo", null, fileId);
    }
});

bot.on("video", (msg) => {
    const chatId = String(msg.chat.id);
    if (chatId !== ADMIN_ID) {
        // Agar feedback kutayotgan holatda bo'lsa, video qabul qilmaymiz
        if (userStates[chatId] === "waiting_feedback") {
            bot.sendMessage(chatId, "❌ Feedback uchun faqat matn yuboring.");
            return;
        }

        userStates[chatId] = null; // Holatni reset qilish
        handleQuestion(chatId, "video", null, msg.video.file_id);
    }
});

bot.on("voice", (msg) => {
    const chatId = String(msg.chat.id);
    if (chatId !== ADMIN_ID) {
        // Agar feedback kutayotgan holatda bo'lsa, ovoz qabul qilmaymiz
        if (userStates[chatId] === "waiting_feedback") {
            bot.sendMessage(chatId, "❌ Feedback uchun faqat matn yuboring.");
            return;
        }

        userStates[chatId] = null; // Holatni reset qilish
        handleQuestion(chatId, "voice", null, msg.voice.file_id);
    }
});

bot.on("document", (msg) => {
    const chatId = String(msg.chat.id);
    if (chatId !== ADMIN_ID) {
        // Agar feedback kutayotgan holatda bo'lsa, fayl qabul qilmaymiz
        if (userStates[chatId] === "waiting_feedback") {
            bot.sendMessage(chatId, "❌ Feedback uchun faqat matn yuboring.");
            return;
        }

        userStates[chatId] = null; // Holatni reset qilish
        handleQuestion(chatId, "document", null, msg.document.file_id);
    }
});

// Bot ishga tushdi
bot.getMe().then(() => console.log(`✅ Bot running...`));
