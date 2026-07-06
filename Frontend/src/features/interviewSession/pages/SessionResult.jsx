import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useInterviewSession } from "../hooks/useInterviewSession";
import styles from "../style/SessionResult.module.scss";

const ROUND_LABELS = {
    resume: "Resume Discussion",
    technical: "Technical Round",
    coding: "Coding Round",
    behavioral: "Behavioral Round",
    final: "Final Round",
};

const LEETCODE_COLORS = {
    Easy: { bg: "#2ecc7120", color: "#2ecc71" },
    Medium: { bg: "#f39c1220", color: "#f39c12" },
    Hard: { bg: "#e74c3c20", color: "#e74c3c" },
};

export default function SessionResult() {
    const { sessionId } = useParams();
    const navigate = useNavigate();
    const { fetchSession, loading } = useInterviewSession();

    const [session, setSession] = useState(null);

    useEffect(() => {
        fetchSession(sessionId).then((data) => {
            if (data) setSession(data);
        });
    }, [sessionId]);

    if (loading || !session) {
        return (
            <div className={styles.loadingScreen}>
                <div className={styles.spinner} />
                <p>Loading results...</p>
            </div>
        );
    }

    const { finalScore, finalFeedback, roundScores } = session;

    function getScoreColor(score) {
        if (score >= 75) return styles.scoreHigh;
        if (score >= 50) return styles.scoreMid;
        return styles.scoreLow;
    }

    return (
        <div className={styles.container}>
            <div className={styles.inner}>

                {/* ── Header ── */}
                <div className={styles.header}>
                    <h1 className={styles.title}>Interview Complete</h1>
                    <p className={styles.subtitle}>
                        {session.role && session.company
                            ? `${session.role} at ${session.company}`
                            : session.role || session.company || "Mock Interview"}
                    </p>
                </div>

                {/* ── Final score ── */}
                <div className={styles.finalScoreCard}>
                    <span className={styles.finalScoreLabel}>Overall Score</span>
                    <div className={`${styles.finalScoreNum} ${getScoreColor(finalScore)}`}>
                        {finalScore}
                        <span className={styles.finalScoreMax}>/100</span>
                    </div>
                    <div className={styles.scoreBar}>
                        <div
                            className={`${styles.scoreBarFill} ${getScoreColor(finalScore)}`}
                            style={{ width: `${finalScore}%` }}
                        />
                    </div>
                </div>

                {/* ── Round scores ── */}
                {roundScores?.length > 0 && (
                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>Round Breakdown</h2>
                        <div className={styles.roundGrid}>
                            {roundScores.map((r) => (
                                <div key={r.round} className={styles.roundCard}>
                                    <div className={styles.roundCardHeader}>
                                        <span className={styles.roundName}>
                                            {ROUND_LABELS[r.round] || r.round}
                                        </span>
                                        <span className={`${styles.roundScore} ${getScoreColor(r.score)}`}>
                                            {r.score}/100
                                        </span>
                                    </div>
                                    <p className={styles.roundSummary}>{r.summary}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Strengths ── */}
                {finalFeedback?.strengths?.length > 0 && (
                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>
                            <span className={styles.iconGreen}>✓</span> Strengths
                        </h2>
                        <ul className={styles.list}>
                            {finalFeedback.strengths.map((s, i) => (
                                <li key={i} className={`${styles.listItem} ${styles.listItemGreen}`}>
                                    {s}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* ── Weaknesses ── */}
                {finalFeedback?.weaknesses?.length > 0 && (
                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>
                            <span className={styles.iconRed}>✗</span> Weaknesses
                        </h2>
                        <ul className={styles.list}>
                            {finalFeedback.weaknesses.map((w, i) => (
                                <li key={i} className={`${styles.listItem} ${styles.listItemRed}`}>
                                    {w}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* ── Weak topics ── */}
                {finalFeedback?.weakTopics?.length > 0 && (
                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>Topics to Improve</h2>
                        <div className={styles.tagCloud}>
                            {finalFeedback.weakTopics.map((t, i) => (
                                <span key={i} className={styles.tag}>{t}</span>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Behavioral improvements ── */}
                {finalFeedback?.behavioralImprovements?.length > 0 && (
                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>Behavioral Improvements</h2>
                        <ul className={styles.list}>
                            {finalFeedback.behavioralImprovements.map((b, i) => (
                                <li key={i} className={`${styles.listItem} ${styles.listItemPurple}`}>
                                    {b}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* ── Project improvements ── */}
                {finalFeedback?.projectImprovements?.length > 0 && (
                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>Project Explanation Tips</h2>
                        <ul className={styles.list}>
                            {finalFeedback.projectImprovements.map((p, i) => (
                                <li key={i} className={`${styles.listItem} ${styles.listItemOrange}`}>
                                    {p}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* ── LeetCode recommendations ── */}
                {finalFeedback?.leetcodeProblems?.length > 0 && (
                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>Recommended LeetCode Problems</h2>
                        <div className={styles.leetcodeList}>
                            {finalFeedback.leetcodeProblems.map((p, i) => (
                                <div key={i} className={styles.leetcodeCard}>
                                    <div className={styles.leetcodeTop}>
                                        <span className={styles.leetcodeTitle}>{p.title}</span>
                                        <span
                                            className={styles.leetcodeDifficulty}
                                            style={{
                                                background: LEETCODE_COLORS[p.difficulty]?.bg || "#ffffff10",
                                                color: LEETCODE_COLORS[p.difficulty]?.color || "#fff",
                                            }}
                                        >
                                            {p.difficulty}
                                        </span>
                                    </div>
                                    <p className={styles.leetcodeReason}>{p.reason}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Actions ── */}
                <div className={styles.actions}>
                    <button
                        className={styles.primaryBtn}
                        onClick={() => navigate("/interview-session/start")}
                    >
                        Start New Interview →
                    </button>
                    <button
                        className={styles.ghostBtn}
                        onClick={() => navigate("/")}
                    >
                        Back to Home
                    </button>
                </div>

            </div>
        </div>
    );
}