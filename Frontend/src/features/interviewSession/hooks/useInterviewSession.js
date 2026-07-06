import { useState } from "react";
import {
  startInterviewSession,
  getInterviewSession,
  submitInterviewAnswer,
  moveToNextRound,
  finishInterviewSession,
} from "../services/interviewSession.api";

export function useInterviewSession() {
  const [session, setSession] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function execute(callback, fallbackMessage) {
    setLoading(true);
    setError("");

    try {
      return await callback();
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.message ||
        fallbackMessage;

      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function startSession(payload) {
    return execute(async () => {
      const data = await startInterviewSession(payload);

      // backend returns only sessionId
      return data;
    }, "Failed to start session");
  }

  async function fetchSession(sessionId) {
    return execute(async () => {
      const data = await getInterviewSession(sessionId);

      setSession(data);

      return data;
    }, "Failed to fetch session");
  }

  async function submitAnswer(sessionId, payload) {
    return execute(async () => {
      return await submitInterviewAnswer(sessionId, payload);
    }, "Failed to submit answer");
  }

  async function nextRound(sessionId) {
    return execute(async () => {
      return await moveToNextRound(sessionId);
    }, "Failed to advance round");
  }

  async function finishSession(sessionId) {
    return execute(async () => {
      return await finishInterviewSession(sessionId);
    }, "Failed to finish session");
  }

  async function fetchSessions() {
    return execute(async () => {
      const data = await getInterviewSession();

      setSessions(data);

      return data;
    }, "Failed to fetch sessions");
  }

  return {
    session,
    sessions,
    loading,
    error,

    startSession,
    fetchSession,
    submitAnswer,
    nextRound,
    finishSession,
    fetchSessions,
  };
}