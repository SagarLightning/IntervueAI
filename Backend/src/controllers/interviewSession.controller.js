const InterviewSession = require("../models/interviewSession.model.js");
const InterviewReport = require("../models/interviewReport.model.js");

const {
    generateQuestions,
    evaluateAnswer,
    generateFollowUp,
    scoreRound,
    generateFinalFeedback,
} = require("../services/interviewSession.service.js");

// ─── 1. Start a new session ────────────────────────────────────────────────────
async function startSession(req, res) {
    try {
        const { reportId, company, role, difficulty } = req.body;

        const report = await InterviewReport.findOne({
            _id: reportId,
            user: req.user.id,
        });

        if (!report) {
            return res.status(404).json({ message: "Report not found" });
        }

        // generate opening resume discussion questions
        const questions = await generateQuestions({
            report,
            round: "resume",
            difficulty: difficulty || "medium",
            company,
            role,
        });

        const session = await InterviewSession.create({
            user: req.user.id,
            report: report._id,
            company,
            role,
            difficulty: difficulty || "medium",
            currentRound: "resume",
            currentQuestionIndex: 0,
            currentQuestion: questions[0]?.question || "",
            status: "in_progress",
            transcript: questions.map((q, index) => ({
                round: "resume",
                questionIndex: index,
                question: q.question,
            })),
        });

        res.status(201).json({
            sessionId: session._id,
            currentRound: session.currentRound,
            currentQuestionIndex: session.currentQuestionIndex,
            firstQuestion: session.currentQuestion,
        });
    } catch (err) {
        console.error("startSession error:", err);
        res.status(500).json({ message: "Failed to start session" });
    }
}

// ─── 2. Submit an answer ───────────────────────────────────────────────────────
async function submitAnswer(req, res) {
    try {
        const { sessionId } = req.params;
        const { questionIndex, answer, isFollowUp } = req.body;

        const session = await InterviewSession.findOne({
            _id: sessionId,
            user: req.user.id,
        });

        if (!session) return res.status(404).json({ message: "Session not found" });
        if (session.status !== "in_progress")
            return res.status(400).json({ message: "Session is not active" });

        const report = await InterviewReport.findById(session.report);
        const entry = session.transcript.find(
            (t) => t.round === session.currentRound && t.questionIndex === questionIndex
        );

        if (!entry) return res.status(404).json({ message: "Question not found in transcript" });

        // evaluate the answer
        if (isFollowUp) {
            if (!entry.followUpQuestion) {
                return res.status(400).json({
                    message: "No follow-up question exists for this item"
                });
            }

            entry.followUpAnswer = answer;
            session.markModified("transcript");
            await session.save();

            return res.json({
                message: "Follow-up answer saved successfully",
                followUpQuestion: entry.followUpQuestion,
                followUpAnswer: entry.followUpAnswer,
            });
        }

        // evaluate the main answer
        const evaluation = await evaluateAnswer({
            question: entry.question,
            answer,
            round: session.currentRound,
            difficulty: session.difficulty,
            report,
        });

        entry.answer = answer;
        entry.score = evaluation.score;
        entry.feedback = evaluation.feedback;

        // generate follow-up if needed
        if (evaluation.shouldFollowUp) {
            const followUp = await generateFollowUp({
                question: entry.question,
                answer,
                round: session.currentRound,
                report,
            });

            entry.followUpQuestion = followUp.followUpQuestion;
        }

        session.markModified("transcript");
        await session.save();

        res.json({
            score: evaluation.score,
            feedback: evaluation.feedback,
            followUpQuestion: evaluation.shouldFollowUp ? entry.followUpQuestion : null,
        });
    } catch (err) {
        console.error("submitAnswer error:", err);
        res.status(500).json({ message: "Failed to submit answer" });
    }
}

// ─── 3. Advance to next round ──────────────────────────────────────────────────
async function nextRound(req, res) {
    try {
        const { sessionId } = req.params;

        const session = await InterviewSession.findOne({
            _id: sessionId,
            user: req.user.id,
        });

        if (!session) return res.status(404).json({ message: "Session not found" });

        const report = await InterviewReport.findById(session.report);

        // score the current round before advancing
        const roundScore = await scoreRound({
            round: session.currentRound,
            transcript: session.transcript,
            report,
        });

        const alreadyScored = session.roundScores.some(
            (r) => r.round === session.currentRound
        );

        if (!alreadyScored) {
            session.roundScores.push({
                round: session.currentRound,
                score: roundScore.score,
                summary: roundScore.summary,
            });
        }

        // determine next round
        const order = ["resume", "technical", "coding", "behavioral"];
        const currentIndex = order.indexOf(session.currentRound);
        const nextRoundName = order[currentIndex + 1];

        if (!nextRoundName) {
            return res.status(400).json({ message: "Already on last round, call /finish instead" });
        }

        // generate questions for next round
        const questions = await generateQuestions({
            report,
            round: nextRoundName,
            difficulty: session.difficulty,
            company: session.company,
            role: session.role,
        });

        // append new round questions to transcript
        questions.forEach((q, index) => {
            session.transcript.push({
                round: nextRoundName,
                questionIndex: index,
                question: q.question,
            });
        });

        session.currentRound = nextRoundName;
        session.currentQuestionIndex = 0;
        session.currentQuestion = questions[0]?.question || "";
        session.markModified("transcript");
        await session.save();

        res.json({
            round: nextRoundName,
            roundScore,
            questions: questions.map((q) => ({
                index: q.index,
                question: q.question,
            })),
        });
    } catch (err) {
        console.error("nextRound error:", err);
        res.status(500).json({ message: "Failed to advance round" });
    }
}

// ─── 4. Finish session + generate final feedback ───────────────────────────────
async function finishSession(req, res) {
    try {
        const { sessionId } = req.params;

        const session = await InterviewSession.findOne({
            _id: sessionId,
            user: req.user.id,
        });

        if (!session) return res.status(404).json({ message: "Session not found" });

        const report = await InterviewReport.findById(session.report);

        // score the last round
        const lastRoundScore = await scoreRound({
            round: session.currentRound,
            transcript: session.transcript,
            report,
        });

        const alreadyScored = session.roundScores.some(
            (r) => r.round === session.currentRound
        );

        if (!alreadyScored) {
            session.roundScores.push({
                round: session.currentRound,
                score: lastRoundScore.score,
                summary: lastRoundScore.summary,
            });
        }

        // generate final feedback
        const finalFeedback = await generateFinalFeedback({
            transcript: session.transcript,
            roundScores: session.roundScores,
            report,
            role: session.role,
            company: session.company,
        });

        session.finalScore = finalFeedback.finalScore;
        session.finalFeedback = {
            strengths: finalFeedback.strengths,
            weaknesses: finalFeedback.weaknesses,
            weakTopics: finalFeedback.weakTopics,
            behavioralImprovements: finalFeedback.behavioralImprovements,
            projectImprovements: finalFeedback.projectImprovements,
            leetcodeProblems: finalFeedback.leetcodeProblems,
        };
        session.status = "completed";

        await session.save();

        res.json({
            finalScore: session.finalScore,
            roundScores: session.roundScores,
            finalFeedback: session.finalFeedback,
        });
    } catch (err) {
        console.error("finishSession error:", err);
        res.status(500).json({ message: "Failed to finish session" });
    }
}

// ─── 5. Get a session by ID ────────────────────────────────────────────────────
async function getSession(req, res) {
    try {
        const session = await InterviewSession.findOne({
            _id: req.params.sessionId,
            user: req.user.id,
        }).populate("report", "title jobDescription");

        if (!session) return res.status(404).json({ message: "Session not found" });

        res.json(session);
    } catch (err) {
        console.error("getSession error:", err);
        res.status(500).json({ message: "Failed to fetch session" });
    }
}

// ─── 6. List all sessions for current user ────────────────────────────────────
async function listSessions(req, res) {
    try {
        const sessions = await InterviewSession.find({ user: req.user.id })
            .populate("report", "title")
            .select("company role difficulty status finalScore currentRound createdAt")
            .sort({ createdAt: -1 });

        res.json(sessions);
    } catch (err) {
        console.error("listSessions error:", err);
        res.status(500).json({ message: "Failed to fetch sessions" });
    }
}
module.exports = {
    startSession,
    submitAnswer,
    nextRound,
    finishSession,
    getSession,
    listSessions
};