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
const { error } = require("console");
app.use("/uploads", express.static(__dirname + "/uploads"));
const allowedOrigin = ['https://getit-two.vercel.app','http://localhost:3000'];
app.use(
  cors({
    origin: allowedOrigin,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  })
);

app.use(CookieParser());

mongoose
  .connect("mongodb+srv://airhnb:rabinbhn@cluster0.vf0pbbi.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0", {
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
          res.json({
            token,
            user:userDoc
          })

        }
      );
    } else {
      res.json("pass incorrect");
    }
  } else {
    res.status(422).json("not found");
  }
});
app.get('/profile', async (req, res) => {
  const token = req.headers.authorization ? req.headers.authorization.split(' ')[1] : null;

  if (token) {
      try {
          const userData = jwt.verify(token, jwtsecret);
          const { name, email, _id } = await User.findById(userData.id);
          res.json({ name, email, _id });
      } catch (error) {
          console.error(error); // Log the error
          res.status(401).json({ error: 'Invalid or expired token' });
      }
  } else {
      // If no token is provided, proceed without authentication
      res.json({ message: 'No token provided, proceeding without authentication' });
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
function  getUserDatafromreq(req) {

  const token = req.headers.authorization ? req.headers.authorization.split(' ')[1] : null;


  return new Promise((resolve, reject) => {
    jwt.verify(token, jwtsecret, {}, async (err, userData) => {
      if (err) throw err;
      resolve(userData);
    });
  });
}

app.post("/places", async (req, res) => {
  const token = req.headers.authorization ? req.headers.authorization.split(' ')[1] : null;
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
  const token = req.headers.authorization ? req.headers.authorization.split(' ')[1] : null;
  jwt.verify(token, jwtsecret, {}, async (err, userData) => {
    // const { id } = userData; 
    console.log(userData)
    // res.json(await Place.find({ owner: id }));
  });
});

app.get("/places/:id", async (req, res) => {
  const { id } = req.params;
  res.json(await Place.findById(id));
});

app.get("/allplaces", async (req, res) => {
 
  const limit=3
  const page=1
  const offeset=(page-1)*limit
  const allplaces = await Place.find().skip(offeset).limit(limit);
  res.json(allplaces);
});
app.get("/accomodation/:slug",async(req,res)=>{

  const slug=req.params
  try{

    const accomodationdetail=await Place.findOne({

      slug:slug
  
    })

    res.json(accomodationdetail)

  }catch(err){
    res.status(500).json({
      message:err.message
    })
  }

})

app.get("/search/:key", async (req, res) => {
  const filterdata = await Place.find({
    title: {
      $regex: req.params.key,
      $options: "i",
    },
  });

  res.json(filterdata);
});
app.get("/accomodation/:id", async (req, res) => {
  const { id } = req.params;
  res.json(await Place.findById(id));
});



app.post("/booking", async (req, res) => {
  const userData = await getUserDatafromreq(req);
  const { place, checkIn, checkOut, noofpeople, name, phone, price } = req.body;
  Booking.create({
    place,
    checkIn,
    checkOut,
    noofpeople,
    name,
    phone,
    price,
    user: userData._id,
  })
    .then((doc) => {
      res.json(doc);
    })
    .catch((err) => {
      throw err;
    });
});

app.get("/bookings", async (req, res) => {
  const userData = await getUserDatafromreq(req);
  res.json(await Booking.find({ user: userData.id }).populate("place"));
});

const port = 4000 || process.env.PORT;
app.listen(port, () => {
  console.log("port is running",port);
});
