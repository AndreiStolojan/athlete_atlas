import React, { useEffect, useState } from "react";
import { auth, storage } from "../firebase";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { deleteObject } from "firebase/storage"; // Importă
import {
    AppBar,
    Toolbar,
    Typography,
    TextField,
    Button,
    IconButton,
    Card,
    CardContent,
    CardActions,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Fab,
    Checkbox,
    FormControlLabel,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import {
    collection,
    getDocs,
    addDoc,
    deleteDoc,
    doc,
    updateDoc,
    query,
    where,
    getDoc // Adăugăm importul pentru getDoc
} from "firebase/firestore";
import { db } from "../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const Dashboard = () => {
    const navigate = useNavigate();
    const [matches, setMatches] = useState([]); // Lista meciurilor.
    const [dialogOpenMatch, setDialogOpenMatch] = useState(false); // Stat pentru dialogul de creare/actualizare a meciului.
    const [newMatchDate, setNewMatchDate] = useState(""); // Data meciului.
    const [newOpponentTeam, setNewOpponentTeam] = useState(""); // Numele echipei adverse.
    const [newGoalsFor, setNewGoalsFor] = useState(0); // Goluri date.
    const [newGoalsAgainst, setNewGoalsAgainst] = useState(0); // Goluri primite.
    const [newMatchFile, setNewMatchFile] = useState(null); // PDF-ul raportului meciului.
    const [teams, setTeams] = useState([]);
    const [selectedTeamId, setSelectedTeamId] = useState(null);
    const [selectedTeamMembers, setSelectedTeamMembers] = useState([]);
    const [showMembers, setShowMembers] = useState(false);

    const [teamName, setTeamName] = useState("");
    const [teamSport, setTeamSport] = useState("");

    const [dialogOpen, setDialogOpen] = useState(false);
    const [newMemberFirstName, setNewMemberFirstName] = useState("");
    const [newMemberLastName, setNewMemberLastName] = useState("");
    const [newMemberFatherInitial, setNewMemberFatherInitial] = useState("");
    const [newMemberBirthDate, setNewMemberBirthDate] = useState("");
    const [newMemberUniversity, setNewMemberUniversity] = useState("");
    const [newMemberIsActive, setNewMemberIsActive] = useState(false);
    const [editMemberId, setEditMemberId] = useState(null);
    const [newMemberCNP, setNewMemberCNP] = useState("");
    const [newMemberRegistrationNumber, setNewMemberRegistrationNumber] = useState("");
    const [newMemberMedicalVisaExpiry, setNewMemberMedicalVisaExpiry] = useState("");

    const handleDeleteMatch = async (matchId, matchPdfUrl) => {
        if (!selectedTeamId) {
            alert("Nu există o echipă selectată!");
            return;
        }

        try {
            // Verificări pentru permisiuni
            const teamDoc = await getDoc(doc(db, "teams", selectedTeamId));
            if (teamDoc.data().createdBy !== auth.currentUser?.uid) {
                alert("Nu aveți permisiuni să ștergeți acest meci!");
                return;
            }

            // Ștergere fișier PDF din Firebase Storage (dacă există)
            if (matchPdfUrl) {
                try {
                    const decodedUrl = decodeURIComponent(matchPdfUrl);
                    const baseUrl = `https://firebasestorage.googleapis.com/v0/b/${process.env.REACT_APP_FIREBASE_STORAGE_BUCKET}/o/`;
                    if (decodedUrl.startsWith(baseUrl)) {
                        const relativePath = decodedUrl.replace(baseUrl, "").split("?")[0];
                        const fileRef = ref(storage, relativePath);
                        await deleteObject(fileRef); // Ștergere fișier
                    }
                } catch (fileError) {
                    console.warn("Fișierul nu a fost găsit în Firebase Storage:", fileError.message);
                }
            }

            // Ștergerea documentului din Firestore
            const matchRef = doc(db, `teams/${selectedTeamId}/matches/${matchId}`);
            await deleteDoc(matchRef); // Șterge meciul din Firestore

            alert("Meciul a fost șters cu succes!");
            fetchMatches(selectedTeamId); // Reîncarcă meciurile
        } catch (error) {
            console.error("Eroare la ștergerea meciului:", error.message);
            alert(`Eroare: ${error.message}`);
        }
    };

    const fetchMatches = async (teamId) => {
        try {
            const matchesSnapshot = await getDocs(collection(db, `teams/${teamId}/matches`));
            const matchesData = matchesSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
            setMatches(matchesData);
        } catch (error) {
            console.error("Eroare la obținerea meciurilor:", error.message);
        }
    };
    const handleAddMatch = async () => {
        if (!selectedTeamId || !newOpponentTeam.trim() || !newMatchDate) {
            return alert("Completați toate câmpurile pentru a adăuga meciul!");
        }

        try {
            let pdfUrl = "";

            // Dacă există un fișier PDF, se încarcă în Firebase Storage
            if (newMatchFile) {
                const storageRef = ref(storage, `matches/${selectedTeamId}/${newMatchFile.name}`);
                await uploadBytes(storageRef, newMatchFile); // Încărcare PDF.
                pdfUrl = await getDownloadURL(storageRef); // Obținere URL PDF.
            }

            // Salvăm datele meciului în baza de date Firestore
            const matchesRef = collection(db, `teams/${selectedTeamId}/matches`);
            await addDoc(matchesRef, {
                date: newMatchDate,
                opponentTeam: newOpponentTeam,
                goalsFor: newGoalsFor,
                goalsAgainst: newGoalsAgainst,
                createdBy: auth.currentUser?.uid, // User ID.
                matchReportPdfUrl: pdfUrl,
            });

            // Resetăm formularul
            resetMatchForm();
            // Refacem lista de meciuri
            fetchMatches(selectedTeamId);
        } catch (error) {
            console.error("Eroare la adăugarea meciului:", error.message);
            alert("Eroare la salvarea meciului!");
        }
    };

    const resetMatchForm = () => {
        setNewMatchDate("");
        setNewOpponentTeam("");
        setNewGoalsFor(0);
        setNewGoalsAgainst(0);
        setNewMatchFile(null);
        setDialogOpenMatch(false);
    };
    // Fetch echipele utilizatorului conectat
    const fetchTeams = async () => {
        try {
 const userId = auth.currentUser?.uid || ""; // Obținem ID-ul utilizatorului sau un string gol
            if (!userId) {
                console.error("Utilizatorul nu este conectat.");
                navigate("/"); // Redirecționăm dacă utilizatorul nu este autentificat
                return;
            }

            const q = query(collection(db, "teams"), where("createdBy", "==", userId));
            const querySnapshot = await getDocs(q);
            const teamsData = querySnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
            setTeams(teamsData);
        } catch (e) {
            console.error("Eroare la obținerea echipelor:", e);
        }
    };

    // Adaugă echipă nouă
    const handleAddTeam = async () => {
        if (!teamName.trim() || !teamSport.trim()) {
            alert("Completați toate informațiile despre echipă!");
            return;
        }

        try {
            const userId = auth.currentUser?.uid;

            if (!userId) {
                console.error("Utilizatorul nu este autentificat.");
                return;
            }

            // Salvăm echipa în Firestore, inclusiv creatorul
            const teamRef = await addDoc(collection(db, "teams"), {
                name: teamName,
                sport: teamSport,
                createdBy: userId, // UID-ul utilizatorului conectat
            });

            console.log("Noua echipă a fost creată: ", teamRef.id);

            // Resetăm câmpurile formularului
            setTeamName("");
            setTeamSport("");

            // Actualizăm lista echipelor
            fetchTeams();
        } catch (e) {
            console.error("Eroare la adăugarea echipei:", e.message);
            alert(`Eroare: ${e.message}`);
        }
    };

    // Șterge un membru al echipei
    const handleDeleteMember = async (memberId) => {
        if (!selectedTeamId) {
            alert("Nu există o echipă selectată!");
            return;
        }

        try {
            // Obține referința către documentul membrului
            const memberRef = doc(db, `teams/${selectedTeamId}/members/${memberId}`);
            const memberDoc = await getDoc(memberRef);

            // Verifică dacă utilizatorul este creatorul echipei
            const teamRef = doc(db, "teams", selectedTeamId);
            const teamDoc = await getDoc(teamRef);
            if (teamDoc.data().createdBy !== auth.currentUser?.uid) {
                alert("Nu aveți permisiuni să ștergeți acest membru!");
                return;
            }

            // Șterge membrul
            await deleteDoc(memberRef);
            toggleMembersVisibility(selectedTeamId); // Actualizează lista membrilor
            alert("Membrul a fost șters cu succes!");
        } catch (error) {
            console.error("Eroare la ștergerea membrului:", error.message);
            alert(`Eroare: ${error.message}`);
        }
    };

    // Șterge echipă
    const handleDeleteTeam = async (teamId) => {
        try {
            const teamDoc = await getDoc(doc(db, "teams", teamId));
            if (teamDoc.data().createdBy !== auth.currentUser?.uid) {
                alert("Nu aveți permisiuni să ștergeți această echipă!");
                return;
            }

            const membersRef = collection(db, `teams/${teamId}/members`);
            const membersSnapshot = await getDocs(membersRef);

            // Ștergem toți membrii echipei înainte de ștergerea echipei
            const deleteMembersPromises = membersSnapshot.docs.map((doc) => deleteDoc(doc.ref));
            await Promise.all(deleteMembersPromises);

            await deleteDoc(doc(db, "teams", teamId));
            fetchTeams();
        } catch (error) {
            console.error("Eroare la ștergerea echipei:", error.message);
        }
    };

    // Vizualizare membri echipă
    const toggleMembersVisibility = async (teamId) => {
        if (showMembers && selectedTeamId === teamId) {
            setShowMembers(false);
            setSelectedTeamId(null);
            setSelectedTeamMembers([]);
        } else {
            try {
                const querySnapshot = await getDocs(
                    collection(db, `teams/${teamId}/members`)
                );
                const membersData = querySnapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                setSelectedTeamId(teamId);
                setSelectedTeamMembers(membersData);
                setShowMembers(true);
            } catch (e) {
                console.error("Eroare la obținerea membrilor:", e);
            }
        }
    };

    // Funcție pentru deschiderea dialogului de adăugare
    const openAddMemberDialog = () => {
        resetMemberForm(); // Resetăm formularul complet
        setDialogOpen(true); // Deschidem dialogul
    };


    // Începe editarea unui membru
    const startEditMember = (member) => {
        setEditMemberId(member.id);
        setNewMemberFirstName(member.firstName);
        setNewMemberLastName(member.lastName);
        setNewMemberFatherInitial(member.fatherInitial);
        setNewMemberBirthDate(member.birthDate);
        setNewMemberUniversity(member.university || "");
        setNewMemberIsActive(member.isActive);
        setNewMemberCNP(member.cnp || "");
        setNewMemberRegistrationNumber(member.registrationNumber || "");
        setNewMemberMedicalVisaExpiry(member.medicalVisaExpiry || "");
        setDialogOpen(true);
    };


    // Adaugă sau actualizează un membru
    const handleSaveMember = async () => {
        if (!selectedTeamId) return alert("Selectați o echipă înainte de a adăuga membri!");

        const teamDoc = await getDoc(doc(db, "teams", selectedTeamId));
        const teamData = teamDoc.data();

        // Verificăm dacă utilizatorul este creatorul echipei
        if (teamData.createdBy !== auth.currentUser?.uid) {
            alert("Nu aveți permisiuni să editați membrii acestei echipe!");
            return;
        }

        if (!newMemberFirstName.trim() || !newMemberLastName.trim() || !newMemberFatherInitial.trim() || !newMemberBirthDate.trim()) {
            alert("Completați toate informațiile despre membru!");
            return;
        }

        try {
            if (editMemberId) {
                const memberRef = doc(db, `teams/${selectedTeamId}/members/${editMemberId}`);
                await updateDoc(memberRef, {
                    firstName: newMemberFirstName,
                    lastName: newMemberLastName,
                    fatherInitial: newMemberFatherInitial,
                    birthDate: newMemberBirthDate,
                    university: newMemberUniversity || null,
                    isActive: newMemberIsActive,
                    cnp: newMemberCNP,
                    registrationNumber: newMemberRegistrationNumber,
                    medicalVisaExpiry: newMemberMedicalVisaExpiry,
                });
            } else {
                const membersRef = collection(db, `teams/${selectedTeamId}/members`);
                await addDoc(membersRef, {
                    firstName: newMemberFirstName,
                    lastName: newMemberLastName,
                    fatherInitial: newMemberFatherInitial,
                    birthDate: newMemberBirthDate,
                    university: newMemberUniversity || null,
                    isActive: newMemberIsActive,
                    cnp: newMemberCNP,
                    registrationNumber: newMemberRegistrationNumber,
                    medicalVisaExpiry: newMemberMedicalVisaExpiry,
                    createdBy: auth.currentUser.uid,
                });
            }

            resetMemberForm();
            toggleMembersVisibility(selectedTeamId);
        } catch (error) {
            console.error("Eroare la salvarea membrului:", error.message);
        }

    };

    const resetMemberForm = () => {
        setNewMemberFirstName("");
        setNewMemberLastName("");
        setNewMemberFatherInitial("");
        setNewMemberBirthDate("");
        setNewMemberUniversity("");
        setNewMemberIsActive(false);
        setNewMemberCNP("");
        setNewMemberRegistrationNumber("");
        setNewMemberMedicalVisaExpiry("");
        setEditMemberId(null);
        setDialogOpen(false);
    };



    // Logout
    const handleLogout = async () => {
        try {
            await signOut(auth);
            navigate("/");
        } catch (err) {
            console.error("Eroare la logout:", err);
        }
    };

    useEffect(() => {
        console.log("Dashboard component mounted");
 const userId = auth.currentUser?.uid || "";
        if (userId) {
            fetchTeams();
        } else {
            navigate("/"); // Dacă nu este autentificat
        }
    }, []);

    return (
        <div>
            <AppBar position="static">
                <Toolbar>
                    <Typography variant="h6" style={{ flexGrow: 1 }}>
                        Gestionarea Echipelor
                    </Typography>
                    <Button color="inherit" onClick={handleLogout}>
                        Logout
                    </Button>
                </Toolbar>
            </AppBar>

            <div style={{ padding: "20px" }}>
                <Typography variant="h4" gutterBottom>
                    Adaugă o echipă
                </Typography>
                <TextField
                    fullWidth
                    label="Numele echipei"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    style={{ marginBottom: "10px" }}
                />
                <TextField
                    fullWidth
                    label="Sectia"
                    value={teamSport}
                    onChange={(e) => setTeamSport(e.target.value)}
                    style={{ marginBottom: "10px" }}
                />
                <Button
                    variant="contained"
                    color="primary"
                    onClick={handleAddTeam}
                >
                    Salvează Echipa
                </Button>
            </div>

            <div style={{ padding: "20px" }}>
                <Typography variant="h4" gutterBottom>
                    Echipele Tale
                </Typography>
                <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "1fr 1fr" }}>
                    {teams.map((team) => (
                        <Card key={team.id} variant="outlined" style={{ padding: "16px" }}>
                            <CardContent>
                                <Typography variant="h5">{team.name}</Typography>
                                <Typography variant="body2" color="textSecondary">
                                    Sport: {team.sport}
                                </Typography>
                            </CardContent>
                            <CardActions>
                                <Button
                                    color="primary"
                                    onClick={() => toggleMembersVisibility(team.id)}
                                >
                                    {selectedTeamId === team.id && showMembers
                                        ? "Ascunde Membrii"
                                        : "Vezi Membrii"}
                                </Button>
                                <IconButton onClick={() => handleDeleteTeam(team.id)} color="error">
                                    <DeleteIcon />
                                </IconButton>
                            </CardActions>
                        </Card>
                    ))}
                </div>
            </div>

            {showMembers && (
                <div style={{ padding: "20px" }}>
                    <Typography variant="h5">Membrii echipei</Typography>
                    <List>
                        {selectedTeamMembers.map((member) => (
                            <ListItem key={member.id}>
                                <ListItemText
                                    primary={`${member.firstName} ${member.lastName}`}
                                    secondary={`Universitate: ${member.university || "Fără universitate"} | ${
                                        member.isActive ? "Activ" : "Inactiv"
                                    }
            | CNP: ${member.cnp || "N/A"}
            | Nr. Legitimație: ${member.registrationNumber || "N/A"}
            | Expirare Viză Medicală: ${member.medicalVisaExpiry || "N/A"}`}
                                />
                                <ListItemSecondaryAction>
                                    <IconButton
                                        edge="end"
                                        color="primary"
                                        onClick={() => startEditMember(member)}
                                    >
                                        <EditIcon />
                                    </IconButton>
                                    <IconButton
                                        edge="end"
                                        color="error"
                                        onClick={() => handleDeleteMember(member.id)}
                                    >
                                        <DeleteIcon />
                                    </IconButton>
                                </ListItemSecondaryAction>
                            </ListItem>
                        ))}
                    </List>

                    {/* AICI ADAUGI FUNCȚIONALITATEA 7 */}
                    <div>
                        <Typography variant="h5" style={{ marginTop: "20px" }}>
                            Meciurile echipei
                        </Typography>
                        <List>
                            {matches.map((match) => (
                                <ListItem key={match.id}>
                                    <ListItemText
                                        primary={`Meci cu: ${match.opponentTeam} | Data: ${match.date}`}
                                        secondary={`Scor: ${match.goalsFor} - ${match.goalsAgainst}`}
                                    />
                                    {match.matchReportPdfUrl && (
                                        <a
                                            href={match.matchReportPdfUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ marginLeft: "16px" }}
                                        >
                                            Vezi Raport (PDF)
                                        </a>
                                    )}
                                    <ListItemSecondaryAction>
                                        <IconButton
                                            edge="end"
                                            color="error"
                                            onClick={() => handleDeleteMatch(match.id, match.matchReportPdfUrl)}
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </ListItemSecondaryAction>
                                </ListItem>
                            ))}
                        </List>
                    </div>
                    {/* SFÂRȘIT FUNCȚIONALITATE 7 */}
                </div>
            )}

            {selectedTeamId && (
                <Fab
                    color="primary"
                    style={{
                        position: "fixed",
                        bottom: "20px",
                        right: "20px",
                    }}
                    onClick={openAddMemberDialog} // Deschide dialogul de adăugare
                >
                    <AddIcon />
                </Fab>


            )}

            <Dialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle>
                    {editMemberId ? "Editează Membru" : "Adaugă Membru Nou"}
                </DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        margin="dense"
                        label="Prenume"
                        value={newMemberFirstName}
                        onChange={(e) => setNewMemberFirstName(e.target.value)}
                    />
                    <TextField
                        fullWidth
                        margin="dense"
                        label="Nume"
                        value={newMemberLastName}
                        onChange={(e) => setNewMemberLastName(e.target.value)}
                    />
                    <TextField
                        fullWidth
                        margin="dense"
                        label="Inițiala Tatălui"
                        value={newMemberFatherInitial}
                        onChange={(e) => setNewMemberFatherInitial(e.target.value)}
                    />
                    <TextField
                        fullWidth
                        margin="dense"
                        label="Data Nașterii (Zi/Lună/An)"
                        value={newMemberBirthDate}
                        onChange={(e) => setNewMemberBirthDate(e.target.value)}
                    />
                    <TextField
                        fullWidth
                        margin="dense"
                        label="CNP"
                        value={newMemberCNP}
                        onChange={(e) => setNewMemberCNP(e.target.value)}
                    />
                    <TextField
                        fullWidth
                        margin="dense"
                        label="Nr. Legitimație"
                        value={newMemberRegistrationNumber}
                        onChange={(e) => setNewMemberRegistrationNumber(e.target.value)}
                    />
                    <TextField
                        fullWidth
                        margin="dense"
                        label="Data Expirare Viză Medicală (Zi/Lună/An)"
                        value={newMemberMedicalVisaExpiry}
                        onChange={(e) => setNewMemberMedicalVisaExpiry(e.target.value)}
                    />
                    <TextField
                        fullWidth
                        margin="dense"
                        label="Universitate"
                        value={newMemberUniversity}
                        onChange={(e) => setNewMemberUniversity(e.target.value)}
                    />
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={newMemberIsActive}
                                onChange={(e) => setNewMemberIsActive(e.target.checked)}
                            />
                        }
                        label="Activ"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)} color="secondary">
                        Anulează
                    </Button>
                    <Button onClick={handleSaveMember} color="primary">
                        {editMemberId ? "Salvează Modificările" : "Adaugă"}
                    </Button>
                </DialogActions>
            </Dialog>
            {selectedTeamId && (
                <Fab
                    color="primary"
                    style={{
                        position: "fixed",
                        bottom: "80px",
                        right: "20px",
                    }}
                    onClick={() => setDialogOpenMatch(true)} // Deschide dialogul pentru meciuri
                >
                    <AddIcon />
                </Fab>
            )}

            <Dialog
                open={dialogOpenMatch}
                onClose={() => setDialogOpenMatch(false)}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle>Adaugă Meci Nou</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        margin="dense"
                        label="Data Meciului"
                        type="date"
                        value={newMatchDate}
                        onChange={(e) => setNewMatchDate(e.target.value)}
                        InputLabelProps={{
                            shrink: true,
                        }}
                    />
                    <TextField
                        fullWidth
                        margin="dense"
                        label="Echipa Adversă"
                        value={newOpponentTeam}
                        onChange={(e) => setNewOpponentTeam(e.target.value)}
                    />
                    <TextField
                        fullWidth
                        margin="dense"
                        label="Goluri Date"
                        type="number"
                        value={newGoalsFor}
                        onChange={(e) => setNewGoalsFor(Number(e.target.value))}
                    />
                    <TextField
                        fullWidth
                        margin="dense"
                        label="Goluri Primite"
                        type="number"
                        value={newGoalsAgainst}
                        onChange={(e) => setNewGoalsAgainst(Number(e.target.value))}
                    />
                    <label>Adaugă Raportul Meciului (PDF)</label>
                    <input
                        type="file"
                        accept="application/pdf"
                        onChange={(e) => setNewMatchFile(e.target.files[0])}
                        style={{ marginTop: "10px" }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogOpenMatch(false)} color="secondary">
                        Anulează
                    </Button>
                    <Button onClick={handleAddMatch} color="primary">
                        Adaugă
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};

export default Dashboard;