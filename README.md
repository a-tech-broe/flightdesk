# FlightDesk

Flight logging, scheduling, and currency tracking for pilot training schools.

Live: **https://flightadmins.com**

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router, TypeScript, Tailwind CSS) |
| Backend API | FastAPI (Python 3.11) |
| Database | PostgreSQL 15 |
| Reverse Proxy | Nginx |
| Load Balancer | AWS ALB + ACM (SSL) |
| Containers | Docker + Docker Compose |
| Hosting | AWS EC2 — Amazon Linux 2023, m5.xlarge |
| IaC | Terraform |
| CI/CD | GitHub Actions |

---

## Project Structure

```
flightdesk/
├── frontend/                      # Next.js app
│   └── src/
│       ├── app/
│       │   ├── (auth)/            # Login, Register
│       │   └── (protected)/       # Dashboard, Logbook, Currency, Analytics, Map, Scheduling
│       ├── components/            # Navbar, FlightForm, BookingCalendar, FlightMap, WeatherWidget
│       ├── contexts/              # AuthContext (JWT), ThemeContext (dark mode)
│       ├── lib/                   # Axios API client
│       └── types/                 # Shared TypeScript types
├── backend/                       # FastAPI app
│   └── app/
│       ├── models/                # SQLAlchemy: User, Aircraft, Flight, Booking
│       ├── schemas/               # Pydantic request/response schemas
│       ├── routers/               # auth, flights, aircraft, bookings
│       └── auth/                  # JWT utils (python-jose + passlib)
├── nginx/
│   ├── nginx.dev.conf             # HTTP only — used by docker-compose
│   └── nginx.conf                 # HTTPS — for direct EC2 without ALB
├── infrastructure/
│   ├── terraform/                 # EC2, ALB, ACM, Route53, security groups
│   │   ├── main.tf
│   │   ├── lb.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── userdata.sh            # Instance bootstrap script
│   └── setup.sh                   # Manual bootstrap (one-time)
├── .github/workflows/
│   ├── provision-dev.yml          # Terraform + deploy on push to dev
│   └── deploy.yml                 # Deploy only on push to main
├── docker-compose.yml
└── .env.example
```

---

## Architecture

```
Internet
   ↓
Route53 (flightadmins.com)
   ↓
AWS ALB — HTTPS/443 (ACM cert) + HTTP/80 → 301 redirect
   ↓
EC2 — port 80
   ↓
Nginx (Docker)
   ├── /api/*  → FastAPI  (port 8000)
   └── /*      → Next.js  (port 3000)
                     ↓
               PostgreSQL (port 5432, internal only)
```

---

## Features

### Authentication
- Email/password registration and login
- JWT tokens with 24-hour expiry
- Protected routes — redirect to `/login` if unauthenticated

### Flight Logbook
- Full FAA logbook fields: total time, PIC, dual received, night, instrument, cross-country
- Day landings, night landings, and instrument approaches per flight
- Departure/destination (ICAO codes), block times, aircraft, remarks
- Responsive table (desktop) and card layout (mobile) with running totals
- Add, edit, delete flights
- **PDF export** — one-click download of a formatted FAA-style logbook (landscape, with totals row)

### FAA Currency Tracker
Computes all active currency requirements directly from your logbook:

| Requirement | Rule | What's tracked |
|---|---|---|
| Day passenger | FAR 61.57(a) | 3 T&Ls in preceding 90 days |
| Night passenger | FAR 61.57(b) | 3 full-stop night landings in preceding 90 days |
| Instrument | FAR 61.57(c) | 6 approaches in preceding 6 calendar months |
| Flight Review | FAR 61.56 | Every 24 calendar months (user-entered date) |

- Green / amber / red status badges with days-remaining callouts
- Shows exactly what you need to regain currency
- Set and persist your last BFR date from the UI

### Analytics Dashboard
All computed from existing logbook data — no extra input needed:
- **Hours per month** bar chart (last 12 months)
- **Hours breakdown** donut (PIC, Night, IFR, Cross-Country, Dual)
- **Top airports** visited with proportional bar chart
- **Rating progress** bars toward PPL (40h), IFR (50h), CPL (250h), ATP (1500h)
- 30-day / 90-day / 12-month activity summary

### Route Map
- Interactive map (Leaflet + OpenStreetMap — no API key required)
- Airport coordinates fetched live from aviationweather.gov
- Every flight plotted as a route line; airports as circles scaled by visit frequency
- Click any airport for name and operation count
- Stats: airports visited, unique routes, furthest flight (NM), most-visited airport

### Live Weather (on the flight log form)
- Auto-fetches METAR from aviationweather.gov when you type a departure/destination
- Color-coded flight category badge: VFR / MVFR / IFR / LIFR
- Shows wind, visibility, temperature, and raw METAR string
- Free, no API key — uses the FAA public weather API

### Aircraft Scheduling
- FullCalendar week/month/day view
- Click any time slot to book — conflict detection prevents double-booking
- Click your own booking to edit or cancel
- Fleet strip showing all registered aircraft
- Shared calendar — all pilots see availability

### Dashboard
- Total flight hours, total flights, upcoming booking count
- Recent flights and upcoming bookings at a glance

### IACRA Export (FAA Form 8710-1)
Since IACRA has no public API, FlightDesk generates a pre-filled 8710-1 summary PDF that pilots carry into their IACRA session:
- Select the certificate/rating being applied for: PPL, IFR, CPL, CFI, or ATP
- Filter by time period (all time, last 5 years, last 2 years)
- See every IACRA field mapped to your logbook totals with met/not-met status
- Download a formatted PDF with all hour breakdowns, deficits, and a full logbook summary
- Includes solo and simulated instrument fields (tracked per-flight)
- Disclaimer reminding pilots to have their CFI review before submitting

### UI
- Light and dark mode with system preference detection and no flash on load
- Fully responsive — desktop table views collapse to mobile card layouts
- Persistent theme preference saved to localStorage

---

## Running Locally

**Prerequisites:** Docker Desktop

```bash
git clone <repo-url> && cd flightdesk

cp .env.example .env
# Fill in POSTGRES_PASSWORD and SECRET_KEY:
#   openssl rand -hex 32

docker compose up --build
# App:      http://localhost
# API docs: http://localhost/api/docs
```

---

## Infrastructure (Terraform)

Terraform manages: EC2 instance, ALB, target group, ACM certificate,
Route53 records, and security groups. State is stored in S3 with DynamoDB locking.

```bash
cd infrastructure/terraform

terraform init \
  -backend-config="bucket=<your-state-bucket>" \
  -backend-config="region=<your-region>" \
  -backend-config="dynamodb_table=<your-lock-table>"

terraform apply \
  -var="key_pair_name=<your-keypair>"
```

---

## CI/CD

### Branches

| Branch | Workflow | What it does |
|---|---|---|
| `dev` | `provision-dev.yml` | Terraform apply → EIP association → deploy app |
| `main` | `deploy.yml` | Deploy app only |

### GitHub Secrets Required

| Secret | Description |
|---|---|
| `AWS_ACCESS_KEY_ID` | IAM access key |
| `AWS_SECRET_ACCESS_KEY` | IAM secret key |
| `AWS_REGION` | e.g. `us-east-1` |
| `TF_STATE_BUCKET` | S3 bucket for Terraform state |
| `TF_LOCK_TABLE` | DynamoDB table for state locking |
| `EC2_KEY_PAIR_NAME` | Existing EC2 key pair name |
| `EC2_EIP_ALLOCATION_ID` | Existing EIP allocation ID (`eipalloc-…`) |
| `EC2_EIP_HOST` | EIP public IP address |
| `EC2_SSH_KEY` | Private key PEM content |
| `GH_PAT` | GitHub PAT with `repo` scope (for git clone on EC2) |
| `POSTGRES_DB` | e.g. `flightdesk` |
| `POSTGRES_USER` | e.g. `flightdesk` |
| `POSTGRES_PASSWORD` | Strong password |
| `SECRET_KEY` | `openssl rand -hex 32` |
| `NEXT_PUBLIC_API_URL` | `https://flightadmins.com/api` |

---

## API Reference

All endpoints except `/auth/register` and `/auth/login` require:
```
Authorization: Bearer <token>
```

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Get JWT token |
| GET | `/auth/me` | Current user profile |
| PATCH | `/auth/me` | Update profile (name, BFR date) |
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

Interactive docs: **https://flightadmins.com/api/docs**
