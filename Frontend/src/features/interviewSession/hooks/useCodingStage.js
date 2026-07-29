import { useState, useCallback } from "react";

/**
 * State machine for the 4 stages of each coding problem.
 * Stages: "understand" → "discussion" → "coding" → "review"
 */

const STAGES = ["understand", "discussion", "coding", "review"];

export function useCodingStage() {
    const [stage, setStage] = useState("understand");

    const goToDiscussion = useCallback(() => {
        setStage("discussion");
        return "discussion";
    }, []);

    const goToCoding = useCallback(() => {
        setStage("coding");
        return "coding";
    }, []);

    const goToReview = useCallback(() => {
        setStage("review");
        return "review";
    }, []);

    const resetForNextProblem = useCallback(() => {
        setStage("understand");
        return "understand";
    }, []);

    const stageIndex = STAGES.indexOf(stage);

    return {
        stage,
        stageIndex,
        stages: STAGES,
        goToDiscussion,
        goToCoding,
        goToReview,
        resetForNextProblem,
        isUnderstand: stage === "understand",
        isDiscussion: stage === "discussion",
        isCoding: stage === "coding",
        isReview: stage === "review",
    };
}
