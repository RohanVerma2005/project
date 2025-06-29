// models/Ingredient.js
import mongoose from 'mongoose';

const ingredientSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        enum: ['base', 'mixer', 'garnish'],
        required: true
    },
    alcoholContent: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    }
}, { timestamps: true });

const Ingredient = mongoose.model('Ingredient', ingredientSchema);

export default Ingredient;
