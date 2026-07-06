import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useInterviewSession } from "../hooks/useInterviewSession";
import { useInterview } from "../../interview/hooks/useInterview";
import styles from "../style/SessionStart.module.scss";

const DIFFICULTIES = ["easy", "medium", "hard"];
const INTERVIEW_TYPES = ["full", "resume", "technical", "coding", "behavioral"];

export default function SessionStart() {
  const navigate = useNavigate();
  const { startSession, loading, error } = useInterviewSession();
  const { fetchReports } = useInterview();

  const [reports, setReports] = useState([]);
  const [form, setForm] = useState({
    reportId: "",
    company: "",
    role: "",
    difficulty: "medium",
    interviewType: "full",
  });

  useEffect(() => {
    fetchReports().then((data) => {
      if (data) setReports(data);
    });
  }, []);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleStart() {
    if (!form.reportId) return;
    const session = await startSession(form);
    if (session?.sessionId) {
      navigate(`/interview-session/${session.sessionId}`);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>

        <div className={styles.header}>
          <h1 className={styles.title}>Start Mock Interview</h1>
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
          {loading ? "Starting..." : "Start Interview →"}
        </button>

      </div>
    </div>
  );
}