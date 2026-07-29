import styles from "../../style/EvaluationCard.module.scss";

/**
 * Evaluation score card — extracted from existing inline rendering.
 * Preserves exact design from the original CodingRound.
 */
export default function EvaluationCard({ evaluation }) {
    if (!evaluation) return null;

    let displayScore = evaluation.score;
    if (displayScore > 10) {
        displayScore = Math.round((displayScore / 100) * 10);
    }

    const scoreClass =
        displayScore >= 7
            ? styles.scoreHigh
            : displayScore >= 4
                ? styles.scoreMid
                : styles.scoreLow;

    return (
        <div className={styles.card}>
            <div className={styles.header}>
                <span className={styles.label}>Evaluation</span>
                <span className={`${styles.score} ${scoreClass}`}>
                    {displayScore}/10
                </span>
            </div>

            <div className={styles.complexityRow}>
                <span className={styles.tag}>Time: {evaluation.timeComplexity}</span>
                <span className={styles.tag}>Space: {evaluation.spaceComplexity}</span>
                <span className={`${styles.tag} ${evaluation.correctness ? styles.correct : styles.incorrect}`}>
                    {evaluation.correctness ? "✓ Correct" : "✗ Incorrect"}
                </span>
            </div>

            <p className={styles.feedback}>{evaluation.feedback}</p>

            {evaluation.improvements?.length > 0 && (
                <ul className={styles.improvements}>
                    {evaluation.improvements.map((imp, i) => (
                        <li key={i}>{imp}</li>
                    ))}
                </ul>
            )}
        </div>
    );
}
