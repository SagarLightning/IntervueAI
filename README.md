# IntervueAI

IntervueAI is an AI-powered resume-aware interview simulator and career assistant. It provides a comprehensive platform for candidates to evaluate their fit for a job and practice realistic interviews tailored to their profile.

## 🚀 Features

The application is built around two core versions/flows:

### Version 1 (V1) - Resume Analysis & Generation
- **Intelligent Qualification Matching:** Users provide a Job Description (JD), their current Resume, and a self-declaration. The system calculates a matching percentage to assess their qualification for the role.
- **ATS Resume Generation:** Automatically generates an optimized, ATS-friendly resume based on the analysis.
- **Report History:** Maintains a history of all generated reports for easy reference.

### Version 2 (V2) - AI Mock Interview
- **Resume-Aware Interview Sessions:** Uses the report generated in V1 to conduct a realistic, multi-round AI mock interview.
- **Adaptive Questioning:** Questions dynamically adapt based on user responses and difficulty levels.
- **Follow-up Questions:** Simulates human-like interactions with intelligent follow-up questions.
- **Coding Round Support:** Built-in code execution capabilities for technical rounds.
- **Scoring & Feedback:** Provides a final interview report with detailed scores and actionable feedback.

## 🛠️ Technology Stack

- **Frontend:** React, Vite, Monaco Editor
- **Backend:** Node.js, Express.js
- **Database:** MongoDB
- **AI Layer:** Google Gemini
- **Execution Engine:** Judge0 (for coding rounds)
- **Authentication:** JWT + Cookies

## 📚 Documentation

Detailed documentation for the project is available in the root directory:
- [01_PRD.md](./01_PRD.md): Product Requirements Document detailing scope and metrics.
- [02_ARCHITECTURE.md](./02_ARCHITECTURE.md): System architecture and data flow.
- [03_SCHEMA.md](./03_SCHEMA.md): Database schemas for core entities.
- [04_API_CONTRACT.md](./04_API_CONTRACT.md): Comprehensive API endpoints definition.
- [05_TEST_PLAN.md](./05_TEST_PLAN.md): Test cases and pass criteria.

## 🏁 Getting Started

*(Instructions for local development and setup will be updated soon)*
