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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function execute(fn, fallbackMessage) {
    setLoading(true);
    setError(null);

    try {
      return await fn();
    } catch (err) {
      const message =
        err.response?.data?.message || err.message || fallbackMessage;

      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function startSession(payload) {
    return execute(async () => {
      const data = await startInterviewSession(payload);
      setSession(data);
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

  async function submitAnswer(payload) {
    return execute(async () => {
      const data = await submitInterviewAnswer(payload);

      if (data.session) {
        setSession(data.session);
      }

      return data;
    }, "Failed to submit answer");
  }

  async function nextRound(sessionId) {
    return execute(async () => {
      const data = await moveToNextRound(sessionId);

      if (data.session) {
        setSession(data.session);
      }

      return data;
    }, "Failed to advance round");
  }

  async function finishSession(sessionId) {
    return execute(async () => {
      const data = await finishInterviewSession(sessionId);

      if (data.session) {
        setSession(data.session);
      }

      return data;
    }, "Failed to finish session");
  }

  return {
    session,
    loading,
    error,

    startSession,
    fetchSession,
    submitAnswer,
    nextRound,
    finishSession,

    setSession,
  };
}