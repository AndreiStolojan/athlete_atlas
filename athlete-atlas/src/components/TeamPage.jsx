import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Typography, List, ListItem, ListItemText } from "@mui/material";

const TeamPage = () => {
    const { teamId } = useParams();
    const [team, setTeam] = useState(null);
    const [members, setMembers] = useState([]);
    const [matches, setMatches] = useState([]);

    useEffect(() => {
        const fetchTeamData = async () => {
            const teamDoc = await getDoc(doc(db, "teams", teamId));
            setTeam({ id: teamDoc.id, ...teamDoc.data() });

            const membersSnapshot = await getDocs(collection(db, `teams/${teamId}/members`));
            setMembers(membersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));

            const matchesSnapshot = await getDocs(collection(db, `teams/${teamId}/matches`));
            setMatches(matchesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        };

        fetchTeamData();
    }, [teamId]);

    if (!team) {
        return <Typography>Se încarcă...</Typography>;
    }

    return (
        <div style={{ padding: "20px" }}>
            <Typography variant="h4">{team.name}</Typography>
            <Typography variant="subtitle1">Sport: {team.sport}</Typography>

            <div style={{ marginTop: "20px" }}>
                <Typography variant="h5">Membrii Echipei</Typography>
                <List>
                    {members.map((member) => (
                        <ListItem key={member.id}>
                            <ListItemText
                                primary={`${member.firstName} ${member.lastName}`}
                                secondary={`Universitate: ${member.university || "Fără universitate"}`}
                            />
                        </ListItem>
                    ))}
                </List>
            </div>

            <div style={{ marginTop: "20px" }}>
                <Typography variant="h5">Meciuri</Typography>
                <List>
                    {matches.map((match) => (
                        <ListItem key={match.id}>
                            <ListItemText
                                primary={`Meci cu: ${match.opponentTeam} | Data: ${match.date}`}
                                secondary={`Scor: ${match.goalsFor} - ${match.goalsAgainst}`}
                            />
                        </ListItem>
                    ))}
                </List>
            </div>
        </div>
    );
};

export default TeamPage;
