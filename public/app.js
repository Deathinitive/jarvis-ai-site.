const $ = (id) => document.getElementById(id);
const messagesEl = $("messages"), promptEl = $("prompt"), form = $("chatForm");
let history = [];
let busy = false;
let recognition = null;

function clockTick() {
  $("clock").textContent = new Intl.DateTimeFormat("ru-RU", {hour:"2-digit",minute:"2-digit",second:"2-digit"}).format(new Date());
}
clockTick(); setInterval(clockTick, 1000);

function setStatus(text) { $("statusText").textContent = text; }
function escapeText(text) { return String(text).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function addMessage(role, text) {
  const wrap = document.createElement("div");
  wrap.className = `message ${role}`;
  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = role === "assistant" ? "J" : "Вы";
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  const sender = document.createElement("span");
  sender.className = "sender";
  sender.innerHTML = role === "assistant" ? "JARVIS <small>AI CORE</small>" : "ВЫ <small>СЕЙЧАС</small>";
  const p = document.createElement("p");
  p.textContent = text;
  bubble.append(sender, p); wrap.append(avatar, bubble); messagesEl.append(wrap);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return p;
}
function say(text) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "ru-RU"; utter.rate = 1; utter.pitch = 0.88;
  const voices = window.speechSynthesis.getVoices();
  const ru = voices.find(v => v.lang.toLowerCase().startsWith("ru"));
  if (ru) utter.voice = ru;
  window.speechSynthesis.speak(utter);
}
async function sendMessage(text) {
  text = text.trim();
  if (!text || busy) return;
  busy = true; $("sendBtn").disabled = true; $("notice").classList.remove("error");
  addMessage("user", text); history.push({role:"user", content:text});
  promptEl.value = ""; promptEl.style.height = "auto"; setStatus("ОБРАБОТКА ЗАПРОСА");
  const answerEl = addMessage("assistant", "Анализирую запрос…");
  try {
    const response = await fetch("/api/chat", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({messages:history})
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Ошибка сервера (${response.status})`);
    const reply = data.reply || "Ответ не получен.";
    answerEl.textContent = reply; history.push({role:"assistant", content:reply});
    $("notice").textContent = "Бесплатный режим команд активен. Внешний ИИ API не используется.";
    say(reply);
  } catch (err) {
    const msg = err.message || "Не удалось связаться с сервером.";
    answerEl.textContent = msg;
    $("notice").textContent = msg; $("notice").classList.add("error");
  } finally {
    busy = false; $("sendBtn").disabled = false; setStatus("СИСТЕМА ГОТОВА"); promptEl.focus();
  }
}
form.addEventListener("submit", e => { e.preventDefault(); sendMessage(promptEl.value); });
promptEl.addEventListener("input", () => { promptEl.style.height = "auto"; promptEl.style.height = Math.min(promptEl.scrollHeight, 130) + "px"; });
promptEl.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); } });
document.querySelectorAll("[data-prompt]").forEach(btn => btn.addEventListener("click", () => sendMessage(btn.dataset.prompt)));
$("clearBtn").addEventListener("click", () => {
  history = []; messagesEl.innerHTML = "";
  addMessage("assistant", "Диалог очищен. Я готов к следующему запросу.");
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
});
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
  recognition = new SpeechRecognition(); recognition.lang = "ru-RU"; recognition.interimResults = false;
  recognition.onstart = () => { $("micBtn").classList.add("listening"); setStatus("СЛУШАЮ"); };
  recognition.onend = () => { $("micBtn").classList.remove("listening"); setStatus("СИСТЕМА ГОТОВА"); };
  recognition.onerror = () => { $("notice").textContent = "Голосовой ввод недоступен. Проверь разрешение микрофона или введи текст."; };
  recognition.onresult = e => { promptEl.value = e.results[0][0].transcript; form.requestSubmit(); };
  $("micBtn").addEventListener("click", () => { try { recognition.start(); } catch (_) { recognition.stop(); } });
} else {
  $("micBtn").addEventListener("click", () => { $("notice").textContent = "Этот браузер не поддерживает распознавание речи. Попробуй Chrome и разреши микрофон."; });
}
