import Buyer from "../model/buyer.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { sendMail, otpEmailTemplate } from "../utils/mailer.js";
import User from "../model/user.js"; // adjust path if needed


export const registerBuyer = async (req, res) => {
  try {
    const { firstName, lastName, username, email, phoneNumber, password } = req.body;

    const profilePicUrl = req.file ? req.file.path : null;

    if (!firstName || !lastName || !username || !email || !phoneNumber || !password)
      return res.status(400).json({ message: "All fields required" });
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser)
      return res.status(400).json({ message: "Username already exists" });

    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail)
      return res.status(400).json({ message: "Email already exists" });

    // 2️⃣ Create User for authentication
    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      id: userId,
      username,
      email,
      password: hashedPassword,
      role: "buyer",
      profilePic: profilePicUrl,      
    });

    // 3️⃣ Create Buyer profile linked to User
    const buyerId = uuidv4();
 const newBuyer = await Buyer.create({
  id: buyerId,
  firstName,
  lastName,
  phoneNumber,
  profilePic: profilePicUrl,
  userId: newUser.id,
  emailVerified: false,
  username,       
  email,
  password: hashedPassword
});


    // 4️⃣ Generate OTP for email verification
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpHash = await bcrypt.hash(otp, 10);
    newBuyer.emailOtpHash = otpHash;
    newBuyer.emailOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    newBuyer.emailOtpAttempts = 0;
    await newBuyer.save();

    const { text, html } = otpEmailTemplate({ name: newBuyer.firstName, otp });
    await sendMail({ to: newUser.email, subject: "Verify your email", text, html });

    // 5️⃣ Return response
    res.status(201).json({
      message: "Buyer registered. OTP sent to email for verification",
      buyer: {
        id: newBuyer.id,
        firstName: newBuyer.firstName,
        lastName: newBuyer.lastName,
        username: newUser.username,
        email: newUser.email,
        phoneNumber: newBuyer.phoneNumber,
        emailVerified: newBuyer.emailVerified,
        profilePic: newBuyer.profilePic
      }
    });

  } catch (err) {
    console.error("Error registering buyer:", err);
    res.status(500).json({ message: "Error registering buyer", error: err.message });
  }
};


export const verifyBuyerEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: "email and otp required" });

    const buyer = await Buyer.findOne({ where: { email } });
    if (!buyer) return res.status(404).json({ message: "Buyer not found" });
    if (buyer.emailVerified) return res.status(200).json({ message: "Email already verified" });
    if (!buyer.emailOtpHash || !buyer.emailOtpExpiresAt) return res.status(400).json({ message: "No OTP pending" });
    if (buyer.emailOtpAttempts >= 5) return res.status(429).json({ message: "Too many attempts. Request a new OTP" });
    if (new Date() > new Date(buyer.emailOtpExpiresAt)) return res.status(400).json({ message: "OTP expired" });

    const match = await bcrypt.compare(otp, buyer.emailOtpHash);
    if (!match) {
      buyer.emailOtpAttempts += 1;
      await buyer.save();
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // OTP is correct, verify email
    buyer.emailVerified = true;
    buyer.emailOtpHash = null;
    buyer.emailOtpExpiresAt = null;
    buyer.emailOtpAttempts = 0;
    await buyer.save({ validate: false });

    // Generate JWT
    const token = jwt.sign(
      { id: buyer.id, username: buyer.username },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      message: "Email verified successfully",
      token,
      buyer: {
        id: buyer.id,
        firstName: buyer.firstName,
        lastName: buyer.lastName,
        username: buyer.username,
        email: buyer.email,
        phoneNumber: buyer.phoneNumber,
        emailVerified: buyer.emailVerified,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error verifying email", error: err.message });
  }
};


export const resendBuyerOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "email required" });

    const buyer = await Buyer.findOne({ where: { email } });
    if (!buyer) return res.status(404).json({ message: "Buyer not found" });
    if (buyer.emailVerified) return res.status(200).json({ message: "Email already verified" });

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpHash = await bcrypt.hash(otp, 10);
    buyer.emailOtpHash = otpHash;
    buyer.emailOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    buyer.emailOtpAttempts = 0;
    await buyer.save();

    const { text, html } = otpEmailTemplate({ name: buyer.firstName, otp });
    await sendMail({ to: buyer.email, subject: "Your new verification code", text, html });

    return res.status(200).json({ message: "OTP resent" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error resending OTP", error: err.message });
  }
};

export const getBuyer = async (req, res) => {
  try {
    const { id } = req.params;
    const buyer = await Buyer.findByPk(id);
    if (!buyer) return res.status(404).json({ message: "Buyer not found" });
    return res.status(200).json({
      buyer: {
        id: buyer.id,
        firstName: buyer.firstName,
        lastName: buyer.lastName,
        username: buyer.username,
        email: buyer.email,
        phoneNumber: buyer.phoneNumber,
        emailVerified: buyer.emailVerified,
        createdAt: buyer.createdAt,
        updatedAt: buyer.updatedAt,
        profilePic: buyer.profilePic,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching buyer", error: err.message });
  }
};

export const updateBuyer = async (req, res) => {
  try {
    const { id } = req.params;
    const buyer = await Buyer.findByPk(id);
    if (!buyer) return res.status(404).json({ message: "Buyer not found" });

    const allowed = ["firstName", "lastName", "username", "email", "phoneNumber", "password", "profilePic"];
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        buyer[key] = req.body[key];
      }
    }

    await buyer.save();

    return res.status(200).json({
      message: "Buyer updated",
      buyer: {
        id: buyer.id,
        firstName: buyer.firstName,
        lastName: buyer.lastName,
        username: buyer.username,
        email: buyer.email,
        phoneNumber: buyer.phoneNumber,
        emailVerified: buyer.emailVerified,
        createdAt: buyer.createdAt,
        updatedAt: buyer.updatedAt,
        profilePic: buyer.profilePic,
      },
    });
  } catch (err) {
    // Handle unique constraint or other validation errors
    if (err.name === "SequelizeUniqueConstraintError") {
      const fields = err.errors?.map((e) => e.path) || [];
      if (fields.includes("username")) return res.status(400).json({ message: "Username already exists" });
      if (fields.includes("email")) return res.status(400).json({ message: "Email already exists" });
      if (fields.includes("phoneNumber")) return res.status(400).json({ message: "Phone number already exists" });
    }
    console.error(err);
    res.status(500).json({ message: "Error updating buyer", error: err.message });
  }
};

export const deleteBuyer = async (req, res) => {
  try {
    const { id } = req.params;
    const buyer = await Buyer.findByPk(id);
    if (!buyer) return res.status(404).json({ message: "Buyer not found" });
    await buyer.destroy();
    return res.status(200).json({ message: "Buyer deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error deleting buyer", error: err.message });
  }
};

export const listBuyers = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "20", 10), 1), 100);
    const offset = (page - 1) * limit;

    const { rows, count } = await Buyer.findAndCountAll({
      offset,
      limit,
      order: [["createdAt", "DESC"]],
      attributes: [
        "id",
        "firstName",
        "lastName",
        "username",
        "email",
        "phoneNumber",
        "emailVerified",
        "createdAt",
        "updatedAt",
        "profilePic"
      ],
    });

    return res.status(200).json({
      total: count,
      page,
      limit,
      buyers: rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error listing buyers", error: err.message });
  }
};
