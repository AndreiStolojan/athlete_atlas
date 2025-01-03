import React, { useEffect, useState } from "react";
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

export default Dashboard;