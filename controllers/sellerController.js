import bcrypt from "bcrypt";
import Seller from "../model/seller.js";
import User from "../model/user.js";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { sendMail, otpEmailTemplate } from "../utils/mailer.js";



export const registerSeller = async (req, res) => {
  
  const { firstName, lastName, username, email, password, address } = req.body;

  try {

    if (!req.file)
      return res.status(400).json({ message: "License image required" });

    if (!req.file2)
      return res.status(400).json({ message: "Profile image required" });

    const licenseUrl = req.file.path;

    console.log("License URL:", licenseUrl);

    // Check if username/email already exists in Users
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser)
      return res.status(400).json({ message: "Username already taken" });

    // 1️⃣ Create User first
    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      id: userId,
      username,
      email,
      password: hashedPassword,
      role: "seller",
      profilePic: req.file2.path,
    });

    // 2️⃣ Create Seller profile linked to User
    const sellerId = uuidv4();
    const newSeller = await Seller.create({
      id: sellerId,
      firstName,
      lastName,
      address,
      license: licenseUrl,
      userId: newUser.id, // Link to User
      emailVerified: false,
    });

    // 3️⃣ Generate OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpHash = await bcrypt.hash(otp, 10);
    newSeller.emailOtpHash = otpHash;
    newSeller.emailOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    newSeller.emailOtpAttempts = 0;
    await newSeller.save();

    const { text, html } = otpEmailTemplate({ name: newSeller.firstName, otp });
    await sendMail({ to: newUser.email, subject: "Verify your email", text, html });

    res.status(201).json({
      message: "Seller registered. OTP sent to email for verification",
      seller: {
        id: newSeller.id,
        firstName: newSeller.firstName,
        lastName: newSeller.lastName,
        username: newUser.username,
        email: newUser.email,
        address: newSeller.address,
        approved: newSeller.approved,
        emailVerified: newSeller.emailVerified,
        profilePic: newUser.profilePic,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error registering seller", error: error.message });
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
