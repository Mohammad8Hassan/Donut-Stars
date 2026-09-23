'use client';
import router from "next/router";
import { Dispatch, ReactNode, SetStateAction, createContext, useCallback, useEffect, useRef, useState } from "react";

// Shape of the user object returned by /api/me and stored in context.
// Mirrors the session payload set during login.
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
                    credentials: "include", // sends the HttpOnly access-token cookie
                });
            } catch (err) {
                // Couldn't even reach the server — unknown state, not a logout.
                console.error("Auth revalidate error (me unreachable):", err);
                return;
            }

            if (res.status === 401) {
                // Access token expired — try to get a new one via the refresh token.
                let refreshRes: Response;
                try {
                    refreshRes = await fetch("/api/refresh", {
                        method: "POST",
                        credentials: "include", // sends the HttpOnly refresh-token cookie
                    });
                } catch (err) {
                    console.error("Auth revalidate error (refresh unreachable):", err);
                    return;
                }

                if (refreshRes.status === 401 || refreshRes.status === 403) {
                    // Server explicitly rejected the refresh token — genuinely logged out.
                    setUser(null);
                    return;
                }

                if (!refreshRes.ok) {
                    // e.g. a 5xx from a DB hiccup — inconclusive, not a confirmed logout.
                    console.error("Auth revalidate error: /api/refresh failed with", refreshRes.status);
                    return;
                }

                // Refresh succeeded; the server has set a new access-token cookie.
                // Retry the identity check with the fresh token.
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
                // Unexpected server error — inconclusive, leave existing state alone.
                console.error("Auth revalidate error: /api/me failed with", res.status);
                return;
            }

            const data = await res.json();
            setUser(data.user);
        } finally {
            // Always mark auth as resolved so consumers stop waiting.
            setChecked(true);
            isLoadingRef.current = false;
            setIsLoading(false);
        }
    }, []);

    // Run once on mount to establish the initial auth state before any page renders.
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
