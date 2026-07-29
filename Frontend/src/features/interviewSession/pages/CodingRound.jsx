import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { useInterviewSession } from "../hooks/useInterviewSession";
import {
    runCodeAPI,
    submitCodeAPI,
    getSubmissionsAPI,
} from "../services/coding.api";
import ProblemCard from "../components/coding/ProblemCard";
import InterviewChat from "../components/coding/InterviewChat";
import CodeEditorPanel, { DEFAULT_CODE } from "../components/coding/CodeEditorPanel";
import ConsoleOutput from "../components/coding/ConsoleOutput";
import EvaluationCard from "../components/coding/EvaluationCard";
import RoundCompletion from "../components/coding/RoundCompletion";
import { useCodingStage } from "../hooks/useCodingStage";
import { useCodingDiscussion } from "../hooks/useCodingDiscussion";
import { parseProblem } from "../utils/problemParser";
import {
    getWelcomeMessage,
    getProblemIntroMessage,
    getReadyTransition,
    getCodingTransition,
    getReviewTransition,
    getNextProblemTransition,
    getRoundCompleteMessage,
    getPreCodingQuestions,
    getPostCodingQuestions,
} from "../utils/discussionGenerator";
import styles from "../style/CodingRound.module.scss";

export default function CodingRound() {
    const { sessionId } = useParams();
    const navigate = useNavigate();
    const { fetchSession, nextRound, finishSession, loading: sessionLoading } = useInterviewSession();

    const [session, setSession] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);

    const [language, setLanguage] = useState("javascript");
    const [code, setCode] = useState(DEFAULT_CODE["javascript"]);
    const [stdin, setStdin] = useState("");

    const [output, setOutput] = useState(null);
    const [evaluation, setEvaluation] = useState(null);
    const [submissions, setSubmissions] = useState([]);

    const [running, setRunning] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [finishing, setFinishing] = useState(false);
    const [error, setError] = useState(null);
    const [roundFinished, setRoundFinished] = useState(false);

    const {
        stage,
        stageIndex,
        stages,
        goToDiscussion,
        goToCoding,
        goToReview,
        resetForNextProblem,
        isUnderstand,
        isDiscussion,
        isCoding,
        isReview,
    } = useCodingStage();

    const {
        messages,
        isDiscussionComplete,
        isEvaluating,
        evaluatingText,
        addSystemMessage,
        startDiscussion,
        submitAnswer: submitChatAnswer,
        resetDiscussionState,
    } = useCodingDiscussion();

    useEffect(() => {
        loadSession();
    }, [sessionId]);

    async function loadSession() {
        const data = await fetchSession(sessionId);
        if (!data) return;
        setSession(data);

        let codingQuestions = data.transcript.filter((t) => t.round === "coding");

        // If no coding questions yet, advance rounds until coding round is generated
        if (codingQuestions.length === 0) {
            try {
                let current = data.currentRound;
                while (current && current !== "coding") {
                    const nextData = await nextRound(sessionId);
                    if (!nextData) break;
                    current = nextData.round;
                }
                const refreshed = await fetchSession(sessionId);
                if (refreshed) {
                    setSession(refreshed);
                    codingQuestions = refreshed.transcript.filter((t) => t.round === "coding");
                }
            } catch (e) {
                console.error("Error advancing to coding round:", e);
            }
        }

        setQuestions(codingQuestions);
        loadSubmissions();

        // Welcome message + Problem 1 intro
        if (codingQuestions.length > 0 && messages.length === 0) {
            addSystemMessage(getWelcomeMessage());
            addSystemMessage(getProblemIntroMessage(1));
        }
    }

    async function loadSubmissions() {
        try {
            const data = await getSubmissionsAPI(sessionId);
            setSubmissions(data || []);
        } catch (err) {
            console.error("Failed to load submissions:", err);
        }
    }

    // Automatically transition from pre-coding discussion to coding stage
    useEffect(() => {
        if (isDiscussion && isDiscussionComplete) {
            addSystemMessage(getCodingTransition());
            goToCoding();
        }
    }, [isDiscussion, isDiscussionComplete]);

    // Automatically initialize editor with problem starterCode if available
    useEffect(() => {
        const q = questions[currentIndex];
        if (q) {
            const parsed = parseProblem(q.question || "");
            if (parsed.starterCode && language === "javascript") {
                setCode(parsed.starterCode);
            }
        }
    }, [currentIndex, questions]);

    function handleReady() {
        addSystemMessage(getReadyTransition());
        goToDiscussion();
        startDiscussion(getPreCodingQuestions());
    }

    function handleLanguageChange(lang) {
        setLanguage(lang);
        setCode(DEFAULT_CODE[lang]);
        setOutput(null);
        setError(null);
    }

    async function handleRun() {
        if (!code.trim()) return;
        setRunning(true);
        setError(null);
        setOutput(null);
        try {
            const result = await runCodeAPI({ code, language, stdin });
            setOutput(result);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to run code");
        } finally {
            setRunning(false);
        }
    }

    async function handleSubmit() {
        if (!code.trim()) return;
        setSubmitting(true);
        setError(null);
        try {
            const result = await submitCodeAPI({
                sessionId,
                questionIndex: currentIndex,
                code,
                language,
            });

            if (result.submission) {
                setSubmissions((prev) => [result.submission, ...prev]);
            }
            if (result.evaluation) {
                setEvaluation(result.evaluation);
            }

            addSystemMessage(getReviewTransition());
            goToReview();
            startDiscussion(getPostCodingQuestions());
        } catch (err) {
            setError(err.response?.data?.message || "Failed to submit code");
        } finally {
            setSubmitting(false);
        }
    }

    function handleNextProblem() {
        if (currentIndex + 1 < questions.length) {
            addSystemMessage(getNextProblemTransition());
            const nextIdx = currentIndex + 1;
            setCurrentIndex(nextIdx);
            addSystemMessage(getProblemIntroMessage(nextIdx + 1));

            resetForNextProblem();
            resetDiscussionState();

            setCode(DEFAULT_CODE[language]);
            setOutput(null);
            setEvaluation(null);
            setError(null);
        } else {
            addSystemMessage(getRoundCompleteMessage());
            setRoundFinished(true);
        }
    }

    async function handleContinueRound() {
        setFinishing(true);
        try {
            if (session?.interviewType === "full") {
                const res = await nextRound(sessionId);
                if (res?.round) {
                    navigate(`/interview-session/${sessionId}`);
                    return;
                }
            }
            await finishSession(sessionId);
        } catch (e) {
            console.error(e);
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
            setFinishing(true);
            try {
                await finishSession(sessionId);
            } catch (err) {
                console.warn("Finish session error:", err);
            } finally {
                navigate(`/interview-session/${sessionId}/result`);
            }
        }
    }

    if (finishing || !session || questions.length === 0) {
        return (
            <div className={styles.loadingScreen}>
                <div className={styles.spinner} />
                <p>
                    {finishing
                        ? "Ending interview and generating your final evaluation report..."
                        : "Preparing Coding Round..."}
                </p>
            </div>
        );
    }

    if (roundFinished) {
        return (
            <RoundCompletion
                submissions={submissions}
                questions={questions}
                onContinue={handleContinueRound}
                loading={finishing || sessionLoading}
            />
        );
    }

    const currentQ = questions[currentIndex];
    const parsedProblem = parseProblem(currentQ?.question || "");
    const editorDisabled = !isCoding;

    return (
        <div className={styles.container}>
            {/* Top Bar */}
            <div className={styles.topBar}>
                <span className={styles.roundBadge}>Coding Round</span>
                <span className={styles.progress}>
                    Problem {currentIndex + 1} of {questions.length}
                </span>

                <div className={styles.stageIndicator}>
                    {stages.map((s, idx) => (
                        <div
                            key={s}
                            className={`${styles.stageDot} ${
                                idx === stageIndex
                                    ? styles.stageDotActive
                                    : idx < stageIndex
                                    ? styles.stageDotDone
                                    : ""
                            }`}
                            title={`Stage: ${s}`}
                        />
                    ))}
                </div>

                <button
                    className={styles.endInterviewBtn}
                    onClick={handleEndInterview}
                    title="End interview early and view results"
                >
                    ⏹ End Interview
                </button>
            </div>

            {/* 3-Column Conversational Interview Workspace */}
            <div className={styles.main}>
                {/* Left Column: Continuous AI Interviewer Chat */}
                <div className={styles.chatPanel}>
                    <InterviewChat
                        messages={messages}
                        isEvaluating={isEvaluating}
                        evaluatingText={evaluatingText}
                        onSubmitAnswer={submitChatAnswer}
                        inputDisabled={isUnderstand || isCoding}
                    />
                </div>

                {/* Center Column: Problem Statement + Console / Review */}
                <div className={styles.centerPanel}>
                    <ProblemCard
                        problem={parsedProblem}
                        questionIndex={currentIndex}
                    />

                    {isUnderstand && (
                        <button className={styles.readyBtn} onClick={handleReady}>
                            I&apos;m Ready to Discuss →
                        </button>
                    )}

                    {isReview && evaluation && (
                        <EvaluationCard evaluation={evaluation} />
                    )}

                    {isReview && isDiscussionComplete && (
                        <button
                            className={styles.nextProblemBtn}
                            onClick={handleNextProblem}
                        >
                            {currentIndex + 1 < questions.length
                                ? "Next Problem →"
                                : "Finish Coding Round →"}
                        </button>
                    )}

                    {output && <ConsoleOutput output={output} />}
                </div>

                {/* Right Column: Code Editor */}
                <div className={styles.editorPanel}>
                    <CodeEditorPanel
                        code={code}
                        onCodeChange={setCode}
                        language={language}
                        onLanguageChange={handleLanguageChange}
                        onRun={handleRun}
                        onSubmit={handleSubmit}
                        disabled={editorDisabled}
                        running={running}
                        submitting={submitting}
                        stdin={stdin}
                        onStdinChange={setStdin}
                        error={error}
                    />
                </div>
            </div>
        </div>
    );
}