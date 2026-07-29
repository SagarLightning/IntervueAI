import styles from "../../style/RoundCompletion.module.scss";

/**
 * Completion screen shown after all coding problems are finished.
 */
export default function RoundCompletion({ submissions, questions, onContinue, loading }) {
    const avgScore = computeAverageScore(submissions);
    const { strengths, improvements } = deriveInsights(submissions);

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <h2 className={styles.title}>🎯 Coding Round Complete</h2>

                <div className={styles.statsRow}>
                    <div className={styles.stat}>
                        <span className={styles.statValue}>{questions.length}</span>
                        <span className={styles.statLabel}>Problems Solved</span>
                    </div>
                    <div className={styles.stat}>
                        <span className={styles.statValue}>{avgScore}</span>
                        <span className={styles.statLabel}>Average Score / 10</span>
                    </div>
                    <div className={styles.stat}>
                        <span className={styles.statValue}>{submissions.length}</span>
                        <span className={styles.statLabel}>Submissions</span>
                    </div>
                </div>

                {strengths.length > 0 && (
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>✓ Strengths</h3>
                        <ul className={styles.list}>
                            {strengths.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                    </div>
                )}

                {improvements.length > 0 && (
                    <div className={styles.section}>
                        <h3 className={`${styles.sectionTitle} ${styles.improvementTitle}`}>△ Areas for Improvement</h3>
                        <ul className={styles.list}>
                            {improvements.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                    </div>
                )}

                <button
                    className={styles.continueBtn}
                    onClick={onContinue}
                    disabled={loading}
                >
                    {loading ? "Processing..." : "Continue to Behavioral Round →"}
                </button>
            </div>
        </div>
    );
}

function computeAverageScore(submissions) {
    if (!submissions.length) return 0;
    // Take best score per question
    const byQuestion = {};
    submissions.forEach((s) => {
        const key = s.question;
        if (!byQuestion[key] || s.score > byQuestion[key]) {
            byQuestion[key] = s.score;
        }
    });
    const scores = Object.values(byQuestion);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    return Math.round(avg * 10) / 10;
}

function deriveInsights(submissions) {
    const strengths = [];
    const improvements = [];

    const correctCount = submissions.filter((s) => s.correctness).length;
    const avgScore = submissions.length
        ? submissions.reduce((a, s) => a + (s.score || 0), 0) / submissions.length
        : 0;

    if (correctCount === submissions.length && submissions.length > 0) {
        strengths.push("All solutions produced correct output");
    } else if (correctCount > 0) {
        strengths.push(`${correctCount} of ${submissions.length} submissions passed correctness checks`);
    }

    if (avgScore >= 7) {
        strengths.push("Consistently high code quality across submissions");
    } else if (avgScore >= 4) {
        strengths.push("Demonstrated working problem-solving approach");
    }

    if (avgScore < 7) {
        improvements.push("Focus on optimizing time and space complexity");
    }

    if (correctCount < submissions.length) {
        improvements.push("Review edge cases and input boundary handling");
    }

    if (submissions.some((s) => s.improvements?.length > 0)) {
        improvements.push("Consider the specific code improvements noted in each evaluation");
    }

    return { strengths, improvements };
}
