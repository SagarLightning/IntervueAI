import axios from "axios";

const api = axios.create({
    baseURL: "http://localhost:3000",
    withCredentials: true,
});

export const startInterviewSession = async ({ reportId, company, role, difficulty }) => {
    const response = await api.post("/api/interview-session/start", {
        reportId,
        company,
        role,
        difficulty,
    });

    return response.data;
};

export const getInterviewSession = async (sessionId) => {
    const response = await api.get(`/api/interview-session/${sessionId}`);
    return response.data;
};

export const submitInterviewAnswer = async ({ sessionId, questionIndex, answer, isFollowUp }) => {
    const response = await api.post(`/api/interview-session/${sessionId}/answer`, {
        questionIndex,
        answer,
        isFollowUp,
    });

    return response.data;
};

export const moveToNextRound = async (sessionId) => {
    const response = await api.post(`/api/interview-session/${sessionId}/next-round`);
    return response.data;
};

export const finishInterviewSession = async (sessionId) => {
    const response = await api.post(`/api/interview-session/${sessionId}/finish`);
    return response.data;
};