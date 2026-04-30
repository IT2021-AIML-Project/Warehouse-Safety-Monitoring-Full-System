<p align="center">
  <img src="https://img.shields.io/badge/🏭-Warehouse%20Safety-FF6B35?style=for-the-badge&labelColor=1a1a2e" alt="Project Badge"/>
</p>

<h1 align="center">🛡️ Warehouse Safety Monitoring System</h1>

<p align="center">
  <b>AI-Powered Real-Time PPE Detection & Compliance Management Platform</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19.2-61DAFB?style=flat-square&logo=react&logoColor=white" alt="React"/>
  <img src="https://img.shields.io/badge/Node.js-Express%205-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js"/>
  <img src="https://img.shields.io/badge/MongoDB-Mongoose%209-47A248?style=flat-square&logo=mongodb&logoColor=white" alt="MongoDB"/>
  <img src="https://img.shields.io/badge/YOLOv8-Ultralytics-FF6F00?style=flat-square&logo=python&logoColor=white" alt="YOLOv8"/>
  <img src="https://img.shields.io/badge/Flask-3.0-000000?style=flat-square&logo=flask&logoColor=white" alt="Flask"/>
  <img src="https://img.shields.io/badge/Vite-6.0-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite"/>
  <img src="https://img.shields.io/badge/MUI-7.3-007FFF?style=flat-square&logo=mui&logoColor=white" alt="MUI"/>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Status-Production%20Ready-brightgreen?style=flat-square" alt="Status"/>
  <img src="https://img.shields.io/badge/Module-IT2021--AIML-blue?style=flat-square" alt="Module"/>
  <img src="https://img.shields.io/badge/Group-DS%201.1%20|%20Group%2010-purple?style=flat-square" alt="Group"/>
</p>

---
## 👥 Group Members — DS 1.1 | Group 10

<div align="center">

| # | Name | Student ID | GitHub Profile |
|:-:|:-----|:----------:|:--------------:|
| 01 | Disanayaka S.K | `IT24102217` | [![GitHub](https://img.shields.io/badge/-Komal--Disanayaka-181717?style=flat-square&logo=github)](https://github.com/Komal-Disanayaka) |
| 02 | Kommalage S.G | `IT24100641` | [![GitHub](https://img.shields.io/badge/-savinikommalage-181717?style=flat-square&logo=github)](https://github.com/savinikommalage) |
| 03 | Jayathunga N.P | `IT24102981` | [![GitHub](https://img.shields.io/badge/-Nehara--Jay-181717?style=flat-square&logo=github)](https://github.com/Nehara-Jay) |
| 04 | Gamlath G.M.W.S | `IT24102959` | [![GitHub](https://img.shields.io/badge/-wathsalagamlath-181717?style=flat-square&logo=github)](https://github.com/wathsalagamlath) |
| 05 | Athukorala M.B | `IT24101937` | [![GitHub](https://img.shields.io/badge/-monishkaGIT-181717?style=flat-square&logo=github)](https://github.com/monishkaGIT) |
| 06 | Jayarathna W.A.S.H.S | `IT24102968` | [![GitHub](https://img.shields.io/badge/-shyamaljayarathne-181717?style=flat-square&logo=github)](https://github.com/shyamaljayarathne) |

</div>

---
## 📖 About The Project

The **Warehouse Safety Monitoring System** is a full-stack, AI-integrated web application designed to enhance workplace safety in warehouse environments. It leverages **YOLOv8 deep learning** to perform real-time **Personal Protective Equipment (PPE) detection** through image uploads, video analysis, live webcam feeds, and CCTV/IP camera streams.

The system monitors compliance with safety regulations by detecting the presence or absence of **helmets** and **safety vests** on workers, automatically flagging violations, generating real-time safety scores, and providing actionable insights through comprehensive dashboards.

### 🎯 Key Objectives

- 🔍 **Real-time PPE Detection** — Identify helmets, vests, and violations using a custom-trained YOLOv8 model
- 📊 **Compliance Dashboard** — Visualize safety metrics, violation trends, and compliance rates in real time
- 📹 **Multi-Source Monitoring** — Support image upload, video file analysis, live webcam, and CCTV/IP camera streams
- 👷 **Employee & Zone Management** — Track worker assignments, zone configurations, and safety records
- 🔔 **Smart Notifications** — Automated alerts for violations, low compliance scores, and inventory thresholds
- 📦 **PPE Inventory Tracking** — Manage stock levels of safety equipment across warehouse zones

---



## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT  (Browser)                            │
│  React 19 + Vite + MUI 7 + Recharts                                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │  Model   │ │Operations│ │Inventory │ │Warehouse │ │Notifica- │  │
│  │Inference │ │Compliance│ │  Mgmt    │ │  Config  │ │  tions   │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘  │
│       └─────────────┴────────────┴────────────┴────────────┘        │
└───────────────────────────────┬──────────────────────────────────────┘
                                │  REST API (HTTP)
┌───────────────────────────────▼──────────────────────────────────────┐
│                     BACKEND  (Node.js + Express 5)                   │
│  Auth · Employees · Zones · PPE Items · Notifications · Feedbacks    │
│  Zone Assignments · Inference Proxy · Live Inference                  │
└───────────────────────────────┬──────────────────────────────────────┘
                                │  Mongoose ODM
┌───────────────────────────────▼──────────────────────────────────────┐
│                       DATABASE  (MongoDB Atlas)                      │
│  Users · Employees · Zones · PPEItems · Inferences · Violations      │
│  Notifications · Feedbacks · Inquiries · ZoneAssignments             │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                  AI SERVICE  (Python Flask + YOLOv8)                  │
│  ┌─────────┐  ┌─────────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │ /predict │  │/predict-video│  │ /webcam  │  │   /cctv          │   │
│  │ (image)  │  │  (mp4/avi)  │  │ (live)   │  │ (RTSP/HTTP/IP)   │   │
│  └─────────┘  └─────────────┘  └──────────┘  └──────────────────┘   │
│                    YOLOv8s Custom Model (best.pt)                     │
│          Classes: person · helmet · no-helmet · vest · no-vest       │
└──────────────────────────────────────────────────────────────────────┘
```

---

## ✨ Features

### 🤖 AI-Powered Detection Module
- **Image Inference** — Upload warehouse images for instant PPE detection with annotated results
- **Video Inference** — Process uploaded video files frame-by-frame with full violation tracking
- **Live Webcam Monitoring** — Real-time detection via laptop/USB camera with MJPEG streaming
- **CCTV/IP Camera Integration** — Connect to RTSP and HTTP IP camera streams for facility-wide monitoring
- **Model Metrics Dashboard** — View precision, recall, mAP50, F1-score, and training parameters

### 📊 Operations & Compliance Dashboard
- **Safety Score Tracking** — Real-time safety scores computed per rolling 30-second windows
- **Violation Trend Analysis** — Hourly, daily, and custom date-range violation reports
- **Live Compliance Dashboard** — Real-time status indicators with auto-refreshing charts
- **CSV Export** — Download compliance data for external reporting

### 👷 Employee Management
- **Employee Records** — Add, update, and manage employee profiles with zone assignments
- **Role-Based Dashboards** — Different dashboard views for admins, operators, and employees

### 🏭 Warehouse Configuration
- **Zone Management** — Define and configure warehouse zones with safety parameters
- **Zone-Employee Assignment** — Assign workers to specific zones with tracking

### 📦 Inventory Management
- **PPE Item Tracking** — Monitor stock levels of helmets, vests, and other safety equipment
- **Inquiry System** — Employees can submit support inquiries for PPE requests

### 🔔 Notification & Reporting
- **Automated Alerts** — Real-time notifications for safety violations and low compliance
- **Feedback System** — Collect and manage employee feedback on safety procedures
- **PDF Report Generation** — Generate downloadable compliance reports

---

## 🛠️ Tech Stack

<div align="center">

| Layer | Technology | Purpose |
|:-----:|:-----------|:--------|
| **Frontend** | React 19, Vite 6, MUI 7 | UI framework & build tooling |
| **Charts** | Recharts 3 | Data visualization & analytics |
| **Backend** | Node.js, Express 5 | REST API server |
| **Database** | MongoDB Atlas, Mongoose 9 | Cloud database & ODM |
| **AI/ML** | Python 3, Flask 3, YOLOv8 (Ultralytics) | Object detection inference |
| **Computer Vision** | OpenCV, Pillow, NumPy | Image/video processing |
| **Authentication** | JSON Web Tokens (JWT) | Secure user authentication |
| **File Handling** | Multer 2 | Multipart file uploads |
| **PDF Generation** | jsPDF, jspdf-autotable | Client-side report generation |
| **Email** | EmailJS | Contact form integration |

</div>

---

## 📁 Project Structure

```
Warehouse Safety Monitoring System/
│
├── 🤖 AI Componant/                   # Python AI inference service
│   ├── inference_api.py               # Flask API — image, video, webcam, CCTV detection
│   ├── best.pt                        # Custom-trained YOLOv8s model weights
│   ├── requirements.txt               # Python dependencies
│   ├── Dockerfile                     # Docker container config (for deployment)
│   └── uploads/                       # Processed video output storage
│
├── ⚙️ backend/                         # Node.js Express API server
│   ├── server.js                      # App entry point — middleware, routes, DB connection
│   ├── controllers/                   # Business logic
│   │   ├── authController.js          # Login, register, JWT management
│   │   ├── employeeController.js      # Employee CRUD operations
│   │   ├── inferenceController.js     # Image/video inference proxy
│   │   ├── liveInferenceController.js # Live webcam/CCTV window aggregation
│   │   ├── zoneController.js          # Zone management
│   │   ├── zoneAssignmentController.js# Zone-employee assignments
│   │   ├── ppeItemController.js       # PPE inventory management
│   │   ├── notificationController.js  # Alert & notification system
│   │   ├── feedbackController.js      # Employee feedback handling
│   │   └── inquiryController.js       # Support inquiry management
│   ├── models/                        # Mongoose schemas
│   │   ├── User.js                    # User authentication model
│   │   ├── Employee.js                # Employee profile model
│   │   ├── Zone.js                    # Warehouse zone model
│   │   ├── ZoneAssignment.js          # Zone-employee mapping
│   │   ├── PPEItem.js                 # PPE inventory model
│   │   ├── Inference.js               # Detection result model
│   │   ├── Violation.js               # Safety violation model
│   │   ├── Notification.js            # Alert model
│   │   ├── Feedback.js                # Employee feedback model
│   │   ├── Inquiry.js                 # Support inquiry model
│   │   └── Detection.js               # Detection record model
│   ├── routes/                        # Express route definitions
│   └── utils/                         # Helper utilities
│
├── 🎨 frontend/                        # React + Vite SPA
│   ├── src/
│   │   ├── App.jsx                    # Root component — routing & theme
│   │   ├── main.jsx                   # Entry point
│   │   ├── pages/
│   │   │   ├── Home.jsx               # Landing page
│   │   │   ├── Login.jsx              # Authentication
│   │   │   ├── Register.jsx           # User registration
│   │   │   ├── Dashboard.jsx          # Role-based dashboard router
│   │   │   ├── ModelInference/        # AI detection dashboard
│   │   │   ├── OperationsCompliance/  # Compliance analytics
│   │   │   ├── LiveComplianceDashboard/ # Real-time monitoring
│   │   │   ├── InventoryManagement/   # PPE stock management
│   │   │   ├── EmployeeManagement/    # Employee records
│   │   │   ├── warehouseConfig/       # Zone configuration
│   │   │   └── NotificationReporting/ # Alerts & reports
│   │   ├── components/                # Reusable UI components
│   │   ├── context/                   # React context (AuthContext)
│   │   ├── hooks/                     # Custom React hooks
│   │   ├── services/                  # API service layer (Axios)
│   │   ├── styles/                    # Global CSS styles
│   │   └── utils/                     # Frontend utilities
│   ├── index.html                     # HTML entry point
│   ├── vite.config.js                 # Vite configuration
│   └── package.json                   # Frontend dependencies
│
└── README.md                          # 📄 You are here
```

---

## 🚀 Deployment Guide

### Prerequisites

| Tool | Version | Purpose |
|:-----|:--------|:--------|
| **Node.js** | ≥ 18.x | Backend & frontend runtime |
| **npm** | ≥ 9.x | Package management |
| **Python** | ≥ 3.9 | AI inference service |
| **MongoDB** | Atlas (cloud) or local | Database |
| **Git** | Latest | Version control |

---

### ⚡ Quick Start (Local Development)

#### 1️⃣ Clone the Repository

```bash
git clone https://github.com/<your-org>/warehouse-safety-monitoring-system.git
cd warehouse-safety-monitoring-system
```

#### 2️⃣ Set Up the AI Inference Service

```bash
cd "AI Componant"

# Create and activate virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the AI service (runs on port 5001)
python inference_api.py
```

> **Note:** The YOLOv8 model file (`best.pt`) must be present in the `AI Componant/` directory.

#### 3️⃣ Set Up the Backend

```bash
cd backend

# Install dependencies
npm install

# Create .env file (see Environment Variables section below)

# Start the server (runs on port 5000)
npm start

# Or use nodemon for development
npm run dev
```

#### 4️⃣ Set Up the Frontend

```bash
cd frontend

# Install dependencies
npm install

# Create .env file (see Environment Variables section below)

# Start development server (runs on port 5173)
npm run dev
```

#### 5️⃣ Access the Application

| Service | URL |
|:--------|:----|
| **Frontend** | `http://localhost:5173` |
| **Backend API** | `http://localhost:5000` |
| **AI Service** | `http://localhost:5001` |

---

### 🌐 Production Deployment

#### Frontend → Vercel

1. Push the `frontend/` directory to a GitHub repository
2. Import the repo in [Vercel](https://vercel.com)
3. Set the **Root Directory** to `frontend`
4. Configure environment variables:
   ```
   VITE_API_URL=https://your-backend-url.onrender.com
   VITE_AI_API_URL=https://your-ai-service.hf.space
   ```
5. Deploy — Vercel auto-detects Vite and builds accordingly

#### Backend → Render

1. Push the `backend/` directory to a GitHub repository
2. Create a new **Web Service** on [Render](https://render.com)
3. Set the **Root Directory** to `backend`
4. **Build Command:** `npm install`
5. **Start Command:** `npm start`
6. Add environment variables:
   ```
   MONGO_URI=mongodb+srv://...
   JWT_SECRET=your_jwt_secret
   PORT=5000
   ```

#### AI Service → Hugging Face Spaces (Docker)

1. Push the `AI Componant/` directory to a [Hugging Face Space](https://huggingface.co/spaces)
2. Select **Docker** as the SDK
3. The included `Dockerfile` handles all configuration
4. Set the Space visibility and hardware (CPU/GPU)
5. The service will be accessible at `https://<space-name>.hf.space`

---

### 🔐 Environment Variables

#### Backend (`backend/.env`)

```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<dbname>
JWT_SECRET=your_super_secret_jwt_key
```

#### Frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:5000
VITE_AI_API_URL=http://localhost:5001
```

#### AI Service (Environment / Config)

```env
LIVE_INFER_BACKEND_URL=http://localhost:5000/api/inferences/live
```

---

## 📡 API Reference

### Authentication
| Method | Endpoint | Description |
|:------:|:---------|:------------|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Authenticate & receive JWT |

### Employees
| Method | Endpoint | Description |
|:------:|:---------|:------------|
| `GET` | `/api/employees` | List all employees |
| `POST` | `/api/employees` | Create employee record |
| `PUT` | `/api/employees/:id` | Update employee |
| `DELETE` | `/api/employees/:id` | Remove employee |

### Zones & Assignments
| Method | Endpoint | Description |
|:------:|:---------|:------------|
| `GET` | `/api/zones` | List all zones |
| `POST` | `/api/zones` | Create a zone |
| `GET` | `/api/zone-assignments` | List assignments |
| `POST` | `/api/zone-assignments` | Assign employee to zone |

### PPE Inventory
| Method | Endpoint | Description |
|:------:|:---------|:------------|
| `GET` | `/api/ppe-items` | List all PPE items |
| `POST` | `/api/ppe-items` | Add new PPE item |
| `PUT` | `/api/ppe-items/:id` | Update PPE item |
| `DELETE` | `/api/ppe-items/:id` | Remove PPE item |

### AI Inference (via Backend Proxy)
| Method | Endpoint | Description |
|:------:|:---------|:------------|
| `POST` | `/api/inferences/detect` | Image detection (proxy to AI) |
| `POST` | `/api/inferences/detect-video` | Video detection (proxy to AI) |
| `POST` | `/api/inferences/live` | Save live window data |
| `GET` | `/api/inferences/summary` | Get summary statistics |

### AI Service (Direct)
| Method | Endpoint | Description |
|:------:|:---------|:------------|
| `GET` | `/health` | Service health check |
| `GET` | `/model-info` | Model metadata & metrics |
| `POST` | `/predict` | Single image detection |
| `POST` | `/predict-video` | Video file detection |
| `POST` | `/webcam/start` | Start webcam monitoring |
| `POST` | `/webcam/stop` | Stop webcam monitoring |
| `GET` | `/webcam/feed` | Live MJPEG stream |
| `POST` | `/cctv/start` | Start CCTV/IP camera feed |
| `POST` | `/cctv/stop` | Stop CCTV feed |
| `GET` | `/cctv/feed` | CCTV MJPEG stream |

### Notifications & Feedback
| Method | Endpoint | Description |
|:------:|:---------|:------------|
| `GET` | `/api/notifications` | List notifications |
| `POST` | `/api/notifications` | Create notification |
| `GET` | `/api/feedbacks` | List feedbacks |
| `POST` | `/api/feedbacks` | Submit feedback |
| `GET` | `/api/inquiries` | List inquiries |
| `POST` | `/api/inquiries` | Submit inquiry |

---

## 🧪 AI Model Details

| Property | Value |
|:---------|:------|
| **Architecture** | YOLOv8s (Small) |
| **Framework** | Ultralytics |
| **Model File** | `best.pt` (≈6 MB) |
| **Classes** | `person`, `helmet`, `no-helmet`, `vest`, `no-vest` |
| **Confidence Threshold** | 0.55 (general) / 0.65 (violations) |
| **Live Window** | 30-second rolling aggregation |

---

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/your-feature`)
3. **Commit** your changes (`git commit -m "Add: your feature"`)
4. **Push** to the branch (`git push origin feature/your-feature`)
5. **Open** a Pull Request

---

## 📜 License

This project is developed for academic purposes as part of the **IT2021 — Artificial Intelligence & Machine Learning** module at **SLIIT**.

<p align="center">
  <b>DS 1.1 | Group 10</b>
</p>

---

<p align="center">
  Made with ❤️ by <b>Group 10</b> — Warehouse Safety Monitoring System
</p>
