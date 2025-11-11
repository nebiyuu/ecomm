import bcrypt from "bcrypt";
import Seller from "../model/seller.js";
import User from "../model/user.js";
import jwt from "jsonwebtoken";
import { sendMail, otpEmailTemplate } from "../utils/mailer.js";



export const registerSeller = async (req, res) => {
  try {
    const { firstName, lastName, username, email, password, address, license } = req.body;

    if (!firstName || !lastName || !username || !email || !password || !address || !license)
      return res.status(400).json({ message: "All fields required" });

    const existingSeller = await Seller.findOne({ where: { username } });
    if (existingSeller)
      return res.status(400).json({ message: "Username already taken" });

    const newSeller = await Seller.create({
      firstName,
      lastName,
      username,
      email,
      password,
      address,
      license,
      emailVerified: false,
    });

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpHash = await bcrypt.hash(otp, 10);
    newSeller.emailOtpHash = otpHash;
    newSeller.emailOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    newSeller.emailOtpAttempts = 0;
    await newSeller.save();

    const { text, html } = otpEmailTemplate({ name: newSeller.firstName, otp });
    await sendMail({ to: newSeller.email, subject: "Verify your email", text, html });

    res.status(201).json({
      message: "Seller registered. OTP sent to email for verification",
      seller: {
        id: newSeller.id,
        firstName: newSeller.firstName,
        lastName: newSeller.lastName,
        username: newSeller.username,
        email: newSeller.email,
        address: newSeller.address,
        approved: newSeller.approved,
        emailVerified: newSeller.emailVerified,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error registering seller", error: error.message });
  }
};


export const loginSeller = async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log("Login attempt for :", username);

    // find seller by username
    const seller = await Seller.findOne({ where: { username } });

    if (!seller)
      return res.status(400).json({ message: "Invalid username " });

    
    console.log("Login password:", `"${password}"`);
    console.log("Stored hash:", seller.password);



    // compare passwords
    const isMatch = await bcrypt.compare(password, seller.password);
    console.log("Password match:", isMatch);
    if (!isMatch)

      return res.status(400).json({ message: "Invalid username or password" });

    // check if email verified
    if (!seller.emailVerified)
      return res.status(403).json({ message: "Email not verified" });

    // check if seller is approved
    if (!seller.approved)
      return res.status(403).json({ message: "Seller not approved yet" });

    res.status(200).json({
      message: "Seller logged in successfully",
      seller: {
        id: seller.id,
        name: seller.name,
        email: seller.email,
        username: seller.username,
        approved: seller.approved,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error logging in seller" });
  }
};

export const verifySellerEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: "email and otp required" });

    const seller = await Seller.findOne({ where: { email } });
    if (!seller) return res.status(404).json({ message: "Seller not found" });
    if (seller.emailVerified) return res.status(200).json({ message: "Email already verified" });
    if (!seller.emailOtpHash || !seller.emailOtpExpiresAt) return res.status(400).json({ message: "No OTP pending" });
    if (seller.emailOtpAttempts >= 5) return res.status(429).json({ message: "Too many attempts. Request a new OTP" });
    if (new Date() > new Date(seller.emailOtpExpiresAt)) return res.status(400).json({ message: "OTP expired" });

    const match = await bcrypt.compare(otp, seller.emailOtpHash);
    if (!match) {
      seller.emailOtpAttempts += 1;
      await seller.save();
      return res.status(400).json({ message: "Invalid OTP" });
    }

    seller.emailVerified = true;
    seller.emailOtpHash = null;
    seller.emailOtpExpiresAt = null;
    seller.emailOtpAttempts = 0;
    await seller.save({ validate: false });

    const token = jwt.sign(
      { id: seller.id, username: seller.username },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      message: "Email verified successfully",
      token,
      seller: {
        id: seller.id,
        firstName: seller.firstName,
        lastName: seller.lastName,
        username: seller.username,
        email: seller.email,
        approved: seller.approved,
        emailVerified: seller.emailVerified,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error verifying email", error: err.message });
  }
};

export const resendSellerOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "email required" });

    const seller = await Seller.findOne({ where: { email } });
    if (!seller) return res.status(404).json({ message: "Seller not found" });
    if (seller.emailVerified) return res.status(200).json({ message: "Email already verified" });

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpHash = await bcrypt.hash(otp, 10);
    seller.emailOtpHash = otpHash;
    seller.emailOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    seller.emailOtpAttempts = 0;
    await seller.save();

    const { text, html } = otpEmailTemplate({ name: seller.firstName, otp });
    await sendMail({ to: seller.email, subject: "Your new verification code", text, html });

    return res.status(200).json({ message: "OTP resent" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error resending OTP", error: err.message });
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
