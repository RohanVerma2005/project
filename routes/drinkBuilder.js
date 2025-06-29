// routes/drinkbuilder.js
import express from 'express';
import {
    getAllIngredients,
    buildCustomDrink
} from '../controllers/drinkBuilderController.js';

const router = express.Router();

// Fetch all ingredients for the drink builder
router.get('/ingredients', getAllIngredients);

// Generate custom drink with selected ingredients
router.post('/build', buildCustomDrink);

export default router;
