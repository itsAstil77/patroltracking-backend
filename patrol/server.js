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
// const swaggerJsdoc = require("swagger-jsdoc");
// const swaggerUi = require("swagger-ui-express");

// const swaggerOptions = {
//   definition: {
//     openapi: "3.0.0",
//     info: {
//       title: "Patrol System API",
//       version: "1.0.0",
//       description: "Auto-generated docs for Patrol System APIs",
//     },
//     servers: [
//       {
//         url: `http://localhost:${PORT}`,
//       },
//     ],
//   },
//   apis: ["./routes/*.js", "./models/*.js"], // 👈 You can adjust this to your folder structure
// };

// const swaggerSpec = swaggerJsdoc(swaggerOptions);
// app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.log(err));

// Import Routes
const eventRoutes = require("./routes/workflow");
app.use("/workflow", eventRoutes);

const eventWebRoutes = require("./routes/history");
app.use("/history", eventWebRoutes);

const checklistRoutes = require("./routes/checklist");
app.use("/checklists", checklistRoutes);

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


const reportRoutes = require("./routes/report");
app.use("/reports",reportRoutes);

const signatureRoutes = require("./routes/signature");
app.use("/uploads/signatures", express.static(path.join(__dirname, "uploads", "signatures")));

app.use("/signature",signatureRoutes);
const companyRoutes = require("./routes/company");
app.use("/company",companyRoutes)
// ⚡ Final step of express-oas-generator
// expressOasGenerator.handleResponses(app, {});
// Start Server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));




// const express = require("express");
// const swaggerJsdoc = require("swagger-jsdoc");
// const swaggerUi = require("swagger-ui-express");
// require("dotenv").config();
// const mongoose = require("mongoose");

// const app = express();
// app.use(express.json());

// // ✅ Import your route files
// const signupRoutes = require("./routes/signup");
// const loginRoutes = require("./routes/login");
// const companyRoutes = require("./routes/company");

// // ✅ Swagger Configuration
// const swaggerOptions = {
//     definition: {
//         openapi: "3.0.0",
//         info: {
//             title: "Patrol API Documentation",
//             version: "1.0.0",
//             description: "API Documentation for Patrol System",
//         },
//         servers: [
//             {
//                 url: "http://localhost:5000", // Change if using a different port
//             },
//         ],
//     },
//     apis: ["./routes/*.js"], // ✅ Automatically reads API documentation from route files
// };

// const swaggerSpec = swaggerJsdoc(swaggerOptions);
// app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// // ✅ Use Routes
// app.use("/signup", signupRoutes);
// app.use("/login", loginRoutes);
// app.use("/company", companyRoutes);

// // ✅ Connect to MongoDB
// mongoose.connect(process.env.MONGO_URI, {
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
// })
// .then(() => console.log("Connected to MongoDB"))
// .catch(err => console.error("MongoDB Connection Error:", err));

// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
