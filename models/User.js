const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Please provide your name'],
            trim: true,
        },

        fullname: {
            type: String,
            required: [true, 'Please provide your full name'],
            trim: true,
        },

        email: {
            type: String,
            required: false,
            unique: true,
            sparse: true,
            lowercase: true,
            validate: {
                validator: function(v) {
                    return !v || validator.isEmail(v);
                },
                message: 'Please provide a valid email'
            }
        },

        phone: {
            type: String,
            required: [true, 'Please provide your phone number'],
            unique: true,
            trim: true,
            match: [
                /^(\+20|0)?1[0125][0-9]{8}$/,
                'Please enter a valid Egyptian phone number',
            ],
        },

        grade: {
            type: String,
            required: [true, 'Please provide your grade'],
        },

        role: {
            type: String,
            enum: ['user', 'admin'],
            default: 'user',
        },

        password: {
            type: String,
            required: [true, 'Please provide a password'],
            minlength: 8,
            select: false,
        },

        confirmPassword: {
            type: String,
            required: [true, 'Please confirm your password'],
            validate: {
                validator: function (el) {
                    return el === this.password;
                },
                message: 'Passwords are not the same',
            },
        },
        passwordChangedAt: {
            type: Date,
            select: false,
        },
        active: {
            type: Boolean,
            default: true,
            select: false,
        },
        passwordResetToken: {
    type: String,
    select: false,
},

passwordResetExpires: {
    type: Date,
    select: false,
},
    },
    {
        timestamps: true,
    }
);

userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;

    this.password = await bcrypt.hash(this.password, 12);

    this.confirmPassword = undefined;
}); 

userSchema.pre(/^find/, function (next) {
    this.find({ active: { $ne: false } });
});

userSchema.methods.correctPassword = async function (
    candidatePassword,
    userPassword
) {
    return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
    if (this.passwordChangedAt) {
        const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
        return JWTTimestamp < changedTimestamp;
    }

    return false;
};

userSchema.methods.createPasswordResetToken = function () {
    const resetToken = crypto.randomBytes(32).toString('hex');

    this.passwordResetToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

    return resetToken;
};

module.exports = mongoose.model('User', userSchema);