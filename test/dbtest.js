// test/dbtest.js
import sequelize from "../model/index.js";

(async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Connection successful!");
  } catch (err) {
    console.error("❌ Connection failed:", err.message);
  } finally {
    await sequelize.close();
  }
})();
