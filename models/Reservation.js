// models/Reservation.js
import mongoose from 'mongoose';

const reservationSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 50
    },
    lastName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 50
    },
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
    partySize: {
        type: Number,
        required: true,
        min: 1,
        max: 20
    },
    specialRequests: {
        type: String,
        maxlength: 500,
        trim: true
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled'],
        default: 'pending'
    },
    reservationCode: {
        type: String,
        unique: true,
        sparse: true // allows nulls before generation
    },
    confirmationCode: {
        type: String,
        unique: true,
        sparse: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

reservationSchema.index({ date: 1, time: 1 });
reservationSchema.index({ email: 1 });

// Prevent OverwriteModelError
export default mongoose.models.Reservation || mongoose.model('Reservation', reservationSchema);
