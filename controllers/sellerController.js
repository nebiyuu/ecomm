import bcrypt from "bcrypt";
import Seller from "../model/seller.js";
import User from "../model/user.js";

export const registerSeller = async (req, res) => {
  try {
    const { name, username,email,password, license } = req.body;
    console.log("got name :",name)

    // check if seller exists
    const existingSeller = await Seller.findOne({ where: { username } });
    if (existingSeller)
      return res.status(400).json({ message: "Username already taken" });

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // create seller record
    const newSeller = await Seller.create({
      name,
      username,
      password: hashedPassword,
      license,
      email,
    });

    console.log("New seller created:", newSeller);


    res.status(201).json({
      message: "Seller registered successfully",
      seller: {
        id: newSeller.id,
        name: newSeller.name,
        email:newSeller.email,
        username: newSeller.username,
        approved: newSeller.approved,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error registering seller" });
  }
};
