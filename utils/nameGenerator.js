export function generateDrinkName(base, mixer, garnish) {
    const basePart = base.name.slice(0, 3).toUpperCase();
    const mixerPart = mixer.name.slice(-3).toUpperCase();
    const garnishPart = garnish.name[0].toUpperCase();

    return `${basePart}${mixerPart}-${garnishPart}X`;
}
