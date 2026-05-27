# Athlete Atlas

Athlete Atlas is a web application for managing sports teams, athletes, and match records. It was built as a portfolio project to practice authentication, protected routes, Firestore data modeling, file uploads, and dashboard-style UI workflows.

## Features

- Email/password authentication with email verification
- Google sign-in through Firebase Authentication
- Protected dashboard routes for verified users
- Team creation and deletion
- Athlete/member management for each team
- Match tracking with opponent, date, score, and optional PDF report upload
- Basic win/loss/draw statistics with chart visualization
- Excel import flow for adding team members in bulk
- Firebase Storage integration for match report files

## Tech Stack

- React
- React Router
- Material UI
- Firebase Authentication
- Cloud Firestore
- Firebase Storage
- Recharts
- SheetJS / XLSX
- Create React App

## Project Type

Production-style portfolio project.

This is not presented as a deployed production system, but it is structured around realistic application concerns: user accounts, authorization checks, persistent data, file storage, and data-driven screens.

## Getting Started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm start
```

Build for production:

```bash
npm run build
```

## Firebase Configuration

The app initializes Firebase in `src/firebase.jsx`. To run your own instance, create a Firebase project with Authentication, Firestore, and Storage enabled, then replace the Firebase configuration with your project values.

Recommended authentication providers:

- Email/password
- Google sign-in

## Data Model

The app stores teams in a top-level `teams` collection. Each team can contain nested `members` and `matches` collections.

Example structure:

```text
teams/{teamId}
teams/{teamId}/members/{memberId}
teams/{teamId}/matches/{matchId}
```

## Notes

This repository is intended for portfolio review and learning. Before using it in a real organization, the project would need stronger validation, security rule review, environment-based configuration, tests, and deployment hardening.
