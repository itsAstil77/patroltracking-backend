const express = require("express");
const bcrypt = require("bcryptjs");
const Signup = require("../models/signup");
const Master = require("../models/company"); // ✅ Import Company Master model


const router = express.Router();

/** ✅ Function to Generate Next Admin ID */
const generateAdminId = async () => {
    const lastAdmin = await Signup.findOne({ role: "Admin" }).sort({ createdDate: -1 });
    if (!lastAdmin || !lastAdmin.adminId) {
        return "ADM001";
    }
    const lastIdNum = parseInt(lastAdmin.adminId.replace("ADM", ""), 10);
    return `ADM${String(lastIdNum + 1).padStart(3, "0")}`;
};

/** ✅ Function to Generate Next Patrol ID */
const generatePatrolId = async () => {
    const lastPatrol = await Signup.findOne({ role: "Patrol" }).sort({ createdDate: -1 });
    if (!lastPatrol || !lastPatrol.patrolId) {
        return "PTR001";
    }
    const lastIdNum = parseInt(lastPatrol.patrolId.replace("PTR", ""), 10);
    return `PTR${String(lastIdNum + 1).padStart(3, "0")}`;
};

/** ✅ Signup API */
router.post("/", async (req, res) => {
    try {
        const { username, password, email, patrolGuardName, mobileNumber, companyCode, imageUrl, role, department,designation} = req.body;

                // ✅ Ensure username is a Gmail address
        const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
        if (!gmailRegex.test(username)) {
            return res.status(400).json({ message: "Username must be a valid Gmail address" });
        }

        // ✅ Validate required fields
        if (!username || !password || !email || !patrolGuardName || !mobileNumber || !companyCode || !role || !department || !designation) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // ✅ Check if companyCode exists in Master collection
        const company = await Master.findOne({ companyCode });
        if (!company) {
            return res.status(400).json({ message: "Invalid company code. Please provide a valid company code." });
        }

        // ✅ Check if username or email already exists
        const existingUser = await Signup.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            return res.status(400).json({ message: "Username or Email already exists" });
        }

        // ✅ Hash Password before storing
        const hashedPassword = await bcrypt.hash(password, 10);

        let adminId = null;
        let patrolId = null;

        // ✅ Generate ID based on role
        if (role === "Admin") {
            adminId = await generateAdminId();
        } else if (role === "Patrol") {
            patrolId = await generatePatrolId();
        } else {
            return res.status(400).json({ message: "Invalid role. Allowed roles: Admin, Patrol" });
        }

        // ✅ Create New User
        const newUser = new Signup({
            username,
            password: hashedPassword,
            email,
            patrolGuardName,
            mobileNumber,
            companyCode, // ✅ Link to company
            imageUrl,
            role,
            adminId:adminId || null,
            patrolId:patrolId || null,
            department,
            designation,
            createdDate: new Date(),
            modifiedDate: new Date(),
            isActive: true
        });

        await newUser.save();
        res.status(201).json({ message: "Signup successful", data: newUser });

    } catch (error) {
        res.status(500).json({ message: "Error during signup", error: error.message });
    }
});

router.get("/users", async (req, res) => {
    try {
        // ✅ Fetch all patrols and admins from Signup collection
        const users = await Signup.find({ role: { $in: ["Patrol", "Admin"] } }).select("-password"); // Exclude password from the result

        if (users.length === 0) {
            return res.status(404).json({ message: "No users found" });
        }

        res.status(200).json({
            message: "Users retrieved successfully",
            users
        });
    } catch (error) {
        console.error("❌ Error fetching users:", error);
        res.status(500).json({ message: "Error fetching users", error: error.message });
    }
});

router.get("/patrol", async (req, res) => {
    try {
        // ✅ Fetch all patrols and admins from Signup collection
        const users = await Signup.find({ role: "Patrol" }).select("-password"); // Exclude password from the result

        if (users.length === 0) {
            return res.status(404).json({ message: "No users found" });
        }

        res.status(200).json({
            message: "Patrol retrieved successfully",
            users
        });
    } catch (error) {
        console.error("❌ Error fetching Patrol:", error);
        res.status(500).json({ message: "Error fetching users", error: error.message });
    }
});

// ✅ Delete a patrol by patrolId
router.delete("/patrol/:patrolId", async (req, res) => {
    try {
        const { patrolId } = req.params;

        // ✅ Check if patrol exists
        const patrol = await Signup.findOne({ patrolId, role: "Patrol" });

        if (!patrol) {
            return res.status(404).json({ message: "Patrol not found" });
        }

        // ✅ Delete the patrol
        await Signup.deleteOne({ patrolId });

        res.status(200).json({
            message: "Patrol deleted successfully"
        });
    } catch (error) {
        console.error("❌ Error deleting patrol:", error);
        res.status(500).json({ message: "Error deleting patrol", error: error.message });
    }
});

// ✅ Delete a admin by adminId
router.delete("/admin/:adminId", async (req, res) => {
    try {
        const { adminId } = req.params;

        // ✅ Check if patrol exists
        const admin = await Signup.findOne({ adminId, role: "Admin" });

        if (!admin) {
            return res.status(404).json({ message: "Admin not found" });
        }

        // ✅ Delete the patrol
        await Signup.deleteOne({ adminId });

        res.status(200).json({
            message: "Admin deleted successfully"
        });
    } catch (error) {
        console.error("❌ Error deleting Admin:", error);
        res.status(500).json({ message: "Error deleting Admin", error: error.message });
    }
});

// ✅ Update patrol details by patrolId
router.put("/patrol/:patrolId", async (req, res) => {
    try {
        const { patrolId } = req.params;
        const { username, password, email, patrolGuardName, mobileNumber, companyCode, imageUrl, role } = req.body;

        // ✅ Validate required fields
        if (!username || !password || !email || !patrolGuardName || !mobileNumber || !companyCode || !role) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // ✅ Check if companyCode exists in Master collection
        const company = await Master.findOne({ companyCode });
        if (!company) {
            return res.status(400).json({ message: "Invalid company code. Please provide a valid company code." });
        }

        // ✅ Check if patrol exists
        const patrol = await Signup.findOne({ patrolId, role: "Patrol" });

        if (!patrol) {
            return res.status(404).json({ message: "Patrol not found" });
        }

        // ✅ Check if username or email already exists (for other patrols)
        const existingUser = await Signup.findOne({
            $or: [{ username }, { email }],
            _id: { $ne: patrol._id } // Exclude current patrol from the check
        });
        if (existingUser) {
            return res.status(400).json({ message: "Username or Email already exists" });
        }

        // ✅ Hash Password before updating
        const hashedPassword = await bcrypt.hash(password, 10);

        // ✅ Update patrol details
        patrol.username = username;
        patrol.password = hashedPassword;
        patrol.email = email;
        patrol.patrolGuardName = patrolGuardName;
        patrol.mobileNumber = mobileNumber;
        patrol.companyCode = companyCode;
        patrol.imageUrl = imageUrl;
        patrol.role = role;
        patrol.modifiedDate = new Date(); // Update the modified date

        // ✅ Save the updated patrol
        await patrol.save();

        res.status(200).json({
            message: "Patrol details updated successfully",
            data: patrol
        });
    } catch (error) {
        console.error("❌ Error updating patrol details:", error);
        res.status(500).json({ message: "Error updating patrol details", error: error.message });
    }
});

// ✅ Update admin details by adminId
router.put("/admin/:adminId", async (req, res) => {
    try {
        const { adminId } = req.params;
        const { username, password, email, patrolGuardName, mobileNumber, companyCode, imageUrl, role } = req.body;

        // ✅ Validate required fields
        if (!username || !password || !email || !patrolGuardName || !mobileNumber || !companyCode || !role) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // ✅ Check if companyCode exists in Master collection
        const company = await Master.findOne({ companyCode });
        if (!company) {
            return res.status(400).json({ message: "Invalid company code. Please provide a valid company code." });
        }

        // ✅ Check if admin exists
        const admin = await Signup.findOne({ adminId, role: "Admin" });

        if (!admin) {
            return res.status(404).json({ message: "Admin not found" });
        }

        // ✅ Check if username or email already exists (for other admins)
        const existingUser = await Signup.findOne({
            $or: [{ username }, { email }],
            adminId: { $ne: adminId }
        });
        
        if (existingUser) {
            return res.status(400).json({ message: "Username or Email already exists" });
        }

        // ✅ Hash Password before updating
        const hashedPassword = await bcrypt.hash(password, 10);

        // ✅ Update admin details
        admin.username = username;
        admin.password = hashedPassword;
        admin.email = email;
        admin.patrolGuardName = patrolGuardName;
        admin.mobileNumber = mobileNumber;
        admin.companyCode = companyCode;
        admin.imageUrl = imageUrl;
        admin.role = role;
        admin.modifiedDate = new Date();

        await admin.save();

        res.status(200).json({
            message: "Admin details updated successfully",
            data: admin
        });
    } catch (error) {
        console.error("❌ Error updating admin details:", error);
        res.status(500).json({ message: "Error updating admin details", error: error.message });
    }
});


module.exports = router;


