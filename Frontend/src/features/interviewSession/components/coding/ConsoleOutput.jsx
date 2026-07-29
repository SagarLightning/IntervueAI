import styles from "../../style/ConsoleOutput.module.scss";

/**
 * Structured console output for code execution results.
 */
export default function ConsoleOutput({ output }) {
    if (!output) return null;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <span className={styles.label}>Console</span>
                <span className={`${styles.statusBadge} ${output.success ? styles.success : styles.fail}`}>
                    {output.success ? "✓ Success" : "✗ Failed"}
                </span>
            </div>

            {output.stdout && (
                <div className={styles.section}>
                    <span className={styles.sectionLabel}>stdout</span>
                    <pre className={styles.output}>{output.stdout}</pre>
                </div>
            )}

            {output.stderr && (
                <div className={styles.section}>
                    <span className={`${styles.sectionLabel} ${styles.errorLabel}`}>stderr</span>
                    <pre className={`${styles.output} ${styles.errorOutput}`}>{output.stderr}</pre>
                </div>
            )}

            <div className={styles.footer}>
                <span className={styles.exitCode}>
                    Exit Code: {output.exitCode ?? 0}
                </span>
            </div>
        </div>
    );
}
