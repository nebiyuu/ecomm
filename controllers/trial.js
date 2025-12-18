import TrailPolicy from "../model/trailPolicies.js";
import Product from "../model/product.js";
import { validationResult } from "express-validator";

const trialController = {
  // Create trial policy for a product
  async createTrialPolicy(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { trial_days, penalty_value, return_window_hours } = req.body;

      // Check if product exists
      const product = await Product.findByPk(id);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      // Check if trial policy already exists for this product
      const existingPolicy = await TrailPolicy.findOne({
        where: { product_id: id, active: true }
      });

      if (existingPolicy) {
        return res.status(400).json({ error: "Trial policy already exists for this product" });
      }

      // Create new trial policy
      const trialPolicy = await TrailPolicy.create({
        product_id: id,
        trial_days,
        penalty_value,
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
  },

  // Update existing trial policy
  async updateTrialPolicy(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { trial_days, penalty_value, return_window_hours } = req.body;

      // Find existing trial policy
      const trialPolicy = await TrailPolicy.findOne({
        where: { product_id: id, active: true }
      });

      if (!trialPolicy) {
        return res.status(404).json({ error: "Trial policy not found for this product" });
      }

      // Update trial policy
      await trialPolicy.update({
        trial_days: trial_days || trialPolicy.trial_days,
        penalty_value: penalty_value || trialPolicy.penalty_value,
        return_window_hours: return_window_hours || trialPolicy.return_window_hours
      });

      res.status(200).json({
        message: "Trial policy updated successfully",
        trialPolicy
      });
    } catch (error) {
      console.error("Error updating trial policy:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Soft delete/disable trial policy
  async deleteTrialPolicy(req, res) {
    try {
      const { id } = req.params;

      // Find existing trial policy
      const trialPolicy = await TrailPolicy.findOne({
        where: { product_id: id, active: true }
      });

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
  },

  // Get trial policy for a product
  async getTrialPolicy(req, res) {
    try {
      const { id } = req.params;

      // Find active trial policy
      const trialPolicy = await TrailPolicy.findOne({
        where: { product_id: id, active: true }
      });

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
  }
};

export default trialController;