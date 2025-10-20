import Buyer from "../model/buyer.js";

export const registerBuyer = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password)
      return res.status(400).json({ message: "All fields required" });

    const buyer = await Buyer.create({ username, email, password });

    res.status(201).json({
      message: "Buyer registered successfully",
      buyer: {
        id: buyer.id,
        username: buyer.username,
        email: buyer.email,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error registering buyer", error: err.message });
  }
};
