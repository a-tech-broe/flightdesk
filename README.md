# flightdesk


Recommended MVP Stack

Frontend

* Next.js￼

Backend API

* FastAPI￼

Database

* PostgreSQL￼

Reverse Proxy

* Nginx￼

SSL Certificates

* ACM

Container Runtime

* Docker￼
* Docker Compose

Hosting

* Amazon Web Services EC2


Recommended Infrastructure

Single EC2 Instance (Initial MVP)

This is enough for:

* First users
* Demo
* Portfolio
* Pilot schools testing

EC2 Specs

* Amazon Linux 2023
* m5.xlarge
* 30–50GB gp3 storage

Architecture

Internet
   ↓
Route53 DNS
   ↓
Nginx Reverse Proxy
   ↓
Docker Compose
 ├── Frontend (Next.js)
 ├── Backend API (FastAPI)
 └── PostgreSQL


MVP Components

1. Frontend Container

Responsibilities

* Login
* Dashboard
* Flight logging UI
* Aircraft scheduling UI

2. Backend API Container

Responsibilities

* Authentication
* Flight APIs
* Aircraft APIs
* Scheduling APIs

flightdesk/
├── frontend/
├── backend/
├── nginx/
├── docker-compose.yml
├── .env
└── infrastructure/


Initial MVP Features Only

Authentication

* Email/password login

Flight Logging

* Add flight
* View flights
* Edit flights

Aircraft Scheduling

* Simple booking calendar

Dashboard

* Total hours
* Recent flights
* Upcoming bookings

That’s enough for a real usable MVP.

⸻

Authentication Recommendation

Use:

* Clerk￼

Why:

* Faster MVP
* Secure auth
* MFA built-in
* OAuth later

⸻

CI/CD (Simple)

Use:

* GitHub Actions￼

Pipeline:
Push to main
   ↓
Build Docker images
   ↓
SSH into EC2
   ↓
docker compose pull
docker compose up -d
