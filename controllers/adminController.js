import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Seller from "../model/seller.js";
import User from "../model/user.js";

export const approveSeller = async (req, res) => {
  try {
    const { id } = req.params;
    const seller = await Seller.findByPk(id);
    if (!seller) return res.status(404).json({ message: "Seller not found" });

    seller.approved = true;
    await seller.save();

    // Optionally reflect in matching user record if present
    const user = await User.findOne({ where: { email: seller.email } });
    if (user) {
      if (!user.role) user.role = "seller";
      await user.save();
    }

    return res.status(200).json({
      message: "Seller approved",
      seller: { id: seller.id, username: seller.username, email: seller.email, approved: seller.approved },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error approving seller", error: err.message });
  }
};

export const loginAdmin = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: "All fields required" });

    const user = await User.findOne({ where: { username } }) || await User.findOne({ where: { email: username } });
    if (!user || user.role !== "admin") return res.status(403).json({ message: "Forbidden" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: "Invalid password" });

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1d" });

    return res.status(200).json({
      message: "Admin login successful",
      token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error logging in admin", error: err.message });
  }
};
