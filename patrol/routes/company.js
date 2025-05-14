const express = require("express");
const Master = require("../models/company"); // ✅ Import the model

const router = express.Router();

/** ✅ Generate Next Company Code */
const generateCompanyCode = async () => {
    const lastCompany = await Master.findOne().sort({ createdDate: -1 }); // Get latest entry
    if (!lastCompany || !lastCompany.companyCode) return "CMP001"; // First company

    const lastNumber = parseInt(lastCompany.companyCode.replace("CMP", ""), 10) || 0;
    const nextNumber = (lastNumber + 1).toString().padStart(3, "0"); // Format to 3 digits
    return `CMP${nextNumber}`;
};

/** ✅ Add a New Company (Prevent Duplicates) */
router.post("/", async (req, res) => {
    try {
        const { companyName, companyLocation } = req.body;

        // ✅ Check if a company with the same Name & Location already exists
        const existingCompany = await Master.findOne({ companyName, companyLocation });
        if (existingCompany) {
            return res.status(400).json({ message: "Company with the same name and location already exists" });
        }

        // ✅ Generate unique companyCode
        const companyCode = await generateCompanyCode();

        const newCompany = new Master({
            companyCode,
            ...req.body,
            createdDate: new Date(),
            modifiedDate: new Date(),
            isActive: true
        });

        await newCompany.save();
        res.status(201).json({ message: "Company added successfully", data: newCompany });
    } catch (error) {
        res.status(500).json({ message: "Error adding company", error });
    }
});

module.exports = router;
