const { GoogleGenAI, Type } = require("@google/genai");

const { z } = require("zod")
const { zodToJsonSchema } = require("zod-to-json-schema")
const https = require("https");
const fetch = require("node-fetch");
const puppeteer = require("puppeteer");
const agent = new https.Agent({ family: 4 });

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY,
    httpOptions: { fetch: (url, init) => fetch(url, { ...init, agent }) }
});
const FALLBACK_MODELS = [
    process.env.AI_MODEL,
    "gemini-3.5-flash",
    "gemini-3.5-flash-001",
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash",
].filter((m, idx, arr) => m && arr.indexOf(m) === idx);

const MODEL_NAME = process.env.AI_MODEL || "gemini-3.5-flash";

// Retry wrapper for transient network errors, rate limits (429), and missing models (404)
async function withRetry(fn, retries = 5, delayMs = 1500, models = FALLBACK_MODELS) {
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
                    `[AI] Model ${currentModel} failed (${isNotFound ? "404 Not Found" : "429 Rate Limit"}). Switching instantly to fallback model: ${models[modelIdx + 1]}...`
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
                    `[AI] Retryable error (${isRateLimit ? "Rate Limit 429" : "Network"}) on ${currentModel} (attempt ${attempt}/${retries}). Waiting ${Math.round(waitTime / 1000)}s before retry...`
                );
                await new Promise(r => setTimeout(r, waitTime));
            } else {
                throw err;
            }
        }
    }
}

const interviewReportSchema = {
    type: Type.OBJECT,
    properties: {
        match_Score: {
            type: Type.INTEGER,
            description: "The overall match score between 0-100 indicating how well the candidate profile matches the job description"
        },
        technicalQuestions: {
            type: Type.ARRAY,
            description: "Technical questions that can be asked in interview along with their intention and how to answer them",
            items: {
                type: Type.OBJECT,
                properties: {
                    question: { type: Type.STRING, description: "The technical questions can be asked in interview" },
                    intention: { type: Type.STRING, description: "The intention of interviewer behind asking this question" },
                    answer: { type: Type.STRING, description: "How to answer this question, what points to cover, what approach to take etc." }
                },
                required: ["question", "intention", "answer"]
            }
        },
        behaviouralQuestions: {
            type: Type.ARRAY,
            description: "Behavioural questions can be asked in interview along with their intention and how to answer them",
            items: {
                type: Type.OBJECT,
                properties: {
                    question: { type: Type.STRING, description: "The behavioral questions can be asked in interview" },
                    intention: { type: Type.STRING, description: "The intention of interviewer behind asking this question" },
                    answer: { type: Type.STRING, description: "How to answer this question, what points to cover, what approach to take etc." }
                },
                required: ["question", "intention", "answer"]
            }
        },
        skillGaps: {
            type: Type.ARRAY,
            description: "List of skill gaps in the candidate's profile along with their severity",
            items: {
                type: Type.OBJECT,
                properties: {
                    skill: { type: Type.STRING, description: "The skill which candidate is lacking" },
                    severity: { type: Type.STRING, enum: ["low", "medium", "high"], description: "The severity of the skill gap" }
                },
                required: ["skill", "severity"]
            }
        },
        preparationPlan: {
            type: Type.ARRAY,
            description: "A day-wise preparation plan for the candidate to follow in order to prepare for the interview effectively",
            items: {
                type: Type.OBJECT,
                properties: {
                    day: { type: Type.INTEGER, description: "Day number of preparation plan" },
                    focus: { type: Type.STRING, description: "The focus area for this day (e.g: Data Structures and Algorithms, System Design etc.)" },
                    tasks: {
                        type: Type.ARRAY,
                        description: "List of tasks to be done on this day",
                        items: { type: Type.STRING }
                    }
                },
                required: ["day", "focus", "tasks"]
            }
        },
        title: {
            type: Type.STRING,
            description: "Title of the interview report"
        }
    },
    required: ["title", "match_Score", "technicalQuestions", "behaviouralQuestions", "skillGaps", "preparationPlan"]
};

async function generateInterviewReport({ resume, jobDescription, selfDescription }) {
    const prompt = `Generate an interview preparation report for the candidate based on their resume, job description, and self description.
    
    Resume: ${resume}
    Job Description: ${jobDescription}
    Self Description: ${selfDescription}

    The interview preparation report should include:
    - Match score: Overall match score between 0-100 indicating how well the candidate profile matches the job description
    - Technical questions: Technical questions that can be asked in interview along with their intention and how to answer them
    - Behavioural questions: Behavioural questions that can be asked in interview along with their intention and how to answer them
    - Skill gaps: List of skill gaps in the candidate's profile along with their severity
    - Preparation plan: A day-wise preparation plan for the candidate to follow in order to prepare for the interview effectively`;

    const response = await withRetry((model = MODEL_NAME) => ai.models.generateContent({
        model,
        contents: [prompt],
        config: {
            responseMimeType: "application/json",
            responseSchema: interviewReportSchema
        }
    }));

    return JSON.parse(response.text);
}

async function generatePdfFromHtml(htmlContent) {
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] })
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" })

    const pdfBuffer = await page.pdf({
        format: "A4", margin: {
            top: "20mm",
            bottom: "20mm",
            left: "15mm",
            right: "15mm"
        }
    })

    await browser.close()

    return pdfBuffer
}

async function generateResumePDF({ resume, selfDescription, jobDescription }) {
    const resumePdfSchema = z.object({
        html: z.string().describe("The HTML content of the resume which can be converted to PDF using any library like puppeteer")
    })
    const prompt = `Generate resume for a candidate with the following details:
                        Resume: ${resume}
                        Self Description: ${selfDescription}
                        Job Description: ${jobDescription}

                        the response should be a JSON object with a single field "html" which contains the HTML content of the resume which can be converted to PDF using any library like puppeteer.
                        The resume should be tailored for the given job description and should highlight the candidate's strengths and relevant experience. The HTML content should be well-formatted and structured, making it easy to read and visually appealing.
                        The content of resume should be not sound like it's generated by AI and should be as close as possible to a real human-written resume.
                        you can highlight the content using some colors or different font styles but the overall design should be simple and professional.
                        The content should be ATS friendly, i.e. it should be easily parsable by ATS systems without losing important information.
                        The resume should not be so lengthy, it should ideally be 1-2 pages long when converted to PDF. Focus on quality rather than quantity and make sure to include all the relevant information that can increase the candidate's chances of getting an interview call for the given job description.
                    `

    const response = await withRetry((model = MODEL_NAME) => ai.models.generateContent({
        model,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: zodToJsonSchema(resumePdfSchema),
        }
    }));


    const jsonContent = JSON.parse(response.text)

    const pdfBuffer = await generatePdfFromHtml(jsonContent.html)

    return pdfBuffer
}

module.exports = { generateInterviewReport, generateResumePDF };