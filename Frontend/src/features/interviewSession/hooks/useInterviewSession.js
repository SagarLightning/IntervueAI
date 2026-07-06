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

  async function startSession(payload) {
    setLoading(true);
    setError(null);
    try {
      const data = await startInterviewSession(payload);
      setSession(data);
      return data;
    } catch (err) {
      setError(err.response?.data?.message || "Failed to start session");
    } finally {
      setLoading(false);
    }
  }

  async function fetchSession(sessionId) {
    setLoading(true);
    setError(null);
    try {
      const data = await getInterviewSession(sessionId);
      setSession(data);
      return data;
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch session");
    } finally {
      setLoading(false);
    }
  }

  async function submitAnswer(payload) {
    setLoading(true);
    setError(null);
    try {
      const data = await submitInterviewAnswer(payload);
      return data;
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit answer");
    } finally {
      setLoading(false);
    }
  }

  async function nextRound(sessionId) {
    setLoading(true);
    setError(null);
    try {
      const data = await moveToNextRound(sessionId);
      setSession((prev) => ({
        ...prev,
        currentRound: data.round,
        currentQuestionIndex: 0,
        currentQuestion: data.questions?.[0]?.question || "",
      }));
      return data;
    } catch (err) {
      setError(err.response?.data?.message || "Failed to advance round");
    } finally {
      setLoading(false);
    }
  }

  async function finishSession(sessionId) {
    setLoading(true);
    setError(null);
    try {
      const data = await finishInterviewSession(sessionId);
      return data;
    } catch (err) {
      setError(err.response?.data?.message || "Failed to finish session");
    } finally {
      setLoading(false);
    }
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
  };
}