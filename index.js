const TelegramBot = require('node-telegram-bot-api');
const Anthropic = require('@anthropic-ai/sdk');

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const userHistories = {};
const userTodos = {};

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text) return;

  // Vazifalar ro'yxati buyruqlari
  if (text === '/todos') {
    const todos = userTodos[chatId] || [];
    if (todos.length === 0) {
      return bot.sendMessage(chatId, '📝 Vazifalar ro\'yxati bo\'sh.\n\nQo\'shish uchun: "vazifa qo\'sh: [vazifa nomi]"');
    }
    const list = todos.map((t, i) => `${t.done ? '✅' : '⬜'} ${i + 1}. ${t.text}`).join('\n');
    return bot.sendMessage(chatId, `📝 *Vazifalarim:*\n\n${list}`, { parse_mode: 'Markdown' });
  }

  if (text.toLowerCase().startsWith('vazifa qo\'sh:') || text.toLowerCase().startsWith('vazifa qosh:')) {
    const taskText = text.split(':').slice(1).join(':').trim();
    if (!userTodos[chatId]) userTodos[chatId] = [];
    userTodos[chatId].push({ text: taskText, done: false });
    return bot.sendMessage(chatId, `✅ Vazifa qo'shildi: "${taskText}"\n\nBarcha vazifalar: /todos`);
  }

  if (text.toLowerCase().startsWith('bajarildi:')) {
    const num = parseInt(text.split(':')[1].trim()) - 1;
    if (userTodos[chatId] && userTodos[chatId][num]) {
      userTodos[chatId][num].done = true;
      return bot.sendMessage(chatId, `✅ "${userTodos[chatId][num].text}" bajarildi!`);
    }
    return bot.sendMessage(chatId, '❌ Bunday vazifa topilmadi.');
  }

  if (text.toLowerCase().startsWith("o'chir:") || text.toLowerCase().startsWith("ochir:")) {
    const num = parseInt(text.split(':')[1].trim()) - 1;
    if (userTodos[chatId] && userTodos[chatId][num]) {
      const removed = userTodos[chatId].splice(num, 1);
      return bot.sendMessage(chatId, `🗑 "${removed[0].text}" o'chirildi.`);
    }
    return bot.sendMessage(chatId, '❌ Bunday vazifa topilmadi.');
  }

  if (text === '/start') {
    userHistories[chatId] = [];
    return bot.sendMessage(chatId, `👋 Salom! Men sizning shaxsiy yordamchingizman!

📝 *Vazifalar ro'yxati:*
- /todos — vazifalarni ko'rish
- vazifa qo'sh: [vazifa] — vazifa qo'shish
- bajarildi: [raqam] — bajarilgan deb belgilash
- o'chir: [raqam] — o'chirish

💬 Yoki shunchaki menga xabar yozing!`, { parse_mode: 'Markdown' });
  }

  if (!userHistories[chatId]) userHistories[chatId] = [];
  userHistories[chatId].push({ role: 'user', content: text });

  try {
    bot.sendChatAction(chatId, 'typing');
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: 'Siz mehribon va aqlli shaxsiy yordamchisiz. Foydalanuvchiga har qanday masalada yordam bering. O\'zbek tilida javob bering.',
      messages: userHistories[chatId],
    });
    const reply = response.content[0].text;
    userHistories[chatId].push({ role: 'assistant', content: reply });
    bot.sendMessage(chatId, reply);
  } catch (err) {
    console.error(err);
    bot.sendMessage(chatId, '❌ Xatolik yuz berdi. Iltimos qayta urinib ko\'ring.');
  }
});

console.log('Bot ishga tushdi!');
