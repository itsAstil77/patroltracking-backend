const express = require("express");
const bcrypt = require("bcryptjs");
const Signup = require("../models/signup");
const Master = require("../models/company");
const Location = require('../models/locationCodeMaster');


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


router.get("/users", async (req, res) => {
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

router.get("/non-admin", async (req, res) => {
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
router.get("/:userId", async (req, res) => {
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

// router.get("/patrol", async (req, res) => {
//     try {
//         // First find the role document for 'Patrol' dynamically
//         const roleDoc = await Role.findOne({ roleName: "Patrol", isActive: true });
//         if (!roleDoc) {
//             return res.status(404).json({ message: "Patrol role not found" });
//         }

//         // Use the roleName from the Role document to query Signup
//         const users = await Signup.find({ role: roleDoc.roleName }).select("-password");

//         if (users.length === 0) {
//             return res.status(404).json({ message: "No patrol users found" });
//         }

//         res.status(200).json({
//             message: "Patrol users retrieved successfully",
//             users
//         });
//     } catch (error) {
//         console.error("❌ Error fetching patrol users:", error);
//         res.status(500).json({ message: "Error fetching users", error: error.message });
//     }
// });


// ✅ Delete a patrol by patrolId
router.delete("/:userId", async (req, res) => {
    try {
        const { userId } = req.params;

        // ✅ Check if patrol exists
        const patrol = await Signup.findOne({ userId: userId});

        if (!patrol) {
            return res.status(404).json({ message: " not found" });
        }

        // ✅ Delete the patrol
        await Signup.deleteOne({ userId });

        res.status(200).json({
            message: " deleted successfully"
        });
    } catch (error) {
        console.error("❌ Error deleting patrol:", error);
        res.status(500).json({ message: "Error deleting patrol", error: error.message });
    }
});



// ✅ Update patrol details by patrolId
router.put("/:userId", async (req, res) => {
    try {
        const { userId } = req.params;
        const { username, password, email, patrolGuardName, mobileNumber,locationName, imageUrl, roleId, department, designation} = req.body;

        // ✅ Validate required fields
        if (!username || !password || !email || !patrolGuardName || !locationName || !mobileNumber  || !roleId || !department || !designation) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // // ✅ Check if companyCode exists in Master collection
        // const company = await Master.findOne({ companyCode });
        // if (!company) {
        //     return res.status(400).json({ message: "Invalid company code. Please provide a valid company code." });
        // }

        // ✅ Check if patrol exists
        const patrol = await Signup.findOne({ userId });

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
        // ✅ Check if locationName exists in Location collection
        const location = await Location.findOne({ description:locationName });
        if (!location) {
            return res.status(400).json({ message: "Invalid location name. Please provide a valid location." });
        }
          // ✅ Validate roleId
          const roleDoc = await Role.findOne({ roleId, isActive: true });
          if (!roleDoc) {
              return res.status(400).json({ message: "Invalid roleId. Please provide a valid role." });
          }
  
          const roleName = roleDoc.roleName;


        // ✅ Hash Password before updating
        const hashedPassword = await bcrypt.hash(password, 10);

        // ✅ Update patrol details
        patrol.username = username;
        patrol.password = hashedPassword;
        patrol.email = email;
        patrol.patrolGuardName = patrolGuardName;
        patrol.mobileNumber = mobileNumber;
        patrol.locationName = locationName;
        // patrol.companyCode = companyCode;
        patrol.department = department;
        patrol.designation = designation ;
        patrol.imageUrl = imageUrl;
        patrol.roleId = roleId;
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




module.exports = router;


