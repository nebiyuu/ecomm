import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import path from "path";

const API_URL = "http://localhost:5000/api/seller/register";

async function run() {
  try {
    const form = new FormData();

    // Text fields
    form.append("firstName", "Dev");
    form.append("lastName", "Seller");
    form.append("username", "devseller1");
    form.append("email", "devseller1@test.com");
    form.append("password", "12345678");
    form.append("address", "Addis Ababa");
    form.append("phoneNumber", "0912345678");
    form.append("storeName", "Dev Store");

    // Files (make sure these exist)
    form.append(
      "license",
      fs.createReadStream(path.resolve("uploads/dev/license.jpg"))
    );
    form.append(
      "profilePic",
      fs.createReadStream(path.resolve("uploads/dev/profile.jpg"))
    );

    const res = await axios.post(API_URL, form, {
      headers: {
        ...form.getHeaders(),
      },
    });

    console.log("✅ Response:", res.data);
  } catch (err) {
    if (err.response) {
      console.error("❌ API Error:", err.response.data);
    } else {
      console.error("❌ Request Error:", err.message);
    }
  }
}

run();
