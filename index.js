const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

// 🔧 CONFIG
const BOT_ID = '8846a62e10e090cb28b4582a19';
const OWNER_USER_ID = '122993150';
const OWNER_NAME = '@Mira (Reviewer)';

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

// 📜 TERMS
const TERMS = `📜 MEME STEALING LICENSE AGREEMENT...

Do you accept?

#accept or #deny`;

// ❓ QUESTIONS
const questions = [
  "State your full name for the Meme Registry.",
  "State your gender.",
  "State your current occupation.",
  "Why do you deserve meme stealing privileges?",
  "Describe your humor.",
  "Favorite meme type?",
  "Memes per day?",
  "Have you ever stolen a meme without permission before?",
  "If yes, explain. If no, explain why you are lying.",
  "What if your meme flops?",
  "If someone reposts your meme?",
  "A) Quantity B) Quality C) Laughs",
  "Rate taste 1–10",
  "Best joke",
  "Are you funny?"
];

// 📤 SEND MESSAGE
function sendMessage(text, mention = false) {
  let data = {
    bot_id: BOT_ID,
    text
  };

  if (mention) {
    data.attachments = [{
      type: "mentions",
      loci: [[0, OWNER_NAME.length]],
      user_ids: [OWNER_USER_ID]
    }];
  }

  return axios.post('https://api.groupme.com/v3/bots/post', data);
}

// 🚀 WEBHOOK
app.post('/', async (req, res) => {
  res.sendStatus(200);

  const message = req.body.text;
  const user = req.body.sender_id;
  const attachments = req.body.attachments || [];

  const msg = message ? message.toLowerCase() : "";

  // 🔒 OWNER COMMANDS ONLY
  const isOwner = user === OWNER_USER_ID;

  // START
  if (msg === "#start") {
    userStates[user] = "terms";
    return sendMessage(TERMS);
  }

  // ACCEPT / DENY TERMS
  if (userStates[user] === "terms") {
    if (msg === "#accept") {
      userStates[user] = "awaiting_photo";
      return sendMessage("📸 Send a REAL image for your Meme License.");
    }

    if (msg === "#deny") {
      userStates[user] = null;
      return sendMessage("🚫 Then leave.");
    }
  }

  // 🖼️ IMAGE DETECTION
  if (userStates[user] === "awaiting_photo") {
    const hasImage = attachments.some(a => a.type === "image");

    if (hasImage) {
      userStates[user] = "waiting_review";
      applications[user] = { answers: [] };

      return sendMessage(
        `${OWNER_NAME} 📥 New applicant submitted a photo.\nAwaiting approval.`,
        true
      );
    }
  }

  // 🔒 REVIEW COMMAND
  if (msg === "#reviewed" && isOwner) {
    for (let u in userStates) {
      if (userStates[u] === "waiting_review") {
        userStates[u] = "question_0";
        sendMessage("✅ Photo approved. Starting interview...");
        sendMessage(questions[0]);
      }
    }
    return;
  }

  // ❓ QUESTIONS
  if (userStates[user]?.startsWith("question_")) {
    let index = parseInt(userStates[user].split("_")[1]);

    applications[user].answers.push({
      question: questions[index],
      answer: message
    });

    // YES/NO LOGIC
    if (index === 7) {
      const result = detectYesNo(message);
      applications[user].memeCriminal = result;

      if (result === "yes") {
        sendMessage("😏 Honesty respected. Continue.");
      } else if (result === "no") {
        sendMessage("🚨 Liar detected. Flagging.");
      } else {
        sendMessage("🤨 Suspicious answer...");
      }
    }

    index++;

    if (index < questions.length) {
      userStates[user] = `question_${index}`;

      if (index === 8) {
        const status = applications[user].memeCriminal;

        if (status === "yes") return sendMessage("Explain your crimes.");
        if (status === "no") return sendMessage("Explain your lies.");
      }

      return sendMessage(questions[index]);
    }

    // DONE
    userStates[user] = "pending_decision";

    let summary = "📋 APPLICATION\n\n";

    if (applications[user].memeCriminal === "no") {
      summary += "🚨 LIAR FLAG\n\n";
    }

    applications[user].answers.forEach((a, i) => {
      summary += `Q${i+1}: ${a.question}\nA: ${a.answer}\n\n`;
    });

    sendMessage(summary);

    return sendMessage(
      `${OWNER_NAME} ⚖️ Use #approve or #deny`,
      true
    );
  }

  // ✅ APPROVE
  if (msg === "#approve" && isOwner) {
    for (let u in userStates) {
      if (userStates[u] === "pending_decision") {
        userStates[u] = "approved";
        sendMessage("🎉 You are now a licensed meme thief. Use wisely.");
      }
    }
    return;
  }

  // ❌ DENY
  if (msg === "#deny" && isOwner) {
    for (let u in userStates) {
      if (userStates[u] === "pending_decision") {
        userStates[u] = "denied";
        sendMessage("🚫 Application denied. Try being funnier.");
      }
    }
    return;
  }
});

// SERVER
app.listen(process.env.PORT || 3000, () => {
  console.log("Bot running");
});
