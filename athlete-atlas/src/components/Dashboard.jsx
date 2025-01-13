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
    const [teams, setTeams] = useState([]);
    const [teamName, setTeamName] = useState("");
    const [teamSport, setTeamSport] = useState("");

    const fetchTeams = async () => {
        try {
            const userId = auth.currentUser?.uid || "";
            if (!userId) {
                console.error("Utilizatorul nu este conectat.");
                navigate("/");
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

            const teamRef = await addDoc(collection(db, "teams"), {
                name: teamName,
                sport: teamSport,
                createdBy: userId,
            });

            console.log("Noua echipă a fost creată: ", teamRef.id);

            setTeamName("");
            setTeamSport("");

            
            fetchTeams();
        } catch (e) {
            console.error("Eroare la adăugarea echipei:", e.message);
            alert(`Eroare: ${e.message}`);
        }
    };

    const handleDeleteTeam = async (teamId) => {
        try {
            const teamDoc = await getDoc(doc(db, "teams", teamId));
            if (teamDoc.data().createdBy !== auth.currentUser?.uid) {
                alert("Nu aveți permisiuni să ștergeți această echipă!");
                return;
            }

            const membersRef = collection(db, `teams/${teamId}/members`);
            const membersSnapshot = await getDocs(membersRef);
            const deleteMembersPromises = membersSnapshot.docs.map((doc) => deleteDoc(doc.ref));
            await Promise.all(deleteMembersPromises);

            const matchesRef = collection(db, `teams/${teamId}/matches`);
            const matchesSnapshot = await getDocs(matchesRef);
            const deleteMatchesPromises = matchesSnapshot.docs.map((doc) => deleteDoc(doc.ref));
            await Promise.all(deleteMatchesPromises);


            await deleteDoc(doc(db, "teams", teamId));
            fetchTeams();
        } catch (error) {
            console.error("Eroare la ștergerea echipei:", error.message);
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            navigate("/");
        } catch (err) {
            console.error("Eroare la logout:", err);
        }
    };

    const handleTeamClick = (teamId) => {
        navigate(`/team/${teamId}`);
    };

    useEffect(() => {
        console.log("Dashboard component mounted");
 const userId = auth.currentUser?.uid || "";
        if (userId) {
            fetchTeams();
        } else {
            navigate("/");
        }
    }, []);

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
                                <IconButton onClick={() => handleDeleteTeam(team.id)} color="white">
                                    <DeleteIcon />
                                </IconButton>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;