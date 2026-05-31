# 🚦 Smart Traffic System

An AI-powered Smart Traffic System that analyzes real-time traffic conditions, weather information, and traffic incidents to provide users with safer and more efficient route recommendations.

## 📌 Project Overview

This project was developed as a Computer Engineering graduation project. The system combines traffic analysis, route optimization, weather monitoring, risk assessment, and artificial intelligence technologies to assist drivers in making informed travel decisions.

## ✨ Features

* Real-time route analysis
* Alternative route recommendations
* Traffic density analysis
* Weather-aware route evaluation
* Traffic incident visualization
* Risk scoring mechanism
* Live location tracking
* AI-powered traffic assistant
* RAG (Retrieval-Augmented Generation) based knowledge system
* Natural language interaction with users

## 🛠 Technologies Used

### Backend

* FastAPI
* Python
* PostgreSQL
* SQLAlchemy
* Sentence Transformers
* ChromaDB

### Frontend

* Next.js
* React
* TypeScript
* Tailwind CSS

### AI & Data

* Qwen 2.5 LLM
* Retrieval-Augmented Generation (RAG)
* Traffic Knowledge Base
* Weather Data Integration

### Mapping & Routing

* OpenStreetMap
* Leaflet
* OSRM
* TomTom APIs

## 📂 Project Structure

```text
smart-traffic-system
│
├── backend
│   ├── src
│   ├── docs
│   ├── data
│   └── requirements.txt
│
├── frontend
│   ├── app
│   ├── components
│   └── package.json
│
└── README.md
```

## 🚀 Installation

### Backend

```bash
cd backend

pip install -r requirements.txt

uvicorn main:app --reload
```

### Frontend

```bash
cd frontend

npm install

npm run dev
```

## 🤖 AI Traffic Assistant

The system includes an AI-powered traffic assistant capable of answering questions related to:

* Traffic regulations
* Safe driving practices
* Weather-related driving recommendations
* Route information
* Traffic safety

The assistant utilizes a Large Language Model (LLM) together with Retrieval-Augmented Generation (RAG) to provide context-aware responses.

## 📊 Future Improvements

* Advanced traffic prediction models
* Multi-city support
* Mobile application integration
* Real-time vehicle telemetry
* Personalized route recommendations

## 👨‍💻 Developer

**Burak Alper Arslan**

Computer Engineering Graduate

Çukurova University

## 📄 License

This project was developed for educational and research purposes.
