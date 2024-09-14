
const session = require( "express-session");
const passport = require("passport");
const bcrypt = require( "bcryptjs");
const User = require("./model/userSchema");
const EventRegistration = require( "./model/registrationSchema");
const sendEmail = require("./utils/sendEmail"); // Fixed the spacing
const crypto = require( 'crypto');
const OAuth2Strategy = require("passport-google-oauth2").Strategy; // Using ES6 import style for the OAuth2 strategy
const express = require( "express");
const Razorpay = require("razorpay");
const cors = require("cors");
require("./db/conn"); // Ensure this points to the correct path of your connection file
require("dotenv").config(); // Add the missing parentheses to invoke config



const app = express();

app.use(cors());
app.use(express.json());


app.use(express.urlencoded({ extended: true }));



//Payment code start

const instance = new Razorpay({
  key_id: process.env.RAZORPAY_API_KEY,
  key_secret: process.env.RAZORPAY_API_SECRET, // Fixed the typo here ("APT" to "API")
});
const checkout = async (req, res) => {
  const options = {
    amount: Number(req.body.amount * 100),
    currency: "INR",
  };
  const order = await instance.orders.create(options);
  res.status(200).json({
    success: true,
    order,
    
  });

};
const paymentVerification = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    req.body;

  const body = razorpay_order_id + "|" + razorpay_payment_id;

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_API_SECRET)
    .update(body.toString())
    .digest("hex");

  const isAuthentic = expectedSignature === razorpay_signature;

  if (isAuthentic) {
    // Database comes here

    await Payment.create({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });

    res.redirect(
      `http://localhost:3000/paymentsuccess?reference=${razorpay_payment_id}`
    );
  } else {
    res.status(400).json({
      success: false,
    });
  }
};

const router = express.Router();

// Define routes
router.route('/checkout').post(checkout);
router.route('/paymentverification').post(paymentVerification);
app.use('/api', router);

// Endpoint to get Razorpay API key
app.get('/api/getkey', (req, res) =>
  res.status(200).json({ key: process.env.RAZORPAY_API_KEY })
);

//Payment code ends
const PORT = process.env.PORT;



const clientid = "762044144985-l52175nbuk9gjqghtjgsuhuln3vs2efo.apps.googleusercontent.com";
const clientsecret = "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";

app.use(cors({
  origin: "http://localhost:3000",
  methods: "GET,POST,PUT,DELETE",
  credentials: true
}));
app.use(express.json());



const resetTokens = {};
const verifyTokens = {};

app.use(session({
  secret: "1234567jklhyjgklgfd890",
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // 1 day
  }
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new OAuth2Strategy({
  clientID: clientid,
  clientSecret: clientsecret,
  callbackURL: "/auth/google/callback",
  scope: ["profile", "email"]
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ email: profile.email });
    if (!user) {
      return done(null, false, { message: "User not found" });
    }
    await User.updateOne({ email:profile.email }, { verifiedUser: true });
    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user);
 });

passport.deserializeUser((user, done) => {
  done(null, user);
});


app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

app.get("/auth/google/callback", passport.authenticate("google", {
  successRedirect: "http://localhost:3000/",
  failureRedirect: "http://localhost:3000/notfound"
}));



app.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if all fields are provided
    if (!name || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Check if the user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create and save the new user
    const newUser = new User({ name, email, password: hashedPassword, verifiedUser: false });
    await newUser.save();

    // Generate a verification token
    const verifyToken = crypto.randomBytes(32).toString('hex');
    verifyTokens[email] = { token: verifyToken, expiry: Date.now() + 15 * 60 * 1000 }; // Token expires in 15 minutes

    // Create the verification URL
    const verifyUrl = `http://localhost:3000/emailverification?token=${verifyToken}&email=${encodeURIComponent(email)}`;
    const send_to = email;
    const sent_from = process.env.EMAIL_USER;
    const reply_to = email;
    const subject = "Verification Email";
    const message = `
          You are trying to create an account. Please click the link to verify your email: ${verifyUrl}
          If somebody else is trying to use your email, they cannot perform any action without verifying the email.
      `;

    // Send the verification email
    try {
      await sendEmail(subject, message, send_to, sent_from, reply_to);
      res.status(200).json({ success: true, message: "User registered successfully. Please verify your email." });
    } catch (error) {
      // If email sending fails, delete the user from the database
      await User.deleteOne({ _id: newUser._id });
      return res.status(500).json({ error: "Failed to send verification email. User registration rolled back." });
    }
  } catch (error) {
    console.error("Error during user registration:", error);
    res.status(500).json({ error: "Server error" });
  }
});



app.post('/emailverification', async (req, res) => {
  const { email, token } = req.body;
  if (!email || !token) {
    return res.status(400).json({ error: "All fields are required" });
  }

  const storedToken2 = verifyTokens[email];
  if (!storedToken2 || storedToken2.token !== token) {
    return res.status(400).json({ error: "Invalid or expired token" });
  }

  if (storedToken2.expiry < Date.now()) {
    delete verifyTokens[email];
    return res.status(400).json({ error: "Token has expired" });
  }

  await User.updateOne({ email }, { verifiedUser: true });

  delete verifyTokens[email]; // Remove token from memory after successful reset

  res.status(200).json({ message: "Email verified" });
});


app.post('/forgotpassword', async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(400).json({ error: "User not found" });
  }

  // Generate a reset token and set expiration time
  const resetToken = crypto.randomBytes(32).toString('hex');
  resetTokens[email] = { token: resetToken, expiry: Date.now() + 15 * 60 * 1000 }; // Token expires in 15 minutes

  const resetUrl = `http://localhost:3000/resetpassword?token=${resetToken}&email=${encodeURIComponent(email)}`;
  try {
    const send_to = email;
    const sent_from = process.env.EMAIL_USER;
    const reply_to = email;
    const subject = "Password reset Email";
    const message = `You requested a password reset. Click the link to reset your password: ${resetUrl}`;

    await sendEmail(subject, message, send_to, sent_from, reply_to);
    res.status(200).json({ success: true, message: "Password Reset Email Sent" });
  } catch (error) {
    res.status(500).json(error.message);
  }
});




app.post('/resetpassword', async (req, res) => {
  const { email, token, newPassword } = req.body;
  if (!email || !token || !newPassword) {
    return res.status(400).json({ error: "All fields are required" });
  }

  const storedToken = resetTokens[email];
  if (!storedToken || storedToken.token !== token) {
    return res.status(400).json({ error: "Invalid or expired token" });
  }

  if (storedToken.expiry < Date.now()) {
    delete resetTokens[email];
    return res.status(400).json({ error: "Token has expired" });
  }

  // Hash the new password and update the user
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await User.updateOne({ email }, { password: hashedPassword });

  delete resetTokens[email]; // Remove token from memory after successful reset

  res.status(200).json({ message: "Password reset successfully" });
});

//});



app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if both email and password are provided
    if (!email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Find the user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    // Check if the user is verified
    if (!user.verifiedUser) {
      // Generate a verification token
      const verifyToken = crypto.randomBytes(32).toString('hex');
      verifyTokens[email] = { token: verifyToken, expiry: Date.now() + 15 * 60 * 1000 }; // Token expires in 15 minutes

      // Create the verification URL
      const verifyUrl = `http://localhost:3000/emailverification?token=${verifyToken}&email=${encodeURIComponent(email)}`;
      const send_to = email;
      const sent_from = process.env.EMAIL_USER;
      const reply_to = email;
      const subject = "Verification Email";
      const message = `
          You are trying to create an account. Please click the link to verify your email: ${verifyUrl}
          If somebody else is trying to use your email, they cannot perform any action without verifying the email.
      `;

      // Send the verification email
      try {
        await sendEmail(subject, message, send_to, sent_from, reply_to);
        return res.status(200).json({ success: false , message: "Please verify your email to login. Verification link is send to your email." });
      } catch (error) {
        return res.status(500).json({ error: "Failed to send verification email. Please try again later." });
      }
    }

    // Compare provided password with the hashed password in the database
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    // Handle session login if using sessions (e.g., Passport.js)
    req.login(user, err => {
      if (err) {
        console.error("Login error:", err);
        return res.status(500).json({ error: "Login failed" });
      }
      //req.session.user = user; // Store user in session
      
      res.status(200).json({ success: true, message: "User logged in successfully" });
    });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


// Authentication middleware
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  } else {
    res.status(401).json({ error: "Unauthorized" });
  }
};

app.get('/user', isAuthenticated, (req, res) => {
  // The user information is available in req.user if the user is authenticated
  res.status(200).json({ user: req.user });
});

app.post('/registerevent', async (req, res) => {
  const { eventName, teamLeaderName, teamLeaderMobileNo, teamLeaderEmail, teamLeaderCollege, teamSize, teamLeaderGender } = req.body;

  if (!eventName || !teamLeaderName || !teamLeaderMobileNo || !teamLeaderEmail || !teamLeaderCollege || teamSize === undefined) {
    return res.status(400).json({ error: 'All required fields must be provided.' });
  }

  try {
    const existingRegistration = await EventRegistration.findOne({ teamLeaderEmail ,eventName });

    if (existingRegistration) {
      return res.status(400).json({ error: 'A registration with this email already exists for this event.' });
    }
  } catch (error) {
    console.error('Database query error:', error);
    return res.status(500).json({ error: 'Internal server error. Please try again later.' });
  }

  try {
    const registration = new EventRegistration({
      eventName,
      teamLeaderName,
      teamLeaderMobileNo,
      teamLeaderEmail,
      teamLeaderCollege,
      teamSize,
      teamLeaderGender
    });
    await registration.save();
    res.status(200).json({ message: 'Registration successful!' });
  } catch (error) {
    console.error('Database save error:', error);
    res.status(500).json({ error: 'Error registering event. Please try again later.' });
  }
});


app.get('/login/success', (req, res) => {
  if (req.isAuthenticated()) {
    res.status(200).json({ success: true, user: req.user });
  } else {
    res.status(401).json({ success: false });
  }
});




app.get("/logout", (req, res, next) => {
  req.logout(function (err) {
    if (err) { return next(err); }
    // Destroy the session
    req.session.destroy((err) => {
      if (err) {
        return next(err);
      }
      // Clear the session cookie
      res.clearCookie('connect.sid', { path: '/' });
    res.status(200).json({ success:true, message:"user Logged out"});
  });
  });
});



app.listen(PORT, () => {
  console.log(`Server started at port ${PORT}`);


});