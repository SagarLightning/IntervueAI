require('dotenv').config();
const { generateInterviewReport } = require('./src/services/ai.service');

async function testAI() {
    try {
        console.log("Testing AI...");
        const result = await generateInterviewReport({
            resume: "I am a frontend developer with 5 years of experience in React and Node.js.",
            jobDescription: "We need a frontend developer who knows React.",
            selfDescription: "I love building UIs."
        });
        console.log("SUCCESS:", JSON.stringify(result).substring(0, 100));
    } catch (err) {
        console.error("FAILED:", err);
    }
}

testAI();
