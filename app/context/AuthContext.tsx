'use client';
import router from "next/router";
import { Dispatch, ReactNode, SetStateAction, createContext, useCallback, useEffect, useState } from "react";

export type userData = {
    id: string;
    email: string;
    name: string;
    phone?: string;
};

type AuthContextType = {
    user: userData | null;
    isLoading: boolean;
    checked: boolean;          // ✅ auth certainty
    revalidate: () => Promise<void>;
    setUser: Dispatch<SetStateAction<userData | null>>
};

const AuthContext = createContext<AuthContextType>({
    user: null,
    isLoading: false,
    checked: false,
    revalidate: async () => { },
    setUser: (value: SetStateAction<userData | null>) => { }
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<userData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [checked, setChecked] = useState(false);

    const revalidate = useCallback(async () => {
        if (isLoading) return;

        setIsLoading(true);
        console.log("Revalidating auth...");
        try {
            let res = await fetch("/api/me", {
                credentials: "include",
            });

            if (res.status === 401) {
                const refreshRes = await fetch("/api/refresh", {
                    method: "POST",
                    credentials: "include",
                });

                if (!refreshRes.ok) {
                    setUser(null);
                    setChecked(true);
                    setIsLoading(false);
                    return;
                }

                res = await fetch("/api/me", {
                    credentials: "include",
                });
            }

            if (!res.ok) {
                setUser(null);
                setChecked(true);
                setIsLoading(false);
                return;
            }

            const data = await res.json();
            setUser(data.user);
            // setChecked(false);
        } catch (err) {
            console.error("Auth revalidate error:", err);
            setUser(null);
        } finally {
            setChecked(true);
            setIsLoading(false);
        }
    }, []);

    // 🔹 Run once on app start
    useEffect(() => {
        revalidate();
    }, [revalidate]);

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                checked,
                revalidate,
                setUser
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export default AuthContext;