// bot.js
import { Telegraf } from "telegraf";
import config from "./config.js";

const bot = new Telegraf(config.TOKEN);
const ADMIN_ID = config.ADMIN_ID;

// Savollarni vaqtincha saqlash
let questions = {};
let questionCounter = 1;

// Start
bot.start((ctx) => {
    const welcomeText = `
🤖 *Anonim Savol-Javob Bot*

Assalomu alaykum! Bu bot orqali siz anonim ravishda Suhrobga savol bera olasiz.
Siz matn, rasm, ovoz, video yoki sticker yuborishingiz mumkin — hammasi anonim qoladi ✅
  `;
    ctx.reply(welcomeText, { parse_mode: "Markdown" });
});

// Savollarni qabul qilish (matn, media)
bot.on(["text", "photo", "video", "audio", "voice", "sticker"], async (ctx) => {
    const chatId = ctx.chat.id;

    // Admin xabarlarini tashlab yuboramiz
    if (chatId.toString() === ADMIN_ID) return;

    let questionContent = "";

    if (ctx.message.text) questionContent = `📝 Matn: ${ctx.message.text}`;
    else if (ctx.message.photo) questionContent = "🖼 Rasm yuborildi";
    else if (ctx.message.video) questionContent = "🎥 Video yuborildi";
    else if (ctx.message.audio) questionContent = "🎵 Audio yuborildi";
    else if (ctx.message.voice) questionContent = "🎤 Ovozli xabar yuborildi";
    else if (ctx.message.sticker) questionContent = "😊 Sticker yuborildi";

    // Savolni saqlash
    questions[questionCounter] = {
        userId: chatId,
        message: ctx.message,
        answered: false,
        timestamp: new Date(),
    };

    // Foydalanuvchiga tasdiq
    await ctx.reply(
        `✅ Savolingiz qabul qilindi.\n\nID: #${questionCounter}\n${questionContent}`
    );

    // Adminga yuborish
    const notifyText = `🔔 Yangi savol keldi!\n\n#${questionCounter}\n${questionContent}\n\nJavob berish: /answer ${questionCounter} [javobingiz]`;
    await bot.telegram.sendMessage(ADMIN_ID, notifyText);

    // Agar fayl bo‘lsa — adminga ham forward qilamiz
    if (ctx.message.photo) {
        await bot.telegram.sendPhoto(ADMIN_ID, ctx.message.photo[0].file_id);
    } else if (ctx.message.video) {
        await bot.telegram.sendVideo(ADMIN_ID, ctx.message.video.file_id);
    } else if (ctx.message.audio) {
        await bot.telegram.sendAudio(ADMIN_ID, ctx.message.audio.file_id);
    } else if (ctx.message.voice) {
        await bot.telegram.sendVoice(ADMIN_ID, ctx.message.voice.file_id);
    } else if (ctx.message.sticker) {
        await bot.telegram.sendSticker(ADMIN_ID, ctx.message.sticker.file_id);
    }

    questionCounter++;
});

// Admin buyruqlari — savollar ro‘yxati
bot.command("questions", (ctx) => {
    if (ctx.chat.id.toString() !== ADMIN_ID)
        return ctx.reply("❌ Siz admin emassiz");

    if (Object.keys(questions).length === 0) {
        return ctx.reply("📭 Hozircha savollar yo‘q.");
    }

    let list = "📋 Savollar ro‘yxati:\n\n";
    for (let id in questions) {
        const q = questions[id];
        list += `${q.answered ? "✅" : "❌"} #${id} — ${
            q.message.text || "[media]"
        }\n`;
    }
    ctx.reply(list);
});

// Admin javob berishi
bot.command("answer", async (ctx) => {
    if (ctx.chat.id.toString() !== ADMIN_ID)
        return ctx.reply("❌ Siz admin emassiz");

    const parts = ctx.message.text.split(" ");
    const questionId = parts[1];
    const answer = parts.slice(2).join(" ");

    if (!questionId || !answer) {
        return ctx.reply("❌ To‘g‘ri format: /answer [ID] [javob]");
    }

    if (!questions[questionId]) {
        return ctx.reply("❌ Bu ID bo‘yicha savol topilmadi");
    }

    const q = questions[questionId];

    // Javobni foydalanuvchiga yuborish
    await bot.telegram.sendMessage(
        q.userId,
        `💬 Savolingizga javob keldi:\n\n❓ ${
            q.message.text || "[media]"
        }\n\n✅ Javob: ${answer}`
    );

    questions[questionId].answered = true;

    ctx.reply(`✅ #${questionId} savolga javob yuborildi.`);
});

// Xatoliklarni tutish
bot.catch((err) => {
    console.error("❌ Bot xatosi:", err);
});

// Botni ishga tushirish
bot.launch().then(() => {
    console.log("✅ Bot starting...");
});

// Graceful shutdown
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
