import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";
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
    getDoc,
    arrayUnion
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
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { deleteObject } from "firebase/storage";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

const TeamPage = () => {
    const navigate = useNavigate();
    const { teamId } = useParams();
    const [team, setTeam] = useState(null);
    const [members, setMembers] = useState([]);
    const [matches, setMatches] = useState([]);
    const [view, setView] = useState("none"); // none, members, matches

    const [newSport, setNewSport] = useState("");
    const [dialogOpenMatch, setDialogOpenMatch] = useState(false);
    const [newMatchDate, setNewMatchDate] = useState("");
    const [newOpponentTeam, setNewOpponentTeam] = useState("");
    const [newGoalsFor, setNewGoalsFor] = useState(0);
    const [newGoalsAgainst, setNewGoalsAgainst] = useState(0);
    const [newSets, setNewSets] = useState([]);          // lista efectivă de seturi (ex: [[25,20],[22,25],[25,18]])
    const [newSetsInput, setNewSetsInput] = useState("");
    const [newMatchFile, setNewMatchFile] = useState(null);

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

    const [wins, setWins] = useState(0);
    const [losses, setLosses] = useState(0);
    const [draws, setDraws] = useState(0);

    const data = [
        { name: "Câștigate", value: wins },
        { name: "Pierdute", value: losses },
        { name: "Egaluri", value: draws },
    ];

    const COLORS = ["#7E57C2", "#3F51B5", "#9FA8DA"];

    const fetchTeamData = async () => {
        const userId = auth.currentUser?.uid || "";
        if (!userId) {
            console.error("Utilizatorul nu este conectat.");
            navigate("/");
            return;
        }

        const teamDoc = await getDoc(doc(db, "teams", teamId));
        const teamData = { id: teamDoc.id, ...teamDoc.data() };
        setTeam(teamData);

        const membersSnapshot = await getDocs(collection(db, `teams/${teamId}/members`));
        setMembers(membersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));

        const matchesSnapshot = await getDocs(collection(db, `teams/${teamId}/matches`));
        setMatches(matchesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));

        if (teamData.sport) {
            setNewSport(teamData.sport.toLowerCase());
        }
    };

    useEffect(() => {
        let winCount = 0;
        let lossCount = 0;
        let drawCount = 0;

        matches.forEach((match) => {
            const { scoreData } = match;

            const { team1, team2 } = scoreData || {};
            if (team1 > team2) winCount++;
            else if (team1 < team2) lossCount++;
            else drawCount++;

        });

        setWins(winCount);
        setLosses(lossCount);
        setDraws(drawCount);

    }, [matches]);

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
            const teamDoc = await getDoc(doc(db, "teams", teamId));
            if (teamDoc.data().createdBy !== auth.currentUser?.uid) {
                alert("Nu aveți permisiuni să ștergeți acest meci!");
                return;
            }

            if (matchPdfUrl) {
                try {
                    const decodedUrl = decodeURIComponent(matchPdfUrl);
                    const baseUrl = `https://firebasestorage.googleapis.com/v0/b/${process.env.REACT_APP_FIREBASE_STORAGE_BUCKET}/o/`;
                    if (decodedUrl.startsWith(baseUrl)) {
                        const relativePath = decodedUrl.replace(baseUrl, "").split("?")[0];
                        const fileRef = ref(storage, relativePath);
                        await deleteObject(fileRef);
                    }
                } catch (fileError) {
                    console.warn("Fișierul nu a fost găsit în Firebase Storage:", fileError.message);
                }
            }

            const matchRef = doc(db, `teams/${teamId}/matches/${matchId}`);
            await deleteDoc(matchRef);

            alert("Meciul a fost șters cu succes!");
            fetchMatches(teamId);
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
        if (!teamId || !newOpponentTeam.trim() || !newMatchDate) {
            return alert("Completați toate câmpurile pentru a adăuga meciul!");
        }

        const today = new Date();
        const selectedDate = new Date(newMatchDate);
        if (selectedDate > today) {
            return alert("Data meciului nu poate fi în viitor!");
        }

        try {
            let pdfUrl = "";

            // Upload PDF doar dacă e adăugat
            if (newMatchFile) {
                const fileExtension = newMatchFile.name.split('.').pop().toLowerCase();
                if (fileExtension !== "pdf") {
                    return alert("Doar fișiere de tip PDF sunt permise!");
                }

                const storageRef = ref(storage, `matches/${teamId}/${newMatchFile.name}`);
                await uploadBytes(storageRef, newMatchFile);
                pdfUrl = await getDownloadURL(storageRef);
            }

            const parsedSets = newSetsInput
                .split(",") // separăm seturile după virgulă
                .map((setStr) => setStr.trim())
                .map((setStr) => {
                    // regex pentru două numere între 0 și 99 separate de -
                    const match = setStr.match(/^(\d{1,2})-(\d{1,2})$/);
                    if (match) {
                        const num1 = Number(match[1]);
                        const num2 = Number(match[2]);
                        return [num1, num2];
                    }
                    return null; // set invalid
                })
                .filter(Boolean); // eliminăm seturile invalide

            // Construim scoreData în funcție de sport
            let scoreData = {};
            const sport = newSport.toLowerCase();

            switch (sport) {
                case "fotbal":
                case "handbal":
                case "baschet":
                case "volei":
                case "tenis":
                    scoreData = {
                        team1: Number(newGoalsFor) || 0,
                        team2: Number(newGoalsAgainst) || 0,
                    };
                    break;


                default:
                    scoreData = {
                        team1: Number(newGoalsFor) || 0,
                        team2: Number(newGoalsAgainst) || 0,
                    };
            }

            // Construim obiectul pentru Firestore
            const matchData = {
                sport,
                date: newMatchDate,
                opponentTeam: newOpponentTeam,
                scoreData,
                createdBy: auth.currentUser?.uid,
                matchReportPdfUrl: pdfUrl || null,
            };

            const matchesRef = collection(db, `teams/${teamId}/matches`);
            await addDoc(matchesRef, matchData);

            resetMatchForm();
            fetchMatches(teamId);
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
        setNewSets([]);
        setNewSetsInput("");
    };

    const formatScore = (match) => {
        const sport = match.sport?.toLowerCase();
        const score = match.scoreData;

        if (!score) return "-";

        switch (sport) {
            case "fotbal":
            case "handbal":
            case "baschet":
            case "volei":
            case "tenis":
                return `${score.team1} - ${score.team2}`;
            default:
                return `${score.team1} - ${score.team2}`;
        }
    };


    const handleDeleteMember = async (memberId) => {
        try {
            const memberRef = doc(db, `teams/${teamId}/members/${memberId}`);
            const memberDoc = await getDoc(memberRef);

            const teamRef = doc(db, "teams", teamId);
            const teamDoc = await getDoc(teamRef);
            if (teamDoc.data().createdBy !== auth.currentUser?.uid) {
                alert("Nu aveți permisiuni să ștergeți acest membru!");
                return;
            }

            await deleteDoc(memberRef);

            alert("Membrul a fost șters cu succes!");
            const membersSnapshot = await getDocs(collection(db, `teams/${teamId}/members`));
            setMembers(membersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));


        } catch (error) {
            console.error("Eroare la ștergerea membrului:", error.message);
            alert(`Eroare: ${error.message}`);
        }
    };

    const openAddMemberDialog = () => {
        resetMemberForm();
        setDialogOpen(true);
    };

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

    const handleSaveMember = async () => {
        const teamDoc = await getDoc(doc(db, "teams", teamId));
        const teamData = teamDoc.data();

        if (teamData.createdBy !== auth.currentUser?.uid) {
            alert("Nu aveți permisiuni să editați membri acestei echipe!");
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

            resetMemberForm();
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

    const handleImportExcel = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const validExtensions = ["xlsx", "xls"];
        const fileExtension = file.name.split(".").pop().toLowerCase();

        if (!validExtensions.includes(fileExtension)) {
            alert("Fișier invalid! Te rog selectează un fișier Excel (.xlsx sau .xls).");
            event.target.value = ""; // reset inputul
            return;
        }

        try {
            const teamDoc = await getDoc(doc(db, "teams", teamId));
            const teamData = teamDoc.data();

            if (teamData.createdBy !== auth.currentUser?.uid) {
                alert("Nu aveți permisiuni să editați membri acestei echipe!");
                return;
            }

            // Citim fișierul Excel
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(sheet);

            let addedCount = 0;
            let errors = [];

            for (const [index, row] of rows.entries()) {
                const firstName = (row["Prenume"] || "").trim();
                const lastName = (row["Nume"] || "").trim();
                const fatherInitial = (row["Inițiala tatălui"] || "").trim();
                const birthDateStr = (row["Data nașterii"] || "").trim();
                const cnp = (row["CNP"] || "").trim();
                const university = (row["Universitate"] || "").trim();
                const registrationNumber = (row["Număr legitimație"] || "").trim();
                const medicalVisaExpiry = (row["Expirare viză medicală"] || "").trim();
                const isActive = row["Activ"]?.toString().toLowerCase() === "da";

                // --- VALIDĂRI ---
                if (!firstName || !lastName || !fatherInitial || !birthDateStr || !cnp) {
                    errors.push(`Rândul ${index + 2}: Lipsesc informații obligatorii.`);
                    continue;
                }

                const birthDate = new Date(birthDateStr);
                const today = new Date();
                if (isNaN(birthDate.getTime()) || birthDate > today) {
                    errors.push(`Rândul ${index + 2}: Data nașterii invalidă.`);
                    continue;
                }

                if (!/^\d{13}$/.test(cnp)) {
                    errors.push(`Rândul ${index + 2}: CNP invalid (trebuie 13 cifre).`);
                    continue;
                }

                const membersRef = collection(db, `teams/${teamId}/members`);
                await addDoc(membersRef, {
                    firstName,
                    lastName,
                    fatherInitial,
                    birthDate: birthDateStr,
                    university: university || null,
                    isActive,
                    cnp,
                    registrationNumber,
                    medicalVisaExpiry,
                    createdBy: auth.currentUser.uid,
                });

                addedCount++;
            }

            // --- REZULTAT ---
            if (addedCount > 0) {
                alert(`Au fost adăugați ${addedCount} membri cu succes!`);
                const membersSnapshot = await getDocs(collection(db, `teams/${teamId}/members`));
                setMembers(membersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
            }
            if (errors.length > 0) {
                console.warn("Erori import:", errors);
                alert(`Importul s-a finalizat cu erori.\nVerifică consola pentru detalii.`);
            }
        } catch (error) {
            console.error("Eroare la import:", error);
            alert("A apărut o eroare la importul fișierului Excel.");
            event.target.value = "";
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

    const handleGoToDashboard = () => {
        navigate("/dashboard");
    };

    return (
        <div>
            <AppBar position="static" style={{ backgroundColor: "purple" }}>
                <Toolbar>
                    <IconButton
                        edge="start"
                        color="inherit"
                        onClick={handleGoToDashboard}
                        aria-label="back to dashboard"
                    >
                        <ArrowBackIcon />
                    </IconButton>
                    <Typography variant="h6" style={{ flexGrow: 1 }}>
                    </Typography>
                    <Button color="inherit" onClick={handleLogout}>
                        Logout
                    </Button>
                </Toolbar>
            </AppBar>
            <div style={{ padding: "40px 20px", textAlign: "center" }}>
                <Typography variant="h4" sx={{ fontWeight: 600, color: "#4a0072" }}>
                    {team.name}
                </Typography>
                <Typography variant="subtitle1" sx={{ color: "#666" }}>
                    Sport: {team.sport}
                </Typography>


                <div style={{ marginBottom: "40px" }}>
                    <Button
                        variant="contained"
                        color="secondary"
                        style={{ marginRight: "10px" }}
                        onClick={() => setView("members")}
                    >
                        Vezi Membri
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
                        padding: "12px 16px",
                        margin: "16px auto",
                        border: "1px solid #d1c4e9",
                        borderRadius: "12px",
                        backgroundColor: "#ffffff",
                        boxShadow: "0 4px 10px rgba(0, 0, 0, 0.06)",
                        maxWidth: "700px",
                        fontFamily: "Arial, sans-serif",
                        fontSize: "14px",
                        color: "#4a148c",
                        transition: "transform 0.2s, box-shadow 0.2s",
                    }}>
                        <Typography variant="h5" style={{ marginBottom: "10px" }}>
                            Membri Echipei
                        </Typography>
                        <List>
                            {members.map((member) => (
                                <ListItem key={member.id}>
                                    <ListItemText
                                        primary={`${member.firstName} ${member.lastName}`}
                                        secondary={`Universitate: ${member.university || "Fără universitate"} | ${member.isActive ? "Activ" : "Inactiv"
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

                        <div
                            style={{
                                marginTop: "30px",
                                padding: "15px",
                                border: "2px dashed #888",
                                borderRadius: "10px",
                                background: "#fafafa",
                            }}
                        >
                            <Typography variant="h6" gutterBottom>
                                Importă membri din fișier Excel
                            </Typography>
                            <input
                                type="file"
                                accept=".xlsx, .xls"
                                onChange={handleImportExcel}
                                style={{ marginTop: "10px" }}
                            />
                            <Typography variant="body2" color="textSecondary" style={{ marginTop: "5px" }}>
                                Format acceptat: .xlsx sau .xls <br />
                                Coloane necesare: Nume, Prenume, Inițiala tatălui, Data nașterii, CNP,
                                Universitate, Număr legitimație, Expirare viză medicală, Activ
                            </Typography>
                        </div>

                    </div>


                )}

                {view === "matches" && (
                    <div style={{
                        padding: "12px 16px",
                        margin: "16px auto",
                        border: "1px solid #d1c4e9",
                        borderRadius: "12px",
                        backgroundColor: "#ffffff",
                        boxShadow: "0 4px 10px rgba(0, 0, 0, 0.06)",
                        maxWidth: "700px",
                        fontFamily: "Arial, sans-serif",
                        fontSize: "14px",
                        color: "#4a148c",
                        transition: "transform 0.2s, box-shadow 0.2s",
                    }}>
                        <Typography variant="h5" style={{ marginBottom: "10px" }}>
                            Meciuri
                        </Typography>
                        <List>
                            {matches.map((match) => (
                                <ListItem key={match.id}>
                                    <ListItemText
                                        primary={`Meci cu: ${match.opponentTeam} | Data: ${match.date}`}
                                        secondary={`Scor: ${formatScore(match)}`}
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

                        <div style={{ width: "100%", height: 300, marginTop: 30 }}>
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie
                                        data={data}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={100}
                                        innerRadius={50}
                                        paddingAngle={3}
                                        labelLine={true}
                                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                    >
                                        {data.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={COLORS[index % COLORS.length]}
                                                stroke="#fff"
                                                strokeWidth={2}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: "rgba(50, 50, 70, 0.9)",
                                            borderRadius: "10px",
                                            border: "none",
                                            color: "#fff",
                                        }}
                                    />
                                    <Legend verticalAlign="bottom" />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                    </div>
                )}
            </div>

            <div
                style={{
                    position: "fixed",
                    bottom: "20px",
                    left: "20px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "6px 12px",
                    borderRadius: "12px",
                    border: "1px solid #d1c4e9",
                    backgroundColor: "#ffffff",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
                    fontFamily: "Arial, sans-serif",
                    fontSize: "14px",
                    color: "#4a148c",
                    transition: "transform 0.2s, box-shadow 0.2s",
                }}
            >
                <span style={{ paddingRight: "10px" }}>
                    Adaugă Membri
                </span>
                <Fab
                    color="secondary"
                    onClick={openAddMemberDialog}
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
                    <Button onClick={handleSaveMember} color="secondary">
                        {editMemberId ? "Salvează Modificările" : "Adaugă"}
                    </Button>
                </DialogActions>
            </Dialog>

            <div
                style={{
                    position: "fixed",
                    bottom: "20px",
                    right: "20px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "6px 12px",
                    borderRadius: "12px",
                    border: "1px solid #d1c4e9",
                    backgroundColor: "#ffffff",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
                    fontFamily: "Arial, sans-serif",
                    fontSize: "14px",
                    color: "#4a148c",
                    transition: "transform 0.2s, box-shadow 0.2s",
                }}
            >
                <span style={{ paddingRight: "10px" }}>
                    Adaugă Meci
                </span>
                <Fab
                    color="secondary"
                    onClick={() => setDialogOpenMatch(true)}
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

                    {["fotbal", "handbal"].includes(newSport) && (
                        <>
                            <TextField
                                fullWidth
                                margin="dense"
                                label="Goluri Marcate"
                                type="number"
                                inputProps={{ min: 0 }}
                                value={newGoalsFor}
                                onChange={(e) => setNewGoalsFor(Number(e.target.value))}
                            />
                            <TextField
                                fullWidth
                                margin="dense"
                                label="Goluri Primite"
                                type="number"
                                inputProps={{ min: 0 }}
                                value={newGoalsAgainst}
                                onChange={(e) => setNewGoalsAgainst(Number(e.target.value))}
                            />
                        </>
                    )}

                    {["baschet"].includes(newSport) && (
                        <>
                            <TextField
                                fullWidth
                                margin="dense"
                                label="Puncte Înscrise"
                                type="number"
                                inputProps={{ min: 0 }}
                                value={newGoalsFor}
                                onChange={(e) => setNewGoalsFor(Number(e.target.value))}
                            />
                            <TextField
                                fullWidth
                                margin="dense"
                                label="Puncte Primite"
                                type="number"
                                inputProps={{ min: 0 }}
                                value={newGoalsAgainst}
                                onChange={(e) => setNewGoalsAgainst(Number(e.target.value))}
                            />
                        </>
                    )}

                    {["volei", "tenis"].includes(newSport) && (
                        <>
                            <TextField
                                fullWidth
                                margin="dense"
                                label="Seturi Câştigate"
                                type="number"
                                inputProps={{ min: 0 }}
                                value={newGoalsFor}
                                onChange={(e) => setNewGoalsFor(Number(e.target.value))}
                            />
                            <TextField
                                fullWidth
                                margin="dense"
                                label="Seturi Pierdute"
                                type="number"
                                inputProps={{ min: 0 }}
                                value={newGoalsAgainst}
                                onChange={(e) => setNewGoalsAgainst(Number(e.target.value))}
                            />
                        </>
                    )}

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
                    <Button onClick={handleAddMatch} color="secondary">
                        Adaugă
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};

export default TeamPage;
