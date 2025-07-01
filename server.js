import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import crypto from "crypto";
import connectDB from './config/db.js';
import drinkBuilderRoutes from './routes/drinkBuilder.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.set('trust proxy', 1);

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cocktail_reservations', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => console.log('MongoDB connected successfully'))
    .catch(err => console.error('MongoDB connection error:', err));

// Reservation Schema
const reservationSchema = new mongoose.Schema({
    firstName: { type: String, required: true, trim: true, maxlength: 50 },
    lastName: { type: String, required: true, trim: true, maxlength: 50 },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    phone: {
        type: String,
        required: true,
        trim: true,
        match: [/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number']
    },
    date: {
        type: Date,
        required: true,
        validate: {
            validator: function (date) {
                return date > new Date();
            },
            message: 'Reservation date must be in the future'
        }
    },
    time: {
        type: String,
        required: true,
        match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter a valid time in HH:MM format']
    },
    partySize: { type: Number, required: true, min: 1, max: 20 },
    specialRequests: { type: String, maxlength: 500, trim: true },
    status: { type: String, enum: ['pending', 'confirmed', 'cancelled'], default: 'pending' },
    confirmationCode: { type: String, unique: true, sparse: true, trim: true },
    createdAt: { type: Date, default: Date.now }
});

reservationSchema.index({ date: 1, time: 1 });
reservationSchema.index({ email: 1 });

const Reservation = mongoose.model('Reservation', reservationSchema);

// Generate unique confirmation code
function generateConfirmationCode(length = 8) {
    return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length).toUpperCase();
}

// Create a new reservation
app.post('/api/reservations', async (req, res) => {
    try {
        const { firstName, lastName, email, phone, date, time, partySize, specialRequests } = req.body;

        // Validate required fields
        const missingFields = [];
        if (!firstName) missingFields.push("firstName");
        if (!lastName) missingFields.push("lastName");
        if (!email) missingFields.push("email");
        if (!phone) missingFields.push("phone");
        if (!date) missingFields.push("date");
        if (!time) missingFields.push("time");
        if (!partySize) missingFields.push("partySize");

        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Missing required fields: ${missingFields.join(", ")}`
            });
        }

        const requestedDate = new Date(date);
        const startOfDay = new Date(requestedDate.setHours(0, 0, 0, 0));
        const endOfDay = new Date(requestedDate.setHours(23, 59, 59, 999));

        // Check if time slot already booked on that date (excluding cancelled)
        const existingReservation = await Reservation.findOne({
            date: { $gte: startOfDay, $lte: endOfDay },
            time: time,
            status: { $ne: 'cancelled' }
        }).sort({ createdAt: 1 });

        if (existingReservation) {
            return res.status(400).json({
                success: false,
                message: 'This time slot is already booked. Please choose a different time.'
            });
        }

        // Count user's confirmed reservations to check discount eligibility
        const confirmedCount = await Reservation.countDocuments({
            email,
            status: 'confirmed'
        });

        const newReservationCount = confirmedCount + 1;
        const discountCode = (newReservationCount % 5 === 0) ? "DISCOUNT10" : null;

        const confirmationCode = generateConfirmationCode();

        const reservation = new Reservation({
            firstName,
            lastName,
            email,
            phone,
            date: new Date(date),
            time,
            partySize,
            specialRequests: specialRequests || '',
            status: 'confirmed',
            confirmationCode
        });

        await reservation.save();

        res.status(201).json({
            success: true,
            message: 'Reservation created successfully!',
            data: {
                id: reservation._id,
                firstName: reservation.firstName,
                lastName: reservation.lastName,
                email: reservation.email,
                phone: reservation.phone,
                date: reservation.date,
                time: reservation.time,
                partySize: reservation.partySize,
                status: reservation.status,
                confirmationCode: reservation.confirmationCode,
                discountCode
            }
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ success: false, message: 'Validation Error', errors });
        }
        console.error('Error creating reservation:', error);
        res.status(500).json({ success: false, message: 'Internal server error. Please try again later.' });
    }
});

// Get availability for a specific date
app.get('/api/availability', async (req, res) => {
    try {
        const { date } = req.query;
        if (!date) {
            return res.status(400).json({ success: false, message: 'Date query parameter is required' });
        }

        const requestedDate = new Date(date);
        if (isNaN(requestedDate)) {
            return res.status(400).json({ success: false, message: 'Invalid date format' });
        }

        // Define your time slots here (adjust as needed)
        const timeSlots = [
            '17:00', '17:30', '18:00', '18:30', '19:00',
            '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'
        ];

        const startOfDay = new Date(requestedDate.setHours(0, 0, 0, 0));
        const endOfDay = new Date(requestedDate.setHours(23, 59, 59, 999));

        // Find all confirmed reservations on that date
        const reservations = await Reservation.find({
            date: { $gte: startOfDay, $lte: endOfDay },
            status: 'confirmed'
        });

        // Build availability array
        const availability = timeSlots.map(slot => {
            const isBooked = reservations.some(r => r.time === slot);
            return {
                time: slot,
                status: isBooked ? 'booked' : 'available'
            };
        });

        res.json({
            success: true,
            date,
            timeSlots: availability
        });
    } catch (error) {
        console.error('Error fetching availability:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

app.use('/api/drinks', drinkBuilderRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'Server is running', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, message: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
});
