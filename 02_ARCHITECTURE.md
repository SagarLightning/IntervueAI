# Architecture

## Frontend

- React
- Vite
- Monaco Editor

## Backend

- Node.js
- Express.js

## Database

- MongoDB

## AI Layer

- Google Gemini

## Execution Layer

- Judge0

## Auth

- JWT + Cookies

## Main Flow (Version 1)

```text
User
↓
Provide Resume, JD, Self Description
↓
Resume Parser & Gemini Analyzer
↓
Qualification Percentage Calculation
↓
ATS Resume Generator
↓
MongoDB (Save Report)
```

## Main Flow (Version 2)

```text
User
↓
Load V1 Report
↓
Interview Planner
↓
Interview Session
↓
Question Generator
↓
Answer Evaluator
↓
Follow-up Generator
↓
Score Generator
↓
MongoDB (Save Session)
```

## Coding Round Flow

```text
Frontend Editor
↓
Judge0
↓
Execution Result
↓
Gemini Evaluation
```
