require('dotenv').config();
const { App } = require('@slack/bolt');
const express = require('express');
const fs = require('fs');
const OpenAI = require('openai');
const cosineSimilarity = require('./utils/cosineSimilarity');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ✅ Serve static image files
const expressApp = express();
expressApp.use('/docx-images', express.static('public/docx-images'));
expressApp.listen(3000, () => {
  console.log('Static image server running on port 3000');
});

const publicBaseUrl = 'http://3.15.233.240:3000';

// ✅ Load embedded chunks
const embeddedChunks = JSON.parse(fs.readFileSync('./altitude_embedded_chunks.json', 'utf-8'));

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  logLevel: 'DEBUG'
});

const systemInstructions = `
You are **SSM GPT**, an AI coach for students in the Altitude Coaching Program. You are integrated into private Slack channels and accessed via the /ssmgpt command.
Format responses using Markdown. If the context includes images ![Image](...), include them exactly as-is.
Your mission:
- Clarify Altitude lessons, tools, and strategies
- Support students between live calls
- Reduce confusion and increase momentum

Your tone:
- Patient, kind, understanding, and supportive
- Always sound like a knowledgeable private coach helping the student take action

Your knowledge:
- ONLY use the latest content from the following Altitude documents:
  • All Altitude Module Transcripts
  • Altitude Course Slides (Modules 1–6, 7–14, Bonus)
- If there’s conflicting info, favor newer content
- NEVER make up answers — if unsure, say:
  “I want to double-check this for accuracy. Can you reach out to your SSM to confirm?”

Output format:
- Keep answers concise and actionable
- Use bullet points or steps where helpful
- If relevant, reference specific modules or terminology
- End every response with:
  “Let me know if you want to dive deeper into this or need an example!”
`;

function findRelevantChunks(queryEmbedding, topK = 5) {
  if (!queryEmbedding) {
    console.error("No query embedding received.");
    return [];
  }

  return embeddedChunks
    .map(chunk => ({
      ...chunk,
      similarity: cosineSimilarity(chunk.embedding, queryEmbedding)
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}

async function getGptReplyWithContext(prompt) {
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: prompt
  });

  const queryEmbedding = embeddingResponse.data[0].embedding;
  const topChunks = findRelevantChunks(queryEmbedding);

  const context = topChunks.map(c => `From ${c.source}:\n${c.text}`).join('\n\n');

  const finalPrompt = `You are answering a student's question using the context below.

If any of the context contains images in Markdown format (e.g., ![Image](http://...)), include them in your response exactly as they appear. Do not paraphrase or skip them.

Context:
${context}

User question: ${prompt}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: systemInstructions },
      { role: 'user', content: finalPrompt }
    ]
  });

  return response.choices[0].message.content.trim();
}

// ✅ Handle /ssmgpt slash command
app.command('/ssmgpt', async ({ command, ack, respond, client }) => {
  await ack();
  await respond("Thinking...");

  try {
    const reply = await getGptReplyWithContext(command.text);

    const finalText = reply.replace(/!\[.*?\]\((.*?)\)/g, (match, url) => {
      const fullUrl = url.replace("http://localhost:3000", publicBaseUrl);
      return `<${fullUrl}|Click here to preview image>`;
    });

    await client.chat.postMessage({
      channel: command.channel_id,
      text: reply,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: finalText
          }
        }
      ]
    });
  } catch (err) {
    console.error("Slash command error:", err);
    await client.chat.postMessage({
      channel: command.channel_id,
      text: "Something went wrong. Please try again later."
    });
  }
});

// ✅ Handle @mention events
app.event('app_mention', async ({ event, client }) => {
  const prompt = event.text.replace(/<@[^>]+>\s*/, '').trim();

  try {
    const reply = await getGptReplyWithContext(prompt);

    const finalText = reply.replace(/!\[.*?\]\((.*?)\)/g, (match, url) => {
      const fullUrl = url.replace("http://localhost:3000", publicBaseUrl);
      return `<${fullUrl}|Click here to preview image>`;
    });

    await client.chat.postMessage({
      channel: event.channel,
      text: `<@${event.user}> ${reply}`,
      thread_ts: event.thread_ts || event.ts,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: finalText
          }
        }
      ]
    });
  } catch (err) {
    console.error('Mention error:', err);
    await client.chat.postMessage({
      channel: event.channel,
      text: `<@${event.user}> Sorry, something went wrong.`,
      thread_ts: event.thread_ts || event.ts
    });
  }
});

// ✅ Start Slack bot
(async () => {
  await app.start(process.env.PORT || 3001);
  console.log('SSMGPT Slack bot is running');
})();
