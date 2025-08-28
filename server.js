require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require('cors');


// const expressOasGenerator = require('express-oas-generator');
const app = express();
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  }));

// expressOasGenerator.init(app, {}); // Initialize before routes

const path = require("path");
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected");
    // Start server only after DB connection is ready
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error("MongoDB connection error:", err);
  });


// Import Routes
const eventRoutes = require("./routes/workflow");
app.use("/workflow", eventRoutes);

const eventWebRoutes = require("./routes/history");
app.use("/history", eventWebRoutes);

const checklistRoutes = require("./routes/checklist");
app.use("/checklists", checklistRoutes);

const sosRoutes = require("./routes/sos");
app.use("/sos", sosRoutes);

const mediaRoutes = require("./routes/media");
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use("/media", mediaRoutes);


const incidentmasterRoutes = require('./routes/incidentmaster');
app.use('/incidentmaster', incidentmasterRoutes);

// app.use('/uploads', express.static('uploads'));

// // Routes
const patrolRoutes = require("./routes/patrol");
app.use("/patrol",patrolRoutes)

const signupRoutes = require("./routes/signup");
app.use("/signup", signupRoutes);

const loginRoutes = require("./routes/login");
app.use("/login",loginRoutes)
const incidentRoutes = require("./routes/incident");
app.use("/incident",incidentRoutes);
const locationCodesRoutes =  require("./routes/locationCodeMaster");
app.use("/locationcode",locationCodesRoutes)
// const mediaRoutes = require("./media");
// app.use("/multimedia",mediaRoutes);
const scanningRoutes = require("./routes/scanning");
app.use("/scanning",scanningRoutes);
const liveStreamRoutes = require("./routes/liveStream");
app.use("/livestream",liveStreamRoutes);

const mapRoutes = require("./routes/map");
app.use("/maps",mapRoutes);


const reportRoutes = require("./routes/report");
app.use("/reports",reportRoutes);

const licenseRoutes = require("./routes/license");
app.use("/license", licenseRoutes);


const roleRoutes = require("./routes/role");
app.use("/roles", roleRoutes);


const signatureRoutes = require("./routes/signature");
app.use("/uploads/signatures", express.static(path.join(__dirname, "uploads", "signatures")));

app.use("/signature",signatureRoutes);
const companyRoutes = require("./routes/company");
app.use("/company",companyRoutes)
