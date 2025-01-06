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
} from "firebase/auth";
import { useNavigate } from "react-router-dom";
import {
    TextField,
    Button,
    Typography,
    Switch,
    InputAdornment,
    Box,
    Link,
    Alert,
    createTheme,
    ThemeProvider,
    FormControlLabel,
} from "@mui/material";
import WbSunnyIcon from "@mui/icons-material/WbSunny";
import NightsStayIcon from "@mui/icons-material/NightsStay";
import GoogleIcon from "@mui/icons-material/Google";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import Lock from "@mui/icons-material/Lock";
import Email from "@mui/icons-material/Email";

const Auth = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isRegistering, setIsRegistering] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
        setShowConfirmPassword(!showConfirmPassword);
    };
    const [isDarkMode, setIsDarkMode] = useState(true);
    const navigate = useNavigate();

    // Temele pentru moduri dark și light
    const darkTheme = createTheme({
        palette: {
            mode: "dark",
            background: {
                default: "#121212",
                paper: "#1E1E1E",
            },
            text: {
                primary: "#FFFFFF",
                secondary: "#B3B3B3",
            },
            primary: {
                main: "#1976D2",
            },
            secondary: {
                main: "#FFC107",
            },
            error: {
                main: "#FF5252",
            },
            success: {
                main: "#4CAF50",
            },
        },
    });

    const lightTheme = createTheme({
        palette: {
            mode: "light",
            background: {
                default: "#FFFFFF",
                paper: "#F5F5F5",
            },
            text: {
                primary: "#121212",
                secondary: "#4F4F4F",
            },
            primary: {
                main: "#1976D2",
            },
        },
    });

    const theme = isDarkMode ? darkTheme : lightTheme;

    const handleGoogleSignIn = async () => {
        setError(null);
        setSuccess("");
        try {
            const googleProvider = new GoogleAuthProvider();
            googleProvider.setCustomParameters({ prompt: "select_account" });
            await setPersistence(auth, browserLocalPersistence);

            const result = await signInWithPopup(auth, googleProvider);
            if (!result.user) throw new Error("Conectarea Google a eșuat.");

            setSuccess("Te-ai conectat cu succes folosind contul Google!");
            navigate("/dashboard");
        } catch (err) {
            setError(err.message || "Conectarea cu Google a eșuat.");
        }
    };

    // Declarăm un contor global pentru numărul de încercări
    let attempts = 0;

    // Funcția de resetare a contorului
    const resetAttempts = () => {
        attempts = 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null); // Resetăm mesajele de eroare
        setSuccess(""); // Resetăm mesajele de succes

        try {
            // Blocăm dacă se depășește numărul de încercări
            if (attempts >= 5) {
                setError("Prea multe încercări nereușite. Vă rugăm să așteptați 30 de secunde înainte de a încerca din nou.");
                return;
            }

            // Creștem numărul de încercări
            attempts++;

            await setPersistence(auth, browserLocalPersistence);

            if (isRegistering) {
                if (!email) throw new Error("Introduceți o adresă de email.");
                if (password.length < 6) throw new Error("Parola trebuie să aibă cel puțin 6 caractere.");
                if (password !== confirmPassword) throw new Error("Parolele nu coincid.");

                // Crearea contului utilizator
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);

                // Trimiterea emailului de verificare
                await sendEmailVerification(auth.currentUser);

                setSuccess("Contul a fost creat cu succes! Verifică-ți email-ul pentru confirmare.");
                resetAttempts(); // Resetăm când operația reușește
            } else {
                if (!email) throw new Error("Introduceți o adresă de email.");
                if (!password) throw new Error("Introduceți o parolă.");

                const userCredential = await signInWithEmailAndPassword(auth, email, password);

                // Verificăm dacă email-ul utilizatorului este confirmat
                if (!userCredential.user.emailVerified) {
                    throw new Error("Email-ul nu este verificat. Verifică-ți inbox-ul.");
                }

                setSuccess("Autentificat cu succes!");
                navigate("/dashboard");
                resetAttempts(); // Resetăm când operația reușește
            }
        } catch (error) {
            // Verificăm codurile de eroare Firebase și gestionăm mesajele corespunzătoare
            if (error.code === "auth/too-many-requests") {
                // Blocăm manual pentru 30 de secunde
                setError("Prea multe încercări. Așteptați 30 de secunde și încercați din nou.");
                setTimeout(() => resetAttempts(), 30000); // Resetăm după 30 de secunde
            } else {
                // Alte erori Firebase
                switch (error.code) {
                    case "auth/email-already-in-use":
                        setError("Această adresă de email este deja folosită");
                        break;
                    case "auth/weak-password":
                        setError("Parola este prea slabă. Te rugăm să alegi o parolă mai puternică.");
                        break;
                    case "auth/invalid-email":
                        setError("Adresa de email este nevalidă. Verifică formatul.");
                        break;
                    case "auth/user-not-found":
                        setError("Nu există niciun utilizator cu această adresă de email.");
                        break;
                    case "auth/wrong-password":
                        setError("Parola introdusă este greșită. Încearcă din nou.");
                        break;
                    case "auth/network-request-failed":
                        setError("Conexiunea la rețea a eșuat. Verificați conexiunea la internet.");
                        break;
                    case "auth/invalid-credential":
                        setError("Parola sau emailul sunt gresite");
                        break;
                    case "auth/internal-error":
                        setError("A apărut o eroare internă. Încercați din nou.");
                        break;
                    case "auth/popup-blocked":
                        setError("");
                        break;
                    case "auth/cancelled-popup-request":
                        setError("Ati anulat conectarea cu contul Google");
                        break;
                    default :
                        // Eroare necunoscută
                        setError(error.message || "A apărut o eroare necunoscută.");
                }
            }
        }
    };

    return (
        // Restul codului rămâne neschimbat
        <ThemeProvider theme={theme}>
            <Box
                sx={{
                    height: "100vh",
                    background: isDarkMode
                        ? "linear-gradient(to bottom, #0F0F0F, #121212)"
                        : "linear-gradient(to bottom, #FFFFFF, #E8EAF6)",
                    transition: "all 0.3s ease",
                }}
            >
                <Box
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                    justifyContent="center"
                    height="100%"
                >
                    {/* Schimbarea temei cu soare în stânga și lună în dreapta */}
                    <Box sx={{ position: "absolute", top: 15, right: 15 }}>
                        <FormControlLabel
                            label={
                                <Box display="flex" alignItems="center" gap={1}>
                                    <WbSunnyIcon sx={{ color: isDarkMode ? "#FDB813" : "#FFC107" }} />
                                    <Switch
                                        checked={isDarkMode}
                                        onChange={() => setIsDarkMode(!isDarkMode)}
                                        color="primary"
                                    />
                                    <NightsStayIcon sx={{ color: isDarkMode ? "#1976D2" : "#3F51B5" }} />
                                </Box>
                            }
                            control={<span />}
                            sx={{
                                color: theme.palette.text.primary,
                                "& .MuiTypography-root": { fontSize: "0.9rem" },
                            }}
                            labelPlacement="start"
                        />
                    </Box>

                    <Box
                        sx={{
                            p: 4,
                            borderRadius: "12px",
                            boxShadow: isDarkMode
                                ? "0px 4px 10px rgba(0, 0, 0, 0.5)"
                                : "0px 4px 10px rgba(0, 0, 0, 0.1)",
                            backgroundColor: isDarkMode ? "#1F1F1F" : "#FFFFFF",
                            width: "400px",
                        }}
                    >
                        <Box display="flex" alignItems="center" justifyContent="center" mb={2}>
                            <Lock sx={{ fontSize: 40, color: isDarkMode ? "#1976D2" : "#4285F4" }} />
                            <Typography variant="h4" ml={1} sx={{ color: theme.palette.text.primary }}>
                                {isRegistering ? "Creează un cont" : "Conectează-te"}
                            </Typography>
                        </Box>

                        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

                        <Box component="form" onSubmit={handleSubmit}>
                            <TextField
                                label="Email"
                                fullWidth
                                margin="normal"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                sx={{ mb: 2 }}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Email sx={{ color: theme.palette.text.primary }} />
                                        </InputAdornment>
                                    ),
                                }}
                            />

                            <TextField
                                label="Parolă"
                                type={showPassword ? "text" : "password"}
                                fullWidth
                                margin="normal"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Lock sx={{ color: theme.palette.text.primary }} />
                                        </InputAdornment>
                                    ),
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <Button
                                                onClick={togglePasswordVisibility}
                                                sx={{ color: theme.palette.text.primary, marginLeft: 2 }}
                                            >
                                                {showPassword ? <Visibility /> : <VisibilityOff />}
                                            </Button>
                                        </InputAdornment>
                                    ),
                                }}
                            />

                            {isRegistering && (
                                <TextField
                                    label="Confirmă Parola"
                                    type={showConfirmPassword ? "text" : "password"}
                                    fullWidth
                                    margin="normal"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Lock sx={{ color: theme.palette.text.primary }} />
                                            </InputAdornment>
                                        ),
                                        endAdornment: (
                                            <Button
                                                onClick={togglePasswordVisibility}
                                                sx={{ color: theme.palette.text.primary, ml: 2 }}
                                            >
                                                {showConfirmPassword ? <Visibility /> : <VisibilityOff />}
                                            </Button>
                                        ),
                                    }}
                                />
                            )}

                            <Button
                                type="submit"
                                variant="contained"
                                fullWidth
                                sx={{
                                    mt: 2,
                                    backgroundColor: isDarkMode ? "#1976D2" : "#4285F4",
                                    "&:hover": { backgroundColor: isDarkMode ? "#105A93" : "#3075E0" },
                                }}
                            >
                                {isRegistering ? "Creează cont" : "Conectează-te"}
                            </Button>
                        </Box>

                        <Button
                            onClick={handleGoogleSignIn}
                            variant="contained"
                            sx={{
                                mt: 2,
                                backgroundColor: "#DB4437",
                                color: "#FFF",
                                boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
                                "&:hover": { backgroundColor: "#E57373" },
                                width: "100%",
                                height: "45px",
                                fontWeight: "bold",
                            }}
                        >
                            <GoogleIcon sx={{ fontSize: 20, mr: 1 }} />
                            Conectare cu Google
                        </Button>

                        <Typography mt={3} textAlign="center" sx={{ color: theme.palette.text.primary }}>
                            {isRegistering ? "Ai deja un cont?" : "Nu ai cont?"}{" "}
                            <Link
                                component="button"
                                variant="body2"
                                onClick={() => setIsRegistering(!isRegistering)}
                                sx={{ color: theme.palette.primary.main }}
                            >
                                {isRegistering ? "Conectează-te" : "Creează cont"}
                            </Link>
                        </Typography>
                    </Box>

                    <Typography
                        variant="body2"
                        sx={{ mt: 2, color: isDarkMode ? "#666" : "#888", textAlign: "center" }}
                    >
                        © {new Date().getFullYear()} AthleteAtlas. Toate drepturile rezervate.
                    </Typography>
                </Box>
            </Box>
        </ThemeProvider>
    );
};

export default Auth;