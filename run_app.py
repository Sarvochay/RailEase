import os
import sys
import secrets
import hashlib
import sqlite3
import datetime
from functools import wraps
from flask import Flask, request, jsonify, send_from_directory

app = Flask(__name__, static_folder='frontend')

# ── Database Configuration ──────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH  = os.path.join(BASE_DIR, "database", "railease.db")

def get_db():
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys = ON")
    return con

# ── Password Hashing ────────────────────────────────────────────────────────
def hash_pw(pw):
    return hashlib.sha256(pw.encode()).hexdigest()

# ── Session Auth ────────────────────────────────────────────────────────────
def create_session(user_id):
    token = secrets.token_hex(24)
    con = get_db()
    con.execute("INSERT INTO sessions (token, user_id) VALUES (?, ?)", (token, user_id))
    con.commit()
    con.close()
    return token

def get_user_from_token(token):
    if not token:
        return None
    con = get_db()
    session = con.execute("SELECT user_id FROM sessions WHERE token=?", (token,)).fetchone()
    if not session:
        con.close()
        return None
    user = con.execute("SELECT * FROM users WHERE id=?", (session["user_id"],)).fetchone()
    con.close()
    return dict(user) if user else None

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get("Authorization", "").replace("Bearer ", "").strip() or None
        user = get_user_from_token(token)
        if not user:
            return jsonify({"error": "Login required"}), 401
        request.current_user = user
        return f(*args, **kwargs)
    return decorated

def require_admin(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get("Authorization", "").replace("Bearer ", "").strip() or None
        user = get_user_from_token(token)
        if not user or user["role"] != "admin":
            return jsonify({"error": "Admin only"}), 403
        request.current_user = user
        return f(*args, **kwargs)
    return decorated

# ── Booking Logic ───────────────────────────────────────────────────────────
def get_availability(con, train_id, journey_date):
    train = con.execute("SELECT * FROM trains WHERE id=?", (train_id,)).fetchone()
    if not train:
        return None
    conf      = con.execute("SELECT COUNT(*) FROM tickets WHERE train_id=? AND journey_date=? AND status='confirmed'",  (train_id, journey_date)).fetchone()[0]
    rac_count = con.execute("SELECT COUNT(*) FROM tickets WHERE train_id=? AND journey_date=? AND status='rac'",        (train_id, journey_date)).fetchone()[0]
    wl_count  = con.execute("SELECT COUNT(*) FROM tickets WHERE train_id=? AND journey_date=? AND status='waiting'",   (train_id, journey_date)).fetchone()[0]
    return {
        "train":            dict(train),
        "available_seats":  max(0, train["total_seats"] - conf),
        "available_rac":    max(0, train["rac_slots"]   - rac_count),
        "waitlist_count":   wl_count,
        "total_seats":      train["total_seats"],
        "rac_slots":        train["rac_slots"],
        "waitlist_limit":   train["waitlist_limit"],
    }

def book_ticket(user, train_id, journey_date):
    con   = get_db()
    avail = get_availability(con, train_id, journey_date)
    if not avail:
        con.close()
        return None, "Train not found"

    pnr          = "RE" + secrets.token_hex(4).upper()
    fare         = avail["train"]["fare"]
    status = seat_no = rac_gid = waitlist_pos = None

    if avail["available_seats"] > 0:
        seat_no = f"S{avail['total_seats'] - avail['available_seats'] + 1}"
        status  = "confirmed"

    elif avail["available_rac"] > 0:
        gender = user["gender"]
        grp = con.execute(
            "SELECT * FROM rac_groups WHERE train_id=? AND journey_date=? AND gender=? AND occupied < capacity",
            (train_id, journey_date, gender)
        ).fetchone()
        if grp:
            rac_gid = grp["id"]
            con.execute("UPDATE rac_groups SET occupied=occupied+1 WHERE id=?", (rac_gid,))
            seat_no = f"RAC-{grp['berth_no']}"
        else:
            berth_no = avail["rac_slots"] - avail["available_rac"] + 1
            cur = con.execute(
                "INSERT INTO rac_groups (train_id, journey_date, berth_no, gender, occupied, capacity) VALUES (?,?,?,?,1,2)",
                (train_id, journey_date, berth_no, gender)
            )
            rac_gid = cur.lastrowid
            seat_no = f"RAC-{berth_no}"
        status = "rac"

    elif avail["waitlist_count"] < avail["waitlist_limit"]:
        waitlist_pos = avail["waitlist_count"] + 1
        status = "waiting"

    else:
        con.close()
        return None, "No seats available"

    con.execute(
        "INSERT INTO tickets (pnr,user_id,train_id,journey_date,status,seat_number,rac_group_id,waitlist_pos,fare) VALUES (?,?,?,?,?,?,?,?,?)",
        (pnr, user["id"], train_id, journey_date, status, seat_no, rac_gid, waitlist_pos, fare)
    )
    con.commit()
    ticket = dict(con.execute("SELECT * FROM tickets WHERE pnr=?", (pnr,)).fetchone())
    con.close()
    return ticket, None

def cancel_ticket(ticket_id, user_id):
    con    = get_db()
    ticket = con.execute("SELECT * FROM tickets WHERE id=? AND user_id=?", (ticket_id, user_id)).fetchone()
    if not ticket:
        con.close()
        return False, "Ticket not found"
    ticket = dict(ticket)
    if ticket["status"] == "cancelled":
        con.close()
        return False, "Already cancelled"

    train_id     = ticket["train_id"]
    journey_date = ticket["journey_date"]

    if ticket["status"] == "confirmed":
        first_rac = con.execute(
            "SELECT * FROM tickets WHERE train_id=? AND journey_date=? AND status='rac' ORDER BY id LIMIT 1",
            (train_id, journey_date)
        ).fetchone()
        if first_rac:
            con.execute("UPDATE tickets SET status='confirmed', seat_number=? WHERE id=?",
                        (ticket["seat_number"], first_rac["id"]))
            if first_rac["rac_group_id"]:
                con.execute("UPDATE rac_groups SET occupied=occupied-1 WHERE id=?", (first_rac["rac_group_id"],))
            first_wl = con.execute(
                "SELECT * FROM tickets WHERE train_id=? AND journey_date=? AND status='waiting' ORDER BY id LIMIT 1",
                (train_id, journey_date)
            ).fetchone()
            if first_wl:
                wl_user = con.execute("SELECT gender FROM users WHERE id=?", (first_wl["user_id"],)).fetchone()
                grp = con.execute(
                    "SELECT * FROM rac_groups WHERE train_id=? AND journey_date=? AND gender=? AND occupied < capacity",
                    (train_id, journey_date, wl_user["gender"])
                ).fetchone()
                if grp:
                    con.execute("UPDATE rac_groups SET occupied=occupied+1 WHERE id=?", (grp["id"],))
                    new_seat, new_gid = f"RAC-{grp['berth_no']}", grp["id"]
                else:
                    avail     = get_availability(con, train_id, journey_date)
                    new_berth = avail["rac_slots"] - avail["available_rac"] + 1
                    cur       = con.execute(
                        "INSERT INTO rac_groups (train_id,journey_date,berth_no,gender,occupied,capacity) VALUES (?,?,?,?,1,2)",
                        (train_id, journey_date, new_berth, wl_user["gender"])
                    )
                    new_gid, new_seat = cur.lastrowid, f"RAC-{new_berth}"
                con.execute("UPDATE tickets SET status='rac', seat_number=?, rac_group_id=? WHERE id=?",
                            (new_seat, new_gid, first_wl["id"]))
                con.execute("UPDATE tickets SET waitlist_pos=waitlist_pos-1 WHERE train_id=? AND journey_date=? AND status='waiting'",
                            (train_id, journey_date))

    elif ticket["status"] == "rac":
        if ticket["rac_group_id"]:
            con.execute("UPDATE rac_groups SET occupied=occupied-1 WHERE id=?", (ticket["rac_group_id"],))
        first_wl = con.execute(
            "SELECT * FROM tickets WHERE train_id=? AND journey_date=? AND status='waiting' ORDER BY id LIMIT 1",
            (train_id, journey_date)
        ).fetchone()
        if first_wl:
            wl_user = con.execute("SELECT gender FROM users WHERE id=?", (first_wl["user_id"],)).fetchone()
            grp     = con.execute(
                "SELECT * FROM rac_groups WHERE train_id=? AND journey_date=? AND gender=? AND occupied < capacity",
                (train_id, journey_date, wl_user["gender"])
            ).fetchone()
            if grp:
                con.execute("UPDATE rac_groups SET occupied=occupied+1 WHERE id=?", (grp["id"],))
                new_seat, new_gid = f"RAC-{grp['berth_no']}", grp["id"]
            else:
                avail     = get_availability(con, train_id, journey_date)
                new_berth = avail["rac_slots"] - avail["available_rac"] + 1
                cur       = con.execute(
                    "INSERT INTO rac_groups (train_id,journey_date,berth_no,gender,occupied,capacity) VALUES (?,?,?,?,1,2)",
                    (train_id, journey_date, new_berth, wl_user["gender"])
                )
                new_gid, new_seat = cur.lastrowid, f"RAC-{new_berth}"
            con.execute("UPDATE tickets SET status='rac', seat_number=?, rac_group_id=? WHERE id=?",
                        (new_seat, new_gid, first_wl["id"]))
            con.execute("UPDATE tickets SET waitlist_pos=waitlist_pos-1 WHERE train_id=? AND journey_date=? AND status='waiting'",
                        (train_id, journey_date))

    elif ticket["status"] == "waiting":
        con.execute(
            "UPDATE tickets SET waitlist_pos=waitlist_pos-1 WHERE train_id=? AND journey_date=? AND status='waiting' AND waitlist_pos > ?",
            (train_id, journey_date, ticket["waitlist_pos"])
        )

    charge    = round(ticket["fare"] * 0.20, 2) if ticket["status"] == "confirmed" else 60.0
    total_paid = ticket["fare"] + 40.0 if ticket["payment_done"] else 0.0
    refund    = round(max(total_paid - charge, 0), 2) if ticket["payment_done"] else 0.0

    con.execute(
        "UPDATE tickets SET status='cancelled', cancelled_at=datetime('now'), cancellation_charge=?, refund_amount=? WHERE id=?",
        (charge, refund, ticket_id)
    )
    con.commit()
    con.close()
    msg = f"Cancelled. Charge: ₹{charge}. Refund: ₹{refund}" if ticket["payment_done"] else "Cancelled successfully."
    return True, msg

# ── Database Initialisation ─────────────────────────────────────────────────
def init_db():
    con = get_db()
    con.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id       INTEGER PRIMARY KEY AUTOINCREMENT,
            name     TEXT    NOT NULL,
            email    TEXT    UNIQUE NOT NULL,
            password TEXT    NOT NULL,
            gender   TEXT    DEFAULT 'male',
            age      INTEGER DEFAULT 18,
            phone    TEXT,
            role     TEXT    DEFAULT 'passenger'
        );
        CREATE TABLE IF NOT EXISTS sessions (
            token      TEXT PRIMARY KEY,
            user_id    INTEGER REFERENCES users(id),
            created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS trains (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            number          TEXT UNIQUE NOT NULL,
            name            TEXT NOT NULL,
            from_city       TEXT NOT NULL,
            to_city         TEXT NOT NULL,
            departure       TEXT NOT NULL,
            arrival         TEXT NOT NULL,
            distance        INTEGER DEFAULT 0,
            duration        TEXT DEFAULT '',
            total_seats     INTEGER DEFAULT 100,
            available_seats INTEGER DEFAULT 100,
            rac_slots       INTEGER DEFAULT 10,
            available_rac   INTEGER DEFAULT 10,
            waitlist_limit  INTEGER DEFAULT 20,
            waitlist_count  INTEGER DEFAULT 0,
            fare            REAL    DEFAULT 500.0
        );
        CREATE TABLE IF NOT EXISTS train_stops (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            train_number   TEXT NOT NULL REFERENCES trains(number),
            seq            INTEGER NOT NULL,
            station_code   TEXT NOT NULL,
            station_name   TEXT NOT NULL,
            arrival_time   TEXT NOT NULL,
            departure_time TEXT NOT NULL,
            distance       INTEGER DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS rac_groups (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            train_id     INTEGER REFERENCES trains(id),
            journey_date TEXT NOT NULL,
            berth_no     INTEGER,
            gender       TEXT,
            occupied     INTEGER DEFAULT 0,
            capacity     INTEGER DEFAULT 2
        );
        CREATE TABLE IF NOT EXISTS tickets (
            id                  INTEGER PRIMARY KEY AUTOINCREMENT,
            pnr                 TEXT UNIQUE NOT NULL,
            user_id             INTEGER REFERENCES users(id),
            train_id            INTEGER REFERENCES trains(id),
            journey_date        TEXT,
            status              TEXT DEFAULT 'confirmed',
            seat_number         TEXT,
            rac_group_id        INTEGER,
            waitlist_pos        INTEGER,
            fare                REAL,
            payment_done        INTEGER DEFAULT 0,
            booked_at           TEXT DEFAULT (datetime('now')),
            cancelled_at        TEXT,
            cancellation_charge REAL DEFAULT 0.0,
            refund_amount       REAL DEFAULT 0.0
        );
    """)

    try:
        con.execute("ALTER TABLE tickets ADD COLUMN cancellation_charge REAL DEFAULT 0.0")
        con.execute("ALTER TABLE tickets ADD COLUMN refund_amount REAL DEFAULT 0.0")
    except Exception:
        pass

    count = con.execute("SELECT COUNT(*) FROM trains").fetchone()[0]
    if count == 0:
        trains = [
            ("12951", "Mumbai Rajdhani",       "Mumbai Central",       "New Delhi",            "17:00", "08:32", 150, 15, 25, 2800.0, 1386, "15h 32m"),
            ("12002", "Bhopal Shatabdi",        "New Delhi",            "Rani Kamlapati",       "06:00", "13:35", 120, 12, 20, 1200.0,  705, "7h 35m"),
            ("12628", "Karnataka Express",      "New Delhi",            "KSR Bengaluru",        "20:15", "12:00", 200, 20, 30, 2600.0, 2406, "39h 45m"),
            ("12842", "Coromandel Express",     "Chennai Central",      "Shalimar",             "07:00", "10:40", 180, 18, 30, 1900.0, 1659, "27h 40m"),
            ("22436", "Vande Bharat Express",   "New Delhi",            "Varanasi",             "06:00", "14:00", 100, 10, 15, 1750.0,  759, "8h 00m"),
            ("12810", "Howrah Mail",            "Mumbai CSMT",          "Howrah",               "21:10", "06:20", 200, 20, 30, 2200.0, 1968, "33h 10m"),
            ("22692", "Bengaluru Rajdhani",     "Hazrat Nizamuddin",    "KSR Bengaluru",        "19:50", "05:20", 150, 15, 25, 3500.0, 2365, "33h 30m"),
            ("12269", "Chennai Duronto",        "Chennai Central",      "Hazrat Nizamuddin",    "06:35", "10:40", 140, 14, 25, 3100.0, 2174, "28h 05m"),
            ("12616", "Grand Trunk Express",    "New Delhi",            "Chennai Central",      "16:10", "04:30", 180, 18, 30, 2300.0, 2184, "36h 20m"),
            ("12559", "Shiv Ganga Express",     "Banaras",              "New Delhi",            "22:15", "08:30", 150, 15, 25, 1100.0,  755, "10h 15m"),
            ("12925", "Paschim Express",        "Bandra Terminus",      "Amritsar",             "11:25", "20:10", 180, 18, 30, 2100.0, 1883, "32h 45m"),
            ("12259", "Sealdah Duronto",        "Sealdah",              "New Delhi",            "18:30", "11:25", 140, 14, 25, 2500.0, 1458, "16h 55m"),
            ("12903", "Golden Temple Mail",     "Mumbai Central",       "Amritsar",             "21:25", "05:30", 180, 18, 30, 2150.0, 1893, "32h 05m"),
            ("12626", "Kerala Express",         "New Delhi",            "Thiruvananthapuram",   "20:10", "13:30", 200, 20, 30, 2800.0, 3026, "41h 20m"),
            ("12724", "Telangana Express",      "New Delhi",            "Hyderabad",            "16:00", "17:10", 180, 18, 30, 1850.0, 1677, "25h 10m"),
            ("12833", "Howrah Express",         "Ahmedabad",            "Howrah",               "00:15", "13:30", 200, 20, 30, 2300.0, 2087, "37h 15m"),
            ("12431", "Rajdhani Express",       "Trivandrum",           "Hazrat Nizamuddin",    "19:15", "12:30", 150, 15, 25, 4200.0, 3149, "41h 15m"),
            ("12137", "Punjab Mail",            "Mumbai CSMT",          "Firozpur",             "19:35", "05:10", 180, 18, 30, 2100.0, 1930, "33h 35m"),
            ("12423", "Dibrugarh Rajdhani",     "Dibrugarh",            "New Delhi",            "20:55", "10:30", 140, 14, 25, 3400.0, 2434, "37h 35m"),
            ("12313", "Sealdah Rajdhani",       "Sealdah",              "New Delhi",            "16:50", "10:50", 150, 15, 25, 2850.0, 1458, "18h 00m"),
            ("22823", "Bhubaneswar Rajdhani",   "Bhubaneswar",          "New Delhi",            "09:30", "09:55", 140, 14, 25, 3100.0, 1800, "24h 25m"),
            ("11019", "Konark Express",         "Mumbai CSMT",          "Bhubaneswar",          "14:00", "23:20", 180, 18, 30, 2100.0, 1932, "33h 20m"),
            ("12141", "Patliputra Express",     "Mumbai LTT",           "Patliputra",           "23:35", "03:50", 180, 18, 30, 1900.0, 1694, "28h 15m"),
            ("12295", "Sanghamitra Express",    "KSR Bengaluru",        "Danapur",              "09:00", "07:40", 200, 20, 30, 2500.0, 2698, "46h 40m"),
            ("12510", "Guwahati Express",       "KSR Bengaluru",        "Guwahati",             "23:40", "06:15", 200, 20, 30, 2700.0, 2973, "54h 35m"),
        ]
        for t in trains:
            try:
                con.execute(
                    "INSERT INTO trains (number,name,from_city,to_city,departure,arrival,total_seats,available_seats,rac_slots,available_rac,fare,distance,duration) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
                    (t[0],t[1],t[2],t[3],t[4],t[5],t[6],t[6],t[8],t[8],t[9],t[10],t[11])
                )
            except Exception:
                pass

        con.execute("INSERT OR IGNORE INTO users (name,email,password,gender,age,role) VALUES (?,?,?,?,?,?)",
                    ("Admin", "admin@railease.com", hash_pw("admin123"), "male", 30, "admin"))
        con.execute("INSERT OR IGNORE INTO users (name,email,password,gender,age,phone) VALUES (?,?,?,?,?,?)",
                    ("Arjun Sharma", "demo@railease.com", hash_pw("demo123"), "male", 28, "9876543210"))
        con.execute("INSERT OR IGNORE INTO users (name,email,password,gender,age,phone) VALUES (?,?,?,?,?,?)",
                    ("Priya Patel", "demo2@railease.com", hash_pw("demo123"), "female", 25, "9876543211"))

        demo_user  = con.execute("SELECT id FROM users WHERE email='demo@railease.com'").fetchone()
        demo2_user = con.execute("SELECT id FROM users WHERE email='demo2@railease.com'").fetchone()
        train1     = con.execute("SELECT * FROM trains WHERE number='12951'").fetchone()

        if demo_user and train1:
            uid  = demo_user["id"]
            uid2 = demo2_user["id"] if demo2_user else uid
            tid  = train1["id"]
            con.execute("UPDATE trains SET available_seats=0 WHERE id=?", (tid,))
            cur  = con.execute("INSERT INTO rac_groups (train_id,journey_date,berth_no,gender,occupied,capacity) VALUES (?,?,?,?,2,2)",
                               (tid, "2026-05-15", 1, "male"))
            rac1 = cur.lastrowid
            cur2 = con.execute("INSERT INTO rac_groups (train_id,journey_date,berth_no,gender,occupied,capacity) VALUES (?,?,?,?,1,2)",
                               (tid, "2026-05-20", 2, "female"))
            rac2 = cur2.lastrowid
            con.execute("UPDATE trains SET available_rac=available_rac-2 WHERE id=?", (tid,))
            for pnr, uid_, tid_, date, seat, gid in [
                ("REDEMO01", uid,  tid, "2026-05-15", "RAC-1", rac1),
                ("REDEMO02", uid2, tid, "2026-05-15", "RAC-1", rac1),
                ("REDEMO03", uid2, tid, "2026-05-20", "RAC-2", rac2),
            ]:
                con.execute(
                    "INSERT OR IGNORE INTO tickets (pnr,user_id,train_id,journey_date,status,seat_number,rac_group_id,fare,payment_done) VALUES (?,?,?,?,?,?,?,?,?)",
                    (pnr, uid_, tid_, date, "rac", seat, gid, train1["fare"], 1)
                )

        con.commit()
        print("Database initialised with trains and demo data.")
    con.close()

# ── CORS helper ─────────────────────────────────────────────────────────────
@app.after_request
def add_cors(response):
    response.headers["Access-Control-Allow-Origin"]  = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET,POST,DELETE,OPTIONS"
    return response

@app.route("/", defaults={"path": ""}, methods=["OPTIONS"])
@app.route("/<path:path>", methods=["OPTIONS"])
def options_handler(path):
    return "", 204

# ── Auth Routes ─────────────────────────────────────────────────────────────
@app.route("/register", methods=["POST"])
def register():
    body  = request.json or {}
    email = body.get("email", "").lower().strip()
    if not email or not body.get("password"):
        return jsonify({"error": "Email and password required"}), 400
    con = get_db()
    if con.execute("SELECT id FROM users WHERE email=?", (email,)).fetchone():
        con.close()
        return jsonify({"error": "Email already registered"}), 400
    con.execute(
        "INSERT INTO users (name,email,password,gender,age,phone) VALUES (?,?,?,?,?,?)",
        (body.get("name", "User"), email, hash_pw(body["password"]),
         body.get("gender", "male"), body.get("age", 18), body.get("phone", ""))
    )
    con.commit()
    u     = dict(con.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone())
    token = create_session(u["id"])
    con.close()
    return jsonify({"token": token, "name": u["name"], "role": u["role"], "gender": u["gender"]})

@app.route("/login", methods=["POST"])
def login():
    body  = request.json or {}
    email = body.get("email", "").lower().strip()
    con   = get_db()
    u     = con.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
    if not u or dict(u)["password"] != hash_pw(body.get("password", "")):
        con.close()
        return jsonify({"error": "Invalid email or password"}), 401
    u     = dict(u)
    token = create_session(u["id"])
    con.close()
    return jsonify({"token": token, "name": u["name"], "role": u["role"], "gender": u["gender"]})

# ── Train / Availability Routes ─────────────────────────────────────────────
@app.route("/trains")
def trains():
    src     = request.args.get("from")
    dst     = request.args.get("to")
    has_rac = request.args.get("has_rac")
    con     = get_db()

    if has_rac:
        rows = con.execute("SELECT * FROM trains WHERE available_seats=0 AND available_rac < rac_slots LIMIT 4").fetchall()
    elif src and dst:
        rows = con.execute("""
            SELECT t.id, t.number, t.name,
                   s1.station_name as from_city, s2.station_name as to_city,
                   s1.departure_time as departure, s2.arrival_time as arrival,
                   t.total_seats, t.available_seats, t.rac_slots, t.available_rac,
                   ABS(s2.distance - s1.distance) * 1.5 as fare,
                   ABS(s2.distance - s1.distance) as distance, '' as duration
            FROM trains t
            JOIN train_stops s1 ON t.number = s1.train_number
            JOIN train_stops s2 ON t.number = s2.train_number
            WHERE LOWER(s1.station_name) LIKE ? AND LOWER(s2.station_name) LIKE ? AND s1.seq < s2.seq
            LIMIT 100
        """, (f"%{src.lower()}%", f"%{dst.lower()}%")).fetchall()
    elif src:
        rows = con.execute("""
            SELECT t.* FROM trains t JOIN train_stops s ON t.number=s.train_number
            WHERE LOWER(s.station_name) LIKE ? LIMIT 100
        """, (f"%{src.lower()}%",)).fetchall()
    elif dst:
        rows = con.execute("""
            SELECT t.* FROM trains t JOIN train_stops s ON t.number=s.train_number
            WHERE LOWER(s.station_name) LIKE ? LIMIT 100
        """, (f"%{dst.lower()}%",)).fetchall()
    else:
        rows = con.execute("SELECT * FROM trains LIMIT 100").fetchall()

    con.close()
    return jsonify([dict(r) for r in rows])

@app.route("/availability")
def availability():
    train_id = request.args.get("train_id")
    date_str = request.args.get("date")
    if not train_id or not date_str:
        return jsonify({"error": "Missing params"}), 400
    con   = get_db()
    avail = get_availability(con, train_id, date_str)
    con.close()
    if not avail:
        return jsonify({"error": "Train not found"}), 404
    return jsonify(avail)

@app.route("/availability-range")
def availability_range():
    train_id = request.args.get("train_id")
    days     = int(request.args.get("days", 14))
    if not train_id:
        return jsonify({"error": "Missing train_id"}), 400
    result = []
    today  = datetime.date.today()
    con    = get_db()
    for i in range(days):
        d     = (today + datetime.timedelta(days=i)).strftime("%Y-%m-%d")
        avail = get_availability(con, train_id, d)
        if avail:
            result.append({
                "date":            d,
                "available_seats": avail["available_seats"],
                "available_rac":   avail["available_rac"],
                "waitlist_count":  avail["waitlist_count"],
                "waitlist_limit":  avail["waitlist_limit"],
            })
    con.close()
    return jsonify(result)

@app.route("/route-availability-range")
def route_availability_range():
    src  = request.args.get("from")
    dst  = request.args.get("to")
    days = int(request.args.get("days", 14))
    con  = get_db()
    q, args = "SELECT id FROM trains WHERE 1=1", []
    if src:
        q += " AND LOWER(from_city) LIKE ?"
        args.append(f"%{src.lower()}%")
    if dst:
        q += " AND LOWER(to_city) LIKE ?"
        args.append(f"%{dst.lower()}%")
    train_ids = [r["id"] for r in con.execute(q, args).fetchall()] if (src or dst) else []
    result, today = [], datetime.date.today()
    for i in range(days):
        d = (today + datetime.timedelta(days=i)).strftime("%Y-%m-%d")
        if not train_ids:
            result.append({"date": d, "status": "unknown"})
            continue
        best = "booked"
        for tid in train_ids:
            a = get_availability(con, tid, d)
            if not a: continue
            if a["available_seats"] > 0:             best = "avail"; break
            elif a["available_rac"]   > 0 and best != "avail":  best = "rac"
            elif a["waitlist_count"]  < a["waitlist_limit"] and best == "booked": best = "wl"
        result.append({"date": d, "status": best})
    con.close()
    return jsonify(result)

# ── User Routes ─────────────────────────────────────────────────────────────
@app.route("/profile")
@require_auth
def profile():
    return jsonify({k: v for k, v in request.current_user.items() if k != "password"})

@app.route("/my-tickets")
@require_auth
def my_tickets():
    con  = get_db()
    rows = con.execute("""
        SELECT t.*, tr.name as train_name, tr.number as train_number,
               tr.from_city, tr.to_city, tr.departure, tr.arrival, tr.fare as train_fare,
               u.gender as passenger_gender, u.name as passenger_name
        FROM tickets t
        JOIN trains tr ON t.train_id=tr.id
        JOIN users  u  ON t.user_id=u.id
        WHERE t.user_id=? ORDER BY t.id DESC
    """, (request.current_user["id"],)).fetchall()
    con.close()
    return jsonify([dict(r) for r in rows])

@app.route("/book", methods=["POST"])
@require_auth
def book():
    body    = request.json or {}
    ticket, err = book_ticket(request.current_user, body.get("train_id"), body.get("journey_date"))
    if err:
        return jsonify({"error": err}), 400
    return jsonify(ticket)

@app.route("/pay", methods=["POST"])
@require_auth
def pay():
    body   = request.json or {}
    tid    = body.get("ticket_id")
    con    = get_db()
    ticket = con.execute("SELECT * FROM tickets WHERE id=? AND user_id=?", (tid, request.current_user["id"])).fetchone()
    if not ticket:
        con.close()
        return jsonify({"error": "Ticket not found"}), 404
    con.execute("UPDATE tickets SET payment_done=1 WHERE id=?", (tid,))
    con.commit()
    con.close()
    return jsonify({"success": True, "message": "Payment successful!"})

@app.route("/cancel/<int:ticket_id>", methods=["DELETE"])
@require_auth
def cancel(ticket_id):
    ok, msg = cancel_ticket(ticket_id, request.current_user["id"])
    return jsonify({"success": ok, "message": msg}), 200 if ok else 400

@app.route("/rac-groups/<train_id>")
def rac_groups(train_id):
    con  = get_db()
    rows = con.execute("""
        SELECT rg.*,
               GROUP_CONCAT(tk.pnr,       ',') as pnrs,
               GROUP_CONCAT(u.name,        ',') as passenger_names,
               GROUP_CONCAT(u.gender,      ',') as passenger_genders
        FROM rac_groups rg
        LEFT JOIN tickets tk ON tk.rac_group_id=rg.id AND tk.status='rac'
        LEFT JOIN users u    ON tk.user_id=u.id
        WHERE rg.train_id=?
        GROUP BY rg.id
    """, (train_id,)).fetchall()
    con.close()
    return jsonify([dict(r) for r in rows])

# ── Admin Routes ────────────────────────────────────────────────────────────
@app.route("/admin/stats")
@require_admin
def admin_stats():
    con   = get_db()
    stats = {
        "passengers": con.execute("SELECT COUNT(*) FROM users WHERE role='passenger'").fetchone()[0],
        "trains":     con.execute("SELECT COUNT(*) FROM trains").fetchone()[0],
        "bookings":   con.execute("SELECT COUNT(*) FROM tickets WHERE status!='cancelled'").fetchone()[0],
        "confirmed":  con.execute("SELECT COUNT(*) FROM tickets WHERE status='confirmed'").fetchone()[0],
        "rac":        con.execute("SELECT COUNT(*) FROM tickets WHERE status='rac'").fetchone()[0],
        "waiting":    con.execute("SELECT COUNT(*) FROM tickets WHERE status='waiting'").fetchone()[0],
        "cancelled":  con.execute("SELECT COUNT(*) FROM tickets WHERE status='cancelled'").fetchone()[0],
        "revenue":    con.execute("SELECT COALESCE(SUM(fare),0) FROM tickets WHERE payment_done=1").fetchone()[0],
    }
    con.close()
    return jsonify(stats)

@app.route("/admin/bookings")
@require_admin
def admin_bookings():
    con  = get_db()
    rows = con.execute("""
        SELECT t.*, tr.name as train_name, tr.from_city, tr.to_city,
               u.name as passenger_name, u.gender as passenger_gender
        FROM tickets t
        JOIN trains tr ON t.train_id=tr.id
        JOIN users  u  ON t.user_id=u.id
        ORDER BY t.id DESC LIMIT 100
    """).fetchall()
    con.close()
    return jsonify([dict(r) for r in rows])

@app.route("/admin/trains")
@require_admin
def admin_trains():
    con  = get_db()
    rows = con.execute("SELECT * FROM trains").fetchall()
    con.close()
    return jsonify([dict(r) for r in rows])

@app.route("/admin/add-train", methods=["POST"])
@require_admin
def admin_add_train():
    body  = request.json or {}
    seats = int(body.get("total_seats", 100))
    rac   = int(body.get("rac_slots", 10))
    con   = get_db()
    con.execute(
        "INSERT INTO trains (number,name,from_city,to_city,departure,arrival,total_seats,available_seats,rac_slots,available_rac,fare) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        (body["number"], body["name"], body["from_city"], body["to_city"],
         body["departure"], body["arrival"], seats, seats, rac, rac, float(body.get("fare", 500)))
    )
    con.commit()
    con.close()
    return jsonify({"success": True, "message": "Train added!"})

# ── Static Frontend ─────────────────────────────────────────────────────────
@app.route("/")
def index():
    return send_from_directory("frontend", "index.html")

@app.route("/<path:filename>")
def static_files(filename):
    return send_from_directory("frontend", filename)

# ── Entry Point ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    init_db()
    PORT = 8000
    print(f"""
==========================================
      RailEase is running!
==========================================
  Open:   http://localhost:{PORT}
  Admin:  admin@railease.com / admin123
  Demo:   demo@railease.com  / demo123
  Demo2:  demo2@railease.com / demo123
==========================================
    """)
    app.run(host="0.0.0.0", port=PORT, debug=True)
