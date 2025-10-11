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
  <div style={{ backgroundColor: "#f9fafb", minHeight: "100vh" }}>
    {/* HEADER */}
    <AppBar position="static" style={{ backgroundColor: "#800080" }}>
      <Toolbar>
        <Typography
          variant="h6"
          style={{ flexGrow: 1, fontWeight: "600", letterSpacing: "0.5px" }}
        >
          Gestionarea Echipelor
        </Typography>
        <Button color="inherit" onClick={handleLogout}>
          LOGOUT
        </Button>
      </Toolbar>
    </AppBar>

    {/* FORM CARD */}
    <div
      style={{
        maxWidth: "600px",
        margin: "40px auto",
        backgroundColor: "white",
        borderRadius: "16px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
        padding: "40px",
        textAlign: "center",
      }}
    >
      <Typography
        variant="h4"
        gutterBottom
        style={{ color: "#800080", fontWeight: "700" }}
      >
        Adaugă o echipă
      </Typography>

      <TextField
        fullWidth
        label="Numele echipei"
        variant="outlined"
        value={teamName}
        onChange={(e) => setTeamName(e.target.value)}
        style={{ marginBottom: "16px" }}
      />
      <TextField
        fullWidth
        label="Sport"
        variant="outlined"
        value={teamSport}
        onChange={(e) => setTeamSport(e.target.value)}
        style={{ marginBottom: "24px" }}
      />
      <Button
        variant="contained"
        onClick={handleAddTeam}
        style={{
          backgroundColor: "#800080",
          color: "white",
          fontWeight: "600",
          padding: "10px 24px",
          borderRadius: "8px",
        }}
      >
        SALVEAZĂ ECHIPA
      </Button>
    </div>

    {/* TEAMS SECTION */}
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "0 20px" }}>
      <Typography
        variant="h4"
        gutterBottom
        style={{ color: "#800080", fontWeight: "700", marginBottom: "20px" }}
      >
        Echipele Tale
      </Typography>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "20px",
        }}
      >
        {teams.map((team) => (
          <Card
            key={team.id}
            style={{
              backgroundColor: "#800080",
              color: "white",
              borderRadius: "12px",
              boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
              marginBottom: "32px",
              transition: "transform 0.2s ease",
            }}
          >
            <CardContent>
              <Typography
                variant="h5"
                style={{
                  fontWeight: "600",
                  cursor: "pointer",
                  marginBottom: "8px",
                  transition: "color 0.2s ease, transform 0.2s ease",
                }}
                onClick={() => handleTeamClick(team.id)}
                onMouseEnter={(e) => {
                  e.target.style.color = "white";
                  e.target.style.transform = "scale(1.03)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.color = "white";
                  e.target.style.transform = "scale(1)";
                }}
              >
                {team.name}
              </Typography>

              <Typography variant="body2" style={{ marginBottom: "8px" }}>
                Sport: {team.sport}
              </Typography>

              <IconButton
                onClick={() => handleDeleteTeam(team.id)}
                style={{
                  color: "white",
                  transition: "background-color 0.2s ease, transform 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "rgba(255, 255, 255, 0.2)";
                  e.currentTarget.style.transform = "scale(1.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
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