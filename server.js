const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const User = require("./Models/User.js");
const Place = require("./Models/Place.js");
const Booking = require("./Models/Booking.js");
const bycrypt = require("bcryptjs");

require("dotenv").config();
const app = express();
const jwt = require("jsonwebtoken");
const CookieParser = require("cookie-parser");

app.use(express.json());
const bcryptSalt = bycrypt.genSaltSync(10);
const jwtsecret = "stehbdj/gdgi/srbdhfi";
const imageDownloader = require("image-downloader");
const multer = require("multer");
const fs = require("fs");
app.use("/uploads", express.static(__dirname + "/uploads"));
const allowedOrigin = 'https://airbnbclone-3off.onrender.com';
app.use(
  cors({
    origin: allowedOrigin,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  })
);
app.use(CookieParser());

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://airbnbclone-3off.onrender.com');
 

  next();
});

mongoose
  .connect(process.env.MONGO_URL, {
    useUnifiedTopology: true,
    useNewUrlParser: true,
    autoIndex: true,
  })
  .then(() => {
    console.log("Connected to mongoDB");
  });

app.get("/test", (req, res) => {
  res.json("test is ok");
});

app.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const userDoc = await User.create({
      name,
      email,
      password: bycrypt.hashSync(password, bcryptSalt),
    });
    res.json(userDoc);
  } catch (e) {
    res.status(422).json(e);
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const userDoc = await User.findOne({ email });
  if (userDoc) {
    const passok = bycrypt.compareSync(password, userDoc.password);
    if (passok) {
      jwt.sign(
        { email: userDoc.email, id: userDoc._id, name: userDoc.name },
        jwtsecret,
        {},
        (err, token) => {
          if (err) throw err;
          res.cookie("token", token).json(userDoc);
        }
      );
    } else {
      res.json("pass incorrect");
    }
  } else {
    res.status(422).json("not found");
  }
});
app.get("/profile", (req, res) => {
  const { token } = req.cookies;
  if (token) {
    jwt.verify(token, jwtsecret, {}, async (err, userData) => {
      if (err) throw err;
      const { name, email, _id } = await User.findById(userData.id);
      res.json({ name, email, _id });
    });
  } else {
    res.json(null);
  }
});

app.post("/logout", (req, res) => {
  res.cookie("token", "").json("eh");
});

app.post("/uploadbylink", async (req, res) => {
  const newName = "photo" + Date.now() + ".jpeg";
  const { link } = req.body;
  await imageDownloader.image({
    url: link,
    dest: __dirname + "/uploads/" + newName,
  });
  res.json(newName);
});
const photoMiddleware = multer({ dest: "uploads/" });
app.post("/upload", photoMiddleware.array("photos", 100), (req, res) => {
  const uploadFiles = [];
  for (let i = 0; i < req.files.length; i++) {
    const { path, originalname } = req.files[i];
    const parts = originalname.split(".");
    const ext = parts[parts.length - 1];
    const newPath = path + "." + ext;
    fs.renameSync(path, newPath);
    uploadFiles.push(newPath.replace("uploads", ""));
  }
  res.json(uploadFiles);
});

app.post("/places", async (req, res) => {
  const { token } = req.cookies;
  const {
    title,
    address,
    photos,
    description,
    perks,
    extraInfo,
    checkIn,
    checkOut,
    maxGuests,
    price,
  } = req.body;
  jwt.verify(token, jwtsecret, {}, async (err, userData) => {
    if (err) throw err;
    const placeDoc = await Place.create({
      owner: userData.id,
      title,
      address,
      photos,
      description,
      perks,
      extraInfo,
      checkIn,
      checkOut,
      maxGuests,
      price,
    });
    res.json(placeDoc);
  });
});
app.get("/userplaces", (req, res) => {
  const { token } = req.cookies;
  jwt.verify(token, jwtsecret, {}, async (err, userData) => {
    const { id } = userData;
    res.json(await Place.find({ owner: id }));
  });
});

app.get("/places/:id", async (req, res) => {
  const { id } = req.params;
  res.json(await Place.findById(id));
});

app.get("/allplaces", async (req, res) => {
  const allplaces = await Place.find();
  res.json(allplaces);
});
app.get("/accomodation/:id", async (req, res) => {
  const { id } = req.params;
  res.json(await Place.findById(id));
});

function getUserDatafromreq(req){
    return new Promise((resolve,reject)=>{
      jwt.verify(req.cookies.token, jwtsecret, {}, async (err, userData) => {
        if (err) throw err
        resolve(userData)
  
        
      });

    })
    
}


app.post("/booking", async(req,res) => {
  const userData=await getUserDatafromreq(req);
  const { place, checkIn, checkOut, noofpeople, name, phone, price } = req.body;
   Booking.create({
    place,
    checkIn,
    checkOut,
    noofpeople,
    name,
    phone,
    price,
    user:userData.id,
  }).then((doc)=>{
   
    res.json(doc)
  }).catch((err)=>{
    throw err
  })
});


  app.get("/bookings", async(req, res) => {
    const userData= await getUserDatafromreq(req)
    res.json(await Booking.find({user:userData.id}).populate("place"))
  });

const port = process.env.PORT||4000;
app.listen(port, () => {
  console.log("port is running");
});
