const express = require("express");
const bcrypt = require("bcryptjs");
const Signup = require("../models/signup");
const Master = require("../models/company");
const Location = require('../models/locationCodeMaster');
const Checklist = require('../models/checklist');
const authMiddleware = require('../middleware/authMiddleware');
// Near the top
const generateUserId = require("../utils/generateUserId");


const router = express.Router();


const Role = require("../models/role"); // make sure this is imported





router.post("/", async (req, res) => {
    try {
        const {
            username, password, email, patrolGuardName, mobileNumber,
            locationId, imageUrl, roleId, department, designation
        } = req.body;

        // ✅ Validate required fields
        if (!username || !password || !email || !patrolGuardName || !mobileNumber || !locationId  || !roleId || !department || !designation) {
            return res.status(400).json({ message: "All fields are required" });
        }

                // ✅ Validate array of locationIds
        if (!Array.isArray(locationId) || locationId.length === 0) {
            return res.status(400).json({ message: "locationId must be a non-empty array." });
        }

        const locationDocs = await Location.find({ locationId: { $in: locationId } });
        if (locationDocs.length !== locationId.length) {
            return res.status(400).json({ message: "Some locationIds are invalid." });
        }

        const locationNames = locationDocs.map(loc => loc.description);
        // ✅ Validate email formats
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const gmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!gmailRegex.test(username)) {
          return res.status(400).json({ message: "Username must be a valid Gmail address (e.g., user@gmail.com)." });
        }
        if (!emailRegex.test(email)) {
          return res.status(400).json({ message: "Email must be a valid email address." });
        }

        // const locationExists = await Location.findOne({locationId});
        // if (!locationExists) {
        //     return res.status(400).json({ message: "Invalid locationName. Please provide a valid location." });
        // }
        //     const locationName = locationExists.description;

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
          // In your route:
const userId = await generateUserId();

        // ✅ Create user
        const newUser = new Signup({
            username,
            password: await bcrypt.hash(password, 10),
            email,
            patrolGuardName,
            mobileNumber,
            locationId,
             locationName:locationNames,
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


router.get("/users", authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;      // Default to page 1
    const limit = parseInt(req.query.limit) || 10;   // Default to 10 users per page
    const skip = (page - 1) * limit;

    // Get total count for pagination metadata
    const totalUsers = await Signup.countDocuments();

    // Fetch users with pagination (excluding password)
  const users = await Signup.find({}, "-password")
  .sort({ createdDate: -1 })
  .skip(skip)
  .limit(limit)
  

    if (users.length === 0) {
      return res.status(404).json({ message: "No users found" });
    }

    res.status(200).json({
      message: "Users retrieved successfully",
      pagination: {
        totalRecords: totalUsers,
        totalPages: Math.ceil(totalUsers / limit),
        currentPage: page,
        pageSize: limit
      },
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
      locationId,
      imageUrl,
      department,
      designation,
    } = req.body;

    // ✅ Validate required fields
    if (
      !username ||
      !email ||
      !patrolGuardName ||
      !locationId ||
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
    


    // ✅ Validate all locationIds exist
    const locationDocs = await Location.find({ locationId: { $in: locationId } });
    if (locationDocs.length !== locationId.length) {
      return res.status(400).json({ message: "Some locationIds are invalid" });
    }

    const locationCodes = locationDocs.map(loc => loc.locationCode);
    const locationNames = locationDocs.map(loc => loc.description);

    // ✅ Update patrol
    patrol.username = username;
    patrol.email = email;
    patrol.patrolGuardName = patrolGuardName;
    patrol.mobileNumber = mobileNumber;
    patrol.locationId = locationId;
    patrol.locationCode = locationCodes;
    patrol.locationName = locationNames;
    patrol.imageUrl = imageUrl;
    patrol.department = department;
    patrol.designation = designation;
    patrol.modifiedDate = new Date();

    // ✅ Save
    await patrol.save();
        // ✅ Update all checklists assigned to this patrol
    await Checklist.updateMany(
      { assignedTo: userId },
      {
        $set: {
          locationId: locationId,
          locationCode: locationCodes,
            locationName: locationNames, 
          modifiedDate: new Date(), // optional
        },
      }
    );

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


