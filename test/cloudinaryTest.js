import 'dotenv/config';
import cloudinary from 'cloudinary';
import path from 'path';
import { fileURLToPath } from 'url'; // <--- 1. Import fileURLToPath

// Define equivalent of __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename); // <--- 2. Define __dirname

cloudinary.v2.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_KEY,
  api_secret: process.env.CLOUD_SECRET,
});

async function testUpload() {
  try {
    // Correctly constructs the absolute path to the image in the current directory
    const imagePath = path.join(__dirname, 'wallhaven-qz76y7.png'); 
    
    console.log(`Attempting to upload file from: ${imagePath}`); // Optional: Check the path

    const result = await cloudinary.v2.uploader.upload(imagePath);
    console.log("Upload successful:", result.secure_url);
  } catch (err) {
    console.error("Cloudinary error:", err);
  }
}

testUpload();