import { createContext, useState, useEffect } from "react";
import { getMe } from "./services/auth.api";

export const AuthContext=createContext();

export const AuthProvider=({children})=>{
    const [user, setUser]=useState(null);
    const [loading, setLoading]=useState(true)

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const data = await getMe();
                // Safely check if data exists because getMe returns undefined on error
                if (data && data.user) {
                    setUser(data.user);
                }
            } catch (err) {
                console.error("Error fetching user:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchUser();
    }, []);

    return(
        <AuthContext.Provider value={{user,loading,setUser,setLoading}}>
            {children}
        </AuthContext.Provider>
    )
}