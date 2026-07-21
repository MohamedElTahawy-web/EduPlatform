const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { promisify } = require('util');
const User = require('../../models/User');
const catchAsync = require('../../utils/catchAsync');
const ApiError = require('../../utils/ApiError');

const signToken = (id) => {
    return jwt.sign(
        { id },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN
        }
    );
};

const createSendToken = (user, statusCode, res) => {
    const token = signToken(user._id);

    user.password = undefined;
    user.confirmPassword = undefined;

    res.status(statusCode).json({
        status: 'success',
        token,
        data: {
            user
        }
    });
};

exports.signup = catchAsync(async (req, res, next) => {
    const newUser = await User.create(req.body);
    createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
    console.log("LOGIN START");

    const { phone, password } = req.body;

    console.log("PHONE:", phone);

    const user = await User.findOne({ phone }).select('+password');

    console.log("USER:", user);

    if (!user || !(await user.correctPassword(password, user.password))) {
        return next(new ApiError('Incorrect phone number or password', 401));
    }

    console.log("PASSWORD OK");

    createSendToken(user, 200, res);
});

exports.logout = (req, res) => {
    // Project uses JWT Bearer Tokens, so we replace with simple JSON response
    res.status(200).json({
        status: 'success',
        message: 'Logged out successfully'
    });
};

exports.protect = catchAsync(async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return next(
            new ApiError('You are not logged in. Please log in to get access.', 401)
        );
    }

    const decoded = await promisify(jwt.verify)(
        token,
        process.env.JWT_SECRET
    );

    const currentUser = await User.findById(decoded.id);

    if (!currentUser) {
        return next(
            new ApiError('The user belonging to this token no longer exists.', 401)
        );
    }

    // Check if user changed password after the token was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next(
            new ApiError('User recently changed password! Please log in again.', 401)
        );
    }

    req.user = currentUser;
    next();
});

exports.allowedTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(
                new ApiError(
                    'You do not have permission to perform this action.',
                    403
                )
            );
        }

        next();
    };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
    const user = await User.findOne({
    phone: req.body.phone
        });

    if (!user) {
        return next(new ApiError('There is no user with this phone.', 404));
    }

    const resetToken = user.createPasswordResetToken();

    await user.save({
        validateBeforeSave: false
    });

    // TODO: Send reset email via Nodemailer/Mailtrap here later

    res.status(200).json({
        status: 'success',
        resetToken
    });
});

exports.resetPassword = catchAsync(async (req, res, next) => {
    return next(new ApiError('Not Implemented', 501));
});

exports.updatePassword = catchAsync(async (req, res, next) => {
    const user = await User.findById(req.user.id).select('+password');
    if (!(await user.correctPassword(req.body.currentPassword, user.password))) {
        return next(new ApiError('Your current password is wrong.', 401));
    }
    user.password = req.body.newPassword;
    await user.save();
    createSendToken(user, 200, res);
});

exports.verifyEmail = catchAsync(async (req, res, next) => {
    return next(new ApiError('Not Implemented', 501));
});

exports.resendVerificationEmail = catchAsync(async (req, res, next) => {
    return next(new ApiError('Not Implemented', 501));
});

exports.refreshToken = catchAsync(async (req, res, next) => {
    return next(new ApiError('Not Implemented', 501));
});