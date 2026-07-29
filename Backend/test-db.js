require('dotenv').config();
const mongoose = require('mongoose');
const { generateInterviewReport } = require('./src/services/ai.service');
const interviewReportModel = require('./src/models/interviewReport.model');

async function testDB() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const result = await generateInterviewReport({
            resume: "I am a frontend developer with 5 years of experience in React and Node.js.",
            jobDescription: "We need a frontend developer who knows React.",
            selfDescription: "I love building UIs."
        });
        const doc = new interviewReportModel({
            user: new mongoose.Types.ObjectId(),
            resume: "test",
            jobDescription: "test",
            ...result
        });
        await doc.validate();
        console.log("Validation SUCCESS");
    } catch (err) {
        console.error("Validation FAILED:", err);
    } finally {
        mongoose.disconnect();
    }
}

testDB();
