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
