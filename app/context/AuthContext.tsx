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

// Everything consumers can read or call from useAuth().
type AuthContextType = {
    // Null means no authenticated user (guest or not yet resolved).
    user: userData | null;

    // True while a /api/me or /api/refresh request is in flight.
    // Use this to show spinners or block actions that need an identity.
    isLoading: boolean;

    // Flips to true after the very first auth check completes (success or failure).
    // Guards that must wait for a definitive answer (e.g. redirect logic, cart hydration)
    // should wait for checked === true before acting, so they don't flash or
    // make decisions before the session cookie has been verified.
    checked: boolean;

    // Re-runs the /api/me → optional /api/refresh → /api/me flow.
    // Call this after login, logout, or any action that changes the session
    // so the rest of the app sees the updated identity immediately.
    revalidate: () => Promise<void>;

    // Direct setter for the user state — useful for optimistic updates
    // (e.g. updating the displayed name after a profile edit without a full revalidate).
    setUser: Dispatch<SetStateAction<userData | null>>;
};

// Default values are placeholders for the rare case where useContext is called
// outside of AuthProvider. In practice, AuthProvider wraps the whole app in layout.tsx.
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
    
    // Starts false; becomes true after the first revalidate() settles.
    // Children that depend on knowing whether a user is logged in must
    // check this flag before rendering auth-sensitive UI.
    const [checked, setChecked] = useState(false);

    // Verifies the current session and refreshes it if the access token has expired.
    // Flow:
    //   1. GET /api/me — returns 200 + user if the access token cookie is valid.
    //   2. If 401, POST /api/refresh — attempts to issue a new access token using
    //      the refresh token cookie. If the refresh token is also expired or missing,
    //      the user is treated as logged out.
    //   3. If refresh succeeds, retry GET /api/me with the new token.
    //   4. Any non-OK final response clears the user.
    //
    // `checked` is always set to true in the finally block so that components
    // waiting on auth certainty unblock regardless of outcome.
    const revalidate = useCallback(async () => {
        // Prevent overlapping calls if one is already in flight.
        if (isLoadingRef.current) return;

        isLoadingRef.current = true;
        setIsLoading(true);
        console.log("Revalidating auth...");
        try {
            let res = await fetch("/api/me", {
                credentials: "include", // sends the HttpOnly access-token cookie
            });

            if (res.status === 401) {
                // Access token expired — try to get a new one via the refresh token.
                const refreshRes = await fetch("/api/refresh", {
                    method: "POST",
                    credentials: "include", // sends the HttpOnly refresh-token cookie
                });

                if (!refreshRes.ok) {
                    // Refresh token is also invalid or missing — user must log in again.
                    setUser(null);
                    setChecked(true);
                    isLoadingRef.current = false;
                    setIsLoading(false);
                    return;
                }

                // Refresh succeeded; the server has set a new access-token cookie.
                // Retry the identity check with the fresh token.
                res = await fetch("/api/me", {
                    credentials: "include",
                });
            }

            if (!res.ok) {
                // Unexpected error from /api/me — treat as unauthenticated.
                setUser(null);
                setChecked(true);
                isLoadingRef.current = false;
                setIsLoading(false);
                return;
            }

            const data = await res.json();
            setUser(data.user);
        } catch (err) {
            // Network failure or JSON parse error — fail safe to logged-out state.
            console.error("Auth revalidate error:", err);
            setUser(null);
        } finally {
            // Always mark auth as resolved so consumers stop waiting.
            setChecked(true);
            isLoadingRef.current = false;
            setIsLoading(false);
        }
    }, []); //check this

    // Run once on mount to establish the initial auth state before any page renders.
    // Because revalidate is stable (empty dep array above), this only fires once.
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
