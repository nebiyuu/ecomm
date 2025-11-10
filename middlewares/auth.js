import jwt from "jsonwebtoken";
import Buyer from "../model/buyer.js";

export const requireAuth = (req, res, next) => {
  try {
    const header = req.headers["authorization"] || "";
    const [, token] = header.split(" ");
    if (!token) return res.status(401).json({ message: "Unauthorized" });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized" });
  }
};

export const requireSameBuyer = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (req.user.role === "admin") return next();
    const buyer = await Buyer.findByPk(id);
    if (!buyer) return res.status(404).json({ message: "Buyer not found" });
    const same = (req.user.email && req.user.email === buyer.email) || (req.user.username && req.user.username === buyer.username) || (req.user.id && String(req.user.id) === String(buyer.id));
    if (!same) return res.status(403).json({ message: "Forbidden" });
    next();
  } catch (err) {
    return res.status(403).json({ message: "Forbidden" });
  }
};
