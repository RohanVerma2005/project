export function estimateAlcoholPercentage(ingredients) {
    const total = ingredients.length;
    if (!total) return 0;

    const avg = ingredients.reduce((sum, item) => sum + (item.alcoholContent || 0), 0);
    return Math.round(avg / total);
}
