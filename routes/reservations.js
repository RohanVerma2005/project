import express from 'express';
import Reservation from '../models/Reservation.js';
import { generateConfirmationCode } from '../utils/generateCode.js';


const router = express.Router();

router.post('/', async (req, res) => {
    try {
        const { firstName, lastName, email, phone, date, time, partySize, specialRequests } = req.body;

        // Check required fields
        const missingFields = [];
        if (!firstName) missingFields.push('firstName');
        if (!lastName) missingFields.push('lastName');
        if (!email) missingFields.push('email');
        if (!phone) missingFields.push('phone');
        if (!date) missingFields.push('date');
        if (!time) missingFields.push('time');
        if (!partySize) missingFields.push('partySize');

        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Missing required fields: ${missingFields.join(', ')}`
            });
        }

        const newReservation = new Reservation({
            firstName,
            lastName,
            email,
            phone,
            date: new Date(date),
            time,
            partySize,
            specialRequests: specialRequests || '',
            status: 'confirmed',
            confirmationCode: generateConfirmationCode()
        });

        await newReservation.save();

        // Check if this is the earliest reservation for the same date + time
        const sameSlotReservations = await Reservation.find({
            date: newReservation.date,
            time: newReservation.time,
            status: { $ne: 'cancelled' }
        }).sort({ createdAt: 1 });

        if (sameSlotReservations.length && sameSlotReservations[0]._id.equals(newReservation._id)) {
            // First one to book this time slot — confirm it
            newReservation.status = 'confirmed';
            newReservation.confirmationCode = generateConfirmationCode();
            await newReservation.save();
        }

        return res.status(201).json({
            success: true,
            message: newReservation.status === 'confirmed'
                ? 'Reservation confirmed!'
                : 'Reservation pending – slot already booked by another user.',
            data: {
                id: newReservation._id,
                firstName: newReservation.firstName,
                lastName: newReservation.lastName,
                date: newReservation.date,
                time: newReservation.time,
                partySize: newReservation.partySize,
                status: newReservation.status,
                confirmationCode: newReservation.confirmationCode
            }
        });

    } catch (error) {
        console.error('Error creating reservation:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error. Please try again later.'
        });
    }
});

export default router;
