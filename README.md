# Shūkan — A Discipline Tracker

Shūkan is a minimalist web application designed to help users turn intention into consistent action. It measures study discipline through verified hours, structured commitments, and long-term progress tracking.

Its core philosophy is simple:

Consistency compounds. Motivation fades.

Shūkan exists to make discipline visible.

---

## Overview

Most productivity tools track time. Shūkan tracks commitment.

Instead of rewarding short bursts of effort, it emphasizes sustained daily practice. Users log verified study hours, set daily goals, and review their progress through clear analytics and a public leaderboard ranked by cumulative effort.

The interface is intentionally restrained. It avoids clutter, noise, and unnecessary distraction so the focus remains on work.

---

## Core Principles

- Discipline over motivation
- Verification over self-reporting
- Consistency over intensity
- Clarity over distraction

---

## Features

### Verified Study Logging

Users can increment study time only after completing a full cooldown interval. This helps ensure that logged time reflects real effort rather than manual inflation.

### Daily Commitment System

Users set a study goal for the day. Completing the commitment may unlock additional recognition and helps reinforce follow-through without punishing missed goals.

### Personal Analytics

A private dashboard presents meaningful study statistics, including:

- Total verified hours
- Weekly activity
- Best study day
- Average session length
- Planning accuracy

The analytics are designed to support reflection rather than competition.

### Lifetime Leaderboard

The public leaderboard ranks users by cumulative verified study time.

Each entry shows:

- Rank
- Username
- Days active
- Total study time
- Distance from the current leader

This highlights long-term consistency rather than short-term spikes.

### Minimalist Interface

The visual style is inspired by Japanese minimalism:

- Muted colors
- Generous spacing
- Thin typography
- Subtle hierarchy

The interface is designed to reduce cognitive load and support extended use.

---

## System Design

Shūkan enforces integrity through server-side validation.

Each user record includes:

- Account creation timestamp
- Total verified study time
- Last verified session timestamp
- Daily commitment value

Study increments are allowed only after a defined time interval. Commitment rewards are awarded automatically when conditions are met.

All calculations prioritize transparency and simplicity.

---

## User Flow

1. User creates an account
2. User sets a daily commitment
3. User logs study sessions
4. Dashboard updates analytics
5. Leaderboard reflects cumulative progress

The system supports a cycle of planning, execution, and reflection.

---

## Privacy

Shūkan stores only the data required to track progress.

- No audio or video is recorded
- No personal content is shared externally
- No behavioral profiling is performed

The system measures effort, not identity.

---

## Intended Audience

Shūkan is built for:

- Students
- Self-learners
- Engineers
- Researchers
- Anyone building a disciplined routine

It is especially useful for users who prefer structured productivity tools over gamified environments.

---

## Technology

- Frontend: React (Vite), TypeScript, Tailwind CSS
- Backend and Database: Supabase
- Hosting: Vercel

The architecture is designed for simplicity, scalability, and maintainability.

---

## Deployment

The application is deployed as a static site with serverless backend integration. Automatic redeployment occurs when updates are pushed to the repository.

Client-side routing is supported through rewrite configuration to ensure seamless navigation.

---

## Future Direction

Potential future enhancements include:

- Presence verification
- Focus mode
- Group accountability rooms
- Discipline scoring
- Mobile installation support

The goal is to evolve into a system that measures not just time, but behavioral consistency.

---

## Author

Mithun Srinivas  
Electronics and Communication Engineering  
Full Stack Development and Cloud Computing

---

## Closing Note

Shūkan is not designed to push users harder.

It is designed to help users keep promises to themselves.

Discipline is not dramatic.  
It is repetition.

Shūkan makes repetition visible.
