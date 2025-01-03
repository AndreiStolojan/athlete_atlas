import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import Auth from "./components/Auth";
import Dashboard from "./components/Dashboard";
import WaitingForVerification from "./components/WaitingForVerification"; // Pagina de așteptare
import { auth } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";

function App() {
    const [user, setUser] = useState(null); // Utilizatorul curent
    const [loading, setLoading] = useState(true); // Indicator de încărcare
    const [emailVerified, setEmailVerified] = useState(false); // Starea de verificare

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setEmailVerified(currentUser.emailVerified);
                setUser(currentUser);
            } else {
                setUser(null);
                setEmailVerified(false);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleLogout = async () => {
        await signOut(auth);
        setUser(null);
        setEmailVerified(false);
    };

    if (loading) {
        return <p>Se încarcă...</p>;
    }

    return (
        <Router>
            <Routes>
                <Route
                    path="/"
                    element={
                        user ? (
                            emailVerified ? (
                                <Navigate to="/dashboard" />
                            ) : (
                                <Navigate to="/verify-email" />
                            )
                        ) : (
                            <Auth />
                        )
                    }
                />
                <Route
                    path="/dashboard"
                    element={
                        user && emailVerified ? (
                            <Dashboard />
                        ) : (
                            <Navigate to="/" />
                        )
                    }
                />
                <Route
                    path="/verify-email"
                    element={
                        user && !emailVerified ? (
                            <WaitingForVerification
                                user={user}
                                handleLogout={handleLogout}
                            />
                        ) : (
                            <Navigate to="/" />
                        )
                    }
                />
            </Routes>
        </Router>
    );
}

export default App;