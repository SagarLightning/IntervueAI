import { useState, useRef, useEffect } from "react";
import styles from "../../style/InterviewChat.module.scss";

/**
 * Persistent chat panel for the AI interviewer.
 * Renders the full append-only conversation. Never clears messages.
 */
export default function InterviewChat({
    messages,
    isEvaluating,
    evaluatingText,
    onSubmitAnswer,
    inputDisabled,
}) {
    const [input, setInput] = useState("");
    const bottomRef = useRef(null);

    // Auto-scroll to latest message
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isEvaluating]);

    function handleSend() {
        if (!input.trim() || inputDisabled || isEvaluating) return;
        onSubmitAnswer(input.trim());
        setInput("");
    }

    function handleKeyDown(e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <span className={styles.headerIcon}>🤖</span>
                <span className={styles.headerTitle}>AI Interviewer</span>
            </div>

            <div className={styles.messageList}>
                {messages.map((msg, i) => (
                    <div
                        key={i}
                        className={`${styles.bubble} ${
                            msg.role === "candidate" ? styles.candidate : styles.interviewer
                        } ${msg.type === "system" ? styles.system : ""} ${
                            msg.type === "evaluation" ? styles.evaluation : ""
                        }`}
                    >
                        {msg.role === "interviewer" && msg.type === "question" && (
                            <span className={styles.role}>Interviewer</span>
                        )}
                        {msg.role === "candidate" && (
                            <span className={styles.roleCandidate}>You</span>
                        )}
                        <p className={styles.text}>{msg.text}</p>
                    </div>
                ))}

                {/* Evaluating indicator */}
                {isEvaluating && (
                    <div className={`${styles.bubble} ${styles.interviewer} ${styles.evaluating}`}>
                        <div className={styles.dots}>
                            <span /><span /><span />
                        </div>
                        <p className={styles.evalText}>{evaluatingText}</p>
                    </div>
                )}

                <div ref={bottomRef} />
            </div>

            {/* Input area */}
            <div className={styles.inputArea}>
                <textarea
                    className={styles.input}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={inputDisabled ? "Complete the current stage to respond..." : "Type your answer..."}
                    disabled={inputDisabled || isEvaluating}
                    rows={2}
                />
                <button
                    className={styles.sendBtn}
                    onClick={handleSend}
                    disabled={inputDisabled || isEvaluating || !input.trim()}
                >
                    Send
                </button>
            </div>
        </div>
    );
}
