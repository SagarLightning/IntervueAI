require('dotenv').config();
const { generateResumePDF } = require('./src/services/ai.service');

async function testResume() {
    try {
        console.log("Testing PDF AI...");
        const result = await generateResumePDF({
            resume: "test resume",
            jobDescription: "test job",
            selfDescription: "test self"
        });
        console.log("SUCCESS, buffer length:", result.length);
    } catch (err) {
        console.error("FAILED:");
        console.error(err);
    }
}

testResume();
