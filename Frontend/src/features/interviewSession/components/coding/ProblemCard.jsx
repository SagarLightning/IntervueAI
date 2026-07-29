import { useState, useEffect } from "react";
import styles from "../../style/ProblemCard.module.scss";

/**
 * Displays a coding problem with cleanly formatted sections.
 * Beautifully formats title, difficulty badge, scenario, detailed description,
 * input/output specifications, examples, constraints, and edge cases.
 */
export default function ProblemCard({ problem, questionIndex }) {
    const [expanded, setExpanded] = useState(true);

    useEffect(() => {
        setExpanded(true);
    }, [questionIndex]);

    if (!problem) return null;

    const difficultyClass =
        problem.difficulty?.toLowerCase() === "easy"
            ? styles.diffEasy
            : problem.difficulty?.toLowerCase() === "hard"
            ? styles.diffHard
            : styles.diffMedium;

    const hasDetails =
        problem.input ||
        problem.output ||
        problem.examples ||
        problem.constraints ||
        problem.edgeCases ||
        problem.notes;

    return (
        <div className={styles.card}>
            {/* Header: Number, Title, Difficulty */}
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <span className={styles.label}>Problem {questionIndex + 1}</span>
                    {problem.title && (
                        <h2 className={styles.title}>{problem.title}</h2>
                    )}
                </div>
                {problem.difficulty && (
                    <span className={`${styles.diffBadge} ${difficultyClass}`}>
                        {problem.difficulty}
                    </span>
                )}
            </div>

            {/* Main Problem Scenario / Description */}
            <div className={styles.body}>
                {problem.scenario && (
                    <Section title="Overview" content={problem.scenario} />
                )}
                {problem.detailedDescription && (
                    <Section
                        title="Business Context & Details"
                        content={problem.detailedDescription}
                    />
                )}
                {problem.task && (
                    <Section title="Task" content={problem.task} />
                )}

                {/* If no sections were parsed at all, show the full text */}
                {!problem.hasSections && problem.fullText && (
                    <p className={styles.text}>{problem.fullText}</p>
                )}
            </div>

            {/* Detailed sections (Input, Output, Examples, Constraints, Edge Cases) */}
            {expanded && hasDetails && (
                <div className={styles.details}>
                    {problem.input && (
                        <Section title="Input Format" content={problem.input} />
                    )}
                    {problem.output && (
                        <Section title="Output Format" content={problem.output} />
                    )}
                    {problem.examples && (
                        <Section
                            title="Examples"
                            content={problem.examples}
                            mono
                        />
                    )}
                    {problem.constraints && (
                        <Section
                            title="Constraints"
                            content={problem.constraints}
                        />
                    )}
                    {problem.edgeCases && (
                        <Section
                            title="Edge Cases"
                            content={problem.edgeCases}
                        />
                    )}
                    {problem.notes && (
                        <Section title="Notes" content={problem.notes} />
                    )}
                </div>
            )}

            {/* Collapse / Expand Button */}
            {hasDetails && (
                <button
                    className={styles.toggleBtn}
                    onClick={() => setExpanded((prev) => !prev)}
                >
                    {expanded
                        ? "Minimize Problem Specifications ▲"
                        : "Show Problem Specifications (Input, Examples, Constraints) ▼"}
                </button>
            )}
        </div>
    );
}

function formatSectionText(text, mono) {
    if (!text) return null;
    if (mono) return text;
    if (typeof text !== "string") return String(text);

    return text.split(/\n\n+/).map((para, i) => {
        // Clean up bold **text** markers and inline `code`
        const parts = para.split(/(\*\*.*?\*\*|`.*?`|\n)/g);
        return (
            <p key={i} style={{ margin: i > 0 ? "0.6rem 0 0 0" : 0 }}>
                {parts.map((part, j) => {
                    if (part === "\n") return <br key={j} />;
                    if (part.startsWith("**") && part.endsWith("**")) {
                        return <strong key={j} style={{ color: "#ffffff", fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
                    }
                    if (part.startsWith("`") && part.endsWith("`")) {
                        return <code key={j} style={{ background: "#24242a", color: "#2ecc71", padding: "0.1rem 0.35rem", borderRadius: "4px", fontSize: "0.85em", fontFamily: "monospace" }}>{part.slice(1, -1)}</code>;
                    }
                    return part;
                })}
            </p>
        );
    });
}

function Section({ title, content, mono }) {
    return (
        <div className={styles.section}>
            <span className={styles.sectionTitle}>{title}</span>
            <div className={`${styles.text} ${mono ? styles.mono : ""}`}>
                {formatSectionText(content, mono)}
            </div>
        </div>
    );
}
