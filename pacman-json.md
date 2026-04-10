# Pacman Game State JSON Format

Dieses Dokument beschreibt das JSON-Format für den aktuellen Spielzustand von Pacman. Das Format wird periodisch zur Konsole ausgegeben und ist für zukünftige HTTP-Push- oder WebSocket-Integrationen vorbereitet.

## Beispiel JSON

```json
{
  "timestamp": "2026-04-10T11:20:00.000Z",
  "game": {
    "score": 1250,
    "lives": 3,
    "level": 1,
    "status": "playing", 
    "totalPills": 240,
    "pillsEaten": 12,
    "powerPillActive": false,
    "powerPillTimer": 0
  },
  "pacman": {
    "x": 335,
    "y": 475,
    "gridX": 10.0,
    "gridY": 15.0,
    "direction": "L"
  },
  "ghosts": [
    {
      "name": "Blinky",
      "x": 455,
      "y": 355,
      "gridX": 14.0,
      "gridY": 11.0,
      "direction": "U",
      "status": "normal"
    },
    {
      "name": "Pinky",
      "x": 425,
      "y": 355,
      "gridX": 13.0,
      "gridY": 11.0,
      "direction": "D",
      "status": "vulnerable"
    },
    {
      "name": "Inky",
      "x": 485,
      "y": 355,
      "gridX": 15.0,
      "gridY": 11.0,
      "direction": "L",
      "status": "eyes"
    },
    {
      "name": "Clyde",
      "x": 455,
      "y": 385,
      "gridX": 14.0,
      "gridY": 12.0,
      "direction": "R",
      "status": "normal"
    }
  ],
  "remainingPills": [
    { "x": 65, "y": 55, "gridX": 1.0, "gridY": 1.0, "type": "pill" },
    { "x": 185, "y": 55, "gridX": 5.0, "gridY": 1.0, "type": "powerpill" }
  ],
  "walls": [
    { "x": 35, "y": 25, "gridX": 0.0, "gridY": 0.0 },
    { "x": 65, "y": 25, "gridX": 1.0, "gridY": 0.0 }
  ]
}
```

## Feld-Beschreibungen

### Top-Level Felder
- `timestamp`: Zeitpunkt der Datenerfassung im ISO-8601 Format.
- `game`: Allgemeine Spielmetriken.
- `pacman`: Aktueller Zustand von Pacman.
- `ghosts`: Liste der Geister und deren Zustände.
- `remainingPills`: Liste der noch im Labyrinth vorhandenen Pillen (optional/konfigurierbar).
- `walls`: Liste aller Wandpositionen im Labyrinth.

### Game Objekt (`game`)
- `score`: Aktueller Punktestand.
- `lives`: Verbleibende Leben des Spielers.
- `level`: Aktuelle Level-Nummer.
- `status`: Aktueller Spielstatus (`playing`, `paused`, `won`, `lost`, `game_over`, `ready`).
- `totalPills`: Gesamtzahl der Pillen in diesem Level beim Start.
- `pillsEaten`: Anzahl der bereits gegessenen Pillen.
- `powerPillActive`: Boolean, gibt an, ob ein Powerpill-Effekt aktiv ist.
- `powerPillTimer`: Verbleibende Zeit des Powerpill-Effekts (in Iterationen/Ticks).

### Pacman Objekt (`pacman`)
- `x`: Aktuelle X-Koordinate in Pixeln (relativ zum Maze-Container).
- `y`: Aktuelle Y-Koordinate in Pixeln.
- `gridX`: (Vorschlag) Berechnete Gitter-X-Koordinate (X-35)/30.
- `gridY`: (Vorschlag) Berechnete Gitter-Y-Koordinate (Y-25)/30.
- `direction`: Aktuelle Bewegungsrichtung (`U` = Up, `D` = Down, `L` = Left, `R` = Right).

### Ghost Objekt (`ghosts[]`)
- `name`: Name des Geists (Blinky, Pinky, Inky, Clyde).
- `x`: Aktuelle X-Koordinate in Pixeln.
- `y`: Aktuelle Y-Koordinate in Pixeln.
- `gridX`: (Vorschlag) Berechnete Gitter-X-Koordinate (X-35)/30.
- `gridY`: (Vorschlag) Berechnete Gitter-Y-Koordinate (Y-25)/30.
- `direction`: Aktuelle Bewegungsrichtung.
- `status`: Aktueller Status des Geistes (`normal`, `vulnerable` (essbar nach Powerpill), `eyes` (nur Augen nach dem Essen)).

### Pill Objekt (`remainingPills[]`)
- `x`: X-Koordinate der Pille (Pixel-basiert aus der Cell-ID).
- `y`: Y-Koordinate der Pille (Pixel-basiert aus der Cell-ID).
- `gridX`: (Vorschlag) Berechnete Gitter-X-Koordinate (X-35)/30.
- `gridY`: (Vorschlag) Berechnete Gitter-Y-Koordinate (Y-25)/30.
- `type`: Typ der Pille (`pill` für normale Pillen, `powerpill` für Power-Pillen).

### Wall Objekt (`walls[]`)
- `x`: X-Koordinate der Wand (Pixel-basiert).
- `y`: Y-Koordinate der Wand (Pixel-basiert).
- `gridX`: Berechnete Gitter-X-Koordinate (X-35)/30.
- `gridY`: Berechnete Gitter-Y-Koordinate (Y-25)/30.

## Koordinatensystem

### Herkunft der Koordinaten
Die Koordinaten (`x`, `y`) im Spiel werden in Pixeln angegeben, relativ zum Ursprung des Spielfeld-Containers (`#mazeinner`).
- Das Spielfeld ist in einem Grid organisiert, wobei jede Zelle eine Größe von **30x30 Pixeln** hat.
- Der horizontale Versatz (`h_offset`) beginnt bei **35 Pixeln**.
- Der vertikale Versatz (`v_offset`) beginnt bei **25 Pixeln**.
- Pacman und die Geister bewegen sich innerhalb dieses Grids in Schritten (Pixeln), die durch die Spielgeschwindigkeit (`moveInc`) definiert sind. Ein Wert von `moveInc = 2` bedeutet beispielsweise, dass sie sich um 2 Pixel pro Iteration bewegen.

### Alternative Darstellung (Grid-Koordinaten)
Anstatt der absoluten Pixel-Koordinaten ist eine Darstellung in **Grid-Indizes** (0, 1, 2...) für logische Operationen (z.B. KI-Steuerung oder Pfadfindung) oft sinnvoller.

**Berechnungsformel:**
- `gridX = (pixelX - 35) / 30`
- `gridY = (pixelY - 25) / 30`

**Vorteile der Grid-Darstellung:**
- Abstraktion von der visuellen Darstellung (Pixeln).
- Einfachere Indexierung für 2D-Arrays (Maze-Daten).
- Unabhängigkeit von der `moveInc`-Schrittweite für logische Vergleiche.
- Die Grid-Koordinaten können Fließkommazahlen sein (z.B. `1.5`), wenn sich eine Entität zwischen zwei Zellen befindet.

Es wird empfohlen, für Agenten-Integrationen primär auf die Grid-Koordinaten zu setzen.

## Intervall
Standardmäßig wird der Zustand alle 1000ms (1 Sekunde) zur Konsole ausgegeben.
