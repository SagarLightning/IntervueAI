# API Contract

## Existing

- `POST /auth/register`
- `POST /auth/login`
- `POST /resume/analyze`
- `GET /reports`
- `POST /resume/generate`

## New

### Create Interview Session

`POST /interview/start`

Request:

```json
{
  "reportId": "string",
  "company": "string",
  "role": "string",
  "interviewType": "string"
}
```

Response:

```json
{
  "sessionId": "string",
  "firstQuestion": "string"
}
```

### Submit Answer

`POST /interview/answer`

Request:

```json
{
  "sessionId": "string",
  "answer": "string"
}
```

Response:

```json
{
  "evaluation": "object",
  "nextQuestion": "string",
  "currentRound": "string"
}
```

### Get Session

`GET /interview/`

Response:

```json
{
  "session": "object"
}
```

### End Session

`POST /interview/end`

Response:

```json
{
  "scores": "object",
  "finalFeedback": "object"
}
```

### Coding Submission

`POST /coding/submit`

Request:

```json
{
  "sessionId": "string",
  "code": "string",
  "language": "string"
}
```

Response:

```json
{
  "output": "string",
  "testResults": "object",
  "aiFeedback": "object"
}
```
