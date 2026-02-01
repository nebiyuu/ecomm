import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "./cloudinary.js";


//profile related images like license and profile pci
const profileStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "user_profiles",
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
  },
});

// storage for product images
const productStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "products",
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
  },
});
const defaultpic = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "defaultedpics",
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
  },
})

const uploadProfile = multer({ storage: profileStorage });
const uploadProduct = multer({ storage: productStorage });
const uploadDefaultpic = multer({ storage: defaultpic });

export { uploadProfile, uploadProduct, uploadDefaultpic };
