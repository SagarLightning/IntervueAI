const mongoose = require("mongoose");
const INTERVIEW_ROUNDS = ["resume", "technical", "coding", "behavioral", "final"];


/**
 * Schema for individual transcript entries in the interview session
 */
//transcript stores every Q&A turn with per-answer score and feedback
const transcriptEntrySchema = new mongoose.Schema(
    {
        round: {
            type: String,
            enum: INTERVIEW_ROUNDS,
            required: true,
        },
        questionIndex: { type: Number, required: true },
        question: { type: String, required: true },
        answer: { type: String, default: "" },
        followUpQuestion: { type: String, default: "" },
        followUpAnswer: { type: String, default: "" },
        score: { type: Number, default: null }, // 0–10
        feedback: { type: String, default: "" },
        timestamp: {
            type: Date,
            default: Date.now,
        },
    },
    { _id: false }
);

const roundScoreSchema = new mongoose.Schema(
    {
        round: {
            type: String,
            enum: INTERVIEW_ROUNDS,
        },
        score: { type: Number, default: null }, // 0–100
        summary: { type: String, default: "" },
    },
    { _id: false }
);

const interviewSessionSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Users",
            required: true,
        },
        //report refs your existing InterviewReport model so Gemini always has resume + JD context
        report: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "InterviewReport",
            required: true,
        },

        // context
        company: { type: String, default: "" },
        role: { type: String, default: "" },
        interviewType: {
            type: String,
            enum: ["full", "resume", "technical", "coding", "behavioral"],
            default: "full",
        },
        difficulty: {
            type: String,
            enum: ["easy", "medium", "hard"],
            default: "medium",
        },

        // progress
        currentRound: {
            type: String,
            enum: INTERVIEW_ROUNDS,
            default: "resume",
        },
        currentQuestionIndex: {
            type: Number,
            default: 0,
        },
        currentQuestion: {
            type: String,
            default: "",
        },
        status: {
            type: String,
            enum: ["in_progress", "completed", "abandoned"],
            default: "in_progress",
        },

        // full Q&A log
        transcript: [transcriptEntrySchema],

        // per-round scores
        roundScores: [roundScoreSchema],

        // final evaluation
        finalScore: { type: Number, default: null }, // 0–100
        //finalFeedback is structured — not a blob — so the frontend can render each section cleanly
        finalFeedback: {
            strengths: [String],
            weaknesses: [String],
            weakTopics: [String],
            behavioralImprovements: [String],
            projectImprovements: [String],
            leetcodeProblems: [
                {
                    title: String,
                    difficulty: String,
                    reason: String,
                },
            ],
        },
    },
    { timestamps: true }
);

const InterviewSession = mongoose.model(
    "InterviewSession",
    interviewSessionSchema
);

module.exports = InterviewSession;