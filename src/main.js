// Anonim Savol-Javob Telegram Bot
// Bu bot foydalanuvchilarning anonim savollarini qabul qilib, admin orqali javob beradi

import TelegramBot from "node-telegram-bot-api";
import config from "./config.js";
// Bot tokeni - BotFather'dan olinadi
const token = config.TOKEN;

// Bot yaratish va xatolarni qayta ishlash
const bot = new TelegramBot(token, {
    polling: {
        interval: 300,
        autoStart: true,
        params: {
            timeout: 10,
        },
    },
});

// Admin ID - faqat admin javob bera oladi
const ADMIN_ID = config.ADMIN_ID;

// Xotira - ma'lumotlarni vaqtincha saqlash uchun
let questions = {}; // {questionId: {userId: number, question: string, answered: boolean}}
let questionCounter = 1;

// Bot ishga tushganda
bot.on("polling_error", (error) => {
    console.error("❌ Polling xatosi:", error.code);

    if (error.code === "EFATAL") {
        console.error("🔑 Token noto'g'ri yoki bot o'chirilgan!");
    } else if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
        console.error("🌐 Internet aloqasi muammosi. Internetni tekshiring.");
    } else if (
        error.code === "ETELEGRAM" &&
        error.response?.body?.error_code === 409
    ) {
        console.error(
            "🔄 Bot boshqa joyda ishlamoqda. Faqat bir joyda ishlatish mumkin."
        );
    }
});

// /start buyrug'i - botni ishga tushirganda
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    console.log(
        `👤 Yangi foydalanuvchi: ${chatId} (${
            msg.from.first_name || "Noma'lum"
        })`
    );

    // Botni tanitish xabari
    const welcomeText = `
🤖 *Anonim Savol-Javob Bot*

Assalomu alaykum! Bu bot orqali siz anonim ravishda savol bera olasiz.

📝 *Qanday ishlaydi:*
• Shunchaki savolingizni yozing
• Sizning ismingiz sir saqlanadi
• Admin javobni bu yerda beradi

💡 *Misollar:*
• "JavaScript qanday o'rganish kerak?"
• "Dasturlashda qayerdan boshlash kerak?"

Savolingizni yozing! 👇
    `;

    bot.sendMessage(chatId, welcomeText, { parse_mode: "Markdown" }).catch(
        (err) => console.error("❌ Xabar yuborishda xato:", err.message)
    );
});

// Admin buyruqlari
bot.onText(/\/admin/, (msg) => {
    const chatId = msg.chat.id;

    // Faqat admin ko'ra oladi
    if (chatId.toString() !== ADMIN_ID) {
        bot.sendMessage(chatId, "❌ Sizda admin huquqi yo'q!");
        return;
    }

    console.log("👨‍💻 Admin panelga kirdi");

    // Admin paneliga kirish
    const adminText = `
👨‍💻 *Admin Panel*

📊 *Mavjud buyruqlar:*
• /questions - barcha savollarni ko'rish
• /answer [ID] [javob] - savolga javob berish
• /stats - batafsil statistika

📈 *Statistika:*
• Jami savollar: ${Object.keys(questions).length}
• Javoblanmagan: ${Object.values(questions).filter((q) => !q.answered).length}
• Javoblangan: ${Object.values(questions).filter((q) => q.answered).length}
    `;

    bot.sendMessage(chatId, adminText, { parse_mode: "Markdown" }).catch(
        (err) => console.error("❌ Admin panel yuborishda xato:", err.message)
    );
});

// Batafsil statistika
bot.onText(/\/stats/, (msg) => {
    const chatId = msg.chat.id;

    if (chatId.toString() !== ADMIN_ID) {
        bot.sendMessage(chatId, "❌ Sizda admin huquqi yo'q!");
        return;
    }

    const totalQuestions = Object.keys(questions).length;
    const answeredQuestions = Object.values(questions).filter(
        (q) => q.answered
    ).length;
    const unansweredQuestions = totalQuestions - answeredQuestions;

    const statsText = `
📊 *Batafsil Statistika*

📈 *Umumiy:*
• Jami savollar: ${totalQuestions}
• Javoblangan: ${answeredQuestions}
• Javoblanmagan: ${unansweredQuestions}
• Javob foizi: ${
        totalQuestions > 0
            ? Math.round((answeredQuestions / totalQuestions) * 100)
            : 0
    }%

🎯 *Bot holati:* Faol
⏰ *Oxirgi yangilanish:* ${new Date().toLocaleString("uz-UZ")}
    `;

    bot.sendMessage(chatId, statsText, { parse_mode: "Markdown" }).catch(
        (err) => console.error("❌ Stats yuborishda xato:", err.message)
    );
});

// Barcha savollarni ko'rish (admin uchun)
bot.onText(/\/questions/, (msg) => {
    const chatId = msg.chat.id;

    if (chatId.toString() !== ADMIN_ID) {
        bot.sendMessage(chatId, "❌ Sizda admin huquqi yo'q!");
        return;
    }

    // Agar savol yo'q bo'lsa
    if (Object.keys(questions).length === 0) {
        bot.sendMessage(chatId, "📭 Hozircha savollar yo'q.").catch((err) =>
            console.error("❌ Xabar yuborishda xato:", err.message)
        );
        return;
    }

    // Barcha savollarni ko'rsatish
    let questionsList = "📋 *Barcha savollar:*\n\n";

    for (let id in questions) {
        const q = questions[id];
        const status = q.answered ? "✅" : "❌";
        const shortQuestion =
            q.question.length > 50
                ? q.question.substring(0, 50) + "..."
                : q.question;
        questionsList += `${status} *#${id}*\n📝 ${shortQuestion}\n\n`;
    }

    // Agar xabar juda uzun bo'lsa, bo'laklarga bo'lib yuborish
    if (questionsList.length > 4000) {
        const chunks = questionsList.match(/.{1,3500}/g) || [];
        chunks.forEach((chunk, index) => {
            setTimeout(() => {
                bot.sendMessage(chatId, chunk, {
                    parse_mode: "Markdown",
                }).catch((err) =>
                    console.error("❌ Xabar yuborishda xato:", err.message)
                );
            }, index * 1000);
        });
    } else {
        bot.sendMessage(chatId, questionsList, {
            parse_mode: "Markdown",
        }).catch((err) =>
            console.error("❌ Xabar yuborishda xato:", err.message)
        );
    }
});

// Savolga javob berish (admin uchun)
bot.onText(/\/answer (\d+) (.+)/, (msg, match) => {
    const chatId = msg.chat.id;

    if (chatId.toString() !== ADMIN_ID) {
        bot.sendMessage(chatId, "❌ Sizda admin huquqi yo'q!");
        return;
    }

    const questionId = match[1];
    const answer = match[2];

    // Savol mavjudligini tekshirish
    if (!questions[questionId]) {
        bot.sendMessage(chatId, "❌ Bu ID da savol topilmadi!").catch((err) =>
            console.error("❌ Xabar yuborishda xato:", err.message)
        );
        return;
    }

    const question = questions[questionId];

    // Javobni foydalanuvchiga yuborish
    const responseText = `
💬 *Savolingizga javob keldi:*

❓ *Savol:* ${question.question}

✅ *Javob:* ${answer}

📌 Yana savol bo'lsa, bemalol yozing!
    `;

    bot.sendMessage(question.userId, responseText, { parse_mode: "Markdown" })
        .then(() => {
            // Savol javoblandi deb belgilash
            questions[questionId].answered = true;

            // Adminga tasdiqlash
            bot.sendMessage(
                chatId,
                `✅ #${questionId} savoliga javob berildi!`
            ).catch((err) =>
                console.error("❌ Tasdiqlash xabarida xato:", err.message)
            );

            console.log(`✅ Savol #${questionId} ga javob berildi`);
        })
        .catch((err) => {
            console.error("❌ Javob yuborishda xato:", err.message);
            bot.sendMessage(
                chatId,
                `❌ #${questionId} savoliga javob yuborishda xato: ${err.message}`
            ).catch((err) =>
                console.error("❌ Xato xabarida xato:", err.message)
            );
        });
});

// Oddiy xabarlarni qayta ishlash (savollar)
bot.on("message", (msg) => {
    const chatId = msg.chat.id;
    const messageText = msg.text;

    // Agar buyruq bo'lsa, o'tkazib yuborish
    if (messageText && messageText.startsWith("/")) {
        return;
    }

    // Agar admin xabar yozsa, o'tkazib yuborish
    if (chatId.toString() === ADMIN_ID) {
        return;
    }

    // Agar matn bo'lmasa
    if (!messageText) {
        bot.sendMessage(
            chatId,
            "📝 Iltimos, savolingizni matn ko'rinishida yozing."
        ).catch((err) =>
            console.error("❌ Xabar yuborishda xato:", err.message)
        );
        return;
    }

    // Juda qisqa matnlarni rad etish
    if (messageText.length < 5) {
        bot.sendMessage(chatId, "❌ Savol juda qisqa. Batafsil yozing.").catch(
            (err) => console.error("❌ Xabar yuborishda xato:", err.message)
        );
        return;
    }

    // Yangi savol qo'shish
    questions[questionCounter] = {
        userId: chatId,
        question: messageText,
        answered: false,
        timestamp: new Date(),
    };

    console.log(
        `📝 Yangi savol #${questionCounter}: ${messageText.substring(0, 50)}...`
    );

    // Foydalanuvchiga tasdiq
    bot.sendMessage(
        chatId,
        `
✅ *Savolingiz qabul qilindi!*

📝 *Savolingiz:* ${messageText}

⏳ Admin tez orada javob beradi. Kuting...
    `,
        { parse_mode: "Markdown" }
    ).catch((err) => console.error("❌ Tasdiq xabarida xato:", err.message));

    // Adminga bildirishnoma
    if (ADMIN_ID) {
        const notificationText = `
🔔 *Yangi savol keldi!*


📝 *Savol:* ${messageText}

Javob berish uchun: \`/answer ${questionCounter} [javobingiz]\`
        `;

        bot.sendMessage(ADMIN_ID, notificationText, {
            parse_mode: "Markdown",
        }).catch((err) =>
            console.error("❌ Admin bildirishnomasida xato:", err.message)
        );
    }

    questionCounter++;
});

// Umumiy xato holatlarini qayta ishlash
bot.on("error", (error) => {
    console.error("❌ Bot xatosi:", error.message);
});

// Jarayonni to'xtatganda
process.on("SIGINT", () => {
    console.log("\n👋 Bot to'xtatilmoqda...");
    bot.stopPolling();
    process.exit(0);
});

// Bot muvaffaqiyatli ishga tushganda
bot.getMe()
    .then((botInfo) => {
        console.log("✅ Bot muvaffaqiyatli ishga tushdi!");
        console.log(`🤖 Bot nomi: @${botInfo.username}`);
        console.log(`👨‍💻 Admin ID: ${ADMIN_ID}`);
        console.log("📡 Xabarlar kutilmoqda...");
    })
    .catch((error) => {
        console.error("❌ Bot ma'lumotlarini olishda xato:", error.message);
        if (error.message.includes("401")) {
            console.error(
                "🔑 Token noto'g'ri! BotFather dan yangi token oling."
            );
        }
    });
