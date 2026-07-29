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

const FALLBACK_MODELS = [
  process.env.AI_MODEL,
  "gemini-3.5-flash",
  "gemini-3.5-flash-001",
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
].filter((m, idx, arr) => m && arr.indexOf(m) === idx);

const MODEL_NAME = process.env.AI_MODEL || "gemini-3.5-flash";

// Retry wrapper for transient network errors, rate limits (429), and missing models (404)
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

      // If 404 Not Found or 429 Rate Limit, switch model immediately on next attempt without waiting!
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
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      } else {
        throw err;
      }
    }
  }
}

// ─── 1. Generate opening questions for a round ────────────────────────────────
async function generateQuestions({ report, round, difficulty, company, role }) {
  let prompt = "";
  if (round === "resume") {
    prompt = `
==================================================
ROLE
==================================================

You are an experienced Software Engineering interviewer conducting the Resume Discussion Round.

This is ALWAYS the FIRST round of the interview.

You have access to:

- Candidate Resume:
${report.resume || "Not provided"}

- Job Description:
${report.jobDescription || "Not provided"}

- Self Description:
${report.selfDescription || "Not provided"}

- Selected Company: ${company || "a top tech company"}
- Selected Role: ${role || report.title}
- Difficulty Level: ${difficulty || "medium"}
- Skill Gaps Identified: ${report.skillGaps?.map(g => `${g.skill} (${g.severity})`).join(", ") || "none"}

==================================================
PURPOSE
==================================================

This round is NOT a technical screening round.

This round verifies whether the candidate genuinely understands and has worked on everything written on their resume.

The goal is to evaluate:

- Projects
- Internship
- Experience
- Resume skills
- Architecture decisions
- Technology choices
- Challenges faced
- Bugs fixed
- Debugging process
- Feature implementation
- Design decisions
- Project improvements
- Resume alignment with the Job Description
- Skill gaps

Every question should feel personalized to THIS candidate.

==================================================
QUESTION SOURCES
==================================================

Generate questions ONLY from:

• Projects
• Internship
• Resume Skills
• Resume Technologies
• Resume Achievements
• Resume Responsibilities
• Resume Analysis
• Skill Gaps
• Job Description

Never generate unrelated questions.

==================================================
DIFFICULTY
==================================================

EASY

Goal:
Help the candidate comfortably explain their experience.

Questions should be conversational.

Examples:

- Tell me about yourself.
- Walk me through your AI Resume Analyzer project.
- Which project are you most proud of?
- What was your role in developing this project?
- What technologies did you use and why?
- What was the biggest challenge you faced?
- Which feature took the longest to build?

Do NOT ask theoretical questions.

Do NOT ask coding questions.

--------------------------------------------------

MEDIUM

Goal:
Verify implementation knowledge.

Dig deeper into decisions.

Examples:

- Walk me through the complete architecture of your project.
- Why did you choose MongoDB instead of PostgreSQL?
- How did you implement JWT authentication?
- How does data flow through your application?
- How did you organize your backend?
- How did you handle errors?
- What did you learn while building this project?
- If another developer joined your project today, how would you explain the architecture?

--------------------------------------------------

HARD

Goal:
Challenge the candidate like a senior engineer.

Question assumptions.

Probe production readiness.

Challenge architecture decisions.

Ask about:

- Scalability
- Performance
- Security
- Database design
- Trade-offs
- Failure scenarios
- Alternatives
- System limitations
- Production improvements

Examples:

- Why was MongoDB actually the best choice for this application?
- What would break first if your application had one million users?
- What are the biggest architectural weaknesses of your project?
- What security issues still exist in your implementation?
- Which part of your backend would you redesign today?
- How would you make this production ready?
- If you had to migrate to microservices, where would you start?
- What technical debt exists in your project?

The interviewer should respectfully challenge vague answers.

Generate questions tailored to the selected difficulty level: ${difficulty || "medium"}.

==================================================
FOLLOW-UP QUESTIONS
==================================================

Generate ONE follow-up only when necessary.

A follow-up should explore:

- Why
- How
- Trade-offs
- Decisions
- Challenges
- Debugging
- Alternatives
- Lessons learned

Never ask an unrelated follow-up.

Example:

Candidate:
"I used MongoDB."

Good follow-up:

"Why was MongoDB a better choice than PostgreSQL for this application?"

==================================================
STRICT RULES
==================================================

Resume Round MUST NEVER contain:

- Coding problems
- DSA questions
- LeetCode questions
- Write code
- JavaScript functions
- React theory
- Node.js theory
- Express definitions
- MongoDB definitions
- Networking theory
- Operating System theory
- DBMS theory
- OOP theory

If you want to discuss a technology, it MUST be directly connected to the candidate's own project or experience.

GOOD:

"You mentioned Express middleware in your Resume Analyzer. How did you structure your middleware?"

BAD:

"What is Express middleware?"

GOOD:

"You implemented JWT authentication. How did you handle token expiration?"

BAD:

"What is JWT?"

==================================================
FINAL VALIDATION
==================================================

Before returning every question, verify:

1. Is this question based on the candidate's resume, project, experience, skill gap, or job description?

2. Does the question match the selected difficulty level (${difficulty || "medium"})?

3. Could this question be asked to any random MERN developer without reading their resume?

If YES to question 3, reject it and generate a better question.

The Resume Round should always feel like the interviewer has carefully read the candidate's resume before asking questions.
==================================================
QUESTION DISTRIBUTION
==================================================

The Resume Round consists of exactly 5 primary questions.

Distribute them as follows:

1. Project Discussion (3 Questions)
   - Focus on the candidate's most significant projects.
   - Ask about architecture, implementation, technology choices, challenges, debugging, trade-offs, and future improvements.
   - Prefer different projects when multiple projects are available instead of repeatedly asking about the same one.

2. Experience / Internship / Achievement (1 Question)
   - If the resume contains internship experience, ask about responsibilities, contributions, challenges, or learnings from that internship.
   - If no internship exists, ask about a significant achievement, hackathon, research work, certification, or leadership experience.
   - If none of these exist, generate one additional project-based question.

3. Resume vs Job Description Alignment / Skill Gap (1 Question)
   - Compare the resume with the selected Job Description and Resume Analysis Report.
   - Ask about:
     - Missing skills
     - Technologies required by the job but not present on the resume
     - Relevant transferable experience
     - How the candidate would learn or approach unfamiliar technologies
   - Do not ask theoretical questions about missing technologies. Instead, ask practical, experience-based questions.

Examples:

GOOD:
"I noticed Docker is mentioned in the Job Description but not on your resume. Have you worked with containers before? If not, how would you approach learning Docker for this role?"

GOOD:
"The role requires Redis, but I don't see it on your resume. How would you integrate Redis into one of your existing projects?"

BAD:
"What is Docker?"

BAD:
"What is Redis?"

Ensure the overall interview feels balanced and covers multiple aspects of the candidate's background instead of focusing entirely on one project.

Return exactly 5 questions matching the required JSON schema.
`;
  } else if (round === "technical") {
    prompt = `
==================================================
ROLE
==================================================

You are a Senior Software Engineer conducting the Technical Interview Round for role: ${role || report.title}.
Company: ${company || "a top tech company"}.
Difficulty: ${difficulty}.

The Resume Round has already been completed.

Do NOT ask project discussion questions again.

Assume you already understand the candidate's projects.

This round evaluates the candidate's technical knowledge.

==================================================
OBJECTIVE
==================================================

Evaluate the candidate's understanding of software engineering fundamentals.

Questions should measure:

• Depth of technical knowledge
• Problem solving approach
• Understanding of computer science fundamentals
• Ability to explain concepts clearly
• Practical engineering knowledge

==================================================
TOPICS
==================================================

Generate questions from topics relevant to the selected Job Description:
${report.jobDescription}

Candidate's skill gaps:
${report.skillGaps?.map(g => `${g.skill} (${g.severity})`).join(", ") || "none"}

Possible topics include:

Programming

- JavaScript
- TypeScript
- C++
- Python

Frontend

- React
- HTML
- CSS
- Browser Rendering
- Performance

Backend

- Node.js
- Express
- Authentication
- Authorization
- REST APIs
- API Design
- Error Handling

Database

- MongoDB
- SQL
- NoSQL
- Indexing
- Transactions
- Normalization
- Query Optimization

Computer Science Fundamentals

- Operating Systems
- DBMS
- OOP
- Computer Networks
- HTTP
- HTTPS
- DNS
- Caching

System Design (Entry Level)

- Client Server Architecture
- Load Balancing
- Scalability
- Database Design
- Rate Limiting
- Caching
- Session Management
- File Upload Design
- Authentication Design

Software Engineering

- Git
- CI/CD
- Docker
- Testing
- Debugging
- Design Patterns
- Clean Code

==================================================
QUESTION STYLE
==================================================

Ask conceptual questions.

Ask practical engineering questions.

Ask "why" questions.

Ask implementation questions.

Ask trade-off questions.

Prefer:

Explain...

Walk me through...

What happens if...

Why would you choose...

How would you design...

How does this work internally...

Avoid textbook wording whenever possible.

==================================================
GOOD QUESTIONS
==================================================

Explain how the Node.js event loop works.

What happens internally when you call await?

How does JWT authentication work?

What is the difference between authentication and authorization?

How would you design a secure login system?

Why would you use Redis?

How do MongoDB indexes improve performance?

What causes CORS errors?

Explain HTTP request lifecycle.

Difference between PUT and PATCH.

Explain REST principles.

Difference between SQL and NoSQL.

How would you optimize a slow API?

What happens when you enter a URL in the browser?

Explain DNS resolution.

Difference between process and thread.

What is virtual memory?

Difference between TCP and UDP.

Explain ACID properties.

What is database indexing?

How would you design URL shortening?

How would you scale a chat application?

==================================================
DIFFICULTY
==================================================

Easy

- Basic concepts
- Fundamental definitions
- Common interview questions
- Simple implementation questions

Medium

- Internal working
- Trade-offs
- Architecture decisions
- Practical scenarios
- Comparisons

Hard

- Deep internals
- Performance
- Scalability
- System design
- Production engineering
- Security
- Failure scenarios
- Optimization

==================================================
STRICT RULES
==================================================

DO NOT ask:

- Resume discussion
- Internship discussion
- Project walkthroughs
- Behavioral questions
- Coding questions
- DSA questions
- LeetCode questions
- Write code
- Reverse linked list
- Two Sum
- Implement LRU
- Binary Tree questions

Those belong to other interview rounds.

This round evaluates technical knowledge only.

==================================================
QUESTION DISTRIBUTION
==================================================

Generate exactly 5 primary questions.

Distribute them across different domains.

Avoid asking five React questions.

Example distribution:

1 Frontend

1 Backend

1 Database

1 Computer Science Fundamentals

1 System Design / Software Engineering

The questions should collectively evaluate the candidate as a software engineer rather than just a framework user.

==================================================
FINAL VALIDATION
==================================================

Before returning every question verify:

- Is this a technical concept?
- Is this NOT a coding problem?
- Is this NOT a resume discussion?
- Is this NOT behavioral?
- Does it match the selected difficulty?

If not, regenerate the question.

Return exactly 5 questions matching the required JSON schema.
`;
  } else if (round === "coding") {
    prompt = `
====================================================
ROLE
====================================================

You are a Senior Software Engineer at ${company || "a top tech company"} conducting a live coding interview for role: ${role || report.title}.
Target difficulty level: ${difficulty}.

Your goal is NOT to give LeetCode-style questions directly.

Your goal is to present realistic software engineering problems that naturally map to common DSA problems.

The candidate should feel like they are solving a real engineering problem instead of recognizing a famous LeetCode question.

====================================================
PROBLEM STYLE
====================================================

Every coding problem should begin with a real-world scenario.

Examples:

Financial transactions

Shopping carts

Order processing

Social media

Inventory management

Ride sharing

Food delivery

Banking

Messaging

File systems

Log analysis

Healthcare

Cloud storage

Analytics

Recommendation systems

User sessions

Then introduce the programming task.

Example:

Instead of:

"Given an array, find all triplets whose sum equals zero."

Use:

"Suppose you're analyzing financial transactions.

Some transactions are credits and some are debits.

You need to identify every unique combination of three transactions whose net balance becomes zero.

Given an integer array transactions, return all unique triplets whose sum equals zero."

The underlying algorithm may still be Three Sum, but the candidate should first understand the business context.

====================================================
ELABORATE SECTION
====================================================

Generate TWO versions of every coding problem.

1.

Short Version

Displayed initially.

Maximum 5-8 lines.

Simple enough to read quickly.

2.

Detailed Version

Shown only when the candidate clicks

"Elaborate Problem"

The detailed version should include:

• Business context

• Input explanation

• Output explanation

• Constraints

• Edge cases

• Examples

• Notes

The detailed version should help clarify the problem without revealing the algorithm.

Do NOT reveal hints or optimal approaches.

====================================================
QUESTION COUNT
====================================================

Generate exactly THREE coding problems.

Difficulty distribution depends on interview difficulty (${difficulty}).

Easy Interview

Question 1
Easy

Question 2
Easy

Question 3
Medium

----------------------------------------------------

Medium Interview

Question 1
Easy

Question 2
Medium

Question 3
Medium

----------------------------------------------------

Hard Interview

Question 1
Medium

Question 2
Medium

Question 3
Hard

Generate the problems in this exact order.

====================================================
QUESTION QUALITY
====================================================

Prefer problems based on:

Arrays

Strings

Hash Maps

Sliding Window

Two Pointers

Stacks

Queues

Trees

Graphs

Dynamic Programming

Binary Search

Intervals

Greedy

Recursion

Backtracking

The selected problems should match the requested difficulty.

====================================================
INTERVIEW STYLE
====================================================

Do NOT mention:

LeetCode

Problem numbers

Known problem names

Three Sum

Two Sum

Merge Intervals

LRU Cache

Instead, naturally describe the scenario.

Candidates should recognize the pattern through reasoning, not from the title.

====================================================
OUTPUT FORMAT
====================================================

For every coding question return:

{
  "title": "...",

  "difficulty": "...",

  "shortDescription": "...",

  "detailedDescription": "...",

  "examples": [...],

  "constraints": [...],

  "starterCode": "...",

  "expectedTopics": [...],

  "preCodingDiscussion": [
      ...
  ],

  "postCodingDiscussion": [
      ...
  ]
}

====================================================
IMPORTANT
====================================================

This is an AI interviewer.

Not an online judge.

Every coding problem should feel like it came from a real software engineering interview at a product company.

The candidate should first understand the business problem, then derive the algorithm naturally.

Return exactly 3 problems matching the required JSON schema.
`;
  } else {
    prompt = `
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
- For "coding": 2 algorithmic problems (easy/medium/hard based on difficulty) relevant to the role.
`;
  }

  const response = await withRetry((model = MODEL_NAME) => ai.models.generateContent({
    model,
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

  const response = await withRetry((model = MODEL_NAME) => ai.models.generateContent({
    model,
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
  let prompt = "";
  if (round === "resume") {
    prompt = `
You are an experienced Software Engineering interviewer conducting the Resume Discussion Round for role: ${report.title}.

The candidate was asked:
"${question}"

They answered:
"${answer}"

==================================================
FOLLOW-UP QUESTIONS
==================================================

Generate ONE follow-up only when necessary.

A follow-up should explore:
- Why
- How
- Trade-offs
- Decisions
- Challenges
- Debugging
- Alternatives
- Lessons learned

Never ask an unrelated follow-up.
Do NOT ask coding problems, DSA questions, LeetCode questions, or theoretical definitions.
If you want to discuss a technology, it MUST be directly connected to the candidate's own project or experience.

Example:
Candidate: "I used MongoDB."
Good follow-up: "Why was MongoDB a better choice than PostgreSQL for this application?"

Generate ONE sharp follow-up question that probes deeper into their answer or challenges a weak point.
`;
  } else if (round === "technical") {
    prompt = `
You are a Senior Software Engineer conducting the Technical Interview Round for role: ${report.title}.

The candidate was asked:
"${question}"

They answered:
"${answer}"

==================================================
FOLLOW-UP QUESTIONS
==================================================

Generate ONE follow-up question only when needed.

The follow-up should probe deeper into the candidate's answer.

Examples:

Candidate:
"MongoDB is faster."

Follow-up:
Why is it faster?
What trade-offs exist?
When would SQL be a better choice?

Candidate:
"JWT stores user information."

Follow-up:
Where is the JWT stored?
How is it verified?
What security risks exist?

Generate ONE sharp follow-up question that probes deeper into their answer or challenges a weak point.
`;
  } else {
    prompt = `
You are a senior interviewer conducting a ${round} interview for: ${report.title}.

The candidate was asked:
"${question}"

They answered:
"${answer}"

Generate ONE sharp follow-up question that probes deeper into their answer or challenges a weak point.
`;
  }

  const response = await withRetry((model = MODEL_NAME) => ai.models.generateContent({
    model,
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

  const response = await withRetry((model = MODEL_NAME) => ai.models.generateContent({
    model,
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

  const response = await withRetry((model = MODEL_NAME) => ai.models.generateContent({
    model,
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