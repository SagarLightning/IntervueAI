import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useInterviewSession } from "../hooks/useInterviewSession";
import { useInterview } from "../../interview/hooks/useInterview";
import styles from "../style/SessionStart.module.scss";

const DIFFICULTIES = ["easy", "medium", "hard"];
const INTERVIEW_TYPES = ["full", "resume", "technical", "coding", "behavioral"];

export default function SessionStart() {
  const navigate = useNavigate();
  const { startSession, nextRound, loading, error } = useInterviewSession();
  const { getReports } = useInterview();

  const [reports, setReports] = useState([]);
  const [startingStepText, setStartingStepText] = useState("");
  const [form, setForm] = useState(() => {
    try {
      const saved = localStorage.getItem("sessionStart_form");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      reportId: "",
      company: "",
      role: "",
      difficulty: "medium",
      interviewType: "full",
    };
  });

  useEffect(() => {
    getReports().then((data) => {
      if (data) setReports(data);
    });
  }, []);

  useEffect(() => {
    localStorage.setItem("sessionStart_form", JSON.stringify(form));
  }, [form]);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleStart() {
    if (!form.reportId || loading) return;
    setStartingStepText("Initializing session...");
    try {
      const session = await startSession(form);
      if (!session?.sessionId) return;

      const { sessionId } = session;

      if (form.interviewType === "coding") {
        setStartingStepText("Preparing Coding interview questions...");
        await nextRound(sessionId); // resume -> technical
        await nextRound(sessionId); // technical -> coding
        navigate(`/interview-session/${sessionId}/coding`);
        return;
      } else if (form.interviewType === "technical") {
        setStartingStepText("Preparing Technical interview questions...");
        await nextRound(sessionId); // resume -> technical
        navigate(`/interview-session/${sessionId}`);
        return;
      } else if (form.interviewType === "behavioral") {
        setStartingStepText("Preparing Behavioral interview questions...");
        await nextRound(sessionId); // resume -> technical
        await nextRound(sessionId); // technical -> coding
        await nextRound(sessionId); // coding -> behavioral
        navigate(`/interview-session/${sessionId}`);
        return;
      }

      navigate(`/interview-session/${sessionId}`);
    } catch (err) {
      console.error("Error starting session:", err);
    } finally {
      setStartingStepText("");
    }
  }

  function handleCancel() {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate("/");
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>

        <div className={styles.header}>
          <div className={styles.headerTop}>
            <h1 className={styles.title}>Start Mock Interview</h1>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={handleCancel}
              title="Cancel and go back"
              aria-label="Cancel and go back"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <p className={styles.subtitle}>
            Pick a resume report and configure your session.
          </p>
        </div>

        {/* Report selector */}
        <div className={styles.field}>
          <label className={styles.label}>Resume Report</label>
          <select
            name="reportId"
            value={form.reportId}
            onChange={handleChange}
            className={styles.select}
          >
            <option value="">-- Select a report --</option>
            {reports.map((r) => (
              <option key={r._id} value={r._id}>
                {r.title || r._id}
              </option>
            ))}
          </select>
        </div>

        {/* Company */}
        <div className={styles.field}>
          <label className={styles.label}>Target Company <span>(optional)</span></label>
          <input
            type="text"
            name="company"
            value={form.company}
            onChange={handleChange}
            placeholder="e.g. Google, Flipkart"
            className={styles.input}
          />
        </div>

        {/* Role */}
        <div className={styles.field}>
          <label className={styles.label}>Target Role <span>(optional)</span></label>
          <input
            type="text"
            name="role"
            value={form.role}
            onChange={handleChange}
            placeholder="e.g. Frontend Engineer"
            className={styles.input}
          />
        </div>

        {/* Difficulty */}
        <div className={styles.field}>
          <label className={styles.label}>Difficulty</label>
          <div className={styles.pills}>
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                className={`${styles.pill} ${form.difficulty === d ? styles.pillActive : ""}`}
                onClick={() => setForm((prev) => ({ ...prev, difficulty: d }))}
              >
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Interview Type */}
        <div className={styles.field}>
          <label className={styles.label}>Interview Type</label>
          <div className={styles.pills}>
            {INTERVIEW_TYPES.map((t) => (
              <button
                key={t}
                className={`${styles.pill} ${form.interviewType === t ? styles.pillActive : ""}`}
                onClick={() => setForm((prev) => ({ ...prev, interviewType: t }))}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <button
          className={styles.startBtn}
          onClick={handleStart}
          disabled={loading || !form.reportId}
        >
          {loading ? (startingStepText || "Starting...") : "Start Interview →"}
        </button>

      </div>
    </div>
  );
}