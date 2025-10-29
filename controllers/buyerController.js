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


