import { DzienDiety } from "../types";

export function getDzienPoNumerze(dieta: DzienDiety[], numerDnia: number): DzienDiety | undefined {
  return dieta.find((day) => day.numerDnia === numerDnia);
}

export function getPosilek(day: DzienDiety, mealId: string) {
  return day.posilki.find((meal) => meal.id === mealId);
}
