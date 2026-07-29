const express = require("express");
const router = express.Router();
const {
    runCode,
    submitCode,
    getSubmissions,
    getSupportedLanguages,
} = require("../controllers/coding.controller.js");
const { authUser } = require("../middlewares/auth.middleware.js");

router.use(authUser);

router.post("/run", runCode);
router.post("/:sessionId/submit", submitCode);
router.get("/:sessionId/submissions", getSubmissions);
router.get("/languages", getSupportedLanguages);

module.exports = router;