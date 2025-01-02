import React, { useState } from "react";
import { auth } from "../firebase";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    setPersistence,
    browserLocalPersistence,
} from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { TextField, Button, Typography, Box, Link, createTheme, ThemeProvider } from "@mui/material";

const theme = createTheme({
    palette: {
        background: {
            default: "#121212",
        },
        text: {
            primary: "#ECECEC",
        },
    },
    components: {
        MuiTextField: {
            styleOverrides: {
                root: {
                    "& .MuiInputBase-root": {
                        backgroundColor: "#1F1F1F",
                        color: "#ECECEC",
                        borderRadius: "8px",
                        "&:hover": {
                            borderColor: "#42A5F5",
                        },
                        "&.Mui-focused": {
                            borderColor: "#42A5F5",
                        },
                    },
                    "& .MuiInputLabel-root": {
                        color: "#ECECEC",
                    },
                },
            },
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    backgroundColor: "#42A5F5",
                    color: "#ECECEC",
                    borderRadius: "8px",
                    "&:hover": {
                        backgroundColor: "#64BDF5",
                    },
                },
            },
        },
        MuiTypography: {
            styleOverrides: {
                root: {
                    color: "#ECECEC",
                },
            },
        },
    },
});

const Auth = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isRegistering, setIsRegistering] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        try {
            await setPersistence(auth, browserLocalPersistence);

            if (isRegistering) {
                // Validări pentru înregistrare
                if (!email) {
                    throw new Error("Introduceți o adresă de email.");
                }
                if (password.length < 6) {
                    throw new Error("Parola trebuie să conțină cel puțin 6 caractere.");
                }
                if (password !== confirmPassword) {
                    throw new Error("Parolele nu coincid. Introduceți din nou.");
                }

                await createUserWithEmailAndPassword(auth, email, password);
                alert("Contul a fost creat cu succes!");
            } else {
                // Validări pentru autentificare
                if (!email) {
                    throw new Error("Introduceți o adresă de email.");
                }
                if (!password) {
                    throw new Error("Introduceți o parolă.");
                }

                await signInWithEmailAndPassword(auth, email, password);
                alert("Te-ai conectat cu succes!");
            }

            navigate("/dashboard");
        } catch (err) {
            console.error(err);
            // Gestionarea erorilor specifice din Firebase
            if (err.code) {
                switch (err.code) {
                    case "auth/email-already-in-use":
                        setError("Adresa de email este deja utilizată de un alt cont.");
                        break;
                    case "auth/invalid-email":
                        setError("Adresa de email nu este validă. Verificați formatul.");
                        break;
                    case "auth/weak-password":
                        setError("Parola este prea slabă. Alegeți una mai puternică.");
                        break;
                    case "auth/user-disabled":
                        setError("Acest cont a fost dezactivat. Contactați suportul.");
                        break;
                    case "auth/user-not-found":
                        setError("Nu există niciun cont asociat acestui email.");
                        break;
                    case "auth/wrong-password":
                        setError("Parola este incorectă. Încercați din nou.");
                        break;
                    case "auth/too-many-requests":
                        setError("Prea multe încercări nereușite. Vă rugăm să așteptați și să încercați mai târziu.");
                        break;
                    default:
                        setError("A apărut o eroare necunoscută. Încercați din nou.");
                        break;
                }
            } else {
                // Gestionarea erorilor generale
                setError(err.message || "A apărut o eroare. Încercați din nou.");
            }
        }
    };

    return (
        <ThemeProvider theme={theme}>
            <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                height="100vh"
                bgcolor="#121212"
            >
                <Typography variant="h4" mb={3}>
                    {isRegistering ? "Creează un cont" : "Conectează-te"}
                </Typography>
                {error && (
                    <Typography sx={{ color: "#f44336" }} variant="body1" mb={2}>
                        {error}
                    </Typography>
                )}
                <Box
                    component="form"
                    onSubmit={handleSubmit}
                    sx={{ width: "300px" }}
                >
                    <TextField
                        label="Email"
                        fullWidth
                        margin="normal"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <TextField
                        label="Parolă"
                        type="password"
                        fullWidth
                        margin="normal"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    {isRegistering && (
                        <TextField
                            label="Confirmă Parola"
                            type="password"
                            fullWidth
                            margin="normal"
                            value={confirmPassword}
                            onChange={(e) =>
                                setConfirmPassword(e.target.value)
                            }
                            required
                        />
                    )}
                    <Button
                        type="submit"
                        variant="contained"
                        fullWidth
                        sx={{ mt: 2 }}
                    >
                        {isRegistering ? "Creează cont" : "Conectează-te"}
                    </Button>
                </Box>
                <Typography mt={2}>
                    {isRegistering ? "Ai deja un cont?" : "Nu ai cont?"}{" "}
                    <Link
                        component="button"
                        variant="body2"
                        onClick={() => setIsRegistering((prev) => !prev)}
                    >
                        {isRegistering
                            ? "Conectează-te"
                            : "Creează cont"}
                    </Link>
                </Typography>
            </Box>
        </ThemeProvider>
    );
};

export default Auth;