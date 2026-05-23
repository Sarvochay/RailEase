# GitHub Repository Description

🚆 RailEase — A modern AI-inspired railway reservation system with smart RAC allocation, waitlist auto-upgrades, secure authentication, real-time seat availability, and an interactive premium frontend built using Flask, SQLite, HTML, CSS, and JavaScript.

---

# README.md

# 🚆 RailEase — Smart Railway Reservation System

RailEase is a modern full-stack railway reservation platform designed to simulate a real-world train booking experience with intelligent RAC handling, waitlist management, secure authentication, and a sleek responsive UI.

Built using:

* ⚙️ Flask (Backend API)
* 🗄️ SQLite (Database)
* 🎨 HTML, CSS & JavaScript (Frontend)
* 🔐 Token-based Authentication

---

# ✨ Features

## 👤 User Authentication

* User Signup & Login
* Secure SHA-256 password hashing
* Session-based authentication using tokens
* Role-based access (User/Admin)

## 🎟️ Smart Ticket Booking

* Real-time seat availability
* Automatic seat allocation
* PNR generation system
* Journey date management
* Fare calculation

## 🟣 Intelligent RAC System

* Smart RAC berth grouping
* Gender-based RAC pairing
* RAC auto-promotion to confirmed tickets
* Dynamic RAC berth allocation

## ⏳ Waitlist Management

* Automatic waitlist creation
* Auto-upgrade from Waitlist → RAC → Confirmed
* Waitlist position tracking

## ❌ Ticket Cancellation System

* Instant cancellation handling
* Automatic seat redistribution
* RAC and waitlist adjustments after cancellation

## 🚄 Train Search & Filtering

* Search trains by cities
* Interactive city autocomplete
* Train availability display
* Responsive train cards UI

## 🧑‍💼 Admin Panel

* Admin-only access control
* Train management
* User management
* Ticket monitoring

## 🎨 Premium Frontend UI

* Modern responsive design
* Interactive animations
* Beautiful train cards
* Toast notifications
* Dynamic overlays and modals

---

# 🛠️ Tech Stack

| Technology | Purpose            |
| ---------- | ------------------ |
| Flask      | Backend Framework  |
| SQLite     | Database           |
| HTML5      | Frontend Structure |
| CSS3       | Styling            |
| JavaScript | Frontend Logic     |
| SHA-256    | Password Security  |

---

# 📂 Project Structure

```bash
railease_flask/
│
├── database/
│   └── railease.db
│
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
│
└── run_app.py
```

---

# ⚙️ Installation & Setup

## 1️⃣ Clone Repository

```bash
git clone https://github.com/your-username/railease.git
cd railease
```

## 2️⃣ Install Dependencies

```bash
pip install flask
```

## 3️⃣ Run Application

```bash
python run_app.py
```

## 4️⃣ Open in Browser

```bash
http://localhost:8000
```

---

# 🔐 Authentication Flow

1. User registers account
2. Password gets encrypted using SHA-256
3. Session token generated after login
4. Token used for protected routes

---

# 🚆 RAC & Waitlist Logic

RailEase includes a smart railway booking algorithm:

* If confirmed seats are available → Confirmed ticket issued
* Else if RAC slots available → RAC ticket assigned
* Else → Waitlist ticket created

When cancellations occur:

* RAC passengers automatically move to Confirmed
* Waitlisted passengers move to RAC
* Queue updates automatically

---

# 🌟 Unique Highlights

✅ Smart gender-based RAC pairing

✅ Automatic ticket status upgrades

✅ Realistic railway booking workflow

✅ Premium modern UI experience

✅ Full-stack architecture

✅ Session-based secure authentication

---

# 🚀 Future Improvements

* AI-based train recommendation system
* Online payment gateway integration
* QR-code based e-ticket generation
* Live train tracking
* Email/SMS notifications
* PDF ticket download
* Dark/Light theme switching
* Seat selection visualization
* AI chatbot support assistant

---

# 📸 Screenshots

Add your project screenshots here.

```bash
/screenshots/homepage.png
/screenshots/booking.png
/screenshots/rac-system.png
```

---

# 🤝 Contributing

Contributions are welcome.

Fork the repository and submit a pull request.

---

# 📜 License

This project is developed for educational and learning purposes.

---

# 👨‍💻 Developer

Developed by Sarvochay

⭐ If you like this project, don't forget to star the repository.
