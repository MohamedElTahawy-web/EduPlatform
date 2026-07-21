const dotenv = require('dotenv');
const mongoose = require('mongoose');

process.on('uncaughtException', err => {
    console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
    console.log(err.name, err.message, err.stack);
    process.exit(1);
});

dotenv.config({ path: './config.env' });

const app = require('./app');

let server;

const connectDB = async () => {
    try {  
        console.log(`[${process.env.MONGODB_URI}]`); 
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
        console.log("Connected successfully");

        const port = process.env.PORT || 3000;
        server = app.listen(port, () => {
            console.log(`Server is running on port ${port} in ${process.env.NODE_ENV || 'production'} mode`);
        });
    } catch (err) {
        console.error('MongoDB connection failed:', err.message);
        console.log('Retrying MongoDB connection in 5 seconds...');
        setTimeout(connectDB, 5000);
    }
};

connectDB();

process.on('unhandledRejection', err => {
    console.log('UNHANDLED REJECTION! 💥 Shutting down...');
    console.log(err.name, err.message);
    if (server) {
        server.close(() => {
            process.exit(1);
        });
    } else {
        process.exit(1);
    }
});

process.on('SIGTERM', () => {
    console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
    if (server) {
        server.close(() => {
            console.log('💥 Process terminated!');
            mongoose.connection.close(false, () => {
                process.exit(0);
            });
        });
    }
});

process.on('SIGINT', () => {
    console.log('👋 SIGINT RECEIVED. Shutting down gracefully');
    if (server) {
        server.close(() => {
            console.log('💥 Process terminated!');
            mongoose.connection.close(false, () => {
                process.exit(0);
            });
        });
    }
});