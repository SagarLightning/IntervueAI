# Product Requirements Document (PRD)

## Product Name

IntervueAI

## What It Is

IntervueAI is an AI-powered resume-aware interview simulator.

It analyzes:

- Candidate resume
- Job description
- Self description

Then conducts a realistic interview.

The system behaves like a human interviewer.

## Core Goals

- **Version 1 (V1):** Resume Analysis & Generation. Users provide Job Description (JD), Resume, and a self-declaration. The system calculates a qualification percentage and generates an optimized ATS-friendly resume.
- **Version 2 (V2):** AI Mock Interview. Using the report generated in V1, users can conduct a realistic, multi-round AI mock interview with adaptive questioning and a coding round.

## In Scope

### Version 1 (V1) Features

- Auth
- Resume, JD, and Self-description input
- Resume parsing and analysis
- Qualification matching percentage calculation
- ATS optimized resume generation
- Report history

### Version 2 (V2) Features

- Interview session engine (uses V1 report)
- Resume-aware questioning
- Follow-up questioning
- Coding round
- Difficulty adaptation
- Scoring engine
- Final interview report

## Out of Scope

- Video interviews
- Real-time voice
- Webcam emotion detection
- Peer-to-peer interviews
- Company-wide analytics
- Multiplayer interviews

## Success Metrics

- User completes full interview
- User receives useful report
- AI asks relevant personalized questions
- Coding round executes successfully
- Session history persists
