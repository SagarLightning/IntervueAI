import { useState, useEffect, useRef } from "react";
import CodeEditor from "@uiw/react-textarea-code-editor";
import styles from "../../style/CodeEditorPanel.module.scss";

const LANGUAGES = [
    { id: "javascript", label: "JavaScript" },
    { id: "python", label: "Python" },
    { id: "java", label: "Java" },
    { id: "cpp", label: "C++" },
    { id: "c", label: "C" },
    { id: "typescript", label: "TypeScript" },
];

const DEFAULT_CODE = {
    javascript: `// Write your solution here\nfunction solution() {\n  \n}\n`,
    python: `# Write your solution here\ndef solution():\n    pass\n`,
    java: `// Write your solution here\npublic class Main {\n    public static void main(String[] args) {\n        \n    }\n}\n`,
    cpp: `// Write your solution here\n#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    \n    return 0;\n}\n`,
    c: `// Write your solution here\n#include <stdio.h>\n\nint main() {\n    \n    return 0;\n}\n`,
    typescript: `// Write your solution here\nfunction solution(): void {\n  \n}\n`,
};

const RUN_TEXTS = ["Compiling...", "Running...", "Executing..."];
const SUBMIT_TEXTS = [
    "Executing final submission...",
    "Running test cases...",
    "Analyzing correctness...",
    "Reviewing code quality...",
    "Evaluating complexity...",
    "Generating interviewer feedback...",
];

export { DEFAULT_CODE };

export default function CodeEditorPanel({
    code,
    onCodeChange,
    language,
    onLanguageChange,
    onRun,
    onSubmit,
    disabled,
    running,
    submitting,
    stdin,
    onStdinChange,
    error,
}) {
    const [loadingTextIdx, setLoadingTextIdx] = useState(0);
    const activeTexts = running ? RUN_TEXTS : submitting ? SUBMIT_TEXTS : [];
    const intervalRef = useRef(null);

    useEffect(() => {
        if (!running && !submitting) {
            setLoadingTextIdx(0);
            return;
        }
        intervalRef.current = setInterval(() => {
            setLoadingTextIdx((prev) => (prev + 1) % activeTexts.length);
        }, running ? 1200 : 2000);
        return () => clearInterval(intervalRef.current);
    }, [running, submitting, activeTexts.length]);

    function handleReset() {
        onCodeChange(DEFAULT_CODE[language]);
    }

    function handleCopy() {
        navigator.clipboard.writeText(code).catch(() => {});
    }

    const loadingText = activeTexts[loadingTextIdx] || "";

    return (
        <div className={styles.container}>
            {/* Toolbar */}
            <div className={styles.toolbar}>
                <div className={styles.langSelector}>
                    {LANGUAGES.map((l) => (
                        <button
                            key={l.id}
                            className={`${styles.langBtn} ${language === l.id ? styles.langBtnActive : ""}`}
                            onClick={() => onLanguageChange(l.id)}
                            disabled={disabled}
                        >
                            {l.label}
                        </button>
                    ))}
                </div>
                <div className={styles.toolbarActions}>
                    <button className={styles.toolBtn} onClick={handleReset} disabled={disabled} title="Reset Code">
                        ↺ Reset
                    </button>
                    <button className={styles.toolBtn} onClick={handleCopy} title="Copy Code">
                        ⎘ Copy
                    </button>
                </div>
            </div>

            {/* Editor */}
            <div className={`${styles.editorWrapper} ${disabled ? styles.editorDisabled : ""}`}>
                <CodeEditor
                    value={code}
                    language={language === "cpp" ? "cpp" : language}
                    onChange={(e) => onCodeChange(e.target.value)}
                    padding={16}
                    style={{
                        fontSize: 14,
                        backgroundColor: "#0d0d0d",
                        fontFamily: "JetBrains Mono, Fira Code, monospace",
                        minHeight: "100%",
                        borderRadius: "0",
                    }}
                    disabled={disabled}
                />
                {disabled && <div className={styles.disabledOverlay} />}
            </div>

            {/* Stdin */}
            <div className={styles.stdinBlock}>
                <label className={styles.stdinLabel}>Custom Input (stdin)</label>
                <textarea
                    className={styles.stdinArea}
                    placeholder="Optional test input..."
                    value={stdin}
                    onChange={(e) => onStdinChange(e.target.value)}
                    rows={2}
                    disabled={disabled}
                />
            </div>

            {/* Action bar */}
            <div className={styles.actionBar}>
                {error && <span className={styles.errorText}>{error}</span>}
                {(running || submitting) && (
                    <span className={styles.loadingText}>{loadingText}</span>
                )}
                <div className={styles.actionBtns}>
                    <button
                        className={styles.runBtn}
                        onClick={onRun}
                        disabled={running || submitting || disabled}
                    >
                        {running ? "Running..." : "▶ Run"}
                    </button>
                    <button
                        className={styles.submitBtn}
                        onClick={onSubmit}
                        disabled={running || submitting || disabled}
                    >
                        {submitting ? "Submitting..." : "Submit"}
                    </button>
                </div>
            </div>
        </div>
    );
}
