const express = require("express");
const bcrypt = require("bcryptjs");
const Signup = require("../models/signup");
const Master = require("../models/company");
const Location = require('../models/locationCodeMaster');
const authMiddleware = require('../middleware/authMiddleware');


const router = express.Router();


const Role = require("../models/role"); // make sure this is imported

async function generateUserId() {
    const allPatrols = await Signup.find({ patrolId: { $exists: true } }, { patrolId: 1 });

    let maxNum = 0;
    allPatrols.forEach(doc => {
        if (doc.patrolId) {
            const num = parseInt(doc.patrolId.replace("USR00", ""));
            if (!isNaN(num) && num > maxNum) {
                maxNum = num;
            }
        }
    });

    return `USR00${maxNum + 1}`;
}



router.post("/", async (req, res) => {
    try {
        const {
            username, password, email, patrolGuardName, mobileNumber,
            locationName, companyCode, imageUrl, roleId, department, designation
        } = req.body;

        // ✅ Validate required fields
        if (!username || !password || !email || !patrolGuardName || !mobileNumber || !locationName || !roleId || !department || !designation) {
            return res.status(400).json({ message: "All fields are required" });
        }
        // ✅ Validate email formats
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;

        if (!gmailRegex.test(username)) {
          return res.status(400).json({ message: "Username must be a valid Gmail address (e.g., user@gmail.com)." });
        }
        if (!emailRegex.test(email)) {
          return res.status(400).json({ message: "Email must be a valid email address." });
        }

        const locationExists = await Location.findOne({ description:locationName });
        if (!locationExists) {
            return res.status(400).json({ message: "Invalid locationName. Please provide a valid location." });
        }

        // ✅ Lookup roleName from roleId
        const roleDoc = await Role.findOne({ roleId, isActive: true });
        if (!roleDoc) {
            return res.status(400).json({ message: "Invalid roleId. Please select a valid role." });
        }

        const roleName = roleDoc.roleName; // e.g., "Admin" or "Patrol"

            // Check if username already exists
          const existingUser = await Signup.findOne({ username });
          if (existingUser) {
            return res.status(400).json({ message: "Username already exists" });
          }

                // ✅ Generate userId (e.g., USR001, USR002...)
                const userCount = await Signup.countDocuments({});
                const userId = `USR${(userCount + 1).toString().padStart(3, "0")}`;

        // ✅ Create user
        const newUser = new Signup({
            username,
            password: await bcrypt.hash(password, 10),
            email,
            patrolGuardName,
            mobileNumber,
            locationName,
            // companyCode,
            imageUrl,
            roleId,
            role: roleName,
            userId, 
            department,
            designation,
            createdDate: new Date(),
            modifiedDate: new Date(),
            isActive: true
        });

        await newUser.save();
        res.status(200).json({ message: "Signup successful", data: newUser });

    } catch (error) {
        res.status(500).json({ message: "Error during signup", error: error.message });
    }
});


router.post("/change-password",authMiddleware, async (req, res) => {
  const { username, oldPassword, password, confirmPassword } = req.body;

  if (!username || !oldPassword || !password || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required" });
  }

  try {
      const user = await Signup.findOne({ username });
      if (!user) {
          return res.status(404).json({ message: "User not found" });
      }

      const isMatch = await bcrypt.compare(oldPassword, user.password);
      if (!isMatch) {
          return res.status(401).json({ message: "Old password is incorrect" });
      }

      if (password !== confirmPassword) {
          return res.status(400).json({ message: "Passwords do not match" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      user.password = hashedPassword;
      user.modifiedDate = new Date();
      await user.save();

      res.status(200).json({ message: "Password changed successfully" });

  } catch (error) {
      res.status(500).json({ message: "Something went wrong", error: error.message });
  }
});


router.get("/users",authMiddleware, async (req, res) => {
    try {
        // ✅ Fetch all patrols and admins from Signup collection
        const users = await Signup.find({}, "-password");// Exclude password from the result

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

router.get("/non-admin",authMiddleware, async (req, res) => {
    try {
      // Find all users whose role is NOT "Admin"
      const users = await Signup.find({ role: { $ne: "Admin" } }, "-password -__v");
  
      if (users.length === 0) {
        return res.status(404).json({ message: "No non-admin users found" });
      }
  
      res.status(200).json({
        message: "Non-admin users retrieved successfully",
        users
      });
    } catch (error) {
      console.error("❌ Error fetching non-admin users:", error);
      res.status(500).json({ message: "Error fetching users", error: error.message });
    }
  });
  



// GET /user/:userId
router.get("/:userId",authMiddleware, async (req, res) => {
    try {
      const { userId } = req.params;
  
      const user = await Signup.findOne({ userId, isActive: true }).select("-password -__v");
  
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
  
      res.status(200).json({ message: "User found", data: user });
  
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  });



// Delete a patrol by userId, but prevent deleting if role is "Admin"
router.delete("/:userId", authMiddleware,async (req, res) => {
    try {
        const { userId } = req.params;

        // Check if user exists
        const user = await Signup.findOne({ userId });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Prevent deleting if role is Admin
        if (user.role === "Admin") {
            return res.status(403).json({ message: "Admin users cannot be deleted" });
        }

        // Delete the user
        await Signup.deleteOne({ userId });

        res.status(200).json({
            message: "User deleted successfully"
        });
    } catch (error) {
        console.error("❌ Error deleting user:", error);
        res.status(500).json({ message: "Error deleting user", error: error.message });
    }
});





router.put("/:userId", authMiddleware,async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      username,
      email,
      patrolGuardName,
      mobileNumber,
      locationName,
      imageUrl,
      department,
      designation,
    } = req.body;

    // ✅ Validate required fields
    if (
      !username ||
      !email ||
      !patrolGuardName ||
      !locationName ||
      !mobileNumber ||
      !department ||
      !designation
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // ✅ Find the patrol by userId
    const patrol = await Signup.findOne({ userId });
    if (!patrol) {
      return res.status(404).json({ message: "Patrol not found" });
    }
    

    // ✅ Check if location exists
    const location = await Location.findOne({ description: locationName });
    if (!location) {
      return res.status(400).json({ message: "Invalid location name" });
    }

    // ✅ Update fields
    patrol.username = username;
    patrol.email = email;
    patrol.patrolGuardName = patrolGuardName;
    patrol.mobileNumber = mobileNumber;
    patrol.locationName = locationName;
    patrol.department = department;
    patrol.designation = designation;
    patrol.imageUrl = imageUrl;
    patrol.modifiedDate = new Date();

    // ✅ Save
    await patrol.save();

    return res.status(200).json({
      message: "Patrol details updated successfully",
      data: patrol,
    });
  } catch (error) {
    console.error("❌ Error updating patrol details:", error);
    return res.status(500).json({
      message: "Error updating patrol details",
      error: error.message,
    });
  }
});




module.exports = router;


