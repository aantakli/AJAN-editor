import math
from math import factorial
import re
import carla

def hex_to_rgb(hex_color):
    """Hilfsfunktion zur Konvertierung von Hex-Farbwerten in RGB-Werte für CARLA."""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def cubic_bezier_curve(p0, p1, p2, p3, num_points=100):
    """
    Berechnet eine kubische Bezier-Kurve zwischen den Punkten p0, p1, p2 und p3.
    Diese Kurve wird mit den klassischen Ease-In und Ease-Out Übergängen berechnet.

    :param p0: Der Startpunkt der Kurve (carla.Location)
    :param p1: Der erste Kontrollpunkt (carla.Location)
    :param p2: Der zweite Kontrollpunkt (carla.Location)
    :param p3: Der Endpunkt der Kurve (carla.Location)
    :param num_points: Anzahl der Punkte auf der Bezierkurve
    :return: Eine Liste von carla.Location-Punkten auf der Bezierkurve
    """
    curve_points = []

    # Berechnung der Bezier-Kurve
    for t in range(num_points):
        t /= (num_points - 1)  # Normalisiere t zwischen 0 und 1
        x = (1 - t)**3 * p0.x + 3 * (1 - t)**2 * t * p1.x + 3 * (1 - t) * t**2 * p2.x + t**3 * p3.x
        y = (1 - t)**3 * p0.y + 3 * (1 - t)**2 * t * p1.y + 3 * (1 - t) * t**2 * p2.y + t**3 * p3.y
        z = (1 - t)**3 * p0.z + 3 * (1 - t)**2 * t * p1.z + 3 * (1 - t) * t**2 * p2.z + t**3 * p3.z
        curve_points.append(carla.Location(x, y, z))

    return curve_points

def get_direction(start, end):
    direction = carla.Vector3D(
        x=end.x - start.x,
        y=end.y - start.y,
        z=end.z - start.z
    )
    length = math.sqrt(direction.x**2 + direction.y**2 + direction.z**2)
    if length > 0:
        direction.x /= length
        direction.y /= length
        direction.z /= length
    return direction

def parse_agents(response_text):
    agent_pattern = re.compile(
        r"Agent\(url=(?P<url>http://[^\s,]+), id=(?P<id>[^\s,]+),"
    )

    agents = []
    for match in agent_pattern.finditer(response_text):
        agent_url = match.group("url")
        agent_id = match.group("id")
        agents.append({"url": agent_url, "id": agent_id})

    return agents
