const TelegramBot = require('node-telegram-bot-api');
const Anthropic = require('@anthropic-ai/sdk');

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const userHistories = {};

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text) return;

  if (text === '/start') {
    userHistories[chatId] = [];
    return bot.sendMessage(chatId, '👋 Salom! Men sizning shaxsiy yordamchingizman. Nimada yordam kerak?');
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
