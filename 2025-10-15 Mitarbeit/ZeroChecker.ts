const array = [34,5,6,14,67,42,9];
const closestToZero = array.reduce((prev, curr) =>
    Math.abs(curr) < Math.abs(prev) ? curr : prev
);
console.log(closestToZero);