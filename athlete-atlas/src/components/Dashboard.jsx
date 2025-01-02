import React from "react";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { Button } from "@mui/material";

const Dashboard = () => {
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await signOut(auth); // Deconectează utilizatorul
            navigate("/"); // Redirecționează către pagina de logare
        } catch (err) {
            console.error("Eroare la deconectare:", err);
        }
    };

    return (
        <div style={{ textAlign: "center", marginTop: "50px" }}>
            <h1>Bine ai venit în Dashboard!</h1>
            <p>Aceasta este o pagină dedicată utilizatorilor autentificați.</p>
            <Button
                onClick={handleLogout}
                variant="contained"
                color="primary"
                style={{ marginTop: "20px" }}
            >
                Deconectează-te
            </Button>
        </div>
    );
};

export default Dashboard;