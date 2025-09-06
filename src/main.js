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

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
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
                    ["👨‍💻 About Suhrob", "📲📞 Contacts"],
                    ["📝 Send Feedback"],
                ],
                resize_keyboard: true,
                one_time_keyboard: false,
            },
        }
    );
});

bot.on("message", (msg) => {
    const chatId = String(msg.chat.id);
    const text = msg.text;

    if (chatId === ADMIN_ID) return;

    if (text === "👨‍💻 About Suhrob") {
        bot.sendMessage(
            chatId,
            `👨‍💻 *About Suhrob*\n\nAssalomu alaykum! Men Suhrob Abdurazzoqov, Software Engineer (Backend, NodeJS). Maqsadlarim O'zbekistonda sifatli IT auditoriyani rivojlantirish va yoshlarni qo'llab-quvvatlash.\n\n Biz yutamiz bolalar!`,
            { parse_mode: "Markdown" }
        );
        return;
    }

    if (text === "📲📞 Contacts") {
        bot.sendMessage(chatId, "📇 *Contacts:* ", {
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: "Telegram",
                            url: "https://t.me/abdurazzokovswe",
                        },
                        {
                            text: "Github",
                            url: "https://github.com/SuhrobAbdurazzokov",
                        },
                    ],
                    [
                        {
                            text: "LinkedIn",
                            url: "https://www.linkedin.com/in/suhrob-abdurazzokov-437059376",
                        },
                        {
                            text: "Email: ssuhrobabdurazzoqov@gmail.com",
                            callback_data: "email_info",
                        },
                    ],
                ],
            },
        });
    }

    if (text === "📝 Send Feedback") {
        bot.sendMessage(
            chatId,
            "📝 Iltimos, o'z fikringizni yozing. Sizning fikringiz Suhrobga anonim tarzda yetkaziladi."
        );

        bot.once("message", (msg) => {
            if (!msg.text) return;
            const userFeedback = msg.text;
            const fId = feedbackCounter++;
            feedbacks[fId] = {
                userId: chatId,
                content: userFeedback,
                answered: false,
                timestamp: new Date(),
            };

            bot.sendMessage(
                chatId,
                "✅ Fikringiz qabul qilindi. E'tiboringiz uchun rahmat!"
            );
            bot.sendMessage(
                ADMIN_ID,
                `💬 *Yangi Feedback keldi (#${fId}):*\n\n${userFeedback}\n\nJavob uchun: /f ${fId} [xabar]`,
                { parse_mode: "Markdown" }
            );
        });
        return;
    }

    if (text && !text.startsWith("/")) {
        handleQuestion(chatId, "text", text);
    }
});

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
        let notify = `🔔 *Yangi savol keldi!*\n\n`;
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
        `💬 *Savolingizga javob keldi:*\n\n✅ Suhrobning sizga yozgan javobi: \n${answer}`,
        { parse_mode: "Markdown" }
    );

    questions[questionId].answered = true;
    bot.sendMessage(chatId, `✅ Javob foydalanuvchiga yuborildi!`);
});

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
        `💬 *Feedbackingizga javob keldi:*\n\n✅ Suhrobning feedbackingizga javobi: \n${answer}`,
        { parse_mode: "Markdown" }
    );

    feedbacks[fId].answered = true;
    bot.sendMessage(chatId, `✅ Javob foydalanuvchiga yuborildi!`);
});

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

bot.getMe().then(() => console.log(`✅ Bot running...`));
