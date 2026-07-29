const axios = require("axios");

const WANDBOX_URL = "https://wandbox.org/api/compile.json";

// language config — kept for compatibility with controllers checking supported languages
const LANGUAGE_CONFIG = {
    javascript: { language: "node", version: "18.15.0" },
    python: { language: "python", version: "3.10.0" },
    java: { language: "java", version: "15.0.2" },
    cpp: { language: "c++", version: "10.2.0" },
    c: { language: "c", version: "10.2.0" },
    typescript: { language: "typescript", version: "5.0.3" },
};

const WANDBOX_COMPILERS = {
    javascript: "nodejs-20.17.0",
    python: "cpython-3.14.0",
    java: "openjdk-jdk-22+36",
    cpp: "gcc-13.2.0",
    c: "gcc-13.2.0-c",
    typescript: "typescript-5.6.2",
};

async function executeCode({ language, code, stdin = "" }) {
    if (!LANGUAGE_CONFIG[language] || !WANDBOX_COMPILERS[language]) {
        throw new Error(`Unsupported language: ${language}`);
    }

    let processedCode = code;
    if (language === "java") {
        processedCode = processedCode.replace(/\bpublic\s+class\s+/g, "class ");
    }

    const compiler = WANDBOX_COMPILERS[language];

    const response = await axios.post(
        WANDBOX_URL,
        {
            compiler,
            code: processedCode,
            stdin: stdin || "",
        },
        {
            headers: { "Content-Type": "application/json" },
            timeout: 20000,
        }
    );

    const result = response.data;
    const stdout = result.program_output || "";
    const stderr = [result.compiler_error, result.program_error].filter(Boolean).join("\n");
    const exitCode = parseInt(result.status ?? "0", 10);
    const success = exitCode === 0 && !result.compiler_error;
    const output = [stdout, stderr].filter(Boolean).join("\n");

    return {
        stdout,
        stderr,
        output,
        exitCode: isNaN(exitCode) ? 1 : exitCode,
        language,
        success,
    };
}

async function getSupportedLanguages() {
    return Object.keys(LANGUAGE_CONFIG);
}

module.exports = { executeCode, getSupportedLanguages, LANGUAGE_CONFIG };