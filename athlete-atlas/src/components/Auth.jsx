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
    const [success, setSuccess] = useState(""); // Starea pentru mesajele de succes
    const navigate = useNavigate();

    // Funcția pentru conectarea cu Google
    const handleGoogleSignIn = async () => {
        setError(null); // Resetează erorile
        setSuccess(""); // Resetează mesajele de succes

        try {
            const provider = new GoogleAuthProvider();
            await setPersistence(auth, browserLocalPersistence); // Sesiunea persistă în browser

            // Încercăm să ne conectăm cu Google folosind Popup
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            // Verificare email validat (opțional, Google e validat implicit)
            if (!user.email) {
                throw new Error(
                    "Email-ul asociat contului Google nu este validat. Contactați suportul."
                );
            }

            setSuccess("Te-ai conectat cu succes folosind contul Google!");
            navigate("/dashboard"); // Navigare spre dashboard
        } catch (err) {
            console.error(err);

            if (err.code === "auth/popup-blocked") {
                // Fall back către metoda Redirect dacă Popup e blocat
                try {
                    const provider = new GoogleAuthProvider();
                    await signInWithRedirect(auth, provider);
                } catch (redirectError) {
                    console.error(redirectError);
                    setError(
                        redirectError.message ||
                        "Autentificarea cu Google nu a reușit. Încercați altă metodă."
                    );
                }
            } else {
                setError(
                    err.message || "Conectarea cu Google a eșuat. Încercați din nou."
                );
            }
        }
    };

    // Funcția de submit pentru email/parolă
    const handleSubmit = async (e) => {
        e.preventDefault(); // Previne refresh-ul paginii
        setError(null);
        setSuccess("");

        try {
            await setPersistence(auth, browserLocalPersistence); // Persistă sesiunea

            if (isRegistering) {
                // Înregistrare
                if (!email) throw new Error("Introduceți o adresă de email.");
                if (password.length < 6)
                    throw new Error("Parola trebuie să conțină cel puțin 6 caractere.");
                if (password !== confirmPassword)
                    throw new Error("Parolele nu coincid.");

                // Creează cont nou
                const userCredential = await createUserWithEmailAndPassword(
                    auth,
                    email,
                    password
                );
                const user = userCredential.user;

                // Trimite email de verificare
                await sendEmailVerification(user);
                setSuccess(
                    `Contul a fost creat cu succes. Verifică email-ul la adresa ${email} pentru confirmare!`
                );
            } else {
                // Autentificare
                if (!email) throw new Error("Introduceți o adresă de email.");
                if (!password) throw new Error("Introduceți o parolă.");

                const userCredential = await signInWithEmailAndPassword(
                    auth,
                    email,
                    password
                );
                const user = userCredential.user;

                if (!user.emailVerified) {
                    throw new Error(
                        "Email-ul nu este verificat. Verifică-ți inbox-ul."
                    );
                }

                setSuccess("Autentificare reușită!");
                navigate("/dashboard");
            }
        } catch (err) {
            console.error(err);

            // Tratăm codurile de eroare Firebase
            if (err.code) {
                switch (err.code) {
                    case "auth/email-already-in-use":
                        setError("Adresa de email este deja utilizată.");
                        break;
                    case "auth/invalid-email":
                        setError("Adresa de email nu este validă.");
                        break;
                    case "auth/weak-password":
                        setError("Parola este prea slabă.");
                        break;
                    case "auth/user-disabled":
                        setError("Contul este dezactivat.");
                        break;
                    case "auth/user-not-found":
                        setError("Email-ul nu există.");
                        break;
                    case "auth/wrong-password":
                        setError("Parola este greșită.");
                        break;
                    default:
                        setError("A apărut o eroare necunoscută.");
                }
            } else {
                setError(err.message || "A apărut o eroare necunoscută.");
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