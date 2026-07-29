/**
 * Parses a raw coding question string (which may be structured JSON or plain text)
 * into structured sections for display.
 */

function cleanMetaText(text) {
    if (!text || typeof text !== "string") return "";
    let clean = text.replace(/^\s+|\s+$/g, ""); // simple trim
    clean = clean.replace(/\\n/g, "\n").replace(/\\t/g, "\t").replace(/\\"/g, '"');
    return clean;
}

function formatList(val) {
    if (!val) return "";
    if (typeof val === "string") {
        const trimmed = val.trim();
        if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
            try {
                val = JSON.parse(trimmed);
            } catch (e) {
                // Keep as string if JSON parse of array fails
            }
        }
    }
    if (Array.isArray(val)) {
        return val.map((item) => `• ${typeof item === "object" ? JSON.stringify(item) : item}`).join("\n");
    }
    return String(val);
}

function formatExamples(examples) {
    if (!examples) return "";
    if (typeof examples === "string") {
        const trimmed = examples.trim();
        if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
            try {
                examples = JSON.parse(trimmed);
            } catch (e) {
                // Keep as string if parse fails
            }
        }
    }
    if (Array.isArray(examples)) {
        return examples
            .map((ex, i) => {
                if (typeof ex === "string") return `Example ${i + 1}:\n${ex}`;
                const inStr = typeof ex.input === "object" ? JSON.stringify(ex.input) : ex.input || "";
                const outStr = typeof ex.output === "object" ? JSON.stringify(ex.output) : ex.output || "";
                let block = `Example ${i + 1}:\nInput: ${inStr}\nOutput: ${outStr}`;
                if (ex.explanation) block += `\nExplanation: ${ex.explanation}`;
                return block;
            })
            .join("\n\n");
    }
    return String(examples);
}

function extractLenientJson(text) {
    if (!text || typeof text !== "string") return null;
    if (!/"(?:title|shortDescription|detailedDescription|scenario|task|difficulty)"\s*:/i.test(text)) {
        return null;
    }

    const matches = [];
    const keyRegex = /"(title|difficulty|shortDescription|detailedDescription|scenario|task|inputExplanation|input|outputExplanation|output|examples|constraints|edgeCases|Edge Cases|notes|Notes|starterCode)"\s*:/gi;
    let match;
    while ((match = keyRegex.exec(text)) !== null) {
        matches.push({
            key: match[1],
            start: match.index + match[0].length,
            matchIndex: match.index
        });
    }

    if (matches.length === 0) return null;
    matches.sort((a, b) => a.matchIndex - b.matchIndex);

    const result = {};
    const lastBrace = text.lastIndexOf("}");
    for (let i = 0; i < matches.length; i++) {
        const start = matches[i].start;
        const end = (i + 1 < matches.length) ? matches[i + 1].matchIndex : (lastBrace !== -1 ? lastBrace : text.length);
        let rawVal = text.slice(start, end !== -1 && end > start ? end : text.length).trim();

        // Strip trailing commas
        rawVal = rawVal.replace(/,\s*$/, "").trim();

        if ((rawVal.startsWith("[") && rawVal.endsWith("]")) || (rawVal.startsWith("{") && rawVal.endsWith("}"))) {
            try {
                result[matches[i].key] = JSON.parse(rawVal);
            } catch (err) {
                try {
                    const cleanedArr = rawVal.replace(/[\n\r\t]/g, " ");
                    result[matches[i].key] = JSON.parse(cleanedArr);
                } catch (err2) {
                    result[matches[i].key] = rawVal;
                }
            }
        } else {
            // Strip leading and trailing quotes if it's a string literal
            if ((rawVal.startsWith('"') && rawVal.endsWith('"')) || (rawVal.startsWith("'") && rawVal.endsWith("'"))) {
                rawVal = rawVal.slice(1, -1);
            }
            // Unescape common escaped chars
            rawVal = rawVal.replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\t/g, "\t").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
            result[matches[i].key] = rawVal;
        }
    }

    return result;
}

function tryParseJson(text) {
    if (typeof text === "object" && text !== null) return text;
    if (typeof text !== "string") return null;

    try {
        let cleaned = text.trim();
        if (cleaned.startsWith("```json")) {
            cleaned = cleaned.replace(/^```json\s*/i, "").replace(/\s*```$/, "");
        } else if (cleaned.startsWith("```")) {
            cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
        }
        const firstBrace = cleaned.indexOf("{");
        const lastBrace = cleaned.lastIndexOf("}");
        if (firstBrace !== -1 && lastBrace > firstBrace) {
            cleaned = cleaned.slice(firstBrace, lastBrace + 1);
            return JSON.parse(cleaned);
        }
    } catch (e) {
        // Strict JSON.parse failed, try resilient extraction below
    }

    try {
        return extractLenientJson(text);
    } catch (e2) {
        return null;
    }
}

const SECTION_PATTERNS = [
    { key: "scenario", pattern: /(?:^|\n)\s*(?:Scenario|Context|Background|Overview|Description)\s*[:\-]\s*/i },
    { key: "task", pattern: /(?:^|\n)\s*(?:Task|Problem|Objective|Goal|Instructions)\s*[:\-]\s*/i },
    { key: "input", pattern: /(?:^|\n)\s*(?:Input Format|Input|Parameters|Arguments|INPUT FORMAT)\s*[:\-]?\s*/i },
    { key: "output", pattern: /(?:^|\n)\s*(?:Output Format|Output|Returns?|Result|OUTPUT FORMAT)\s*[:\-]?\s*/i },
    { key: "examples", pattern: /(?:^|\n)\s*(?:Examples?|Sample)\s*[:\-]?\s*/i },
    { key: "constraints", pattern: /(?:^|\n)\s*(?:Constraints?|Limits?|Bounds?)\s*[:\-]\s*/i },
    { key: "notes", pattern: /(?:^|\n)\s*(?:Notes?|Hints?|Tips?|Clarifications?)\s*[:\-]\s*/i },
];

function extractSectionsAndExamples(text) {
    let clean = cleanMetaText(text);

    // Extract code block for starterCode if present
    let starterCode = "";
    const codeMatch = clean.match(/```(?:javascript|python|js|ts|java|cpp|c)?\s*\n?([\s\S]*?)```/i);
    if (codeMatch) {
        starterCode = codeMatch[1].trim();
        clean = clean.replace(/```(?:javascript|python|js|ts|java|cpp|c)?\s*\n?[\s\S]*?```/i, "").trim();
    }

    const found = [];
    for (const { key, pattern } of SECTION_PATTERNS) {
        const match = clean.match(pattern);
        if (match) {
            found.push({ key, index: match.index, headerLength: match[0].length });
        }
    }
    found.sort((a, b) => a.index - b.index);

    const sections = {};
    for (let i = 0; i < found.length; i++) {
        const start = found[i].index + found[i].headerLength;
        const end = i + 1 < found.length ? found[i + 1].index : clean.length;
        sections[found[i].key] = clean.slice(start, end).trim();
    }

    // Capture initial text before first header as scenario/overview if scenario not found
    if (!sections.scenario && found.length > 0 && found[0].index > 0) {
        sections.scenario = clean.slice(0, found[0].index).trim();
    }

    // Check if output or other sections contain Example pairs (e.g. Input: ... Output: ...) without an Examples header
    if (sections.output && !sections.examples && /Input:\s*\[/.test(sections.output)) {
        const parts = sections.output.split(/(?=Input:\s*\[)/i);
        sections.output = parts[0].trim();
        const exList = parts.slice(1).map((ex, idx) => {
            return `Example ${idx + 1}:\n${ex.trim()}`;
        });
        sections.examples = exList.join("\n\n");
    }

    return { sections, starterCode, cleanedFull: clean };
}

function buildShortSummary(text) {
    if (!text) return "Coding problem";
    const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
    return sentences.slice(0, 4).join(" ");
}

function deriveTitleFromCodeOrText(starterCode, text) {
    if (starterCode) {
        const fnMatch = starterCode.match(/(?:function|def|class)\s+([a-zA-Z0-9_]+)/);
        if (fnMatch && fnMatch[1]) {
            return fnMatch[1]
                .replace(/([A-Z])/g, " $1")
                .replace(/_/g, " ")
                .trim()
                .replace(/^./, (c) => c.toUpperCase());
        }
    }
    return "Coding Problem";
}

function formatStructuredProblem(json, originalText = "") {
    const title = cleanMetaText(json.title || "");
    const difficulty = cleanMetaText(json.difficulty || "");
    const scenario = cleanMetaText(json.shortDescription || json.scenario || "");
    const detailedDescription = cleanMetaText(json.detailedDescription || "");
    const task = cleanMetaText(json.task || "");
    const input = cleanMetaText(json.inputExplanation || json.input || "");
    const output = cleanMetaText(json.outputExplanation || json.output || "");
    const examples = formatExamples(json.examples);
    const constraints = formatList(json.constraints);
    const edgeCases = formatList(json.edgeCases || json["Edge Cases"]);
    const notes = formatList(json.notes || json["Notes"] || json.Notes);
    const starterCode = json.starterCode || "";

    const shortSummary = scenario || title || "Coding problem";

    return {
        title: title || deriveTitleFromCodeOrText(starterCode, originalText),
        difficulty,
        scenario,
        detailedDescription,
        task,
        input,
        output,
        examples,
        constraints,
        edgeCases,
        notes,
        starterCode,
        fullText: cleanMetaText(typeof originalText === "string" ? originalText : JSON.stringify(json, null, 2)),
        shortSummary,
        hasSections: true,
        isStructuredJson: true,
    };
}

export function parseProblem(questionText) {
    if (!questionText) {
        return {
            title: "",
            difficulty: "",
            scenario: "",
            detailedDescription: "",
            task: "",
            input: "",
            output: "",
            examples: "",
            constraints: "",
            edgeCases: "",
            notes: "",
            starterCode: "",
            fullText: "",
            shortSummary: "",
            hasSections: false,
        };
    }

    if (typeof questionText === "object" && questionText !== null) {
        return formatStructuredProblem(questionText);
    }

    if (typeof questionText === "string") {
        const json = tryParseJson(questionText);
        if (json && typeof json === "object" && (json.title || json.shortDescription || json.detailedDescription)) {
            return formatStructuredProblem(json, questionText);
        }

        // Fallback for plain/markdown text
        const { sections, starterCode, cleanedFull } = extractSectionsAndExamples(questionText);
        const hasSections = Object.keys(sections).length > 0;

        const scenario = sections.scenario || (!hasSections ? cleanedFull : "");
        const task = sections.task || "";
        const title = deriveTitleFromCodeOrText(starterCode, cleanedFull);
        const shortSource = scenario || task || cleanedFull;

        return {
            title,
            difficulty: "",
            scenario,
            detailedDescription: "",
            task,
            input: sections.input || "",
            output: sections.output || "",
            examples: sections.examples || "",
            constraints: sections.constraints || "",
            edgeCases: "",
            notes: sections.notes || "",
            starterCode,
            fullText: cleanedFull,
            shortSummary: buildShortSummary(shortSource),
            hasSections: true,
            isStructuredJson: false,
        };
    }

    const cleanStr = cleanMetaText(String(questionText));
    return {
        title: "Coding Problem",
        difficulty: "",
        scenario: cleanStr,
        detailedDescription: "",
        task: "",
        input: "",
        output: "",
        examples: "",
        constraints: "",
        edgeCases: "",
        notes: "",
        starterCode: "",
        fullText: cleanStr,
        shortSummary: buildShortSummary(cleanStr),
        hasSections: true,
    };
}
