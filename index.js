const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

// 🔧 CONFIG — EDIT THESE
const BOT_ID = '8846a62e10e090cb28b4582a19';
const OWNER_USER_ID = '122993150'; // your GroupMe user ID
const OWNER_NAME = '@Mira (Reviewer)'; // display text

// 🧠 MEMORY
let userStates = {};
let applications = {};

// 🧠 YES/NO DETECTOR
function detectYesNo(input) {
  const msg = input.toLowerCase();
  if (/(yes|yeah|yep|yup|of course|obviously)/.test(msg)) return "yes";
  if (/(no|nah|nope|never)/.test(msg)) return "no";
  return "unknown";
}

// 📜 TERMS & CONDITIONS
const TERMS = `📜 MEME STEALING LICENSE AGREEMENT (MSLA v1.6)

Before proceeding, you must review and accept the following legally-questionable terms:

1. This Meme Stealing License (MSL) grants the holder limited, non-exclusive, non-transferable meme stealing privileges for a specific group chat only.
2. Meme theft is permitted for:
   - Personal amusement
   - Group chat distribution
   - Mild flexing purposes
3. Meme quality is the sole responsibility of the license holder.
Repeated posting of unfunny, outdated, or cringe memes may result in:
   - Temporary suspension
   - Permanent revocation
   - Public shaming
4. Cross-chat meme redistribution WITHOUT proper licensing is strictly prohibited.
(Yes, we WILL know.)
5. This license does NOT guarantee:
   - Originality
   - Laughs
   - Respect
6. Meme privileges may be revoked at any time for any reason.
7. By accepting, you agree to the sacred code:
"If it's funny, it's mine."

💡 NOTE: If you have any questions during the interview, please use the #quit command before asking them, as it will mess up the bot.

📢 THIS IS NOT AN AI.

━━━━━━━━━━━━━━━━━━━━━━

Do you accept these terms?

Reply with:
#accept ✅
or
#deny ❌`;

// ❓ QUESTIONS
const questions = [
  "State your name.",
  "Which group chat will you be using this Meme License for?",
  "State your gender.",
  "State your current occupation (or \"professional memer\" if unemployed).",
  "Why do you believe you deserve meme stealing privileges?",
  "Describe your sense of humor in one sentence.",
  "What is your favorite type of meme to steal?",
  "On average, how many memes do you consume per day?",
  "Have you ever stolen a meme without permission before?",
  "Explain your answer above honestly.",
  "How would you handle posting a meme that gets no reactions?",
  "What would you do if someone reposts YOUR stolen meme?",
  "Choose one:\nA) Quantity\nB) Quality\nC) Whatever gets laughs",
  "Rate your meme taste from 1–10.",
  "Submit your best short joke or meme idea.",
  "Final question: Are you funny? Defend your answer."
];

// 📤 SEND MESSAGE
function sendMessage(text, mention = false) {
  let data = { bot_id: BOT_ID, text };
  if (mention) {
    data.attachments = [{
      type: "mentions",
      loci: [[0, OWNER_NAME.length]],
      user_ids: [OWNER_USER_ID]
    }];
  }
  return axios.post('https://api.groupme.com/v3/bots/post', data);
}

// 🚀 MAIN WEBHOOK
app.post('/', async (req, res) => {
  res.sendStatus(200); // ✅ important for GroupMe

  const message = req.body.text;
  const user = req.body.sender_id;
  const attachments = req.body.attachments || [];

  if (!message && attachments.length === 0) return;

  const msg = message ? message.toLowerCase() : "";
  const isOwner = user === OWNER_USER_ID;

  // 🟢 START
  if (msg === "#start") {
    userStates[user] = "terms";
    return sendMessage(TERMS);
  }

  // 🛑 QUIT COMMAND
  if (msg === "#quit") {
    userStates[user] = null;
    return sendMessage("🚪 You have exited the Meme License process. Use #start to begin again.");
  }

  // ✅ ACCEPT / ❌ DENY
  if (userStates[user] === "terms") {
    if (msg === "#accept") {
      userStates[user] = "awaiting_photo";
      return sendMessage("📸 Please send your photo for your Meme License. Your photo is only used for the license record and will not be shared anywhere.\n\nAfter sending it, type: photo sent");
    }
    if (msg === "#deny") {
      userStates[user] = null;
      return sendMessage("🚫 Okay then… why are you even here? Skedaddle.");
    }
  }

  // 📸 PHOTO STEP
  if (userStates[user] === "awaiting_photo" && msg === "photo sent") {
    userStates[user] = "waiting_review";
    return sendMessage(
      `${OWNER_NAME} 📥 New applicant photo submitted.\n📨 Sending to upper management...\nPlease wait patiently.`,
      true
    );
  }

  // 🧑‍💼 OWNER COMMANDS
  if (isOwner) {
    // APPROVE PHOTO
    if (msg === "#reviewed") {
      for (let u in userStates) {
        if (userStates[u] === "waiting_review") {
          userStates[u] = "question_0";
          applications[u] = [];
          sendMessage("✅ Photo approved. Beginning interview...");
          sendMessage(questions[0]);
        }
      }
      return;
    }

    // DENY PHOTO
    if (msg === "#deny") {
      for (let u in userStates) {
        if (userStates[u] === "waiting_review") {
          userStates[u] = null;
          sendMessage(`🚫 Photo denied for user <${u}>.`);
        }
      }
      return;
    }
  }

  // ❓ QUESTION FLOW
  if (userStates[user] && userStates[user].startsWith("question_")) {
    let index = parseInt(userStates[user].split("_")[1]);
    applications[user].push({ question: questions[index], answer: message });

    // 👇 SPECIAL YES/NO LOGIC for meme theft
    if (index === 8) { // "Have you ever stolen a meme without permission"
      const result = detectYesNo(message);
      applications[user].memeCriminal = result;

      if (result === "yes") {
        sendMessage("😏 Honesty detected. Respect.\nProceed to explain your crimes.");
      } else if (result === "no") {
        sendMessage("🚨 Lying detected.\nThis has been flagged for suspicious levels of innocence.");
      } else {
        sendMessage("🤨 That wasn't a clear yes or no... we'll keep an eye on you.");
      }
    }

    index++;

    // Next question
    if (index < questions.length) {
      userStates[user] = `question_${index}`;
      return sendMessage(questions[index]);
    }

    // 🧾 FINISHED
    userStates[user] = "done";
    let summary = "📋 MEME LICENSE APPLICATION\n━━━━━━━━━━━━━━━━━━━━━━\n\n";

    if (applications[user].memeCriminal === "no") {
      summary += "🚨 FLAG: POSSIBLE LIAR DETECTED\n\n";
    }

    applications[user].forEach((item, i) => {
      summary += `Q${i + 1}: ${item.question}\nA: ${item.answer}\n\n`;
    });

    summary += "━━━━━━━━━━━━━━━━━━━━━━\n⏳ Your application is under review.\nPlease wait 2–3 business minutes.";

    sendMessage(summary);
    return sendMessage(`${OWNER_NAME} 📬 New application ready for review.`, true);
  }
});

// 🌐 START SERVER
app.listen(process.env.PORT || 3000, () => {
  console.log("Meme License Bot is running...");
});
