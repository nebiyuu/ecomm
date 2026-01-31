import bcrypt from "bcrypt";
import Seller from "../model/seller.js";
import User from "../model/user.js";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { sendMail, otpEmailTemplate } from "../utils/mailer.js";



export const registerSeller = async (req, res) => {
  const { firstName, lastName, username, email, password, address, phoneNumber, storeName } = req.body;

  try {
    // 1. Immediate Validation
    if (!req.files?.license || !req.files?.profilePic) {
      return res.status(400).json({ message: "License and Profile images are required" });
    }

    const licenseUrl = req.files.license[0].path;
    const profilePicUrl = req.files.profilePic[0].path;

    // 2. Check existence early
    const existingUser = await User.findOne({ where: { email } }); // Better to check email too
    if (existingUser) return res.status(400).json({ message: "User already exists" });

    // 3. Heavy lifting (Hashing)
    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpHash = await bcrypt.hash(otp, 10);

    // 4. Database Operations
    const userId = uuidv4();
    const newUser = await User.create({
      id: userId,
      username,
      email,
      password: hashedPassword,
      role: "seller",
      profilePic: profilePicUrl,
    });

    const newSeller = await Seller.create({
      id: uuidv4(),
      firstName,
      lastName,
      phoneNumber,
      storeName,
      username,
      email,
      password: hashedPassword, // Note: Usually, you don't need the password in BOTH tables
      address,
      license: licenseUrl,
      role: "seller",
      userId: newUser.id,
      emailVerified: false,
      profilePic: profilePicUrl,
      emailOtpHash: otpHash,
      emailOtpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      emailOtpAttempts: 0
    });

    // 5. Fire and Forget Email (Don't 'await' this)
    const { text, html } = otpEmailTemplate({ name: firstName, otp });
    sendMail({ to: email, subject: "Verify your email", text, html })
      .catch(err => console.error("Background Email Error:", err));

    // 6. Respond immediately
    return res.status(201).json({
      message: "Seller registered. OTP sent to email.",
      sellerId: newSeller.id
    });

  } catch (error) {
    console.error("Registration Error:", error);
    return res.status(500).json({ message: "Error registering seller" });
  }
};



// READ - Get all sellers
export const getAllSellers = async (req, res) => {
  try {
    const sellers = await Seller.findAll({
      attributes: { exclude: ['password', 'emailOtpHash'] }
    });
    
    res.status(200).json({
      message: "Sellers retrieved successfully",
      sellers
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error retrieving sellers", error: error.message });
  }
};

// READ - Get seller by ID
export const getSellerById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const seller = await Seller.findByPk(id, {
      attributes: { exclude: ['password', 'emailOtpHash'] }
    });
    
    if (!seller) {
      return res.status(404).json({ message: "Seller not found" });
    }
    
    res.status(200).json({
      message: "Seller retrieved successfully",
      seller
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error retrieving seller", error: error.message });
  }
};

// UPDATE - Update seller
export const updateSeller = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, address, license, approved } = req.body;
    
    const seller = await Seller.findByPk(id);
    if (!seller) {
      return res.status(404).json({ message: "Seller not found" });
    }
    
    // Update fields if provided
    if (firstName !== undefined) seller.firstName = firstName;
    if (lastName !== undefined) seller.lastName = lastName;
    if (email !== undefined) seller.email = email;
    if (address !== undefined) seller.address = address;
    if (license !== undefined) seller.license = license;
    if (approved !== undefined) seller.approved = approved;
    
    await seller.save();
    
    // Update corresponding user record if email or approval status changed
    if (email !== undefined || approved !== undefined) {
      await User.update(
        { 
          ...(email && { email }),
          ...(approved !== undefined && { approved })
        },
        { where: { username: seller.username } }
      );
    }
    
    res.status(200).json({
      message: "Seller updated successfully",
      seller: {
        id: seller.id,
        firstName: seller.firstName,
        lastName: seller.lastName,
        username: seller.username,
        email: seller.email,
        address: seller.address,
        license: seller.license,
        approved: seller.approved,
        emailVerified: seller.emailVerified
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating seller", error: error.message });
  }
};

// DELETE - Delete seller
export const deleteSeller = async (req, res) => {
  try {
    const { id } = req.params;
    
    const seller = await Seller.findByPk(id);
    if (!seller) {
      return res.status(404).json({ message: "Seller not found" });
    }
    
    // Delete corresponding user record first
    await User.destroy({ where: { username: seller.username } });
    
    // Delete seller
    await seller.destroy();
    
    res.status(200).json({
      message: "Seller deleted successfully"
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error deleting seller", error: error.message });
  }
};
