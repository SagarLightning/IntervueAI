import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { useInterviewSession } from "../hooks/useInterviewSession";
import styles from "../style/InterviewRoom.module.scss";

const ROUND_ORDER = ["resume", "technical", "coding", "behavioral", "final"];

const ROUND_LABELS = {
    resume: "Resume Discussion",
    technical: "Technical Round",
    coding: "Coding Round",
    behavioral: "Behavioral Round",
    final: "Final Round",
};

export default function InterviewRoom() {
    const { sessionId } = useParams();
    const navigate = useNavigate();
    const { fetchSession, submitAnswer, nextRound, finishSession, loading, error } =
        useInterviewSession();

    const [session, setSession] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answer, setAnswer] = useState("");
    const [feedback, setFeedback] = useState(null);       // { score, feedback, followUpQuestion }
    const [followUpAnswer, setFollowUpAnswer] = useState("");
    const [followUpDone, setFollowUpDone] = useState(false);
    const [roundScore, setRoundScore] = useState(null);
    const [phase, setPhase] = useState("answering");
    // phases: "answering" | "feedback" | "followup" | "roundEnd" | "finished"

    const textareaRef = useRef(null);

    useEffect(() => {
        loadSession();
    }, [sessionId]);

    async function loadSession() {
        const data = await fetchSession(sessionId);
        if (!data) return;
        setSession(data);

        const roundQuestions = data.transcript.filter(
            (t) => t.round === data.currentRound
        );
        setQuestions(roundQuestions);
        setCurrentIndex(data.currentQuestionIndex || 0);
    }

    // current question entry from transcript
    const currentEntry = questions[currentIndex];

    async function handleSubmitAnswer() {
        if (!answer.trim()) return;

        const result = await submitAnswer({
            sessionId,
            questionIndex: currentEntry.questionIndex,
            answer,
            isFollowUp: false,
        });

        if (!result) return;

        setFeedback(result);
        setAnswer("");

        if (result.followUpQuestion) {
            setPhase("followup");
        } else {
            setPhase("feedback");
        }
    }

    async function handleSubmitFollowUp() {
        if (!followUpAnswer.trim()) return;

        await submitAnswer({
            sessionId,
            questionIndex: currentEntry.questionIndex,
            answer: followUpAnswer,
            isFollowUp: true,
        });

        setFollowUpAnswer("");
        setFollowUpDone(true);
        setPhase("feedback");
    }

    function handleNextQuestion() {
        if (currentIndex + 1 < questions.length) {
            setCurrentIndex((prev) => prev + 1);
            setFeedback(null);
            setFollowUpDone(false);
            setPhase("answering");
        } else {
            setPhase("roundEnd");
        }
    }

    async function handleNextRound() {
        const currentRoundIndex = ROUND_ORDER.indexOf(session.currentRound);
        const isLastRound = currentRoundIndex === ROUND_ORDER.length - 2; // before "final"

        if (isLastRound) {
            handleFinish();
            return;
        }

        const result = await nextRound(sessionId);
        if (!result) return;

        setRoundScore(result.roundScore);
        setSession((prev) => ({ ...prev, currentRound: result.round }));
        setQuestions(
            result.questions.map((q) => ({
                round: result.round,
                questionIndex: q.index,
                question: q.question,
            }))
        );
        setCurrentIndex(0);
        setFeedback(null);
        setFollowUpDone(false);
        setPhase("answering");
    }

    async function handleFinish() {
        const result = await finishSession(sessionId);
        if (result) {
            navigate(`/interview-session/${sessionId}/result`);
        }
    }

    if (!session || !currentEntry) {
        return (
            <div className={styles.loadingScreen}>
                <div className={styles.spinner} />
                <p>Loading session...</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>

            {/* ── Top bar ── */}
            <div className={styles.topBar}>
                <div className={styles.roundBadge}>
                    {ROUND_LABELS[session.currentRound] || session.currentRound}
                </div>
                <div className={styles.progress}>
                    Q{currentIndex + 1} / {questions.length}
                </div>
                <div className={styles.roundSteps}>
                    {/* {ROUND_ORDER.filter((r) => r !== "final").map((r) => (
            <div
              key={r}
              className={`${styles.step} ${
                r === session.currentRound
                  ? styles.stepActive
                  : ROUND_ORDER.indexOf(r) 
                    ROUND_ORDER.indexOf(session.currentRound)
                  ? styles.stepDone
                  : ""
              }`}
            />
          ))} */}
                    {ROUND_ORDER.filter((r) => r !== "final").map((r) => {
                        const idx = ROUND_ORDER.indexOf(r);
                        const currentIdx = ROUND_ORDER.indexOf(session.currentRound);
                        return (
                            <div
                                key={r}
                                className={`${styles.step} ${r === session.currentRound
                                    ? styles.stepActive
                                    : idx < currentIdx
                                        ? styles.stepDone
                                        : ""
                                    }`}
                            />
                        );
                    })}
                </div>
            </div>

            {/* ── Main content ── */}
            <div className={styles.main}>

                {/* Question card */}
                <div className={styles.questionCard}>
                    <span className={styles.questionLabel}>Question {currentIndex + 1}</span>
                    <p className={styles.questionText}>{currentEntry.question}</p>
                </div>

                {/* Answer phase */}
                {phase === "answering" && (
                    <div className={styles.answerSection}>
                        <textarea
                            ref={textareaRef}
                            className={styles.textarea}
                            placeholder="Type your answer here..."
                            value={answer}
                            onChange={(e) => setAnswer(e.target.value)}
                            rows={6}
                        />
                        <button
                            className={styles.primaryBtn}
                            onClick={handleSubmitAnswer}
                            disabled={loading || !answer.trim()}
                        >
                            {loading ? "Evaluating..." : "Submit Answer →"}
                        </button>
                    </div>
                )}

                {/* Follow-up phase */}
                {phase === "followup" && feedback?.followUpQuestion && (
                    <div className={styles.followUpSection}>
                        <div className={styles.followUpBadge}>Follow-up Question</div>
                        <p className={styles.followUpQuestion}>{feedback.followUpQuestion}</p>
                        <textarea
                            className={styles.textarea}
                            placeholder="Answer the follow-up..."
                            value={followUpAnswer}
                            onChange={(e) => setFollowUpAnswer(e.target.value)}
                            rows={4}
                        />
                        <button
                            className={styles.primaryBtn}
                            onClick={handleSubmitFollowUp}
                            disabled={loading || !followUpAnswer.trim()}
                        >
                            {loading ? "Submitting..." : "Submit Follow-up →"}
                        </button>
                    </div>
                )}

                {/* Feedback phase */}
                {phase === "feedback" && feedback && (
                    <div className={styles.feedbackSection}>
                        <div className={styles.scoreRow}>
                            <span className={styles.scoreLabel}>Score</span>
                            <span
                                className={`${styles.scoreBadge} ${feedback.score >= 7
                                    ? styles.scoreHigh
                                    : feedback.score >= 4
                                        ? styles.scoreMid
                                        : styles.scoreLow
                                    }`}
                            >
                                {feedback.score} / 10
                            </span>
                        </div>
                        <p className={styles.feedbackText}>{feedback.feedback}</p>
                        <button
                            className={styles.primaryBtn}
                            onClick={handleNextQuestion}
                        >
                            {currentIndex + 1 < questions.length
                                ? "Next Question →"
                                : "End Round →"}
                        </button>
                    </div>
                )}

                {/* Round end phase */}
                {phase === "roundEnd" && (
                    <div className={styles.roundEndSection}>
                        <h2 className={styles.roundEndTitle}>
                            {ROUND_LABELS[session.currentRound]} Complete
                        </h2>
                        {roundScore && (
                            <div className={styles.roundScoreBlock}>
                                <span className={styles.roundScoreNum}>{roundScore.score}</span>
                                <span className={styles.roundScoreLabel}> / 100</span>
                                <p className={styles.roundSummary}>{roundScore.summary}</p>
                            </div>
                        )}
                        <button
                            className={styles.primaryBtn}
                            onClick={handleNextRound}
                            disabled={loading}
                        >
                            {loading
                                ? "Loading next round..."
                                : ROUND_ORDER.indexOf(session.currentRound) >=
                                    ROUND_ORDER.length - 2
                                    ? "Finish Interview →"
                                    : `Start ${ROUND_LABELS[ROUND_ORDER[ROUND_ORDER.indexOf(session.currentRound) + 1]]} →`}
                        </button>
                    </div>
                )}

            </div>

            {error && <p className={styles.errorToast}>{error}</p>}

        </div>
    );
}