import mongoose from 'mongoose';
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        minLength: [3, "Name should be minimum of length 3"],
        required: [true, "Name is required"],
        trim: true,
    },
    email: {
        type: String,
        required: [true, "Email is required"],
        trim: true,
        unique: true,
    },
    password: {
        type: String,
        minLength: [6, "Password should be minimum of length 6"],
        required: [true, "Password is required"],
        trim: true,
    }
}, {
    timestamps: true
});

userSchema.pre('save', async function () {
    const user = this;
    if (!user.isModified('password')) {
        return;
    }
    user.password = await bcrypt.hash(user.password, 10);
});

userSchema.set('toJSON', {
    transform: function (doc, ret) {
        delete ret.password;
    }
});

const userModel = mongoose.model('User', userSchema);

export default userModel;
