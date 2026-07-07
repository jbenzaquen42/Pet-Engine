export interface Point {
  x: number;
  y: number;
}

export interface PetBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export function findPetAtPoint(point: Point, boxes: PetBox[], padding = 0): string | null {
  for (let index = boxes.length - 1; index >= 0; index -= 1) {
    const box = boxes[index];
    const inside =
      point.x >= box.x - padding &&
      point.x <= box.x + box.width + padding &&
      point.y >= box.y - padding &&
      point.y <= box.y + box.height + padding;
    if (inside) {
      return box.id;
    }
  }
  return null;
}
