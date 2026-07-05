const express = require("express");
const router = express.Router();
const {
  startSession,
  submitAnswer,
  nextRound,
  finishSession,
  getSession,
  listSessions,
} = require("../controllers/interviewSession.controller.js");
const { authUser } = require("../middlewares/auth.middleware.js");

// all routes protected
router.use(authUser);

router.post("/start", startSession);
router.post("/:sessionId/answer", submitAnswer);
router.post("/:sessionId/next-round", nextRound);
router.post("/:sessionId/finish", finishSession);
router.get("/:sessionId", getSession);
router.get("/", listSessions);

module.exports = router;