# FlightDesk

Flight logging and aircraft scheduling for pilot training schools.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router, TypeScript, Tailwind CSS) |
| Backend API | FastAPI (Python 3.11) |
| Database | PostgreSQL 15 |
| Reverse Proxy | Nginx |
| Containers | Docker + Docker Compose |
| Hosting | AWS EC2 (Amazon Linux 2023) |
| SSL | ACM / Let's Encrypt |
| CI/CD | GitHub Actions |

---

## Project Structure

```
flightdesk/
├── frontend/                  # Next.js app
│   └── src/
│       ├── app/
│       │   ├── (auth)/        # Login, Register
│       │   └── (protected)/   # Dashboard, Flights, Scheduling
│       ├── components/        # Navbar, FlightForm, BookingCalendar
│       ├── contexts/          # AuthContext (JWT)
│       ├── lib/               # Axios API client
│       └── types/             # Shared TypeScript types
├── backend/                   # FastAPI app
│   └── app/
│       ├── models/            # SQLAlchemy: User, Aircraft, Flight, Booking
│       ├── schemas/           # Pydantic request/response schemas
│       ├── routers/           # auth, flights, aircraft, bookings
│       └── auth/              # JWT utils (python-jose + passlib)
├── nginx/
│   ├── nginx.dev.conf         # HTTP only (local/dev)
│   └── nginx.conf             # HTTPS production config
├── infrastructure/
│   └── setup.sh               # EC2 bootstrap script
├── .github/workflows/
│   └── deploy.yml             # SSH deploy to EC2 on push to main
├── docker-compose.yml
└── .env.example
```

---

## Architecture

```
Internet
   ↓
Route53 DNS
   ↓
Nginx (port 80/443)
   ├── /api/*  → FastAPI (port 8000)
   └── /*      → Next.js (port 3000)
                     ↓
               PostgreSQL (internal)
```

---

## Features

### Authentication
- Email/password registration and login
- JWT tokens (24-hour expiry)
- Protected routes — redirect to login if unauthenticated

### Flight Logging
- Log flights with full logbook fields: total time, PIC, dual received, night, instrument, cross-country
- Day and night landing counts
- Departure/destination (ICAO codes), departure/arrival times, aircraft, notes
- View full logbook as a sortable table with running totals
- Edit and delete any of your flights

### Aircraft Scheduling
- FullCalendar week/month/day view showing all bookings
- Click any time slot to create a booking
- Click your own booking to edit or cancel it
- Conflict detection — prevents double-booking the same aircraft
- Shared calendar so all pilots see availability

### Dashboard
- Total flight hours, total flights logged, upcoming booking count
- Recent flights list
- Upcoming bookings list

---

## Running Locally

**Prerequisites:** Docker + Docker Compose

```bash
# 1. Clone
git clone <repo-url>
cd flightdesk

# 2. Set up environment
cp .env.example .env
# Edit .env — set POSTGRES_PASSWORD and generate a SECRET_KEY:
#   openssl rand -hex 32

# 3. Start everything
docker compose up --build

# App: http://localhost
# API docs: http://localhost/api/docs
```

---

## Deploying to EC2

### 1. Provision the instance

- Amazon Linux 2023, m5.xlarge, 30–50 GB gp3 storage
- Open ports 22, 80, 443 in the security group

### 2. Bootstrap the server

```bash
scp infrastructure/setup.sh ec2-user@<host>:~/
ssh ec2-user@<host> "bash ~/setup.sh"
# Log out and back in for Docker group permissions
```

### 3. Deploy the app

```bash
ssh ec2-user@<host>
git clone <repo-url> /app/flightdesk
cp /app/flightdesk/.env.example /app/flightdesk/.env
# Edit .env with production values

# Add SSL certs (from ACM export or certbot):
# /app/flightdesk/nginx/ssl/fullchain.pem
# /app/flightdesk/nginx/ssl/privkey.pem

# Swap to production nginx config in docker-compose.yml:
# nginx.dev.conf → nginx.conf

cd /app/flightdesk
docker compose up -d
```

### 4. Configure GitHub Actions CI/CD

Add these secrets to the GitHub repo (Settings → Secrets):

| Secret | Value |
|---|---|
| `EC2_HOST` | Public IP or domain of your EC2 instance |
| `EC2_USERNAME` | `ec2-user` |
| `EC2_SSH_KEY` | Private key for SSH access |

Push to `main` to trigger an automatic deploy.

---

## API Reference

All endpoints (except `/auth/register` and `/auth/login`) require:
```
Authorization: Bearer <token>
```

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Get JWT token |
| GET | `/auth/me` | Current user |
| GET | `/flights` | List your flights |
| POST | `/flights` | Log a flight |
| PUT | `/flights/{id}` | Update a flight |
| DELETE | `/flights/{id}` | Delete a flight |
| GET | `/aircraft` | List all aircraft |
| POST | `/aircraft` | Add an aircraft |
| GET | `/bookings` | List all bookings |
| POST | `/bookings` | Create a booking |
| PUT | `/bookings/{id}` | Update your booking |
| DELETE | `/bookings/{id}` | Cancel your booking |

Interactive docs available at `/api/docs` (Swagger UI).
