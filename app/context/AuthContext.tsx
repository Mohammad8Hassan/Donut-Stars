'use client';
import router from "next/router";
import { Dispatch, ReactNode, SetStateAction, createContext, useCallback, useEffect, useRef, useState } from "react";

export type userData = {
    id: number;
    email: string;
    name: string;
    phone?: string | null;
    roleId: number;
    roleName: string;
};

type AuthContextType = {
    user: userData | null;
    isLoading: boolean;
    checked: boolean;
    revalidate: () => Promise<void>;
    setUser: Dispatch<SetStateAction<userData | null>>;
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

    const isLoadingRef = useRef(false);
    
    const [checked, setChecked] = useState(false);

    const revalidate = useCallback(async () => {
        if (isLoadingRef.current) return;

        isLoadingRef.current = true;
        setIsLoading(true);
        // console.log("Revalidating auth...");
        try {
            let res: Response;
            try {
                res = await fetch("/api/me", {
                    credentials: "include",
                });
            } catch (err) {
                console.error("Auth revalidate error (me unreachable):", err);
                return;
            }

            if (res.status === 401) {
                let refreshRes: Response;
                try {
                    refreshRes = await fetch("/api/refresh", {
                        method: "POST",
                        credentials: "include",
                    });
                } catch (err) {
                    console.error("Auth revalidate error (refresh unreachable):", err);
                    return;
                }

                if (refreshRes.status === 401 || refreshRes.status === 403) {
                    setUser(null);
                    return;
                }

                if (!refreshRes.ok) {
                    console.error("Auth revalidate error: /api/refresh failed with", refreshRes.status);
                    return;
                }

                try {
                    res = await fetch("/api/me", {
                        credentials: "include",
                    });
                } catch (err) {
                    console.error("Auth revalidate error (me retry unreachable):", err);
                    return;
                }
            }

            if (res.status === 401 || res.status === 403) {
                setUser(null);
                return;
            }

            if (!res.ok) {
                console.error("Auth revalidate error: /api/me failed with", res.status);
                return;
            }

            const data = await res.json();
            setUser(data.user);
        } finally {
            setChecked(true);
            isLoadingRef.current = false;
            setIsLoading(false);
        }
    }, []);

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
