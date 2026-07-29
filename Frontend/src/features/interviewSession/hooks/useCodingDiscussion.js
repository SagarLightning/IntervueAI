import { useState, useCallback, useRef, useEffect } from "react";
import { getEvaluationAck } from "../utils/discussionGenerator";

/**
 * Manages the single persistent conversation across all problems and stages.
 * Messages are NEVER cleared — append-only.
 *
 * Message shape: { role: "interviewer" | "candidate", text: string, type: "system" | "question" | "answer" | "evaluation" }
 */

const EVAL_TEXTS = [
    "Evaluating your reasoning...",
    "Reviewing your approach...",
    "Analyzing your explanation...",
    "Considering your answer...",
];

export function useCodingDiscussion() {
    const [messages, setMessages] = useState([]);
    const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
    const [isDiscussionComplete, setIsDiscussionComplete] = useState(false);
    const [isEvaluating, setIsEvaluating] = useState(false);
    const [evalTextIdx, setEvalTextIdx] = useState(0);

    const questionsRef = useRef([]);
    const evalTimerRef = useRef(null);

    // Rotate evaluation text while evaluating
    useEffect(() => {
        if (!isEvaluating) return;
        const interval = setInterval(() => {
            setEvalTextIdx((prev) => (prev + 1) % EVAL_TEXTS.length);
        }, 1800);
        return () => clearInterval(interval);
    }, [isEvaluating]);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (evalTimerRef.current) clearTimeout(evalTimerRef.current);
        };
    }, []);

    const addSystemMessage = useCallback((text) => {
        setMessages((prev) => [...prev, { role: "interviewer", text, type: "system" }]);
    }, []);

    const addInterviewerQuestion = useCallback((text) => {
        setMessages((prev) => [...prev, { role: "interviewer", text, type: "question" }]);
    }, []);

    const startDiscussion = useCallback((questions) => {
        questionsRef.current = questions;
        setCurrentQuestionIdx(0);
        setIsDiscussionComplete(false);
        // Ask the first question
        if (questions.length > 0) {
            setMessages((prev) => [
                ...prev,
                { role: "interviewer", text: questions[0], type: "question" },
            ]);
        } else {
            setIsDiscussionComplete(true);
        }
    }, []);

    const submitAnswer = useCallback((text) => {
        // Add candidate message
        setMessages((prev) => [...prev, { role: "candidate", text, type: "answer" }]);
        setIsEvaluating(true);

        // Simulated evaluation delay (1.5–2.5s)
        const delay = 1500 + Math.random() * 1000;
        evalTimerRef.current = setTimeout(() => {
            setIsEvaluating(false);

            // Add AI acknowledgment
            const ack = getEvaluationAck();
            setMessages((prev) => [...prev, { role: "interviewer", text: ack, type: "evaluation" }]);

            // Advance to next question or complete
            const nextIdx = currentQuestionIdx + 1;
            if (nextIdx < questionsRef.current.length) {
                setCurrentQuestionIdx(nextIdx);
                const nextQ = questionsRef.current[nextIdx];
                setMessages((prev) => [
                    ...prev,
                    { role: "interviewer", text: nextQ, type: "question" },
                ]);
            } else {
                setIsDiscussionComplete(true);
            }
        }, delay);
    }, [currentQuestionIdx]);

    const resetDiscussionState = useCallback(() => {
        // Reset question tracking but KEEP messages
        questionsRef.current = [];
        setCurrentQuestionIdx(0);
        setIsDiscussionComplete(false);
        setIsEvaluating(false);
        if (evalTimerRef.current) clearTimeout(evalTimerRef.current);
    }, []);

    return {
        messages,
        currentQuestionIdx,
        isDiscussionComplete,
        isEvaluating,
        evaluatingText: EVAL_TEXTS[evalTextIdx],
        addSystemMessage,
        addInterviewerQuestion,
        startDiscussion,
        submitAnswer,
        resetDiscussionState,
    };
}
