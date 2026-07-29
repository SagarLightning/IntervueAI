const { GoogleGenAI, Type } = require("@google/genai");
const https = require("https");
const fetch = require("node-fetch");

const agent = new https.Agent({ family: 4 });

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY,
    httpOptions: {
        fetch: (url, init) => fetch(url, { ...init, agent }),
    },
});
const FALLBACK_MODELS = [
    process.env.AI_MODEL,
    "gemini-3.5-flash",
    "gemini-3.5-flash-001",
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash",
].filter((m, idx, arr) => m && arr.indexOf(m) === idx);

const MODEL_NAME = process.env.AI_MODEL || "gemini-3.5-flash";

async function withRetry(fn, retries = 5, delayMs = 2000, models = FALLBACK_MODELS) {
    let modelIdx = 0;
    for (let attempt = 1; attempt <= retries; attempt++) {
        const currentModel = models[modelIdx] || models[0];
        try {
            return await fn(currentModel);
        } catch (err) {
            const isNotFound =
                err?.status === 404 ||
                err?.message?.includes("404") ||
                err?.message?.includes("not found") ||
                err?.message?.includes("is not found");

            const isRateLimit =
                err?.status === 429 ||
                err?.message?.includes("429") ||
                err?.message?.includes("RESOURCE_EXHAUSTED") ||
                err?.message?.includes("Quota exceeded");

            const isNetworkError =
                err?.cause?.code === "ECONNRESET" ||
                err?.message?.includes("fetch failed") ||
                err?.status === 503;

            if ((isNotFound || isRateLimit) && modelIdx + 1 < models.length) {
                console.warn(
                    `[AI Coding] Model ${currentModel} failed (${isNotFound ? "404 Not Found" : "429 Rate Limit"}). Switching instantly to fallback model: ${models[modelIdx + 1]}...`
                );
                modelIdx++;
                continue;
            }

            const isRetryable = isRateLimit || isNetworkError;

            if (isRetryable && attempt < retries) {
                let waitTime = delayMs * attempt;

                if (isRateLimit) {
                    const delayMatch = (err?.message || JSON.stringify(err || {})).match(/retry(?:In|Delay| in)\s*:?\s*"?([0-9.]+)\s*s/i);
                    if (delayMatch && delayMatch[1]) {
                        const requestedSeconds = parseFloat(delayMatch[1]);
                        if (!isNaN(requestedSeconds) && requestedSeconds > 0) {
                            waitTime = Math.ceil(requestedSeconds * 1000) + 2000;
                        }
                    } else {
                        waitTime = Math.min(60000, 5000 * Math.pow(2, attempt - 1));
                    }
                }

                console.warn(
                    `[AI Coding] Retryable error (${isRateLimit ? "Rate Limit 429" : "Network"}) on ${currentModel} (attempt ${attempt}/${retries}). Waiting ${Math.round(waitTime / 1000)}s before retry...`
                );
                await new Promise((resolve) => setTimeout(resolve, waitTime));
            } else {
                throw err;
            }
        }
    }
}

async function evaluateCodeSubmission({ question, code, language, stdout, stderr, exitCode, testCases }) {
    const prompt = `
You are a senior software engineer evaluating a candidate's coding submission.

Problem:
"${question}"

Candidate's Code (${language}):
\`\`\`${language}
${code}
\`\`\`

Execution Result:
- Exit Code: ${exitCode}
- Output: ${stdout || "none"}
- Errors: ${stderr || "none"}
${testCases ? `- Test Cases: ${JSON.stringify(testCases)}` : ""}

Evaluate the submission on:
1. Correctness — does it solve the problem?
2. Time complexity — is it optimal?
3. Code quality — is it clean and readable?
4. Edge cases — are they handled?

Provide a score from 0 to 10 based on these criteria.
Be specific and constructive.
`;

    const response = await withRetry((model = MODEL_NAME) => ai.models.generateContent({
        model,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    score: { type: Type.INTEGER, description: "Score out of 10" },
                    correctness: { type: Type.BOOLEAN },
                    timeComplexity: { type: Type.STRING },   // e.g. "O(n log n)"
                    spaceComplexity: { type: Type.STRING },  // e.g. "O(n)"
                    feedback: { type: Type.STRING },
                    improvements: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                    },
                    passedTestCases: { type: Type.BOOLEAN },
                },
                required: [
                    "score",
                    "correctness",
                    "timeComplexity",
                    "spaceComplexity",
                    "feedback",
                    "improvements",
                    "passedTestCases",
                ],
            },
        },
    }));

    return JSON.parse(response.text);
}

module.exports = { evaluateCodeSubmission };