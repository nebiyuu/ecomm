import Buyer from "../model/buyer.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export const registerBuyer = async (req, res) => {
  try {
    const { firstName, lastName, username, email, phoneNumber, password } = req.body;

    if (!firstName || !lastName || !username || !email || !phoneNumber || !password)
      return res.status(400).json({ message: "All fields required" });

    const buyer = await Buyer.create({ firstName, lastName, username, email, phoneNumber, password });

    res.status(201).json({
      message: "Buyer registered successfully",
      buyer: {
        id: buyer.id,
        firstName: buyer.firstName,
        lastName: buyer.lastName,
        username: buyer.username,
        email: buyer.email,
        phoneNumber: buyer.phoneNumber,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error registering buyer", error: err.message });
  }
};


export const loginBuyer = async (req, res) => {
  const { username, password } = req.body;

  try {
    // 1. Find buyer
    const buyer = await Buyer.findOne({ where: { username } });
    if (!buyer) return res.status(400).json({ message: "Invalid credentials" });

    // 2. Check password
    const isMatch = await bcrypt.compare(password, buyer.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    // 3. Create JWT
    const token = jwt.sign(
      { id: buyer.id, username: buyer.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // 4. Send token
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
