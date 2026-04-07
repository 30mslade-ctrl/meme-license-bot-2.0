const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

// 🔧 CONFIG — EDIT THESE
const BOT_ID = '8846a62e10e090cb28b4582a19';
const OWNER_USER_ID = '122993150'; // your GroupMe user ID
const OWNER_NAME = '@Mira (Reviewer)'; // just display text

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
const TERMS = `📜 MEME STEALING LICENSE AGREEMENT (MSLA v1.5)

Before proceeding, you must review and accept the following legally-questionable terms:

1. This Meme Stealing License (MSL) grants the holder limited, non-exclusive, non-transferable meme stealing privileges for ONE specific GroupMe chat.

2. Meme theft is permitted for:
   - Personal amusement
   - Group chat distribution
   - Mild flexing purposes

3. Meme privileges are valid ONLY in the chat you specify in your application.
To use this license in another chat, you must re-apply separately for that chat.

4. Meme quality is the sole responsibility of the license holder.
Repeated posting of unfunny, outdated, or cringe memes may result in:
   - Temporary suspension
   - Permanent revocation
   - Public shaming

5. Cross-chat meme redistribution WITHOUT proper licensing is strictly prohibited.
(Yes, we WILL know.)

6. This license does NOT guarantee:
   - Originality
   - Laughs
   - Respect

7. Meme privileges may be revoked at any time for any reason.

8. By accepting, you agree to the sacred code:
"If it's funny, it's mine."

━━━━━━━━━━━━━━━━━━━━━━

This bot is coded by the reviewer. IT IS NOT AI (nobody else is seeing this info, just a joke).

If you have any questions during the interview, please use the #quit command before asking them, as asking questions may mess up the bot.

Reply with:
#accept ✅
or
#deny ❌`;

// ❓ QUESTIONS
const questions = [
  "State your full name for the Meme Registry.",
  "State your gender.",
  "State your current occupation (or \"professional memer\" if unemployed).",
  "Which GroupMe chat do you want this license for?",
  "Did you actually read the terms and conditions?",
  "Why do you believe you deserve meme stealing privileges?",
  "Describe your sense of humor in one sentence.",
  "What is your favorite type of meme to steal?",
  "On average, how many memes do you consume per day?",
  "Have you ever stolen a meme without permission before?",
  "If yes, explain. If no, explain why you are lying.",
  "How would you handle posting a meme that gets no reactions?",
  "What would you do if someone reposts YOUR stolen meme?",
  "Choose one:\nA) Quantity\nB) Quality\nC) Whatever gets laughs",
  "Rate your meme taste from 1–10.",
  "Submit your best short joke or meme idea.",
  "Final question: Are you funny? Defend your answer."
];

// 📤 SEND MESSAGE (with optional mention)
async function sendMessage(text, mention = false) {
  let data = { bot_id: BOT_ID, text: text };
  if (mention) {
    data.attachments = [{
      type: "mentions",
      loci: [[0, OWNER_NAME.length]],
      user_ids: [OWNER_USER_ID]
    }];
  }
  await axios.post('https://api.groupme.com/v3/bots/post', data);
}

// 🚀 MAIN WEBHOOK
app.post('/', async (req, res) => {
  res.sendStatus(200);

  const message = req.body.text;
  const user = req.body.sender_id;
  const username = req.body.name || "Applicant";

  if (!message) return;

  const msg = message.toLowerCase();

  // 🟢 START
  if (msg === "#start") {
    userStates[user] = "terms";
    return sendMessage(TERMS);
  }

  // #quit command
  if (msg === "#quit") {
    userStates[user] = null;
    applications[user] = null;
    return sendMessage("👋 You've exited the application process.");
  }

  // ✅ ACCEPT / ❌ DENY TERMS
  if (userStates[user] === "terms") {
    if (msg === "#accept") {
      userStates[user] = "awaiting_photo";
      return sendMessage(
        "📸 Please send your photo for your Meme License.\nRest assured, your photo is just for the license and will not be shared.\nAfter sending it, type: photo sent"
      );
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
      `${OWNER_NAME} 📥 New applicant photo submitted.\n\n📨 Sending to upper management...\nPlease wait patiently.`,
      true
    );
  }

  // 🧑‍💼 OWNER APPROVES PHOTO
  if (msg === "#reviewed") {
    for (let u in userStates) {
      if (userStates[u] === "waiting_review") {
        userStates[u] = "question_0";
        applications[u] = [];
        await sendMessage("✅ Photo approved. Beginning interview...");
        await sendMessage(questions[0]);
      }
    }
    return;
  }

  // ❓ QUESTION FLOW
  if (userStates[user] && userStates[user].startsWith("question_")) {
    let index = parseInt(userStates[user].split("_")[1]);

    // Save answer
    applications[user].push({ question: questions[index], answer: message });

    // 👀 TERMS CHECK QUESTION (index 4)
    if (index === 4) {
      const response = message.toLowerCase();
      if (/(yes|yeah|yep|of course|obviously)/.test(response)) {
        await sendMessage("👏 Good! At least someone read the fine print.");
      } else if (/(no|nah|nope|never)/.test(response)) {
        await sendMessage("😏 Hmm… we might have to send you back to reading class.");
      } else {
        await sendMessage("🤨 We'll take that as a maybe… moving on!");
      }
    }

    // 👇 YES/NO MEME STEALING QUESTION (index 9)
    if (index === 9 && !applications[user].memeCriminal) {
      const result = detectYesNo(message);
      applications[user].memeCriminal = result;
      if (result === "yes") await sendMessage("😏 Honesty detected. Respect. Proceed to explain your crimes.");
      else if (result === "no") await sendMessage("🚨 Lying detected. This has been flagged for suspicious levels of innocence.");
      else await sendMessage("🤨 That wasn't a clear yes or no... we'll keep an eye on you.");
    }

    index++;

    // Next question or special follow-up
    if (index < questions.length) {
      userStates[user] = `question_${index}`;
      // Follow-up only for the explanation question (index 10)
      if (index === 10) {
        const status = applications[user].memeCriminal;
        if (status === "yes") return sendMessage("Alright criminal, explain the situation.");
        if (status === "no") return sendMessage("Explain yourself. Why are you lying?");
      }
      return sendMessage(questions[index]);
    }

    // 🧾 FINISHED
    userStates[user] = "done";
    let summary = `📋 MEME LICENSE APPLICATION FOR ${username}\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    if (applications[user].memeCriminal === "no") summary += "🚨 FLAG: POSSIBLE LIAR DETECTED\n\n";
    applications[user].forEach((item, i) => {
      summary += `Q${i + 1}: ${item.question}\nA: ${item.answer}\n\n`;
    });
    summary += "━━━━━━━━━━━━━━━━━━━━━━\n⏳ Your application is under review.\nPlease wait 2–3 business minutes.";

    await sendMessage(summary);
    // ✅ Owner mention for new application notification
    await sendMessage(`${OWNER_NAME} 📬 New application ready for review.`, true);
    return;
  }

  // 🧑‍💼 REVIEWER APPROVE/DENY FINAL LICENSE (no mention)
  if (msg === "#approve") {
    return sendMessage(`✅ ${username}'s Meme License has been APPROVED! We are printing your license now. Please hold.`);
  }
  if (msg === "#deny") {
    return sendMessage(`❌ ${username}'s Meme License has been DENIED. Better luck next time.`);
  }
});

// 🌐 START SERVER
app.listen(process.env.PORT || 3000, () => {
  console.log("Meme License Bot is running...");
});
