import React, { useState } from "react";
import { auth } from "../firebase";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendEmailVerification,
    setPersistence,
    browserLocalPersistence,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithRedirect,
} from "firebase/auth";
import { useNavigate } from "react-router-dom";
import {
    TextField,
    Button,
    Typography,
    Box,
    Link,
    createTheme,
    ThemeProvider,
} from "@mui/material";
import GoogleIcon from "@mui/icons-material/Google";

// Tema globală Material-UI
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
    const [success, setSuccess] = useState("");
    const navigate = useNavigate();

    // Funcția pentru conectarea cu Google
    const handleGoogleSignIn = async () => {
        setError(null);
        setSuccess("");

        try {
            // Creăm instanța corectă a GoogleAuthProvider la începutul funcției
            const googleProvider = new GoogleAuthProvider();

            // Setăm parametrii pentru forțarea selectorului de conturi
            googleProvider.setCustomParameters({
                prompt: "select_account",
            });

            // Asigurăm persistența autentificării
            await setPersistence(auth, browserLocalPersistence);

            // Încercăm să realizăm conectarea prin popup
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;

            if (!user) {
                throw new Error("Conectarea Google a eșuat.");
            }

            // Dacă autentificarea reușește
            setSuccess("Te-ai conectat cu succes folosind contul Google!");
            navigate("/dashboard");
        } catch (err) {
            console.error("Eroare la autentificare:", err);

            if (err.code === "auth/popup-blocked") {
                try {
                    // Dacă pop-up-ul este blocat, fallback la signInWithRedirect
                    const googleRedirectProvider = new GoogleAuthProvider();
                    googleRedirectProvider.setCustomParameters({
                        prompt: "select_account", // Setăm parametrii și aici
                    });
                    await signInWithRedirect(auth, googleRedirectProvider);
                } catch (redirectError) {
                    console.error("Eroare la fallback pentru redirect:", redirectError);
                    setError(
                        redirectError.message || "Autentificarea cu Google a eșuat complet."
                    );
                }
            } else {
                // Tratare alte erori
                setError(err.message || "Conectarea cu Google a eșuat.");
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess("");

        try {
            await setPersistence(auth, browserLocalPersistence);

            if (isRegistering) {
                if (!email) throw new Error("Introduceți o adresă de email.");
                if (password.length < 6)
                    throw new Error("Parola trebuie să aibă cel puțin 6 caractere.");
                if (password !== confirmPassword)
                    throw new Error("Parolele nu coincid.");

                const userCredential = await createUserWithEmailAndPassword(
                    auth,
                    email,
                    password
                );
                const user = userCredential.user;

                await sendEmailVerification(user);
                setSuccess(`Contul a fost creat. Verifică email-ul ${email} pentru confirmare.`);
            } else {
                if (!email) throw new Error("Introduceți o adresă de email.");
                if (!password) throw new Error("Introduceți o parolă.");

                const userCredential = await signInWithEmailAndPassword(
                    auth,
                    email,
                    password
                );
                const user = userCredential.user;

                if (!user.emailVerified) {
                    throw new Error("Email-ul nu este verificat. Verifică-ți inbox-ul.");
                }

                setSuccess("Autentificat cu succes!");
                navigate("/dashboard");
            }
        } catch (err) {
            console.error(err);
            setError(err.message || "A apărut o eroare necunoscută.");
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
                {success && (
                    <Typography sx={{ color: "#4caf50" }} variant="body1" mb={2}>
                        {success}
                    </Typography>
                )}
                <Box component="form" onSubmit={handleSubmit} sx={{ width: "300px" }}>
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
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                    )}
                    <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }}>
                        {isRegistering ? "Creează cont" : "Conectează-te"}
                    </Button>
                </Box>
                <Button
                    onClick={handleGoogleSignIn}
                    variant="contained"
                    sx={{
                        mt: 2,
                        height: 40,
                        backgroundColor: "#DB4437",
                        color: "#FFF",
                        width: "300px",
                        "&:hover": { backgroundColor: "#E57373" },
                    }}
                >
                    <GoogleIcon sx={{ fontSize: 20, mr: 1 }} />
                    Conectare cu Google
                </Button>
                <Typography mt={2}>
                    {isRegistering ? "Ai deja un cont?" : "Nu ai cont?"}{" "}
                    <Link
                        component="button"
                        variant="body2"
                        onClick={() => setIsRegistering((prev) => !prev)}
                    >
                        {isRegistering ? "Conectează-te" : "Creează cont"}
                    </Link>
                </Typography>
            </Box>
        </ThemeProvider>
    );
};

export default Auth;