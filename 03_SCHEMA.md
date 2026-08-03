# Database Schema

## Core Schemas

### User

- `_id`
- `name`
- `email`
- `password`
- `createdAt`

## Version 1 (V1) Schemas

### Report

- `_id`
- `userId` ref `User`
- `resumeText`
- `jobDescription`
- `selfDescription`
- `matchScore`
- `skillGaps[]`
- `technicalQuestions[]`
- `behavioralQuestions[]`
- `roadmap[]`
- `atsResumePdf`
- `createdAt`

## Version 2 (V2) Schemas

### InterviewSession

- `_id`
- `userId` ref `User`
- `reportId` ref `Report`
- `company`
- `role`
- `interviewType`
- `currentRound`
- `currentQuestionIndex`
- `difficulty`
- `status`
- `transcript[]`
- `scores`
- `finalFeedback`
- `createdAt`

### TranscriptItem

- `question`
- `answer`
- `round`
- `aiEvaluation`
- `followUpQuestion`
- `timestamp`

### Score Object

- `communication`
- `technicalDepth`
- `dsa`
- `optimization`
- `confidence`
- `behavioral`
- `totalScore`

### CodingSubmission

- `_id`
- `sessionId` ref `InterviewSession`
- `problemStatement`
- `language`
- `code`
- `testResults`
- `executionOutput`
- `complexityAnalysis`
- `aiFeedback`
- `createdAt`
