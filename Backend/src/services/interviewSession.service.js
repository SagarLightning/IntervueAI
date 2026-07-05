const { GoogleGenAI, Type } = require("@google/genai");
const https = require("https");
const fetch = require("node-fetch");

const agent = new https.Agent({ family: 4 });

// Initialize the Google Gen AI client correctly
const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GENAI_API_KEY,
  httpOptions: {
    fetch: (url, init) => fetch(url, { ...init, agent }),
  },
});

// Retry wrapper for transient network errors (ECONNRESET, fetch failed)
async function withRetry(fn, retries = 3, delayMs = 1500) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isNetworkError = err?.cause?.code === "ECONNRESET" || err?.message?.includes("fetch failed");
      if (isNetworkError && attempt < retries) {
        console.warn(`[AI] Network error on attempt ${attempt}/${retries}, retrying in ${delayMs * attempt}ms...`);
        await new Promise(r => setTimeout(r, delayMs * attempt));
      } else {
        throw err;
      }
    }
  }
}
const MODEL_NAME = "gemini-2.5-flash";

// ─── 1. Generate opening questions for a round ────────────────────────────────
async function generateQuestions({ report, round, difficulty, company, role }) {
  const prompt = `
You are a senior interviewer at ${company || "a top tech company"} hiring for the role: ${role || report.title}.

Here is the candidate's resume summary:
${report.resume}

Here is the job description:
${report.jobDescription}

Skill gaps identified:
${report.skillGaps?.map(g => `${g.skill} (${g.severity})`).join(", ") || "none"}

Generate 5 ${difficulty} difficulty ${round} interview questions tailored to this candidate and role.

Rules:
- For "behavioral": situational and STAR-format questions based on their experience.
- For "technical": deep concept questions targeting their skill gaps and the JD tech stack.
- For "coding": 2 algorithmic problems (easy/medium/hard based on difficulty) relevant to the role.
`;

  const response = await withRetry(() => ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            index: { type: Type.INTEGER },
            question: { type: Type.STRING },
            round: { type: Type.STRING },
          },
          required: ["index", "question", "round"],
        },
      },
    },
  }));

  return JSON.parse(response.text);
}

// ─── 2. Evaluate a candidate's answer (scores each answer)─────────────────────────────────────────
async function evaluateAnswer({ question, answer, round, difficulty, report }) {
  const prompt = `
You are a strict but fair interviewer evaluating a candidate's answer.

Role context: ${report.title}
Round: ${round}
Difficulty: ${difficulty}

Question:
"${question}"

Candidate's Answer:
"${answer}"

Evaluate the answer on a scale of 0–10. Be specific.
`;

  const response = await withRetry(() => ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.INTEGER },
          feedback: { type: Type.STRING },
          shouldFollowUp: { type: Type.BOOLEAN },
        },
        required: ["score", "feedback", "shouldFollowUp"],
      },
    },
  }));

  return JSON.parse(response.text);
}

// ─── 3. Generate a follow-up question based on the answer ─────────────────────
async function generateFollowUp({ question, answer, round, report }) {
  const prompt = `
You are a senior interviewer conducting a ${round} interview for: ${report.title}.

The candidate was asked:
"${question}"

They answered:
"${answer}"

Generate ONE sharp follow-up question that probes deeper into their answer or challenges a weak point.
`;

  const response = await withRetry(() => ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          followUpQuestion: { type: Type.STRING },
        },
        required: ["followUpQuestion"],
      },
    },
  }));

  return JSON.parse(response.text);
}

// ─── 4. Score an entire round ──────────────────────────────────────────────────
async function scoreRound({ round, transcript, report }) {
  const roundEntries = transcript
    .filter((e) => e.round === round)
    .map(
      (e, i) => `
Q${i + 1}: ${e.question}
Answer: ${e.answer}
Follow-up: ${e.followUpQuestion || "none"}
Follow-up Answer: ${e.followUpAnswer || "none"}
Per-answer score: ${e.score ?? "unscored"}
`
    )
    .join("\n---\n");

  const prompt = `
You are evaluating a candidate's overall performance in the ${round} round for role: ${report.title}.

Here is the full round transcript:
${roundEntries}

Give an overall round score (0–100) and a 2-3 sentence summary of performance.
`;

  const response = await withRetry(() => ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.INTEGER },
          summary: { type: Type.STRING },
        },
        required: ["score", "summary"],
      },
    },
  }));

  return JSON.parse(response.text);
}

// ─── 5. Generate final evaluation across all rounds ───────────────────────────
async function generateFinalFeedback({ transcript, roundScores, report, role, company }) {
  const fullLog = transcript
    .map(
      (e, i) => `
[${e.round.toUpperCase()} Q${e.questionIndex + 1}]
Q: ${e.question}
A: ${e.answer}
Score: ${e.score ?? "unscored"} | Feedback: ${e.feedback || "none"}
`
    )
    .join("\n");

  const scores = roundScores
    .map((r) => `${r.round}: ${r.score}/100 — ${r.summary}`)
    .join("\n");

  const prompt = `
You are a senior engineering hiring manager at ${company || "a top tech company"}.
You have just finished interviewing a candidate for: ${role || report.title}.

Resume summary:
${report.resume}

Job description:
${report.jobDescription}

Round scores:
${scores}

Full interview transcript:
${fullLog}

Generate a comprehensive final evaluation.
`;

  const response = await withRetry(() => ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          finalScore: { type: Type.INTEGER },
          strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
          weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
          weakTopics: { type: Type.ARRAY, items: { type: Type.STRING } },
          behavioralImprovements: { type: Type.ARRAY, items: { type: Type.STRING } },
          projectImprovements: { type: Type.ARRAY, items: { type: Type.STRING } },
          leetcodeProblems: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                difficulty: { type: Type.STRING },
                reason: { type: Type.STRING },
              },
              required: ["title", "difficulty", "reason"],
            },
          },
        },
        required: [
          "finalScore",
          "strengths",
          "weaknesses",
          "weakTopics",
          "behavioralImprovements",
          "projectImprovements",
          "leetcodeProblems",
        ],
      },
    },
  }));

  return JSON.parse(response.text);
}

module.exports = {
  generateQuestions,
  evaluateAnswer,
  generateFollowUp,
  scoreRound,
  generateFinalFeedback,
};