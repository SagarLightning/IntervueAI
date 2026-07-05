import { useContext, useEffect } from "react";
import { AuthContext } from "../auth.context.jsx";
import { login, register, logout, getMe } from "../services/auth.api"


export const useAuth = () => {
    console.log("AuthContext in useAuth:", AuthContext);
    const context = useContext(AuthContext);
    console.log("context from useContext:", context);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    const { user, setUser, loading, setLoading } = context;

    const handleLogin = async ({ email, password }) => {
        setLoading(true);
        try {
            const data = await login({ email, password })
            setUser(data.user)
        }
        catch (err) {
            throw err;
        }
        finally {
            setLoading(false);
        }
    }
    const handleRegister = async ({ username, email, password }) => {
        setLoading(true);
        try {
            const data = await register({ username, email, password })
            setUser(data.user)
        }
        catch (err) {
            throw err;
        }
        finally {
            setLoading(false);
        }
    }
    const handleLogout = async () => {
        setLoading(true);
        try {
            await logout();
            setUser(null);
        }
        catch (err) {
            throw err;
        }
        finally {
            setLoading(false);
        }
    }
    // const handleGetMe=async()=>{
    //     setLoading(true);
    //     const data = await getMe();
    //     setUser(data.user)
    //     setLoading(false);
    // }
    return { user, loading, handleLogin, handleRegister, handleLogout };
}