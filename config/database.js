import { Sequelize } from "sequelize";
require("dotenv").config(); // fixed dotenv import

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: "postgres",
    logging: false, // set to console.log to debug SQL
  }
);

export default sequelize; // fixed export
