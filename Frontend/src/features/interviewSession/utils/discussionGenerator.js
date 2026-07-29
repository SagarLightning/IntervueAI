/**
 * Generates discussion questions and natural transition messages
 * for the AI interviewer throughout the coding round.
 */

function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Transition messages ──────────────────────────────────────────

export function getWelcomeMessage() {
    return pick([
        "Welcome to the Coding Round. I'll be your interviewer today. Before we dive into coding, I'd like to understand how you think through problems. Please read each problem carefully, and when you're ready, click \"I'm Ready\" so we can discuss your approach.",
        "Hi! Welcome to the Coding Round. I'll guide you through three problems today. For each one, we'll start with a short discussion about your approach before you write any code. Take your time reading the problem, and click \"I'm Ready\" when you'd like to begin.",
        "Welcome! I'm your interviewer for the Coding Round. We'll work through three problems together. Before coding each one, I'd like to hear your thought process. Read the problem at your own pace and click \"I'm Ready\" when you're set.",
    ]);
}

export function getProblemIntroMessage(problemNumber) {
    const ordinal = problemNumber === 1 ? "first" : problemNumber === 2 ? "second" : "third";
    return pick([
        `Here's your ${ordinal} problem. Take a moment to read through it carefully.`,
        `Let's look at problem ${problemNumber}. Read it over and let me know when you're ready to discuss.`,
        `Here's problem ${problemNumber} of 3. Take your time understanding it.`,
    ]);
}

export function getReadyTransition() {
    return pick([
        "Great. Before you start coding, I'd like to understand your thinking.",
        "Good, let's talk through your approach before you start writing code.",
        "Alright. Before we jump into implementation, let me ask you a few questions about your approach.",
    ]);
}

export function getCodingTransition() {
    return pick([
        "I like your approach. Go ahead and implement your solution.",
        "Sounds like a solid plan. The editor is ready — go ahead and code it up.",
        "Good thinking. Let's see how you implement this. The editor is now enabled.",
    ]);
}

export function getReviewTransition() {
    return pick([
        "Let me review your submission...",
        "Thanks for submitting. Let me take a look at your solution...",
        "Got it. Let me evaluate your implementation...",
    ]);
}

export function getPostReviewTransition() {
    return pick([
        "Nice work. Let's discuss your implementation.",
        "Good effort. I have a few questions about your solution.",
        "Thanks for that solution. Let's talk through some aspects of your approach.",
    ]);
}

export function getNextProblemTransition() {
    return pick([
        "Good discussion. Let's move on to the next problem.",
        "Great, that wraps up this problem. Ready for the next one?",
        "Well covered. Let's continue to the next challenge.",
    ]);
}

export function getRoundCompleteMessage() {
    return pick([
        "Excellent work completing all three problems. Let me prepare your overall results.",
        "That's all three problems done. Great job working through them. Let me compile your results.",
        "You've completed the entire Coding Round. Let me put together your performance summary.",
    ]);
}

export function getEvaluationAck() {
    return pick([
        "Good thinking. That's a valid approach.",
        "I see where you're going with that. Solid reasoning.",
        "That makes sense. Good explanation.",
        "Fair point. I appreciate the clarity.",
        "Alright, that's a reasonable way to think about it.",
    ]);
}

// ─── Discussion questions ─────────────────────────────────────────

export function getPreCodingQuestions() {
    return [
        "What's your initial approach to solving this problem? Walk me through your thinking.",
        "What data structures or algorithms would you consider for this? Why?",
        "What do you expect the time and space complexity of your approach to be?",
    ];
}

export function getPostCodingQuestions() {
    return [
        "Why did you choose this particular approach over other alternatives?",
        "If you had more time, how would you optimize or improve your solution?",
        "What edge cases did you consider, and are there any you might have missed?",
    ];
}
