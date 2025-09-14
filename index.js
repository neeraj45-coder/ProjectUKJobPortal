const express = require("express");
const app = express();

// Start server
const port = 3000;
app.listen(port, (req,res) => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});

//View Engine Seting
app.set("view engine","ejs");
const path = require("path");
app.set("views", path.join(__dirname, "views"));
app.use(express.static('public'));

// Body parser for form data
app.use(express.urlencoded({ extended: true })); // x-www-form-urlencoded
app.use(express.json()); // JSON data (optional)

const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const { ftruncate } = require("fs");

const multer = require('multer');

// Storage settings
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'uploads/'); // Upload folder
  },
  filename: function(req, file, cb) {
    // Unique filename: timestamp-originalname
    cb(null, Date.now() + '-' + file.originalname);
  }
});

// Multer middleware
const upload = multer({ storage: storage });

//Db Connection
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "Neeraj@123", 
    database: "Ukjob"
});

db.connect(err => {
    if(err) {
        console.log("❌ MySQL Connection Error:", err);
        return;
    }
    console.log("✅ MySQL Connected!");
});


app.get("/",(req,res)=>{
    res.render("home");
})


app.get("/register",(req,res)=>{
    res.render("register");
})
app.post("/register", async (req, res) => {
    const { name, email, password, role } = req.body;
    // Password hash
    const hashedPassword = await bcrypt.hash(password, 10);
    // SQL Insert
    const sql = "INSERT INTO RegisterData (name, email, password, role) VALUES (?, ?, ?, ?)";
    db.query(sql, [name, email, hashedPassword, role], (err, result) => {
        if (err) {
            console.log("MySQL Error:", err); // 🔹 Ye actual error dikha dega
            return res.send("Error registering user.");
        }
        console.log("User Registered:", { name, email, role });
        res.render("deshboard");
    });
    
});
app.post("/login", (req, res) => {
    const { email, password } = req.body;

    // User check query
    const sql = "SELECT * FROM RegisterData WHERE email = ?";
    db.query(sql, [email], async (err, results) => {
        if (err) {
            console.log("MySQL Error:", err);
            return res.send("Database error.");
        }

        if (results.length === 0) {
            return res.send(" User not found!");
        }

        // Stored hashed password
        const hashedPassword = results[0].password;

        // Compare password with bcrypt
        const isMatch = await bcrypt.compare(password, hashedPassword);
        if (!isMatch) {
            console.log("Error");
            return res.send("Wrong Password");
        }

        // If success -> insert into LoginData
        const insertSql = "INSERT INTO LoginData (email, password) VALUES (?, ?)";
        db.query(insertSql, [email, password], (err2, result) => {
            if (err2) {
                console.log("MySQL Error:", err2);
                return res.send("Login logging failed.");
            }
            console.log(" User Logged In:", { email });
            res.render("deshboard");
        });
    });
});


app.get("/login",(req,res)=>{
    res.render("login");
});

// Website Query POST
app.post("/website-query", (req, res) => {
    const { name, email, phone, qury } = req.body;

    const sql = `INSERT INTO WebsiteQuryData (name,email,phone,qury) VALUES (?,?,?,?)`;
    db.query(sql, [name, email, phone, qury], (err, result) => {
        if (err) {
            console.log("MySQL Error:", err);
            return res.send("Query saving failed.");
        }

        console.log("📩 Website Query Saved:", { name, email, phone, qury });

        // Thanks page render with name
        res.render("thankspageq", { name });
    });
});


app.get("/login/gurrenty",(req,res)=>{
    res.render("guarantee");
})

app.get("/login/gurrenty/job",(req,res)=>{
    res.render("jobs");
})
app.get("/login/gurrenty/plan30", (req, res) => res.render("job30"));
app.get("/login/gurrenty/plan60", (req, res) => res.render("job60"));
app.get("/login/gurrenty/plan90", (req, res) => res.render("job90"));

app.post("/submit-job", (req, res) => {
  console.log(req.body);
  res.send("Job application submitted successfully!");
});


// Guarantee Plan 30 (Payment Page)
const QRCode = require("qrcode");

app.post("/login/guarantee/plan30", upload.single("resume"), async (req, res) => {
    // Form data
    const { name, email, phone, salary } = req.body;
    const resumePath = req.file ? req.file.path : null;

    // Console debug
    console.log("✅ Form Data:", req.body);
    console.log("✅ Resume File:", resumePath);

    // DB Insert
    const sql = `INSERT INTO PaidPlansData (name, email, phone, resume, salary) 
                 VALUES (?, ?, ?, ?, ?)`;
    db.query(sql, [name, email, phone, resumePath, salary], (err, result) => {
        if (err) {
            console.log("❌ MySQL Error:", err);
            return res.send("DB Insert Failed!");
        }
        console.log("✅ Data saved to DB:", result);

        // QR code generate
        const QRCode = require("qrcode");
        const plan = "30 Days";
        const amount = 1; // ₹1999
        const upiId = "7983460645@ybl";
        const payeeName = "UkJobPortal";
        const upiLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR`;

        QRCode.toDataURL(upiLink, (err, qrImage) => {
            if (err) {
                console.log("QR Error:", err);
                return res.send("Failed to generate QR.");
            }
            res.render("payment", { plan, amount, name, email, qrImage });
        });
    });
});


app.post("/submit-payment", (req, res) => {
    const { name, email, phone } = req.body;  // <-- यहाँ define करो

    const sql = "INSERT INTO JobGuaranteePayments (name, email, phone) VALUES (?, ?, ?)";
    db.query(sql, [name, email, phone], (err, result) => {
        if(err){
            console.log("DB Insert Error:", err);
            return res.send("DB insert failed!");
        }
        console.log("User saved, Payment Pending!");
        res.send("Payment info saved successfully!");
    });
});



app.get("/login/gurrenty/freepost",(req,res)=>{
    res.render("free.ejs");
})

app.post("/login/gurrenty/freepost/free-feed", (req, res) => {
    const { name, location, job_request } = req.body;

    const sql = "INSERT INTO FreeJobRequests (name, location, job_request) VALUES (?, ?, ?)";
    db.query(sql, [name || "Anonymous", location || "Unknown", job_request], (err, result) => {
        if(err) return res.send("Database Error");
        res.redirect("/"); // post ke baad home page open ho
    });
});



// Free Job Requests Feed
app.get("/login/gurrenty/freepost/free-feed", (req, res) => {
    const sql = "SELECT * FROM FreeJobRequests ORDER BY created_at DESC";
    db.query(sql, (err, results) => {
        if(err){
            console.log("MySQL Error:", err);
            return res.send("Unable to fetch posts.");
        }
        res.render("feed", { posts: results });
    });
});
