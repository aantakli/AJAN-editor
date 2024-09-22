export default function drawGrid(canvas) {
  const ctx = canvas.getContext("2d");

  const gridSize = 12; // Wir wollen immer ein 12x12 Grid
  const cellWidth = canvas.width / gridSize; // Dynamische Zellbreite basierend auf der Canvas-Breite
  const cellHeight = canvas.height / gridSize; // Dynamische Zellhöhe basierend auf der Canvas-Höhe

  // Lösche das Canvas vor dem Neuzeichnen
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#000";

  // Zeichne die vertikalen Linien
  for (let i = 0; i <= gridSize; i++) {
    ctx.beginPath();
    ctx.moveTo(i * cellWidth, 0);
    ctx.lineTo(i * cellWidth, canvas.height);
    ctx.stroke();
  }

  // Zeichne die horizontalen Linien
  for (let i = 0; i <= gridSize; i++) {
    ctx.beginPath();
    ctx.moveTo(0, i * cellHeight);
    ctx.lineTo(canvas.width, i * cellHeight);
    ctx.stroke();
  }
}
