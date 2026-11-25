export type Column = 'left' | 'right';

export function assignToColumns(heights: number[]): Column[] {
  let leftHeight = 0;
  let rightHeight = 0;

  return heights.map((height) => {
    if (leftHeight <= rightHeight) {
      leftHeight += height;
      return 'left';
    }

    rightHeight += height;
    return 'right';
  });
}
