import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
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
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db } from "../firebase";
import { auth, storage } from "../firebase";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { 
    AppBar,
    Toolbar,
    Typography,
    Button, 
    List, 
    ListItem, 
    ListItemText, 
    IconButton, 
    ListItemSecondaryAction, 
    Fab, 
    Checkbox, 
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControlLabel
} from "@mui/material";
import { deleteObject } from "firebase/storage";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";

const TeamPage = () => {
    const navigate = useNavigate();
    const { teamId } = useParams();
    const [team, setTeam] = useState(null);
    const [members, setMembers] = useState([]);
    const [matches, setMatches] = useState([]);
    const [view, setView] = useState("none"); // none, members, matches

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

    const fetchTeamData = async () => {
        const teamDoc = await getDoc(doc(db, "teams", teamId));
        setTeam({ id: teamDoc.id, ...teamDoc.data() });

        const membersSnapshot = await getDocs(collection(db, `teams/${teamId}/members`));
        setMembers(membersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));

        const matchesSnapshot = await getDocs(collection(db, `teams/${teamId}/matches`));
        setMatches(matchesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    };

    useEffect(() => {
        fetchTeamData();
    }, [teamId]);

    if (!team) {
        return <Typography>Se încarcă...</Typography>;
    }

    const handleDeleteMatch = async (matchId, matchPdfUrl) => {
        if (!teamId) {
            alert("Nu există o echipă selectată!");
            return;
        }
    
        try {
            // Verificări pentru permisiuni
            const teamDoc = await getDoc(doc(db, "teams", teamId));
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
            const matchRef = doc(db, `teams/${teamId}/matches/${matchId}`);
            await deleteDoc(matchRef); // Șterge meciul din Firestore
    
            alert("Meciul a fost șters cu succes!");
            fetchMatches(teamId); // Reîncarcă meciurile folosind teamId
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
        if (!teamId || !newOpponentTeam.trim() || !newMatchDate) {
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
                const storageRef = ref(storage, `matches/${teamId}/${newMatchFile.name}`);
                await uploadBytes(storageRef, newMatchFile);
                pdfUrl = await getDownloadURL(storageRef); // Obținem URL-ul pentru PDF.
            }
    
            const matchesRef = collection(db, `teams/${teamId}/matches`);
            await addDoc(matchesRef, {
                date: newMatchDate,
                opponentTeam: newOpponentTeam,
                goalsFor: newGoalsFor,
                goalsAgainst: newGoalsAgainst,
                createdBy: auth.currentUser?.uid,
                matchReportPdfUrl: pdfUrl,
            });
    
            resetMatchForm();
            fetchMatches(teamId); // Re-fetch meciurile folosind teamId
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
    

    
        // Șterge un membru al echipei
        const handleDeleteMember = async (memberId) => {
            try {
                // Obține referința către documentul membrului
                const memberRef = doc(db, `teams/${teamId}/members/${memberId}`);
                const memberDoc = await getDoc(memberRef);
        
                // Verifică dacă utilizatorul este creatorul echipei
                const teamRef = doc(db, "teams", teamId);
                const teamDoc = await getDoc(teamRef);
                if (teamDoc.data().createdBy !== auth.currentUser?.uid) {
                    alert("Nu aveți permisiuni să ștergeți acest membru!");
                    return;
                }
        
                // Șterge membrul
                await deleteDoc(memberRef);
                
                // Reîncarcă datele echipei și membrilor din Firestore
                const membersSnapshot = await getDocs(collection(db, `teams/${teamId}/members`));
                setMembers(membersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        
                alert("Membrul a fost șters cu succes!");
            } catch (error) {
                console.error("Eroare la ștergerea membrului:", error.message);
                alert(`Eroare: ${error.message}`);
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
            const teamDoc = await getDoc(doc(db, "teams", teamId)); // folosim teamId din useEffect
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
                // Dacă se editează un membru existent
                if (editMemberId) {
                    const memberRef = doc(db, `teams/${teamId}/members/${editMemberId}`);
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
                    // Dacă se adaugă un membru nou
                    const membersRef = collection(db, `teams/${teamId}/members`);
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
        
                resetMemberForm(); // Resetăm formularul după salvare
                const membersSnapshot = await getDocs(collection(db, `teams/${teamId}/members`));
                setMembers(membersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
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

    const handleLogout = async () => {
        try {
            await signOut(auth);
            navigate("/");
        } catch (err) {
            console.error("Eroare la logout:", err);
        }
    };

    return (
        <div>
            
            <AppBar position="static" style={{ backgroundColor: "purple" }}>
                <Toolbar>
                    <Typography variant="h6" style={{ flexGrow: 1 }}>
                        Gestionarea Echipelor
                    </Typography>
                    <Button color="inherit" onClick={handleLogout}>
                        Logout
                    </Button>
                </Toolbar>
            </AppBar>
            <div style={{ padding: "20px", textAlign: "center"}}>
                <Typography variant="h4" style={{ marginBottom: "10px"}}>
                    {team.name}
                </Typography>
                <Typography variant="subtitle1" style={{ marginBottom: "20px" }}>
                    Sport: {team.sport}
                </Typography>

            
                <div style={{ marginBottom: "40px" }}>
                    <Button
                        variant="contained"
                        color="secondary"
                        style={{ marginRight: "10px" }}
                        onClick={() => setView("members")}
                    >
                        Vezi Membrii
                    </Button>
                    <Button
                        variant="contained"
                        color="secondary"
                        onClick={() => setView("matches")}
                    >
                        Vezi Meciuri
                    </Button>
                </div>

                {view === "members" && (
                    <div style={{
                        padding: "20px",
                        margin: "20px",
                        border: "3px solid purple",
                        borderRadius: "8px",
                    }}>
                        <Typography variant="h5" style={{ marginBottom: "10px" }}>
                            Membrii Echipei
                        </Typography>
                        <List>
                            {members.map((member) => (
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
                    </div>
                )}

                {view === "matches" && (
                    <div style={{
                        padding: "20px",
                        margin: "20px",
                        border: "3px solid purple",
                        borderRadius: "8px",
                    }}>
                        <Typography variant="h5" style={{ marginBottom: "10px" }}>
                            Meciuri
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
            </div>

            <div
                style={{
                    position: "fixed",
                    bottom: "20px",
                    left: "20px", // Poziționează div-ul în stânga
                    display: "flex",
                    alignItems: "center",
                    border: "3px solid #8e24aa", // Bordura mov
                    padding: "8px",
                    borderRadius: "8px",
                    backgroundColor: "#fff", // Fundal alb pentru a face bordura vizibilă
                }}
>
                <span style={{ paddingRight: "10px" }}>
                    Adaugă Membrii
                </span>
                <Fab
                    color="secondary"
                    onClick={openAddMemberDialog} // Deschide dialogul de adăugare
                >
                    <AddIcon />
                </Fab>
            </div>
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

            <div
                style={{
                position: "fixed",
                bottom: "20px",
                right: "20px", // Poziționează div-ul în dreapta
                display: "flex",
                alignItems: "center",
                border: "3px solid #8e24aa", // Bordura mov
                padding: "8px",
                borderRadius: "8px",
                backgroundColor: "#fff", // Fundal alb pentru a face bordura vizibilă
            }}
>
                <span style={{ paddingRight: "10px" }}>
                    Adaugă Meci
                </span>
                <Fab
                    color="secondary"
                    onClick={() => setDialogOpenMatch(true)} // Deschide dialogul pentru meciuri
                >
                    <AddIcon />
                </Fab>
            </div>
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

export default TeamPage;
