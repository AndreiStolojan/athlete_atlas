import React, { useEffect, useState } from "react";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
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

const Dashboard = () => {
    const navigate = useNavigate();

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

    // Începe editarea unui membru
    const startEditMember = (member) => {
        setEditMemberId(member.id);
        setNewMemberFirstName(member.firstName);
        setNewMemberLastName(member.lastName);
        setNewMemberFatherInitial(member.fatherInitial);
        setNewMemberBirthDate(member.birthDate);
        setNewMemberUniversity(member.university || "");
        setNewMemberIsActive(member.isActive);
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
                });
            }

            // Resetăm formularul
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
                    label="Sportul"
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
                                    secondary={`${member.university || "Fără universitate"} | ${
                                        member.isActive ? "Activ" : "Inactiv"
                                    }`}
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
                                        onClick={() =>
                                            console.log(`Șterge membru ${member.id}`)
                                        }
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
                    onClick={() => setDialogOpen(true)}
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
        </div>
    );
};

export default Dashboard;