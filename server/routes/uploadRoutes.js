const express = require("express");
const multer = require("multer");
const uploadController = require("../controllers/uploadController");

const router = express.Router();

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});



const upload = multer({ storage });

router.post("/upload", upload.single("image"), uploadController.uploadImage);

module.exports = router;
