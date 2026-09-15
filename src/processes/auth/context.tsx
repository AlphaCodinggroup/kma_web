"use client";

import React, { createContext, useContext, useMemo } from "react";
import type { Session, User } from "@entities/user/model/sessions";

export interface AuthContextValue {
    session: Session;
    user: User | null;
    isAuthenticated: boolean;
    isAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export interface AuthProviderProps {
    children: React.ReactNode;
    session: Session;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children, session }) => {
    const value = useMemo<AuthContextValue>(() => {
        const user = session.user;
        const role = user?.role?.toLowerCase();
        const isAdmin = role === "admin" || role === "administrator";

        return {
            session,
            user,
            isAuthenticated: session.authenticated,
            isAdmin,
        };
    }, [session]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useSession(): AuthContextValue {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useSession must be used within an AuthProvider");
    }
    return context;
}
