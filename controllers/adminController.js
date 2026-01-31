import axios from "axios";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Seller from "../model/seller.js";
import User from "../model/user.js";

// Create Chapa subaccount for Tellbirr
export const createChapaSubaccount = async (sellerData) => {
  try {
    const response = await axios.post(
      "https://api.chapa.co/v1/subaccount",
      {
        business_name: sellerData.businessName || sellerData.username,
        account_name: sellerData.firstName,
        bank_code: 855, // Tellbirr
        account_number: sellerData.phoneNumber,
        split_type: "percentage", // or "flat"
        split_value: 0.02, // 2% commission - adjust as needed
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.chapa_Secret_key}`,
          "Content-Type": "application/json",
        },
      }
    );

    return {
      success: true,
      subaccountId: response.data.data.subaccount_id,
      data: response.data.data,
    };
  } catch (error) {
    console.error("Chapa subaccount error:", error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message,
    };
  }
};

export const approveSeller = async (req, res) => {
  try {
    const { id } = req.params;
    const seller = await Seller.findByPk(id);
    if (!seller) return res.status(404).json({ message: "Seller not found" });

    // Create Chapa subaccount
    const chapaResult = await createChapaSubaccount({
      businessName: seller.businessName,
      username: seller.username,
      firstName: seller.firstName,
      phoneNumber: seller.phoneNumber,
    });

    if (!chapaResult.success) {
      return res.status(400).json({
        message: "Failed to create Chapa subaccount",
        error: chapaResult.error,
      });
    }

    seller.approved = true;
    await seller.save();

    const user = await User.findOne({ where: { email: seller.email } });
    if (user) {
      if (!user.role) user.role = "seller";
      user.chapaSubaccountId = chapaResult.subaccountId;
      await user.save();
    }

    return res.status(200).json({
      message: "Seller approved and subaccount created",
      seller: {
        id: seller.id,
        username: seller.username,
        email: seller.email,
        approved: seller.approved,
        chapaSubaccountId: user?.chapaSubaccountId,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error approving seller", error: err.message });
  }
};