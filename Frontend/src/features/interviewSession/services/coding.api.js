import axios from "axios";

const api = axios.create({
    baseURL: "http://localhost:3000",
    withCredentials: true,
});

export const runCodeAPI = async ({ code, language, stdin }) => {
    const response = await api.post("/api/coding/run", { code, language, stdin });
    return response.data;
};

export const submitCodeAPI = async ({ sessionId, code, language, questionIndex, stdin }) => {
    const response = await api.post(`/api/coding/${sessionId}/submit`, {
        code,
        language,
        questionIndex,
        stdin,
    });
    return response.data;
};

export const getSubmissionsAPI = async (sessionId) => {
    const response = await api.get(`/api/coding/${sessionId}/submissions`);
    return response.data;
};

export const getSupportedLanguagesAPI = async () => {
    const response = await api.get("/api/coding/languages");
    return response.data;
};