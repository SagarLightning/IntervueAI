const mongoose = require("mongoose");

const codingSubmissionSchema = new mongoose.Schema(
    {
        session: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "InterviewSession",
            required: true,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Users",
            required: true,
        },
        question: { type: String, required: true },
        code: { type: String, required: true },
        language: { type: String, required: true },

        // piston execution result
        stdout: { type: String, default: "" },
        stderr: { type: String, default: "" },
        exitCode: { type: Number, default: 0 },
        executionSuccess: { type: Boolean, default: false },

        // gemini evaluation
        score: { type: Number, default: null },           // 0–10
        correctness: { type: Boolean, default: false },
        timeComplexity: { type: String, default: "" },
        spaceComplexity: { type: String, default: "" },
        feedback: { type: String, default: "" },
        improvements: [String],
        passedTestCases: { type: Boolean, default: false },

        // attempt tracking
        attemptNumber: { type: Number, default: 1 },
    },
    { timestamps: true }
);

const CodingSubmission = mongoose.model("CodingSubmission", codingSubmissionSchema);

module.exports = CodingSubmission;