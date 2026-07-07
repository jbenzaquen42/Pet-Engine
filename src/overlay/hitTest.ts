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

export function findPetAtPoint(point: Point, boxes: PetBox[]): string | null {
  for (let index = boxes.length - 1; index >= 0; index -= 1) {
    const box = boxes[index];
    const inside =
      point.x >= box.x && point.x <= box.x + box.width && point.y >= box.y && point.y <= box.y + box.height;
    if (inside) {
      return box.id;
    }
  }
  return null;
}
