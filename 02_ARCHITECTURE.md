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

## Main Flow

```text
User
↓
Upload Resume
↓
Resume Parser
↓
Gemini Analyzer
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
MongoDB
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
