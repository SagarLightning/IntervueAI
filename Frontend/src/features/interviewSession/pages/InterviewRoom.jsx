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

const LOADING_TEXTS = [
    "Evaluating your answer...",
    "Thinking...",
    "Reviewing your project explanation...",
    "Analyzing your response..."
];

export default function InterviewRoom() {
    const { sessionId } = useParams();
    const navigate = useNavigate();
    const { fetchSession, submitAnswer, nextRound, finishSession, loading, error } =
        useInterviewSession();

    const [session, setSession] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answer, setAnswer] = useState("");
    const [followUpAnswer, setFollowUpAnswer] = useState("");
    const [evaluatingIndex, setEvaluatingIndex] = useState(null);
    const [evaluatingType, setEvaluatingType] = useState(null); // "answer" | "followup"
    const [loadingTextIdx, setLoadingTextIdx] = useState(0);
    const [finishing, setFinishing] = useState(false);

    const textareaRef = useRef(null);
    const bottomRef = useRef(null);

    useEffect(() => {
        loadSession();
    }, [sessionId]);

    useEffect(() => {
        if (!loading) return;
        const interval = setInterval(() => {
            setLoadingTextIdx((prev) => (prev + 1) % LOADING_TEXTS.length);
        }, 2200);
        return () => clearInterval(interval);
    }, [loading]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [questions, loading, currentIndex]);

    async function loadSession() {
        const data = await fetchSession(sessionId);
        if (!data) return;
        if (data.currentRound === "coding") {
            navigate(`/interview-session/${sessionId}/coding`);
            return;
        }
        setSession(data);

        const roundQuestions = data.transcript.filter(
            (t) => t.round === data.currentRound
        );
        const mappedQuestions = roundQuestions.map((q) => ({
            round: q.round,
            questionIndex: q.questionIndex,
            question: q.question,
            answer: q.answer || "",
            score: q.score ?? null,
            feedback: q.feedback || "",
            followUpQuestion: q.followUpQuestion || null,
            followUpAnswer: q.followUpAnswer || "",
            followUpFeedback: q.followUpAnswer
                ? "Your follow-up explanation has been verified and added to your evaluation."
                : "",
        }));
        setQuestions(mappedQuestions);

        let initialIndex = data.currentQuestionIndex || 0;
        const firstUnanswered = mappedQuestions.findIndex((q) => !isTurnComplete(q));
        if (firstUnanswered !== -1) {
            initialIndex = Math.max(initialIndex, firstUnanswered);
        } else if (mappedQuestions.length > 0 && isTurnComplete(mappedQuestions[mappedQuestions.length - 1])) {
            initialIndex = mappedQuestions.length - 1;
        }
        setCurrentIndex(initialIndex);
    }

    const isTurnComplete = (q) => {
        if (!q || q.score === null || q.score === undefined) return false;
        if (q.followUpQuestion && !q.followUpAnswer) return false;
        return true;
    };

    async function handleSubmitAnswer(qIndex) {
        if (!answer.trim() || loading) return;

        setEvaluatingIndex(qIndex);
        setEvaluatingType("answer");

        try {
            const result = await submitAnswer({
                sessionId,
                questionIndex: qIndex,
                answer,
                isFollowUp: false,
            });

            if (!result) return;

            setQuestions((prev) =>
                prev.map((q, idx) =>
                    idx === currentIndex
                        ? {
                            ...q,
                            answer: answer,
                            score: result.score,
                            feedback: result.feedback,
                            followUpQuestion: result.followUpQuestion || null,
                        }
                        : q
                )
            );
            setAnswer("");
        } finally {
            setEvaluatingIndex(null);
        }
    }

    async function handleSubmitFollowUp(qIndex) {
        if (!followUpAnswer.trim() || loading) return;

        setEvaluatingIndex(qIndex);
        setEvaluatingType("followup");

        try {
            const result = await submitAnswer({
                sessionId,
                questionIndex: qIndex,
                answer: followUpAnswer,
                isFollowUp: true,
            });

            if (!result) return;

            setQuestions((prev) =>
                prev.map((q, idx) =>
                    idx === currentIndex
                        ? {
                            ...q,
                            followUpAnswer: followUpAnswer,
                            followUpFeedback:
                                result.message ||
                                "Your follow-up explanation has been verified and added to your evaluation.",
                        }
                        : q
                )
            );
            setFollowUpAnswer("");
        } finally {
            setEvaluatingIndex(null);
        }
    }

    function handleNextQuestion() {
        if (currentIndex + 1 < questions.length) {
            setCurrentIndex((prev) => prev + 1);
            setAnswer("");
            setFollowUpAnswer("");
            setTimeout(() => {
                textareaRef.current?.focus();
            }, 100);
        }
    }

    async function handleContinueOrFinish() {
        const nextIdx = ROUND_ORDER.indexOf(session.currentRound) + 1;
        const nextRoundName = ROUND_ORDER[nextIdx];

        if (session.interviewType === "full" && nextRoundName !== "final" && nextRoundName) {
            const result = await nextRound(sessionId);
            if (!result) return;
            if (result.round === "coding") {
                navigate(`/interview-session/${sessionId}/coding`);
                return;
            }
            setSession((prev) => ({ ...prev, currentRound: result.round }));
            setQuestions(
                result.questions.map((q) => ({
                    round: result.round,
                    questionIndex: q.index,
                    question: q.question,
                    answer: "",
                    score: null,
                    feedback: "",
                    followUpQuestion: null,
                    followUpAnswer: "",
                    followUpFeedback: "",
                }))
            );
            setCurrentIndex(0);
        } else {
            await handleFinish();
        }
    }

    async function handleFinish() {
        setFinishing(true);
        try {
            await finishSession(sessionId);
        } catch (err) {
            console.warn("Finish session error:", err);
        } finally {
            navigate(`/interview-session/${sessionId}/result`);
        }
    }

    async function handleEndInterview() {
        if (
            window.confirm(
                "Are you sure you want to end this interview early and view your results?"
            )
        ) {
            await handleFinish();
        }
    }

    const calculateOverallScore = () => {
        if (!questions.length) return 75;
        const total = questions.reduce((acc, q) => acc + (q.score || 0), 0);
        return Math.round((total / questions.length) * 10);
    };

    const getRoundSummary = () => {
        const score = calculateOverallScore();
        if (score >= 85)
            return "Outstanding performance across all resume discussion topics. You demonstrated deep domain expertise and clear project communication.";
        if (score >= 70)
            return "Solid performance in explaining your resume background. Your technical explanations were well structured with minor areas for refinement.";
        return "Completed resume discussion round. Focus on structuring project outcomes and STAR methodology in future responses.";
    };

    const getNextButtonText = () => {
        if (loading) return "Processing...";
        if (session.interviewType !== "full") return "End Interview →";
        
        const nextIdx = ROUND_ORDER.indexOf(session.currentRound) + 1;
        const nextRoundName = ROUND_ORDER[nextIdx];
        
        if (nextRoundName === "final" || !nextRoundName) {
            return "End Interview →";
        }
        return `Continue to ${ROUND_LABELS[nextRoundName]} →`;
    };

    if (finishing || !session || questions.length === 0) {
        return (
            <div className={styles.loadingScreen}>
                <div className={styles.spinner} />
                <p>{finishing ? "Ending interview and generating your final evaluation report..." : "Loading session..."}</p>
            </div>
        );
    }

    const displayedQuestions = questions.slice(0, currentIndex + 1);
    const isRoundFullyDone = currentIndex === questions.length - 1 && isTurnComplete(questions[currentIndex]);

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
                <button
                    onClick={handleEndInterview}
                    className={styles.endInterviewBtn}
                    title="End interview early and view results"
                >
                    ⏹ End Interview
                </button>
            </div>

            {/* ── Main content (Continuous Growing Transcript) ── */}
            <div className={styles.main}>
                {/* Greeting Message */}
                <div
                    className={styles.questionCard}
                    style={{
                        borderColor: "#6c63ff40",
                        background: "rgba(108, 99, 255, 0.06)",
                    }}
                >
                    <span className={styles.questionLabel} style={{ color: "#6c63ff" }}>
                        AI Interviewer
                    </span>
                    <p className={styles.questionText}>
                        Welcome to your {ROUND_LABELS[session.currentRound] || "Resume"} round! I will be asking you {questions.length} questions to explore your background and experience. Let's get started.
                    </p>
                </div>

                {displayedQuestions.map((q, i) => {
                    const isCurrent = i === currentIndex;
                    const isTurnEvaluatingAnswer = loading && evaluatingIndex === i && evaluatingType === "answer";
                    const isTurnEvaluatingFollowUp = loading && evaluatingIndex === i && evaluatingType === "followup";

                    return (
                        <div key={`turn-${i}`} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                            {/* AI Question */}
                            <div className={styles.questionCard}>
                                <span className={styles.questionLabel}>Question {i + 1}</span>
                                <p className={styles.questionText}>{q.question}</p>
                            </div>

                            {/* Candidate Answer Phase */}
                            {isCurrent && !q.answer && !isTurnEvaluatingAnswer && (
                                <div className={styles.answerSection}>
                                    <textarea
                                        ref={textareaRef}
                                        className={styles.textarea}
                                        placeholder="Type your answer here..."
                                        value={answer}
                                        onChange={(e) => setAnswer(e.target.value)}
                                        rows={6}
                                        disabled={loading}
                                    />
                                    <button
                                        className={styles.primaryBtn}
                                        onClick={() => handleSubmitAnswer(i)}
                                        disabled={loading || !answer.trim()}
                                    >
                                        Submit Answer →
                                    </button>
                                </div>
                            )}

                            {/* Candidate Submitted Answer Card */}
                            {q.answer && (
                                <div
                                    className={styles.questionCard}
                                    style={{ background: "#141414", borderColor: "#2a2a2a" }}
                                >
                                    <span
                                        className={styles.questionLabel}
                                        style={{ color: "#6c63ff" }}
                                    >
                                        Candidate
                                    </span>
                                    <p className={styles.questionText}>{q.answer}</p>
                                </div>
                            )}

                            {/* Evaluating Typing Indicator for Main Answer */}
                            {isTurnEvaluatingAnswer && (
                                <div
                                    className={styles.questionCard}
                                    style={{
                                        display: "flex",
                                        flexDirection: "row",
                                        alignItems: "center",
                                        gap: "1rem",
                                        background: "#141414",
                                    }}
                                >
                                    <div
                                        className={styles.spinner}
                                        style={{ width: "22px", height: "22px", borderWidth: "2px", flexShrink: 0 }}
                                    />
                                    <p
                                        className={styles.questionText}
                                        style={{ color: "#888", fontStyle: "italic", fontSize: "0.95rem" }}
                                    >
                                        {LOADING_TEXTS[loadingTextIdx]}
                                    </p>
                                </div>
                            )}

                            {/* AI Evaluation Card */}
                            {q.score !== null && q.feedback && (
                                <div className={styles.feedbackSection}>
                                    <div className={styles.scoreRow}>
                                        <span className={styles.scoreLabel}>Evaluation</span>
                                        <span
                                            className={`${styles.scoreBadge} ${q.score >= 7
                                                ? styles.scoreHigh
                                                : q.score >= 4
                                                    ? styles.scoreMid
                                                    : styles.scoreLow
                                                }`}
                                        >
                                            {q.score} / 10
                                        </span>
                                    </div>
                                    <p className={styles.feedbackText}>{q.feedback}</p>
                                </div>
                            )}

                            {/* AI Follow-up Question Card */}
                            {q.followUpQuestion && (
                                <div className={styles.followUpSection}>
                                    <div className={styles.followUpBadge}>Follow-up Question</div>
                                    <p className={styles.followUpQuestion}>{q.followUpQuestion}</p>
                                </div>
                            )}

                            {/* Candidate Follow-up Answer Phase */}
                            {isCurrent && q.followUpQuestion && !q.followUpAnswer && !isTurnEvaluatingFollowUp && (
                                <div className={styles.followUpSection}>
                                    <textarea
                                        className={styles.textarea}
                                        placeholder="Answer the follow-up..."
                                        value={followUpAnswer}
                                        onChange={(e) => setFollowUpAnswer(e.target.value)}
                                        rows={4}
                                        disabled={loading}
                                    />
                                    <button
                                        className={styles.primaryBtn}
                                        onClick={() => handleSubmitFollowUp(i)}
                                        disabled={loading || !followUpAnswer.trim()}
                                    >
                                        Submit Follow-up →
                                    </button>
                                </div>
                            )}

                            {/* Candidate Submitted Follow-up Answer Card */}
                            {q.followUpAnswer && (
                                <div
                                    className={styles.questionCard}
                                    style={{ background: "#141414", borderColor: "#2a2a2a" }}
                                >
                                    <span
                                        className={styles.questionLabel}
                                        style={{ color: "#ff9f43" }}
                                    >
                                        Candidate (Follow-up Answer)
                                    </span>
                                    <p className={styles.questionText}>{q.followUpAnswer}</p>
                                </div>
                            )}

                            {/* Evaluating Typing Indicator for Follow-up Answer */}
                            {isTurnEvaluatingFollowUp && (
                                <div
                                    className={styles.questionCard}
                                    style={{
                                        display: "flex",
                                        flexDirection: "row",
                                        alignItems: "center",
                                        gap: "1rem",
                                        background: "#141414",
                                    }}
                                >
                                    <div
                                        className={styles.spinner}
                                        style={{
                                            width: "22px",
                                            height: "22px",
                                            borderWidth: "2px",
                                            borderTopColor: "#ff9f43",
                                            flexShrink: 0,
                                        }}
                                    />
                                    <p
                                        className={styles.questionText}
                                        style={{ color: "#888", fontStyle: "italic", fontSize: "0.95rem" }}
                                    >
                                        {LOADING_TEXTS[loadingTextIdx]}
                                    </p>
                                </div>
                            )}

                            {/* AI Follow-up Evaluation Card */}
                            {q.followUpAnswer && (
                                <div className={styles.feedbackSection}>
                                    <div className={styles.scoreRow}>
                                        <span className={styles.scoreLabel}>Follow-up Evaluation</span>
                                        <span
                                            className={`${styles.scoreBadge} ${q.score >= 7
                                                ? styles.scoreHigh
                                                : q.score >= 4
                                                    ? styles.scoreMid
                                                    : styles.scoreLow
                                                }`}
                                        >
                                            {q.score} / 10
                                        </span>
                                    </div>
                                    <p className={styles.feedbackText}>
                                        {q.followUpFeedback ||
                                            "Your follow-up explanation has been verified and added to your evaluation."}
                                    </p>
                                </div>
                            )}

                            {/* Next Question Button */}
                            {isCurrent && isTurnComplete(q) && i < questions.length - 1 && (
                                <div style={{ padding: "0.5rem 0", display: "flex", justifyContent: "flex-start" }}>
                                    <button
                                        className={styles.primaryBtn}
                                        onClick={handleNextQuestion}
                                    >
                                        Next Question →
                                    </button>
                                </div>
                            )}

                            {/* Divider between completed questions */}
                            {i < currentIndex && (
                                <hr style={{ border: "none", borderTop: "1px solid #222", margin: "0.5rem 0" }} />
                            )}
                        </div>
                    );
                })}

                {/* Resume Round Completion Panel */}
                {isRoundFullyDone && (
                    <div className={styles.roundEndSection} style={{ marginTop: "1.5rem" }}>
                        <h2 className={styles.roundEndTitle}>
                            {ROUND_LABELS[session.currentRound] || "Resume Round"} Complete
                        </h2>
                        <div className={styles.roundScoreBlock}>
                            <span className={styles.roundScoreNum}>{calculateOverallScore()}</span>
                            <span className={styles.roundScoreLabel}> / 100</span>
                            <p className={styles.roundSummary}>{getRoundSummary()}</p>
                        </div>
                        <button
                            className={styles.primaryBtn}
                            onClick={handleContinueOrFinish}
                            disabled={loading}
                        >
                            {getNextButtonText()}
                        </button>
                    </div>
                )}

                <div ref={bottomRef} />
            </div>

            {error && <p className={styles.errorToast}>{error}</p>}
        </div>
    );
}