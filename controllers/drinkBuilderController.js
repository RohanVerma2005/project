import Ingredient from '../models/Ingredient.js';
import { estimateAlcoholPercentage } from '../utils/alcoholUtils.js';
import { generateDrinkName } from '../utils/nameGenerator.js';

export const getAllIngredients = async (req, res) => {
    try {
        const ingredients = await Ingredient.find({});
        res.json({ success: true, data: ingredients });
    } catch (err) {
        console.error('Error fetching ingredients:', err);
        res.status(500).json({ success: false, message: 'Error fetching ingredients.' });
    }
};

export const buildCustomDrink = async (req, res) => {
    const {
        baseId, mixerId, garnishId,
        baseName, mixerName, garnishName
    } = req.body;

    // Check if either ID or Name is provided for each
    if ((!baseId && !baseName) || (!mixerId && !mixerName) || (!garnishId && !garnishName)) {
        return res.status(400).json({
            success: false,
            message: 'Missing ingredient selections. Provide either IDs or names for base, mixer, and garnish.'
        });
    }

    try {
        const [base, mixer, garnish] = await Promise.all([
            baseId ? Ingredient.findById(baseId) : Ingredient.findOne({ name: baseName }),
            mixerId ? Ingredient.findById(mixerId) : Ingredient.findOne({ name: mixerName }),
            garnishId ? Ingredient.findById(garnishId) : Ingredient.findOne({ name: garnishName }),
        ]);

        const missing = [];
        if (!base) missing.push('base');
        if (!mixer) missing.push('mixer');
        if (!garnish) missing.push('garnish');

        if (missing.length > 0) {
            return res.status(404).json({
                success: false,
                message: `Ingredient(s) not found: ${missing.join(', ')}`
            });
        }

        const estimatedABV = estimateAlcoholPercentage([base, mixer]);
        const drinkName = generateDrinkName(base, mixer, garnish);

        res.json({
            success: true,
            drink: {
                name: drinkName,
                ingredients: [base.name, mixer.name, garnish.name],
                estimatedABV: estimatedABV + "%"
            }
        });

    } catch (err) {
        console.error('Error building drink:', err);
        res.status(500).json({ success: false, message: 'Error building custom drink' });
    }
};
