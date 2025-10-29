import bcrypt from "bcrypt";
import Seller from "../model/seller.js";
import User from "../model/user.js";



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
    });

    res.status(201).json({
      message: "Seller registered successfully",
      seller: {
        id: newSeller.id,
        firstName: newSeller.firstName,
        lastName: newSeller.lastName,
        username: newSeller.username,
        email: newSeller.email,
        address: newSeller.address,
        approved: newSeller.approved,
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
