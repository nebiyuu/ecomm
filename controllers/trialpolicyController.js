import TrailPolicy from "../model/trailPolicies.js";
import Product from "../model/product.js";
import { validationResult } from "express-validator";


// Helper function to check if product existss
const checkProductExists = async (productId) => {
  const product = await Product.findByPk(productId);
  if (!product) {
    return { success: false, error: "Product not found" };
  }
  return { success: true, product };
};

// Helper function to find active trial policy
const findActiveTrialPolicy = async (productId) => {
  const trialPolicy = await TrailPolicy.findOne({
    where: { product_id: productId}
  });
  return trialPolicy;
};

// Create trial policy for a product
export const createTrialPolicy = async (req, res) => {
  try {
    const validation = validationResult(req);
    if (!validation.isEmpty()) {
      return res.status(400).json({ errors: validation.array() });
    }

    const { id } = req.params;
    const { trial_days, return_window_hours } = req.body;

    // Check if product exists
    const productCheck = await checkProductExists(id);
    if (!productCheck.success) {
      return res.status(404).json({ error: productCheck.error });
    }

    // Check if trial policy already exists for this product
    const existingPolicy = await findActiveTrialPolicy(id);
    if (existingPolicy) {
      return res.status(400).json({ error: "Trial policy already exists for this product" });
    }

    // Create new trial policy
    const trialPolicy = await TrailPolicy.create({
      product_id: id,
      trial_days,
      return_window_hours,
      active: true
    });

    res.status(201).json({
      message: "Trial policy created successfully",
      trialPolicy
    });
  } catch (error) {
    console.error("Error creating trial policy:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Update existing trial policy
export const updateTrialPolicy = async (req, res) => {
  try {

    const { id } = req.params;
    const { trial_days, return_window_hours } = req.body || {};

    //print the req
      console.log(req.body);

    // Find existing trial policy
    const trialPolicy = await findActiveTrialPolicy(id);
    if (!trialPolicy) {
      return res.status(404).json({ error: "Trial policy not found for this product" });
    }
    if (trialPolicy.active === true) {
      return res.status(409).json({
        error: "Active trial policy cannot be updated"
        });
    }

    // Update trial policy
await trialPolicy.update({
  trial_days: trial_days ?? trialPolicy.trial_days,
  return_window_hours: return_window_hours ?? trialPolicy.return_window_hours
});


    res.status(200).json({
      message: "Trial policy updated successfully",
      trialPolicy
    });
  } catch (error) {
    console.error("Error updating trial policy:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Soft delete/disable trial policy
export const deleteTrialPolicy = async (req, res) => {
  try {
    const { id } = req.params;

    if (trialPolicy.active === true) {
  return res.status(409).json({
    error: "Active trial policy cannot be updated"
  });
}

    // Find existing trial policy
    const trialPolicy = await findActiveTrialPolicy(id);
    if (!trialPolicy) {
      return res.status(404).json({ error: "Trial policy not found for this product" });
    }

    // Soft delete by setting active to false
    await trialPolicy.update({ active: false });

    res.status(200).json({
      message: "Trial policy disabled successfully"
    });
  } catch (error) {
    console.error("Error deleting trial policy:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get trial policy for a product
export const getTrialPolicy = async (req, res) => {
  try {
    const { id } = req.params;

    // Find active trial policy
    const trialPolicy = await findActiveTrialPolicy(id);
    if (!trialPolicy) {
      return res.status(404).json({ error: "Trial policy not found for this product" });
    }

    res.status(200).json({
      trialPolicy
    });
  } catch (error) {
    console.error("Error getting trial policy:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};