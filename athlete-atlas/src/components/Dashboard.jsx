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
            setMatches(matchesData); // Actualizăm lista meciurilor pe baza echipei selectate
        } catch (error) {
            console.error("Eroare la obținerea meciurilor:", error.message);
        }
    };

    const handleAddMatch = async () => {
        if (!selectedTeamId || !newOpponentTeam.trim() || !newMatchDate) {
            return alert("Completați toate câmpurile pentru a adăuga meciul!");
        }

        const today = new Date();
        const selectedDate = new Date(newMatchDate);
        if (selectedDate > today) {
            return alert("Data meciului nu poate fi in viitor!");
        }

        try {
            let pdfUrl = "";

            const fileExtension = newMatchFile.name.split('.').pop().toLowerCase();
            if (fileExtension !== "pdf") {
                return alert("Doar fisiere de tip PDF sunt permise!");
            }

            if (newMatchFile) {
                const storageRef = ref(storage, `matches/${selectedTeamId}/${newMatchFile.name}`);
                await uploadBytes(storageRef, newMatchFile);
                pdfUrl = await getDownloadURL(storageRef); // Obținem URL-ul pentru PDF.
            }

            const matchesRef = collection(db, `teams/${selectedTeamId}/matches`);
            await addDoc(matchesRef, {
                date: newMatchDate,
                opponentTeam: newOpponentTeam,
                goalsFor: newGoalsFor,
                goalsAgainst: newGoalsAgainst,
                createdBy: auth.currentUser?.uid,
                matchReportPdfUrl: pdfUrl,
            });

            resetMatchForm();
            fetchMatches(selectedTeamId); // Re-fetch după ce meciul este adăugat.
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
        if (selectedTeamId === teamId && showMembers) {
            setShowMembers(false);
            setSelectedTeamId(null);
            setSelectedTeamMembers([]);
            setMatches([]); // Resetăm lista meciurilor, pentru a evita erorile
        } else {
            try {
                const querySnapshot = await getDocs(collection(db, `teams/${teamId}/members`));
                const membersData = querySnapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                setSelectedTeamId(teamId);
                setSelectedTeamMembers(membersData);
                setShowMembers(true);

                // Fetch matches pentru echipa selectată
                fetchMatches(teamId);
            } catch (e) {
                console.error("Eroare la obținerea membrilor sau meciurilor:", e);
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
        if (!selectedTeamId) return alert("Selectați o echipă înainte de a adăuga membrii!");

        const teamDoc = await getDoc(doc(db, "teams", selectedTeamId));
        const teamData = teamDoc.data();

        // Verificăm dacă utilizatorul este creatorul echipei
        if (teamData.createdBy !== auth.currentUser?.uid) {
            alert("Nu aveți permisiuni să editați membrii acestei echipe!");
            return;
        }

        if (!newMemberFirstName.trim() || !newMemberLastName.trim() || !newMemberFatherInitial.trim() || !newMemberBirthDate.trim() || !newMemberCNP.trim()) {
            alert("Completați toate informațiile despre membru!");
            return;
        }

        const birthDate = new Date(newMemberBirthDate);
        const today = new Date();
        if (birthDate > today) {
            alert("Data nașterii nu poate fi în viitor!");
            return;
        }

        if (!/^\d{13}$/.test(newMemberCNP)) {
            alert("CNP-ul trebuie să conțină exact 13 cifre!");
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

    const handleTeamClick = (teamId) => {
        navigate(`/team/${teamId}`); // Navighează spre pagina echipei cu ID-ul respectiv
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

    /*return (
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
                        type="date"
                        label="Data Nașterii"
                        value={newMemberBirthDate}
                        onChange={(e) => setNewMemberBirthDate(e.target.value)}
                        InputLabelProps={{
                            shrink: true,
                        }}
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
                        type="date"
                        label="Data Expirare Viză Medicală"
                        value={newMemberMedicalVisaExpiry}
                        onChange={(e) => setNewMemberMedicalVisaExpiry(e.target.value)}
                        InputLabelProps={{
                            shrink: true,
                        }}
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
    );*/


    return (
        <div>
            <AppBar position="static" style={{ backgroundColor: "purple" }}>
                <Toolbar>
                    <Typography variant="h6" style={{ flexGrow: 1 }}>
                        Gestionarea Echipelor
                    </Typography>
                    <Button color="inherit" onClick={() => auth.signOut()}>
                        Logout
                    </Button>
                </Toolbar>
            </AppBar>

            <div
                style={{
                    padding: "20px",
                    margin: "20px",
                    border: "3px solid purple",
                    borderRadius: "8px",
                }}
            >
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
                    label="Sport"
                    value={teamSport}
                    onChange={(e) => setTeamSport(e.target.value)}
                    style={{ marginBottom: "10px" }}
                />
                <Button variant="contained" style={{ backgroundColor: "purple", color: "white" }} onClick={handleAddTeam}>
                    Salvează Echipa
                </Button>
            </div>

            <div
                style={{
                    padding: "20px",
                    margin: "20px",
                    border: "3px solid purple",
                    borderRadius: "8px",
                }}
            >
                <Typography variant="h4" gutterBottom >
                    Echipele Tale
                </Typography>
                <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "1fr 1fr" }}>
                    {teams.map((team) => (
                        <Card key={team.id} variant="outlined" style={{ padding: "16px", backgroundColor : "purple" }}>
                            <CardContent>
                                <Typography
                                    variant="h5"
                                    style={{ cursor: "pointer", color: "white" }}
                                    onClick={() => handleTeamClick(team.id)}
                                >
                                    {team.name}
                                </Typography>
                                <Typography variant="body2" color="white">
                                    Sport: {team.sport}
                                </Typography>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;




//VARIANTA MEA
/*import React, { useEffect, useState } from "react";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { TextField, Button, Checkbox, FormControlLabel } from "@mui/material";
import { db } from "../firebase";
import { collection, getDocs, addDoc, query, where, deleteDoc, doc  } from "firebase/firestore";
import { Timestamp } from "firebase/firestore";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from 'dayjs';

// Importă pluginurile de care ai nevoie
import weekOfYear from 'dayjs/plugin/weekOfYear';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import isBetween from 'dayjs/plugin/isBetween';
import advancedFormat from 'dayjs/plugin/advancedFormat';

// Extinde dayjs cu pluginurile respective
dayjs.extend(weekOfYear);
dayjs.extend(customParseFormat);
dayjs.extend(localizedFormat);
dayjs.extend(isBetween);
dayjs.extend(advancedFormat);

const Dashboard = () => {
    const navigate = useNavigate();
    const [teams, setTeams] = useState([]); // State pentru echipe
    const [selectedTeamId, setSelectedTeamId] = useState(null); // Echipa selectată
    const [selectedTeamMembers, setSelectedTeamMembers] = useState([]); // Membrii echipei selectate
    const [showMembers, setShowMembers] = useState(false); // Control vizibilitate membri

    const [teamName, setTeamName] = useState(""); // Formular echipe
    const [teamSport, setTeamSport] = useState("");

    const [teamNameForMember, setTeamNameForMember] = useState("");
    const [memberData, setMemberData] = useState({
        firstName: "",
        lastName: "",
        fatherInitial: "",
        birthDate: dayjs(),
        isStudent: false,
        faculty: "",
        isActive: true,
    });

    const handleLogout = async () => {
        try {
            await signOut(auth); // Deconectează utilizatorul
            navigate("/"); // Redirecționează către pagina de logare
        } catch (err) {
            console.error("Eroare la deconectare:", err);
        }
    };

    const fetchTeams = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, "teams"));
            const teamsData = querySnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
            setTeams(teamsData);
        } catch (e) {
            console.error("Error fetching teams:", e);
        }
    };

    const toggleMembersVisibility = async (teamId) => {
        if (showMembers && selectedTeamId === teamId) {
            // Dacă membrii sunt deja afișați, îi ascundem
            setShowMembers(false);
            setSelectedTeamId(null);
            setSelectedTeamMembers([]);
        } else {
            // Fetch și afișare membri
            try {
                const querySnapshot = await getDocs(collection(db, `teams/${teamId}/members`));
                const membersData = querySnapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                setSelectedTeamId(teamId);
                setSelectedTeamMembers(membersData);
                setShowMembers(true);
            } catch (e) {
                console.error("Error fetching members:", e);
            }
        }
    };

    const handleAddTeam = async () => {
        if (!teamName.trim() || !teamSport.trim()) {
            console.error("Toate câmpurile pentru echipă trebuie completate.");
            alert("Te rugăm să completezi toate câmpurile pentru echipă.");
            return;
        }
    
        try {
            const docRef = await addDoc(collection(db, "teams"), {
                name: teamName,
                sport: teamSport,
            });
            console.log("Echipa adăugată cu ID:", docRef.id);
            setTeamName("");
            setTeamSport("");
            fetchTeams(); // Reîmprospătare echipe
        } catch (e) {
            console.error("Eroare la adăugarea echipei:", e);
        }
    };

    const handleAddMemberByTeamName = async () => {
        const currentDate = dayjs(); // Data curentă
    
        // Validări de completitudine și structură
        if (
            !teamNameForMember?.trim() || // Verificăm dacă este definit și nu este gol
            !memberData?.firstName?.trim() ||
            !memberData?.lastName?.trim() ||
            !memberData?.fatherInitial?.trim() ||
            !memberData?.birthDate || // Verificăm dacă data de naștere este definită
            (memberData.isStudent && !memberData.university?.trim()) // Dacă este student, universitatea trebuie completată
        ) {
            console.error("Toate câmpurile pentru membru trebuie completate corect.");
            alert("Te rugăm să completezi toate câmpurile pentru membru corect.");
            return;
        }
    
        // Validare data de naștere
        if (dayjs(memberData.birthDate).isAfter(currentDate)) {
            console.error("Data de naștere nu poate fi în viitor.");
            alert("Data de naștere nu poate fi în viitor. Te rugăm să introduci o dată validă.");
            return;
        }
    
        try {
            // Căutare echipă după nume
            const q = query(collection(db, "teams"), where("name", "==", teamNameForMember));
            const querySnapshot = await getDocs(q);
    
            if (!querySnapshot.empty) {
                const teamDoc = querySnapshot.docs[0]; // Prima echipă găsită (numele trebuie să fie unic)
                const teamId = teamDoc.id;
    
                // Adaugă membrul în subcolecția "members"
                const docRef = await addDoc(collection(db, `teams/${teamId}/members`), {
                    ...memberData,
                    birthDate: Timestamp.fromDate(new Date(memberData.birthDate)), // Conversia birthDate
                });
                console.log("Membrul adăugat cu ID:", docRef.id);
    
                // Resetează formularul
                setMemberData({
                    firstName: "",
                    lastName: "",
                    fatherInitial: "",
                    birthDate: dayjs(), // Resetează data de naștere
                    isStudent: false,
                    university: "",
                    isActive: true,
                });
                setTeamNameForMember("");
    
                // Actualizează membrii echipei dacă echipa este vizibilă
                if (selectedTeamId === teamId) toggleMembersVisibility(teamId);
            } else {
                console.error("Nu a fost găsită nicio echipă cu acest nume.");
                alert("Echipa specificată nu există.");
            }
        } catch (e) {
            console.error("Eroare la adăugarea membrului:", e);
        }
    };
    
    const handleDeleteTeam = async (teamId) => {
        try {
            // Șterge membrii echipei
            const membersCollectionRef = collection(db, `teams/${teamId}/members`);
            const membersSnapshot = await getDocs(membersCollectionRef);
            const deletePromises = membersSnapshot.docs.map((memberDoc) => deleteDoc(memberDoc.ref));
            await Promise.all(deletePromises);
    
            // Șterge echipa
            await deleteDoc(doc(db, "teams", teamId));
            console.log("Echipa a fost ștearsă cu succes!");
            fetchTeams(); // Actualizează lista echipelor
        } catch (error) {
            console.error("Eroare la ștergerea echipei:", error);
        }
    };

    const handleDeleteMember = async (teamId, memberId) => {
        try {
            await deleteDoc(doc(db, `teams/${teamId}/members`, memberId));
            console.log("Membrul a fost șters cu succes!");
            toggleMembersVisibility(teamId); // Actualizează lista membrilor echipei
        } catch (error) {
            console.error("Eroare la ștergerea membrului:", error);
        }
    };
    
    useEffect(() => {
        fetchTeams();
    }, []);

    return (
        <div style={{ textAlign: "center", marginTop: "50px" }}>
            <h1>Bine ai venit în Dashboard!</h1>
            <p>Aceasta este o pagină dedicată utilizatorilor autentificați.</p>

            <div>
            <h2 style={{ marginTop: "30px" }}>Adaugă Echipe</h2>
            <TextField
                label="Numele Echipei"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                style={{ marginBottom: "10px" }}
            />
            <TextField
                label="Sportul Echipei"
                value={teamSport}
                onChange={(e) => setTeamSport(e.target.value)}
                style={{ marginBottom: "10px" }}
            />
            <Button variant="contained" color="primary" onClick={handleAddTeam}>
                Adaugă Echipa
            </Button>

            <h2 style={{ marginTop: "30px" }}>Adaugă Membrii</h2>
            <TextField
                label="Numele Echipei"
                value={teamNameForMember}
                onChange={(e) => setTeamNameForMember(e.target.value)}
                style={{ marginBottom: "10px" }}
            />
            <TextField
                label="Prenume"
                value={memberData.firstName}
                onChange={(e) =>
                    setMemberData((prev) => ({ ...prev, firstName: e.target.value }))
                }
                style={{ marginBottom: "10px" }}
            />
            <TextField
                label="Nume"
                value={memberData.lastName}
                onChange={(e) =>
                    setMemberData((prev) => ({ ...prev, lastName: e.target.value }))
                }
                style={{ marginBottom: "10px" }}
            />
            <TextField
                label="Inițiala Tatălui"
                value={memberData.fatherInitial}
                onChange={(e) =>
                    setMemberData((prev) => ({ ...prev, fatherInitial: e.target.value }))
                }
                style={{ marginBottom: "10px" }}
            />
            <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                    label="Data Nașterii"
                    value={memberData.birthDate}
                    onChange={(newValue) =>
                        setMemberData((prev) => ({ ...prev, birthDate: newValue }))
                    }
                    renderInput={(params) => (
                        <TextField {...params} style={{ marginBottom: "10px" }} />
                    )}
                />
            </LocalizationProvider>
            <FormControlLabel
                control={
                    <Checkbox
                        checked={memberData.isStudent}
                        onChange={(e) =>
                            setMemberData((prev) => ({ ...prev, isStudent: e.target.checked }))
                        }
                    />
                }
                label="Este Student?"
            />
            <TextField
                label="Universitatea"
                value={memberData.faculty}
                onChange={(e) =>
                    setMemberData((prev) => ({ ...prev, faculty: e.target.value }))
                }
                style={{ marginBottom: "10px" }}
            />
            <FormControlLabel
                control={
                    <Checkbox
                        checked={memberData.isActive}
                        onChange={(e) =>
                            setMemberData((prev) => ({ ...prev, isActive: e.target.checked }))
                        }
                    />
                }
                label="Activ?"
            />
            <Button
                variant="contained"
                color="secondary"
                onClick={handleAddMemberByTeamName}
                style={{ marginTop: "10px" }}
            >
                Adaugă Membrul
            </Button>
            </div>

            <h2>Lista echipelor</h2>
            {teams.length > 0 ? (
                <ul style={{ listStyleType: "none", padding: 0 }}>
                    {teams.map((team) => (
                        <li key={team.id} style={{ margin: "20px 0" }}>
                            <strong>{team.name}</strong> - {team.sport}
                            <Button
                                onClick={() => toggleMembersVisibility(team.id)}
                                variant="contained"
                                color={selectedTeamId === team.id && showMembers ? "secondary" : "primary"}
                                style={{ marginLeft: "10px" }}
                            >
                                {selectedTeamId === team.id && showMembers
                                    ? "Ascunde Membrii"
                                    : "Vezi Membrii"}
                            </Button>
                            <Button
                                onClick={() => handleDeleteTeam(team.id)}
                                variant="contained"
                                color="error"
                                style={{ marginLeft: "10px" }}
                            >
                                Șterge Echipa
                            </Button>

                        </li>
                    ))}
                </ul>
            ) : (
                <p>Nu există echipe.</p>
            )}

            {showMembers && (
                <div style={{ marginTop: "30px" }}>
                    <h2>Membrii echipei selectate</h2>
                    <ul style={{ listStyleType: "none", padding: 0 }}>
                        {selectedTeamMembers.map((member) => (
                            <li key={member.id}>
                                {member.firstName} {member.lastName}{" "}
                                {member.isStudent && member.faculty && (
                                    <span>- Student la {member.faculty}</span>
                                )}
                                {member.isActive ? " (Activ)" : " (Inactiv)"}
                            <Button
                                onClick={() => handleDeleteMember(selectedTeamId, member.id)}
                                variant="contained"
                                color="error"
                                style={{ marginLeft: "10px" }}
                            >
                                Șterge Membrul
                            </Button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

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

export default Dashboard;*/