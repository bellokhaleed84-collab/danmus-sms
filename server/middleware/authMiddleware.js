const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {

  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {

    try {

      token = req.headers.authorization.split(" ")[1];

      console.log("TOKEN:");
      console.log(token);

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
      );

      console.log("DECODED:");
      console.log(decoded);

      const user = await User.findById(decoded.id).select("-password");

      console.log("USER:");
      console.log(user);

      if (!user) {
        return res.status(401).json({
          message: "User not found",
        });
      }

      req.user = user;

      next();

    } catch (error) {

      console.log("AUTH ERROR:");
      console.log(error);

      return res.status(401).json({
        message: "Not authorized",
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      message: "No token provided",
    });
  }
};

module.exports = {
  protect,
};