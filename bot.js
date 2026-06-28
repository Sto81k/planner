import TelegramBot from 'node-telegram-bot-api';
import cron from 'node-cron';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import Event from './models/Event.js';
import Task from './models/Task.js';
import Goal from './models/Goal.js';
import User from './models/User.js';

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.warn("⚠️ TELEGRAM_BOT_TOKEN не знайдено. Бот не запущено.");
} else {
  const bot = new TelegramBot(token, { polling: true });
  console.log("🤖 Telegram-бот успішно запущено (Інтерактивний Мультикористувацький режим)!");

  const keyboard = {
    reply_markup: {
      keyboard: [
        [{ text: "📅 Розклад на сьогодні" }, { text: "📆 Розклад на тиждень" }],
        [{ text: "📊 Моя статистика" }]
      ],
      resize_keyboard: true
    }
  };

  const sessions = {};

  // Допоміжна функція для форматування часу (Початок - Кінець)
  const formatTimeRange = (startHour, duration) => {
    const start = Number(startHour) || 0;
    const dur = Number(duration) || 1;
    
    // Початок
    const startH = Math.floor(start);
    const startM = Math.round((start % 1) * 60);
    
    // Кінець
    const end = start + dur;
    const endH = Math.floor(end);
    const endM = Math.round((end % 1) * 60);
    
    return `${startH.toString().padStart(2, '0')}:${startM.toString().padStart(2, '0')} - ${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
  };

  // ==========================================
  // 1. СТАРТ ТА ПОЧАТОК ДІАЛОГУ АВТОРИЗАЦІЇ
  // ==========================================
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id.toString();
    
    try {
      const existingUser = await User.findOne({ telegramChatId: chatId });
      
      if (existingUser) {
        return bot.sendMessage(
          chatId, 
          `👋 Привіт знову, ${existingUser.name}! Твій акаунт вже підключено.`, 
          keyboard
        );
      }

      sessions[chatId] = { step: 'EMAIL' }; 
      
      bot.sendMessage(
        chatId, 
        `👋 Привіт! Я твій персональний планувальник.\n\n` +
        `Щоб я міг надсилати твої задачі та нагадування, потрібно підключити акаунт.\n\n` +
        `📧 Будь ласка, напиши мені свій **Email**:`,
        { parse_mode: 'Markdown' }
      );
    } catch (err) {
      console.error(err);
    }
  });

  // ==========================================
  // 2. ОБРОБКА ВСІХ ПОВІДОМЛЕНЬ
  // ==========================================
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id.toString();
    const text = msg.text;

    if (!text || text.startsWith('/')) return;

    if (sessions[chatId]) {
      const session = sessions[chatId];

      if (session.step === 'EMAIL') {
        session.email = text.toLowerCase().trim();
        session.step = 'PASSWORD';
        return bot.sendMessage(chatId, `🔒 Дякую! Тепер напиши свій **Пароль**:`, { parse_mode: 'Markdown' });
      }

      if (session.step === 'PASSWORD') {
        const password = text;
        const email = session.email;

        try {
          const user = await User.findOne({ email });
          if (!user) {
            delete sessions[chatId]; 
            return bot.sendMessage(chatId, "❌ Користувача з таким email не знайдено. Натисни /start, щоб спробувати знову.");
          }

          const isMatch = await bcrypt.compare(password, user.password);
          if (!isMatch) {
            return bot.sendMessage(chatId, "❌ Невірний пароль. Спробуй написати пароль ще раз:");
          }

          user.telegramChatId = chatId;
          await user.save();
          delete sessions[chatId]; 

          bot.sendMessage(
            chatId, 
            `✅ Авторизація успішна, ${user.name}!\nТепер ти отримуватимеш персональні нагадування.`, 
            keyboard
          );
          
          try { bot.deleteMessage(chatId, msg.message_id); } catch(e) {}
          return;

        } catch (err) {
          console.error(err);
          delete sessions[chatId];
          return bot.sendMessage(chatId, "❌ Сталася помилка на сервері. Натисни /start, щоб спробувати пізніше.");
        }
      }
    }

    const user = await User.findOne({ telegramChatId: chatId });
    if (!user) {
      return bot.sendMessage(chatId, "⚠️ Ти не авторизований. Натисни /start, щоб увійти в акаунт.");
    }

    const kyivTime = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Kyiv" }));
    const todayStr = kyivTime.getFullYear() + '-' + 
                     String(kyivTime.getMonth() + 1).padStart(2, '0') + '-' + 
                     String(kyivTime.getDate()).padStart(2, '0');

    // --- Розклад на сьогодні ---
    if (text === "📅 Розклад на сьогодні") {
      try {
        const events = await Event.find({ userId: user._id, date: todayStr }).sort({ startHour: 1 });
        if (events.length === 0) return bot.sendMessage(chatId, "🎉 На сьогодні вільно!");

        let response = `📅 *Твій розклад на сьогодні:*\n\n`;
        events.forEach(ev => {
          const status = ev.completed ? "✅" : "⏳";
          if (ev.isAllDay) {
            response += `${status} *Весь день*: ${ev.title}\n`;
          } else {
            // Використовуємо нову функцію для форматування проміжку
            const timeStr = formatTimeRange(ev.startHour, ev.duration);
            response += `${status} *${timeStr}* — ${ev.title}\n`;
          }
        });
        bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
      } catch (err) { bot.sendMessage(chatId, "❌ Помилка завантаження."); }
    }

    // --- Розклад на тиждень ---
    if (text === "📆 Розклад на тиждень") {
      try {
        const nextWeek = new Date(kyivTime);
        nextWeek.setDate(nextWeek.getDate() + 7);
        const nextWeekStr = nextWeek.toISOString().split('T')[0];

        const events = await Event.find({ 
          userId: user._id, 
          date: { $gte: todayStr, $lte: nextWeekStr } 
        }).sort({ date: 1, startHour: 1 });

        if (events.length === 0) return bot.sendMessage(chatId, "🎉 На найближчі 7 днів усе вільно!");

        let response = `📆 *Твій план на тиждень:*\n\n`;
        let currentDate = "";

        events.forEach(ev => {
          if (ev.date !== currentDate) {
            response += `\n🗓 *${ev.date}*\n`;
            currentDate = ev.date;
          }
          // Використовуємо нову функцію для форматування проміжку
          const timeStr = ev.isAllDay ? "Весь день" : formatTimeRange(ev.startHour, ev.duration);
          response += `  • ${ev.completed ? '✅' : '⏳'} [${timeStr}] ${ev.title}\n`;
        });
        bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
      } catch (err) { bot.sendMessage(chatId, "❌ Помилка завантаження."); }
    }

    // --- Статистика ---
    if (text === "📊 Моя статистика") {
      try {
        const tasks = await Task.countDocuments({ userId: user._id });
        const compTasks = await Task.countDocuments({ userId: user._id, completed: true });
        const activeGoals = await Goal.countDocuments({ userId: user._id, completed: false });

        const response = `📊 *${user.name}, твоя статистика:*\n\n` +
                         `✅ Задач виконано: *${compTasks}* з *${tasks}*\n` +
                         `🎯 Активних цілей: *${activeGoals}*`;
        bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
      } catch (err) { bot.sendMessage(chatId, "❌ Помилка."); }
    }
  });

  // ==========================================================
  // 3. КРОН-ДЖОБ (Нагадування за 30 хв)
  // ==========================================================
  cron.schedule('* * * * *', async () => {
    const kyivTime = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Kyiv" }));
    const todayStr = kyivTime.getFullYear() + '-' + String(kyivTime.getMonth() + 1).padStart(2, '0') + '-' + String(kyivTime.getDate()).padStart(2, '0');
    
    const targetTime = new Date(kyivTime.getTime() + 30 * 60 * 1000);
    const targetHour = targetTime.getHours();
    const targetMinute = targetTime.getMinutes();

    try {
      const linkedUsers = await User.find({ telegramChatId: { $ne: null } });

      for (const user of linkedUsers) {
        const upcomingEvents = await Event.find({ 
          userId: user._id, 
          date: todayStr, 
          isAllDay: false,
          completed: false 
        });

        upcomingEvents.forEach(ev => {
          const evHour = Math.floor(ev.startHour);
          const evMin = Math.round((ev.startHour % 1) * 60);

          if (evHour === targetHour && evMin === targetMinute) {
            const timeStr = `${evHour.toString().padStart(2, '0')}:${evMin.toString().padStart(2, '0')}`;
            bot.sendMessage(
              user.telegramChatId,
              `🔔 *Нагадування!*\n\nПодія "${ev.title}" розпочнеться через 30 хвилин (о ${timeStr}).`,
              { parse_mode: 'Markdown' }
            );
          }
        });
      }
    } catch (error) { console.error("Помилка крона:", error); }
  });
}