import User from "../models/user.model.js";
import jwt from "jsonwebtoken";
import { Redis } from "../lib/redis.js"
import dotenv from "dotenv";
import bcrypt from 'bcrypt';
import { generateTokens, setCookies, storeRefreshToken } from '../utils/user.utils.js';
dotenv.config();

export const signUpUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "name, email or password is required"
            })
        }

        const isUserAlreadyPresent = await User.findOne({ email });

        if (isUserAlreadyPresent) {
            return res.status(409).json({
                message: "User already present with these credentials"
            })
        }

        const user = new User({
            name, email, password
        })

        await user.save();

        // generate tokens
        const { accessToken, refreshToken } = generateTokens(user._id);

        // store refresh token in redis
        await storeRefreshToken(refreshToken, user._id);

        // set both tokens in secure cookies
        setCookies(accessToken, refreshToken, res);

        res.status(201).json({
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
            },
            message: "User created successfully"
        })

    } catch (error) {
        console.log("Error coming while signup" + error.message);
        res.status(500).json({ message: error.message })
    }
}

export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // find the user first
        const user = await User.findOne({ email });

        if (!user) return res.status(400).json({ message: "Invalid credentials" })

        // match the password
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) return res.status(400).json({ message: "Invalid credentials" })

        // generate tokens
        const { accessToken, refreshToken } = generateTokens(user._id);

        await storeRefreshToken(refreshToken, user._id);

        setCookies(accessToken, refreshToken, res);

        res.status(200).json({
            user,
            message: "User loggedIn successfully"
        })

    } catch (error) {
        console.log("Error coming while login user" + error.message);
        res.status(500).json({ message: error.message })
    }
}

export const logoutUser = async (req, res) => {
    try {
        const { access_token: accessToken, refresh_token: refreshToken } = req.cookies;

        if (!accessToken && !refreshToken) {
            return res.status(400).json({
                message: "You are already logged out",
            });
        }

        if (refreshToken) {
            try {
                const decodedObj = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
                await Redis.del(`refresh_token:${decodedObj.userId}`)
            } catch (error) {
                console.log("Invalid or expired refresh token.");
            }
        }

        res.clearCookie("access_token");
        res.clearCookie("refresh_token");
        res.json({ message: "Logged out successfully" });

    } catch (error) {
        console.log("Error coming while logout user" + error.message);
        res.status(500).json({ message: error.message })
    }
}

export const refreshTokens = async (req, res) => {
    try {
        const { refresh_token } = req.cookies;

        if (!refresh_token) {
            return res.status(401).json({
                message: "Refresh token missing. Please log in again."
            })
        }

        let userId = null;
        try {
            const decodedObj = jwt.verify(refresh_token, process.env.REFRESH_TOKEN_SECRET);
            userId = decodedObj.userId;
        } catch (error) {
            if (error.name === "TokenExpiredError") {
                return res.status(401).json({ message: "Refresh token expired. Please log in again." });
            }
            throw error;
        }

        const storedRefreshToken = await Redis.get(`refresh_token:${userId}`);

        if (!storedRefreshToken || refresh_token !== storedRefreshToken) {
            return res.status(403).json({
                message: "Invalid refresh token. Please login again"
            })
        }

        // generate both access token and refresh token to rotate refresh token
        const { accessToken, refreshToken } = generateTokens(userId);
        await storeRefreshToken(refreshToken, userId);
        setCookies(accessToken, refreshToken, res);

        res.json({ message: "Tokens refreshed successfully" });
    } catch (error) {
        console.log("Error coming while refreshing tokens" + error.message);
        res.status(500).json({ message: error.message })
    }
}

export const getUserProfile = async (req, res) => {
    try {
        const user = req.user;
        res.json({
            user,
        })
    } catch (error) {
        console.log("Error while getting profile" + error.message);
        res.status(500).json({ message: error.message })
    }
}