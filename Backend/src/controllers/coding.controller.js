const CodingSubmission = require("../models/codingSubmission.model.js");
const InterviewSession = require("../models/interviewSession.model.js");
const { executeCode, LANGUAGE_CONFIG } = require("../services/piston.service.js");
const { evaluateCodeSubmission } = require("../services/codingEvaluation.service.js");

// ─── 1. Run code (no evaluation, just execute) ─────────────────────────────────
async function runCode(req, res) {
    try {
        const { code, language, stdin } = req.body;

        if (!code || !language) {
            return res.status(400).json({ message: "code and language are required" });
        }

        if (!LANGUAGE_CONFIG[language]) {
            return res.status(400).json({
                message: `Unsupported language. Supported: ${Object.keys(LANGUAGE_CONFIG).join(", ")}`,
            });
        }

        const result = await executeCode({ code, language, stdin });

        res.json({
            stdout: result.stdout,
            stderr: result.stderr,
            output: result.output,
            exitCode: result.exitCode,
            success: result.success,
        });
    } catch (err) {
        console.error("runCode error:", err);
        res.status(500).json({ message: "Failed to execute code" });
    }
}

// ─── 2. Submit code (execute + Gemini evaluation + save) ───────────────────────
async function submitCode(req, res) {
    try {
        const { sessionId } = req.params;
        const { code, language, questionIndex, stdin } = req.body;

        if (!code || !language) {
            return res.status(400).json({ message: "code and language are required" });
        }

        // verify session belongs to user
        const session = await InterviewSession.findOne({
            _id: sessionId,
            user: req.user.id,
        });

        if (!session) {
            return res.status(404).json({ message: "Session not found" });
        }

        if (session.status !== "in_progress") {
            return res.status(400).json({ message: "Session is not active" });
        }

        // get the coding question from transcript
        const entry = session.transcript.find(
            (t) => t.round === "coding" && t.questionIndex === questionIndex
        );

        if (!entry) {
            return res.status(404).json({ message: "Coding question not found in session" });
        }

        // check attempt number
        const previousAttempts = await CodingSubmission.countDocuments({
            session: sessionId,
            user: req.user.id,
            question: entry.question,
        });

        // execute the code via Piston
        const executionResult = await executeCode({ code, language, stdin });

        // evaluate via Gemini
        const evaluation = await evaluateCodeSubmission({
            question: entry.question,
            code,
            language,
            stdout: executionResult.stdout,
            stderr: executionResult.stderr,
            exitCode: executionResult.exitCode,
        });

        // save submission
        const submission = await CodingSubmission.create({
            session: sessionId,
            user: req.user.id,
            question: entry.question,
            code,
            language,
            stdout: executionResult.stdout,
            stderr: executionResult.stderr,
            exitCode: executionResult.exitCode,
            executionSuccess: executionResult.success,
            score: evaluation.score,
            correctness: evaluation.correctness,
            timeComplexity: evaluation.timeComplexity,
            spaceComplexity: evaluation.spaceComplexity,
            feedback: evaluation.feedback,
            improvements: evaluation.improvements,
            passedTestCases: evaluation.passedTestCases,
            attemptNumber: previousAttempts + 1,
        });

        // also update the transcript entry score
        entry.answer = code;
        entry.score = evaluation.score;
        entry.feedback = evaluation.feedback;
        session.markModified("transcript");
        await session.save();

        res.json({
            submissionId: submission._id,
            executionResult: {
                stdout: executionResult.stdout,
                stderr: executionResult.stderr,
                exitCode: executionResult.exitCode,
                success: executionResult.success,
            },
            evaluation: {
                score: evaluation.score,
                correctness: evaluation.correctness,
                timeComplexity: evaluation.timeComplexity,
                spaceComplexity: evaluation.spaceComplexity,
                feedback: evaluation.feedback,
                improvements: evaluation.improvements,
                passedTestCases: evaluation.passedTestCases,
            },
            attemptNumber: previousAttempts + 1,
        });
    } catch (err) {
        console.error("submitCode error:", err);
        res.status(500).json({ message: "Failed to submit code" });
    }
}

// ─── 3. Get all submissions for a session ──────────────────────────────────────
async function getSubmissions(req, res) {
    try {
        const { sessionId } = req.params;

        const session = await InterviewSession.findOne({
            _id: sessionId,
            user: req.user.id,
        });

        if (!session) {
            return res.status(404).json({ message: "Session not found" });
        }

        const submissions = await CodingSubmission.find({
            session: sessionId,
            user: req.user.id,
        }).sort({ createdAt: -1 });

        res.json(submissions);
    } catch (err) {
        console.error("getSubmissions error:", err);
        res.status(500).json({ message: "Failed to fetch submissions" });
    }
}

// ─── 4. Get supported languages ────────────────────────────────────────────────
async function getSupportedLanguages(req, res) {
    try {
        const languages = Object.keys(LANGUAGE_CONFIG).map((key) => ({
            id: key,
            label: key.charAt(0).toUpperCase() + key.slice(1),
        }));
        res.json(languages);
    } catch (err) {
        console.error("getSupportedLanguages error:", err);
        res.status(500).json({ message: "Failed to fetch languages" });
    }
}

module.exports = {
    runCode,
    submitCode,
    getSubmissions,
    getSupportedLanguages,
};