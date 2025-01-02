import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import Auth from "./components/Auth";
import Dashboard from "./components/Dashboard";
import { auth } from "./firebase"; // Firebase config import
import { onAuthStateChanged } from "firebase/auth";

function App() {
    const [user, setUser] = useState(null); // Starea conexiunii utilizatorului
    const [loading, setLoading] = useState(true); // Detectăm încărcarea inițială

    useEffect(() => {
        // Ascultăm modificările stării autentificării
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser); // Actualizăm starea utilizatorului
            setLoading(false); // Am terminat inițializarea
        });

        return () => unsubscribe(); // Curățare: oprim listener-ul
    }, []);

    if (loading) {
        return <p>Loading...</p>; // Afișăm un indicator de încărcare când configurăm sesiunea
    }

    return (
        <Router>
            <Routes>
                <Route
                    path="/"
                    element={user ? <Navigate to="/dashboard" /> : <Auth />}
                />
                <Route
                    path="/dashboard"
                    element={user ? <Dashboard /> : <Navigate to="/" />}
                />
            </Routes>
        </Router>
    );
}

export default App;