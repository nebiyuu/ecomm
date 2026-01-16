import Product from "../model/product.js";
import sequelize from "../model/index.js";

async function testCreateProduct() {
  try {
    await sequelize.sync({ alter: true });
    console.log("✅ Tables synced successfully");

    const newProduct = await Product.create({
      name: "iPhone 15 Pro",
      description: "Latest Apple iPhone with A17 Pro chip, 48MP camera",
      category: "Electronics",
      condition: "new",
      price: 999.99,
      images: ["https://example.com/iphone1.jpg", "https://example.com/iphone2.jpg"],
      ownerId: "e9bd44b5-50bb-41e9-9448-ec99726501f0",
    });

    console.log("✅ Product created:", {
      id: newProduct.id,
      name: newProduct.name,
      price: newProduct.price,
      category: newProduct.category,
      ownerId: newProduct.ownerId,
    });

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await sequelize.close();
  }
}

testCreateProduct();
