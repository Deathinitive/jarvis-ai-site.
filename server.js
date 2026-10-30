const express = require("express");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

function localReply(input) {
  const raw = String(input || "").trim();
  const s = raw.toLowerCase().replace(/ё/g, "е");
  const now = new Date();
  if (!raw) return "Я не расслышал запрос. Напишите или произнесите команду ещё раз.";
  if (/^(привет|здравствуй|здравствуйте|доброе утро|добрый день|добрый вечер|хай|салют)/i.test(s))
    return "Здравствуйте. JARVIS на связи. Чем могу помочь? Сейчас доступен бесплатный режим команд.";
  if (s.includes("который час") || s.includes("сколько времени") || s === "время")
    return `Сейчас ${new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(now)}.`;
  if (s.includes("какое сегодня число") || s.includes("какая сегодня дата") || s === "дата")
    return `Сегодня ${new Intl.DateTimeFormat("ru-RU", { dateStyle: "full" }).format(now)}.`;
  if (s.includes("что ты умеешь") || s.includes("помощь") || s.includes("список команд"))
    return "В бесплатном режиме я умею приветствовать, сообщать время и дату, считать простые арифметические выражения и выполнять несколько текстовых команд. Полноценная генерация свободных ответов без ИИ-модели недоступна.";
  if (s.includes("как дела")) return "Системы работают штатно. Готов выполнить доступные команды.";
  if (s.includes("кто ты") || s.includes("твое имя") || s.includes("твоё имя"))
    return "Я JARVIS — веб-помощник в бесплатном локальном режиме. Сейчас я выполняю ограниченный набор команд без платного ИИ API.";
  if (s.startsWith("посчитай ") || s.startsWith("вычисли ") || s.startsWith("сколько будет ")) {
    const expr = raw.replace(/^(посчитай|вычисли|сколько будет)\s*/i, "").replace(/,/g, ".").replace(/[×х]/gi, "*").replace(/÷/g, "/").replace(/−/g, "-").trim();
    if (/^[\d\s()+\-*/%.]+$/.test(expr) && expr.length < 100) {
      try {
        const result = Function(`"use strict"; return (${expr})`)();
        if (typeof result === "number" && Number.isFinite(result)) return `${expr} = ${Number(result.toFixed(8))}`;
      } catch (_) {}
    }
    return "Не получилось разобрать пример. Напишите, например: «Посчитай 125 * 8».";
  }
  if (s.includes("спасибо")) return "Всегда пожалуйста. Обращайтесь.";
  if (s.includes("пока") || s.includes("до свидания")) return "До связи. JARVIS завершает текущий сеанс.";
  return "Я получил команду, но в бесплатном режиме без подключённой ИИ-модели не умею отвечать на произвольные вопросы. Скажите «что ты умеешь», чтобы увидеть доступные команды.";
}

app.post("/api/chat", (req, res) => {
  const messages = Array.isArray(req.body.messages) ? req.body.messages : [];
  const lastUser = [...messages].reverse().find(m => m && m.role === "user" && typeof m.content === "string");
  res.json({ reply: localReply(lastUser ? lastUser.content : "") });
});
app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.listen(PORT, () => console.log(`JARVIS free mode running on port ${PORT}`));
