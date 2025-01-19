import express from 'express';
import {
    signUpUser,
    loginUser,
    logoutUser,
    refreshTokens,
    getUserProfile,
} from '../controllers/user.controller.js';
import { checkAuth } from '../middlewares/user.middleware.js';

const userRouter = express.Router();

userRouter.post('/signup', signUpUser);
userRouter.post('/login', loginUser);
userRouter.post('/logout', logoutUser);
userRouter.post('/refresh-token', refreshTokens);
userRouter.get('/profile', checkAuth, getUserProfile);

export default userRouter;
