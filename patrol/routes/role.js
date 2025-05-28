const express = require("express");
const router = express.Router();
const Role = require("../models/role");
const Signup = require("../models/signup");

// Function to generate roleId like ROL001, ROL002...
async function generateRoleId() {
    const lastRole = await Role.findOne().sort({ roleId: -1 });
    if (!lastRole) return "ROL001";

    const lastNum = parseInt(lastRole.roleId.replace("ROL", "")) || 0;
    const newNum = lastNum + 1;
    return `ROL${String(newNum).padStart(3, '0')}`;
}

// POST /roles — Create new role
router.post("/", async (req, res) => {
    try {
        const { roleName, description } = req.body;

        if (!roleName) {
            return res.status(400).json({ message: "roleName is required" });
        }

        // Check for duplicate role name
        const existing = await Role.findOne({ roleName });
        if (existing) {
            return res.status(409).json({ message: "Role already exists" });
        }

        const roleId = await generateRoleId();

        const newRole = new Role({
            roleId,
            roleName,
            description
        });

        await newRole.save();

        return res.status(201).json({ message: "Role created", role: newRole });

    } catch (error) {
        console.error("Error creating role:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});


// GET /roles - List all roles (optional ?active=true/false)
router.get("/", async (req, res) => {
    try {
      const { active } = req.query;
      let filter = {};
      if (active === "true") filter.isActive = true;
      else if (active === "false") filter.isActive = false;
  
      const roles = await Role.find(filter).sort({ roleId: 1 });
      return res.json({ success: true, count: roles.length, roles });
    } catch (error) {
      console.error("Error fetching roles:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
// PUT /roles/:roleId - Update role by roleId (roleName can be updated without validation)
router.put("/:roleId", async (req, res) => {
  try {
    const { roleId } = req.params;
    const { roleName, description, isActive } = req.body;

    const role = await Role.findOne({ roleId });
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    // Allow roleName update without checking for duplicates
    if (roleName !== undefined) role.roleName = roleName;
    if (description !== undefined) role.description = description;
    if (isActive !== undefined) role.isActive = isActive;

    role.modifiedDate = new Date();

    await role.save();

    return res.json({ message: "Role updated successfully", role });
  } catch (error) {
    console.error("Error updating role:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

  
// DELETE /roles/:roleId - Hard delete only if not assigned to any user
router.delete("/:roleId", async (req, res) => {
  try {
    const { roleId } = req.params;

    // 1. Find role by roleId
    const role = await Role.findOne({ roleId });
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    // 2. Check if any user has this role assigned
    const isAssigned = await Signup.exists({ role: role.roleName });
    if (isAssigned) {
      return res.status(400).json({
        message: "Cannot delete role: It is assigned to one or more users"
      });
    }

    // 3. Hard delete the role
    await Role.deleteOne({ roleId });

    return res.json({ message: "Role permanently deleted" });
  } catch (error) {
    console.error("❌ Error deleting role:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
});


module.exports = router;
