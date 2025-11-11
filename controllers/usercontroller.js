import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import User from "../model/user.js";
import Buyer from "../model/buyer.js";
import Seller from "../model/seller.js";
import { sendMail, otpEmailTemplate } from "../utils/mailer.js";

export const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password)
      return res.status(400).json({ message: "All fields required" });

    // find user by username or email
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { username: username },
          { email: username }
        ]
      }
    });

    if (!user) return res.status(404).json({ message: "User not found" });

    const validPass = await bcrypt.compare(password, user.password);
    if (!validPass) return res.status(401).json({ message: "Invalid password" });

    // enforce email verification and approval based on role
    if (user.role === "buyer") {
      const buyer = await Buyer.findOne({ where: { email: user.email } });
      if (!buyer || !buyer.emailVerified)
        return res.status(403).json({ message: "Email not verified" });
    } else if (user.role === "seller") {
      const seller = await Seller.findOne({ where: { email: user.email } });
      if (!seller) return res.status(404).json({ message: "Seller profile not found" });
      if (!seller.emailVerified)
        return res.status(403).json({ message: "Email not verified" });
      if (!seller.approved)
        return res.status(403).json({ message: "Seller not approved yet" });
    } else if (user.role === "admin") {
      // no additional checks
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error logging in", error: err.message });
  }
};

export const sendUserOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "email required" });

    // prefer buyer match, else seller match
    let entity = await Buyer.findOne({ where: { email } });
    let role = "buyer";
    if (!entity) {
      entity = await Seller.findOne({ where: { email } });
      role = "seller";
    }
    if (!entity) return res.status(404).json({ message: "Account not found" });
    if (entity.emailVerified) return res.status(200).json({ message: "Email already verified" });

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpHash = await bcrypt.hash(otp, 10);
    entity.emailOtpHash = otpHash;
    entity.emailOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    entity.emailOtpAttempts = 0;
    await entity.save();

    const name = entity.firstName || entity.username || "User";
    const { text, html } = otpEmailTemplate({ name, otp });
    await sendMail({ to: entity.email, subject: "Verify your email", text, html });

    return res.status(200).json({ message: `OTP sent to ${role} email` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error sending OTP", error: err.message });
  }
};

export const verifyUserEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: "email and otp required" });

    let entity = await Buyer.findOne({ where: { email } });
    let role = "buyer";
    if (!entity) {
      entity = await Seller.findOne({ where: { email } });
      role = "seller";
    }
    if (!entity) return res.status(404).json({ message: "Account not found" });
    if (entity.emailVerified) return res.status(200).json({ message: "Email already verified" });
    if (!entity.emailOtpHash || !entity.emailOtpExpiresAt) return res.status(400).json({ message: "No OTP pending" });
    if (entity.emailOtpAttempts >= 5) return res.status(429).json({ message: "Too many attempts. Request a new OTP" });
    if (new Date() > new Date(entity.emailOtpExpiresAt)) return res.status(400).json({ message: "OTP expired" });

    const match = await bcrypt.compare(otp, entity.emailOtpHash);
    if (!match) {
      entity.emailOtpAttempts += 1;
      await entity.save();
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // mark verified
    entity.emailVerified = true;
    entity.emailOtpHash = null;
    entity.emailOtpExpiresAt = null;
    entity.emailOtpAttempts = 0;
    await entity.save({ validate: false });

    // ensure a corresponding User exists with proper role
    let user = await User.findOne({ where: { email } });
    if (!user) {
      user = await User.create({
        username: entity.username,
        email: entity.email,
        password: entity.password, // already hashed in hooks
        role,
      });
    } else if (!user.role) {
      user.role = role;
      await user.save();
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      message: "Email verified successfully",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error verifying email", error: err.message });
  }
};

export const resendUserOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "email required" });

    let entity = await Buyer.findOne({ where: { email } });
    let role = "buyer";
    if (!entity) {
      entity = await Seller.findOne({ where: { email } });
      role = "seller";
    }
    if (!entity) return res.status(404).json({ message: "Account not found" });
    if (entity.emailVerified) return res.status(200).json({ message: "Email already verified" });

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpHash = await bcrypt.hash(otp, 10);
    entity.emailOtpHash = otpHash;
    entity.emailOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    entity.emailOtpAttempts = 0;
    await entity.save();

    const name = entity.firstName || entity.username || "User";
    const { text, html } = otpEmailTemplate({ name, otp });
    await sendMail({ to: entity.email, subject: "Your new verification code", text, html });

    return res.status(200).json({ message: `OTP resent to ${role} email` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error resending OTP", error: err.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // authZ: only the same user or an admin can delete
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const isSelf = String(req.user.id) === String(user.id);
    const isAdmin = req.user.role === "admin";
    if (!isSelf && !isAdmin) return res.status(403).json({ message: "Forbidden" });

    // Best-effort cleanup from domain tables by email/username
    const whereEmail = { where: { email: user.email } };
    const whereUsername = { where: { username: user.username } };

    // Try delete seller records
    const sellerByEmail = await Seller.findOne(whereEmail);
    if (sellerByEmail) await sellerByEmail.destroy();
    else {
      const sellerByUsername = await Seller.findOne(whereUsername);
      if (sellerByUsername) await sellerByUsername.destroy();
    }

    // Try delete buyer records
    const buyerByEmail = await Buyer.findOne(whereEmail);
    if (buyerByEmail) await buyerByEmail.destroy();
    else {
      const buyerByUsername = await Buyer.findOne(whereUsername);
      if (buyerByUsername) await buyerByUsername.destroy();
    }

    // Finally delete the user record
    await user.destroy();

    return res.status(200).json({ message: "User and related records deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error deleting user", error: err.message });
  }
};
