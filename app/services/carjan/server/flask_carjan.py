import sys

sys.stdout = open(sys.stdout.fileno(), 'w', buffering=1)

from requestAJAN import destroy_actor, generate_actor, send_data, send_initialKnowledge
from flask import Flask, Response, jsonify, request
from rdflib import Graph, URIRef, Literal, Namespace, RDF
import subprocess
import rdflib
import carla
import logging
import time
import numpy as np
import requests
import threading
import logging
import os
from dotenv import load_dotenv
import socket
import psutil
from math import factorial
import math
import json
import re
# import keyboard

app = Flask(__name__)

car_models_path = os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', 'public', 'assets', 'carjan', 'car_models.json')

with open(car_models_path, 'r') as f:
    vehicle_models = json.load(f)

app_data = {}
turtle_data_store = Graph()
app.logger.setLevel(logging.INFO)
actor_list = []

anchor_point = None
carla_client = None
world = None
blueprint_library = None
current_map = None
entityList = []
paths = []
pathsPerEntity = {}

seen_actors = set()

global_async_uri = None


VEHICLE = Namespace("http://carla.org/vehicle/")
PEDESTRIAN = Namespace("http://carla.org/pedestrian/")
LOCATION = Namespace("http://carla.org/location/")
BASE = Namespace("http://carla.org/")

# ! Helpers and Utilities
# * Implements helper functions and utilities
# * for the CARJAN Scenario loaders

def comb(n, k):
    return factorial(n) // (factorial(k) * factorial(n - k))

def get_blueprint_id(vehicle_name):
    for category in vehicle_models.values():
        for vehicle in category:
            if vehicle['name'] == vehicle_name:
                return vehicle['blueprintId']
    return None

def get_spectator_coordinates():
    # Angenommen, du hast bereits ein `world`-Objekt in CARLA
    spectator = world.get_spectator()  # Spectator-Kamera aus der CARLA-Welt holen
    location = spectator.get_location()  # Hole die Position der Kamera
    print(f"Spectator coordinates: x={location.x}, y={location.y}, z={location.z}")

def listen_for_enter_key():
    while True:
        if keyboard.is_pressed('enter'):
            get_spectator_coordinates()

def set_anchor_point(map_name):
    """
    Setzt den Ankerpunkt basierend auf dem Karten-Namen und zeigt einen blauen Debug-Punkt an.

    :param world: Die CARLA-Weltinstanz
    :param map_name: Der Name der Karte
    :return: Der Ankerpunkt als carla.Location
    """
    global anchor_point, world

    if map_name == "map04":
        anchor_point = carla.Location(x=102.7, y=131.35, z=0.1)
    else:
        # Fallback für unbekannte Karten
        anchor_point = carla.Location(x=240, y=57.5, z=0.1)

    print(f"Anchor point set to: x={anchor_point.x}, y={anchor_point.y}, z={anchor_point.z}")
    return anchor_point

def is_port_in_use(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('localhost', port)) == 0

def kill_process_on_port(port):
    for proc in psutil.process_iter(['pid', 'name', 'connections']):
        for conn in proc.info['connections']:
            if conn.laddr.port == port:
                print(f"Killing process {proc.info['name']} (PID {proc.info['pid']}) on port {port}")
                proc.kill()
                break

def getInformation(request):
    ajan_entity_id = None
    async_request_uri = None

    request_data = request.data.decode('utf-8')

    # Parsen der RDF-Daten mit rdflib
    g = rdflib.Graph()
    g.parse(data=request_data, format='turtle')

    # Extrahiere die asynchrone Request-URI
    query_uri = """
    PREFIX actn: <http://www.ajan.de/actn#>
    SELECT ?requestURI WHERE {
        ?action actn:asyncRequestURI ?requestURI .
    }
    """
    uri_result = g.query(query_uri)
    for row in uri_result:
        async_request_uri = row.requestURI

    # Extrahiere die Pedestrian-ID
    query_id = """
    PREFIX ajan: <http://www.ajan.de/ajan-ns#>
    SELECT ?id WHERE {
        ?s ajan:agentId ?id
    }
    """
    id_result = g.query(query_id)
    ajan_entity_id = None
    for row in id_result:
        ajan_entity_id = str(row.id)

    return ajan_entity_id, async_request_uri

def hex_to_rgb(hex_color):
    """Hilfsfunktion zur Konvertierung von Hex-Farbwerten in RGB-Werte für CARLA."""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def set_spectator_view(world, location, rotation):
    spectator = world.get_spectator()
    transform = carla.Transform(location, rotation)
    spectator.set_transform(transform)
    print(f"Spectator set at position {location} with rotation {rotation}")

def get_anchor_point(mapName):
    if mapName == "map01":
        return carla.Location(x=240, y=57.5, z=0.1)

def generate_agent_for_entity(entity):
    agent_name = entity.get("label", "unknown")
    result = generate_actor(agent_name)

    if result["status"] == "success":
        return agent_name
    else:
        print(f"Failed to generate AJAN agent for entity {entity['entity']}: {result['message']}")
        return None

def get_carla_entity_by_ajan_id(ajan_entity_id):
    global actor_list
    print("actor list: ", actor_list)
    for mapping in actor_list:
        if mapping["ajan_agent_id"] == ajan_entity_id:
            return mapping["carla_entity_id"]
    return None

def make_walker_move_forward(ajan_entity_id, speed=1.5):
    global actor_list, carla_client
    print("actor list: ", actor_list)
    world = carla_client.get_world()
    print("Carla actors list: ", world.get_actors())
    # Abrufen der CARLA-Entitäts-ID
    carla_entity_id = get_carla_entity_by_ajan_id(ajan_entity_id)

    if not carla_entity_id:
        print(f"Kein CARLA-Entity mit AJAN-Agent-ID '{ajan_entity_id}' gefunden.")
        return

    # Abrufen des CARLA-Agenten (Walker)
    walker = world.get_actor(carla_entity_id)

    if not walker:
        print(f"CARLA-Agent mit ID '{carla_entity_id}' existiert nicht in der Welt.")
        return

    # Vorwärtsbewegung des Walkers definieren
    direction = carla.Vector3D(1.0, 0.0, 0.0)  # Vorwärts in X-Richtung
    walker_control = carla.WalkerControl(direction=direction, speed=speed)

    # Steuerung auf den Walker anwenden
    walker.apply_control(walker_control)
    print(f"Walker mit ID '{carla_entity_id}' läuft vorwärts mit Geschwindigkeit {speed} m/s.")

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

def get_next_waypoint(path, walker_location):
    """
    Bestimmt den nächsten Wegpunkt im Pfad basierend auf der aktuellen Position des Walkers.
    """
    print("\n in get_next_waypoint: \n")
    print("path: ", path)
    print("walker_location: ", walker_location)
    waypoints = path.get("waypoints", [])
    if not waypoints:
        return None, None

    closest_index = None
    closest_distance = float("inf")

    # Finde den nächsten Wegpunkt basierend auf der Entfernung
    for i, waypoint in enumerate(waypoints):
        waypoint_location = carla.Location(
            x=float(waypoint["x"]),
            y=float(waypoint["y"]),
            z=walker_location.z  # Halte die Z-Koordinate konstant
        )
        distance = walker_location.distance(waypoint_location)
        if distance < closest_distance:
            closest_distance = distance
            closest_index = i

    # Überprüfe, ob ein nächster Wegpunkt existiert
    if closest_index is not None and closest_index < len(waypoints) - 1:
        next_waypoint_index = closest_index + 1
        next_waypoint = waypoints[next_waypoint_index]
        return next_waypoint_index, next_waypoint

    # Wenn wir am Ende des Pfads sind
    return None, None

def follow_bezier_curve(walker, bezier_points, speed):
    for point in bezier_points:
        direction = carla.Vector3D(
            x=point.x - walker.get_location().x,
            y=point.y - walker.get_location().y,
            z=point.z - walker.get_location().z
        )
        length = math.sqrt(direction.x**2 + direction.y**2 + direction.z**2)
        direction.x /= length
        direction.y /= length
        direction.z /= length

        walker.apply_control(carla.WalkerControl(direction=direction, speed=speed))
        time.sleep(0.1)  # Kontrollintervall

def get_follows_path_for_entity(ajan_entity_id):
    global entityList, paths
    print("\n in get_follows_path_for_entity: \n")
    print("entity list: ", entityList)
    print("paths: ", paths)
    entity = next((entity for entity in entityList if entity["label"] == ajan_entity_id), None)
    if entity:
        return next((path for path in paths if path["path"] == entity["followsPath"]), None)

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

# ! Loaders
# * Implement different parts of loading the CARJAN Scenario

def load_grid(grid_width=12, grid_height=12, cw=5, ch=5):
    global carla_client, world, anchor_point
    try:
        carla_client.set_timeout(10.0)
        cell_width = cw*0.8
        cell_height = ch*0.8
        # Farben
        grid_color = carla.Color(50, 200, 50)  # Dunkleres Grün

        # Erhalte die aktuelle Position der Kamera
        spectator = world.get_spectator()
        camera_transform = spectator.get_transform()
        camera_location = camera_transform.location

        if anchor_point:
            center_x = anchor_point.x
            center_y = anchor_point.y
            center_z = 0.2  # Setze das Grid knapp über den Boden
        else:
            raise ValueError("Anchor point not found for the given map name.")

        # Vertauschte Achsen und kleinere Zellen
        for i in range(grid_height + 1):
            # Vertikale Linien (auf der Y-Achse)
            start_y = center_y + i * cell_height - (grid_height * cell_height / 2)
            start_x = center_x - (grid_width * cell_width / 2)
            end_x = center_x + (grid_width * cell_width / 2)

            start_loc = carla.Location(start_x, start_y, center_z)
            end_loc = carla.Location(end_x, start_y, center_z)
            world.debug.draw_line(start_loc, end_loc, thickness=0.02, color=grid_color)

        for j in range(grid_width + 1):
            # Horizontale Linien (auf der X-Achse)
            start_x = center_x + j * cell_width - (grid_width * cell_width / 2)
            start_y = center_y - (grid_height * cell_height / 2)
            end_y = center_y + (grid_height * cell_height / 2)

            start_loc = carla.Location(start_x, start_y, center_z)
            end_loc = carla.Location(start_x, end_y, center_z)
            world.debug.draw_line(start_loc, end_loc, thickness=0.02, color=grid_color)

        return {"status": "Grid drawn successfully with 1:1 ratio, adjusted size and corrected axes"}

    except Exception as e:
        print(f"Error in load_grid: {str(e)}")
        return {"error": str(e)}

def load_world(weather, camera_position):
    global carla_client, world
    try:
        if carla_client is None:
            raise ValueError("CARLA client is not initialized. Start CARLA first.")

        # Lade die Welt
        world = carla_client.load_world('Town01_Opt')

        # Setze das Wetter
        if weather == "Clear":
            world.set_weather(carla.WeatherParameters.ClearNoon)
        elif weather == "Rainy":
            world.set_weather(carla.WeatherParameters.WetCloudyNoon)
        elif weather == "Cloudy":
            world.set_weather(carla.WeatherParameters.CloudySunset)
        else:
            raise ValueError(f"Invalid weather type: {weather}")

        print(f"Weather set to: {weather}")

        # Kamera-Position könnte hier angepasst werden, falls benötigt
        print(f"Camera position set to: {camera_position}")
        return True

    except Exception as e:
        print(f"Error in load_world: {e}")
        return False

def load_entities(entities, paths):
    global world, anchor_point, actor_list, pathsPerEntity
    blueprint_library = world.get_blueprint_library()
    cell_width = 4.0  # Einheitsgröße für die Breite der Zellen
    cell_height = 4.0  # Einheitsgröße für die Höhe der Zellen

    offset_x = -5.5  # Basierend auf der Grid-Verschiebung in X-Richtung
    offset_y = -3.0  # Basierend auf der Grid-Verschiebung in Y-Richtung

    # Initiale halbe Zellenverschiebung, um die Entitäten in der Mitte der Zellen zu platzieren
    half_cell_offset_y = -cell_width / 2
    half_cell_offset_x = 0

    spawned_entities = set()  # Verhindert doppelte Spawns

    print(f"Processing entities: {entities}")

    for entity in entities:
        entity_id = entity["entity"]

        # Überprüfen, ob die Entity schon gespawned wurde
        if entity_id in spawned_entities:
            print(f"Skipping duplicate entity: {entity_id}")
            continue

        # Berechne neue Position basierend auf dem Ankerpunkt, den Skalierungsfaktoren und dem Offset
        new_x = (float(entity["y"]) + offset_y) * cell_height + half_cell_offset_y  # Vertikal (spawnPointY -> y + Offset)
        new_y = (float(entity["x"]) + offset_x) * cell_width + half_cell_offset_x  # Horizontal (spawnPointX -> x + Offset)
        spawn_location = carla.Location(
            x=anchor_point.x + new_y,  # x-Offset
            y=anchor_point.y - new_x,  # y-Offset (invertiert für CARLA-Koordinaten)
            z=anchor_point.z + 1  # Leicht über dem Boden
        )

        # Bestimme die Rotation (Heading)
        heading = entity.get("heading", None)
        print("heading: ", heading)
        rotation = carla.Rotation(pitch=0, yaw=0)

        if heading:
            if heading == "North":
              rotation = carla.Rotation(pitch=0, yaw=-180)
            elif heading == "North-East":
              rotation = carla.Rotation(pitch=0, yaw=-135)
            elif heading == "East":
              rotation = carla.Rotation(pitch=0, yaw=-90)
            elif heading == "South-East":
              rotation = carla.Rotation(pitch=0, yaw=-45)
            elif heading == "South":
              rotation = carla.Rotation(pitch=0, yaw=0)
            elif heading == "South-West":
              rotation = carla.Rotation(pitch=0, yaw=45)
            elif heading == "West":
              rotation = carla.Rotation(pitch=0, yaw=90)
            elif heading == "North-West":
              rotation = carla.Rotation(pitch=0, yaw=135)
            elif heading == "path":
                # Wenn der Entity "path" folgt, dann berechne die Richtung des ersten Waypoints des Pfades
                follows_path = entity.get("followsPath", None)
                if follows_path:
                    # Finde den zugehörigen Pfad
                    path = next((p for p in paths if p["path"] == follows_path), None)
                    if path and path["waypoints"]:
                        # Hole den ersten Waypoint des Pfades
                        first_waypoint = path["waypoints"][0]
                        waypoint_x = (float(first_waypoint["y"]) + offset_y) * cell_height + half_cell_offset_y
                        waypoint_y = (float(first_waypoint["x"]) + offset_x) * cell_width + half_cell_offset_x
                        waypoint_location = carla.Location(
                            x=anchor_point.x + waypoint_y,
                            y=anchor_point.y - waypoint_x,
                            z=anchor_point.z + 0.5  # Leicht über dem Boden
                        )
                        world.debug.draw_string(
                            waypoint_location,
                            "O",
                            draw_shadow=False,
                            color=carla.Color(255, 0, 200),
                            life_time=1000  # Dauerhaft sichtbar
                        )

                        # Berechne die Richtung (Yaw) zum ersten Waypoint
                        direction_x = waypoint_location.x - spawn_location.x
                        direction_y = waypoint_location.y - spawn_location.y
                        yaw = math.degrees(math.atan2(direction_y, direction_x))  # Berechne den Winkel (Yaw)
                        rotation = carla.Rotation(pitch=0, yaw=yaw)
                        print(f"Calculated rotation: {rotation}")

        pedestrian_actor = None
        vehicle_actor = None

        # Spawne die Entität (Pedestrian oder Vehicle)
        if entity["type"] == "Pedestrian":
            model = entity.get("model")
            if model is None or model == "null":
                model = "0001"
            entity["model"] = model
            model_suffix = entity["model"][-4:] if len(entity["model"]) >= 4 else "0001"
            pedestrian_model = f"walker.pedestrian.{model_suffix}"
            pedestrian_blueprint = blueprint_library.find(pedestrian_model)

            pedestrian_transform = carla.Transform(spawn_location, rotation)
            pedestrian_actor = world.try_spawn_actor(pedestrian_blueprint, pedestrian_transform)

            ajan_agent_id = generate_agent_for_entity(entity)
            if ajan_agent_id:
                actor_list.append({
                    "carla_entity_id": pedestrian_actor.id,
                    "ajan_agent_id": ajan_agent_id
                })
                print(f"Mapped CARLA entity {pedestrian_actor.id} to AJAN agent {ajan_agent_id}")
                print(f"\nActor list: {actor_list}")

            if pedestrian_actor:
                if(entity["label"]):
                  print(f"Pedestrian '{entity['label']}' spawned at: {spawn_location} with rotation: {rotation}")
                spawned_entities.add(entity_id)  # Markiere die Entity als gespawned
            else:
                print(f"Failed to spawn Pedestrian '{entity['label']}' at: {spawn_location}")

        elif entity["type"] == "Vehicle":
            vehicle_blueprint = blueprint_library.find(get_blueprint_id(entity["model"]))
            vehicle_transform = carla.Transform(spawn_location, rotation)
            vehicle_actor = world.try_spawn_actor(vehicle_blueprint, vehicle_transform)

            ajan_agent_id = generate_agent_for_entity(entity)
            if ajan_agent_id:
                actor_list.append({
                    "carla_entity_id": vehicle_actor.id,
                    "ajan_agent_id": ajan_agent_id
                })
                print(f"Mapped CARLA entity {vehicle_actor.id} to AJAN agent {ajan_agent_id}")
                print(f"\nActor list: {actor_list}")


            if vehicle_actor:
                print(f"Vehicle '{entity['label']}' spawned at: {spawn_location} with rotation: {rotation}")
                spawned_entities.add(entity_id)  # Markiere die Entity als gespawned
            else:
                print(f"Failed to spawn Vehicle '{entity['label']}' at: {spawn_location}")


        if ("followsPath" in entity):
            follows_path = entity["followsPath"]
            matching_path = next((p for p in paths if p["path"] == follows_path), None)

            if matching_path:
                pathsPerEntity[entity["entity"]] = list(matching_path["waypoints"])
                print(f"Pfad '{follows_path}' für Entity '{entity['entity']}' zugeordnet.")
        print("Pedestrian actor id: ", pedestrian_actor.id)

    print(f"Pfade pro Entity: {pathsPerEntity}")

def load_paths(paths, entities, show_paths):
    global carla_client, world, anchor_point
    cell_width = 4.0  # Einheitsgröße für die Breite der Zellen
    cell_height = 4.0  # Einheitsgröße für die Höhe der Zellen

    offset_x = -5.5  # Basierend auf der Grid-Verschiebung in X-Richtung
    offset_y = -3.0  # Basierend auf der Grid-Verschiebung in Y-Richtung

    half_cell_offset_y = -cell_width / 2
    half_cell_offset_x = 0

    follows_paths = set()
    for entity in entities:
        if isinstance(entity.get('followsPath', None), str):
            follows_paths.add(entity['followsPath'])  # Füge die Pfad-ID zum Set hinzu

    # Nur die Pfade berücksichtigen, die von den Entitäten verfolgt werden
    filtered_paths = [path for path in paths if path["path"] in follows_paths]


    for path in filtered_paths:
        path_color_hex = path.get("color")  # Farbe des Pfads
        path_color_rgb = hex_to_rgb(path_color_hex)  # Farbe von Hex nach RGB umwandeln

        # Extrahiere r, g, b und caste sie als int
        r, g, b = path_color_rgb
        path_color = carla.Color(r, g, b)

        waypoint_locations = []  # Liste für alle Wegpunkt-Positionen

        # Erster Durchlauf: Berechne Wegpunkt-Positionen und speichere sie
        for waypoint in path["waypoints"]:
            waypoint_x = (float(waypoint["y"]) + offset_y) * cell_height + half_cell_offset_y
            waypoint_y = (float(waypoint["x"]) + offset_x) * cell_width + half_cell_offset_x
            waypoint_location = carla.Location(
                x=anchor_point.x + waypoint_y,
                y=anchor_point.y - waypoint_x,
                z=anchor_point.z + 0.5  # Leicht über dem Boden
            )

            # Füge die Wegpunkt-Position zur Liste hinzu
            waypoint_locations.append(waypoint_location)

            # Zeichne den Debug-Punkt für diesen Wegpunkt
            world.debug.draw_string(
                waypoint_location,
                "O",
                draw_shadow=False,
                color=path_color,
                life_time=1000  # Dauerhaft sichtbar
            )

        if show_paths == "true":
          # Berechne die Bezier-Kurve und zeichne sie
          if len(waypoint_locations) > 1:
              for i in range(len(waypoint_locations) - 1):
                  start_point = waypoint_locations[i]
                  end_point = waypoint_locations[i + 1]

                  # Berechne den Richtungsvektor zwischen den beiden Punkten
                  direction_x = end_point.x - start_point.x
                  direction_y = end_point.y - start_point.y

                  # Berechne die Länge des Richtungsvektors
                  length = math.sqrt(direction_x**2 + direction_y**2)

                  # Normalisiere den Richtungsvektor
                  direction_x /= length
                  direction_y /= length

                  # Berechne die Kontrollpunkte, basierend auf der Drittelregel
                  cp1_x = start_point.x + (end_point.x - start_point.x) / 2
                  cp1_y = start_point.y  # Y bleibt konstant

                  cp2_x = end_point.x - (end_point.x - start_point.x) / 2
                  cp2_y = end_point.y  # Y bleibt konstant

                  control_point_1 = carla.Location(cp1_x, cp1_y, start_point.z)
                  control_point_2 = carla.Location(cp2_x, cp2_y, end_point.z)

                  # Zeichne die Kontrollpunkte als rote "O"s
                  # world.debug.draw_string(control_point_1, "O", draw_shadow=False, color=carla.Color(255, 0, 0), life_time=1000)
                  # world.debug.draw_string(control_point_2, "O", draw_shadow=False, color=carla.Color(255, 0, 0), life_time=1000)

                  # Berechne die Punkte auf der Bezierkurve für das Segment
                  curve_points = cubic_bezier_curve(start_point, control_point_1, control_point_2, end_point)

                  # Zeichne die Linie zwischen den Punkten der Bezierkurve
                  for j in range(len(curve_points) - 1):
                      start = curve_points[j]
                      end = curve_points[j + 1]

                      world.debug.draw_line(
                          start,
                          end,
                          thickness=0.1,
                          color=path_color,
                          life_time=1000  # Dauerhaft sichtbar
                      )

          print(f"Path '{path['description']}' processed with color {path_color_hex}.\n")

def load_camera(camera_position):
    global world, anchor_point
    """
    Setzt die Kameraposition relativ zum gegebenen anchor_point.

    :param world: Die CARLA-Weltinstanz
    :param anchor_point: Der global definierte Ankerpunkt als carla.Location
    :param camera_position: Die gewünschte Kameraposition ('up', 'down', 'left', 'right', 'birdseye')
    """
    spectator = world.get_spectator()

    base_location = anchor_point

    if camera_position == 'down':
        new_location = carla.Location(base_location.x - 40, base_location.y, base_location.z + 20)
        rotation = carla.Rotation(pitch=-25, yaw=0)

    elif camera_position == 'up':
        new_location = carla.Location(base_location.x + 40, base_location.y, base_location.z + 20)
        rotation = carla.Rotation(pitch=-25, yaw=180)

    elif camera_position == 'left':
        new_location = carla.Location(base_location.x, base_location.y + 30, base_location.z + 10)
        rotation = carla.Rotation(pitch=-10, yaw=-90)

    elif camera_position == 'right':
        new_location = carla.Location(base_location.x, base_location.y - 30, base_location.z+ 10)
        rotation = carla.Rotation(pitch=-10, yaw=90)

    elif camera_position == 'birdseye':
        new_location = carla.Location(base_location.x, base_location.y, base_location.z + 30)
        rotation = carla.Rotation(pitch=-90, yaw=0)

    else:
        new_location = base_location
        rotation = carla.Rotation(pitch=0, yaw=0)

    spectator.set_transform(carla.Transform(new_location, rotation))
    print(f"Camera set to {camera_position} position: {new_location} with rotation: {rotation}")

def unload_stuff():
    global world
    unloadList = [
            carla.MapLayer.NONE,
            carla.MapLayer.Buildings,
            carla.MapLayer.Decals,
            carla.MapLayer.Foliage,
            carla.MapLayer.Ground,
            carla.MapLayer.ParkedVehicles,
            carla.MapLayer.Particles,
            carla.MapLayer.StreetLights,
            carla.MapLayer.Walls,
        ]

    print("Unloading map layers...")

    for layer in unloadList:
        world.unload_map_layer(layer)

    def disable_specific_objects():
        global world
        # Deaktivieren der entsprechenden Objektkategorien
        object_labels = [
            carla.CityObjectLabel.Other,  # Dies könnte Bushaltestellen, Mülleimer, usw. umfassen
            carla.CityObjectLabel.Static,  # Statische Objekte, die nicht spezifiziert sind
            carla.CityObjectLabel.Vegetation,  # Bäume, Sträucher, etc.
            carla.CityObjectLabel.Fences, # Zäune
            carla.CityObjectLabel.RoadLines,  # Straßenmarkierungen
            carla.CityObjectLabel.Poles,  # Laternenpfähle, Verkehrsschilder, etc.
            carla.CityObjectLabel.TrafficSigns,  # Verkehrsschilder,
            carla.CityObjectLabel.Dynamic,  # Dynamische Objekte wie Fahrzeuge und Fußgänger,
        ]

        for label in object_labels:
            env_objs = world.get_environment_objects(label)
            env_obj_ids = [obj.id for obj in env_objs]
            try:
                world.enable_environment_objects(env_obj_ids, False)
            except RuntimeError as e:
                print(f"Error disabling objects of type {label}: {e}")

    disable_specific_objects()

    # Set roads to gray color
    for blueprint in world.get_blueprint_library().filter('static.prop.street.*'):
        print(f"Setting road texture to gray for {blueprint.id}")
        world.get_blueprint_library().find(blueprint.id).set_attribute('texture', 'none')

# ! Actions
# * Implements actions for Behavior Tree Node Endpoints
# TODO Implement actions

# * async uri
def send_async_request(async_request_uri):
    print(f"Sending async request to {async_request_uri}")
    data = '<http://carla.org/pedestrian> <http://at> <http://waypoint> .'
    headers = {'Content-Type': 'text/turtle'}
    return requests.post(async_request_uri, data=data, headers=headers)

# ? rather in behavior tree?
def isUnsafe(pedestrian, vehicle, async_request_uri):

    def obstacle_callback(event):
        if event.other_actor.id not in seen_actors:
            print(f"Found new actor: ID={event.other_actor.id}, Type={event.other_actor.type_id}")
            seen_actors.add(event.other_actor.id)
            if event.other_actor.type_id == 'walker.pedestrian.0007':
                action_thread = threading.Thread(target=walkToWaypoint, args=(pedestrian, waypoint3, async_request_uri))
                action_thread.start()
                print("Event callback for pedestrian")
                time.sleep(0.5)
                send_async_request(async_request_uri)

    print("Checking if crossing is unsafe")
    obstacle_sensor_bp = blueprint_library.find('sensor.other.obstacle')
    obstacle_sensor_bp.set_attribute('distance', '100')
    obstacle_sensor_bp.set_attribute('hit_radius', '7')
    obstacle_sensor_bp.set_attribute('only_dynamics', 'True')
    sensor_transform = carla.Transform(carla.Location(x=0.7, z=2.5), carla.Rotation(yaw=90))
    obstacle_sensor = world.spawn_actor(obstacle_sensor_bp, sensor_transform, attach_to=vehicle)
    actor_list.append(obstacle_sensor)
    obstacle_sensor.listen(obstacle_callback)
    '''
    while True:
        if pedestrian.get_location().z < 1.05 and distance_check(pedestrian, vehicle.get_location(), 20):
            print("Crossing is unsafe")
            pedestrian.apply_control(carla.WalkerControl(speed=0.0))
            print("Reverting crossing")
            send_unsafe_info()
            action_thread = threading.Thread(target=walkToWaypoint, args=(pedestrian, waypoint3, async_request_uri))
            action_thread.start()
            break
        time.sleep(0.1)
    '''

# * distance check
def distance_check(actor, target_location, threshold):
    actor_location = actor.get_location()
    distance = actor_location.distance(target_location)
    return distance < threshold

# * pedestrian on road
def is_pedestrian_on_road(pedestrian):
    pedestrian_location = pedestrian.get_location()
    waypoint = current_map.get_waypoint(pedestrian_location)

    return waypoint and waypoint.lane_type == carla.LaneType.Driving

# * sprint
def sprint_to(pedestrian, location, speed):

    print(f'Pedestrian location: {pedestrian.get_location()}')
    print(f'Location: {location}')

    # Berechne die Richtung zum Bus
    pedestrian_location = pedestrian.get_location()
    direction = carla.Vector3D(
        x=location.x - pedestrian_location.x,
        y=location.y - pedestrian_location.y,
        z=location.z - pedestrian_location.z
    )
    # Normiere die Richtung
    length = np.sqrt(direction.x**2 + direction.y**2 + direction.z**2)
    direction.x /= length
    direction.y /= length
    direction.z /= length

    # Setze die Geschwindigkeit des Fußgängers
    pedestrian.apply_control(carla.WalkerControl(direction=direction, speed=speed))  # Sprinten mit 5.0 m/s
    while pedestrian.get_location().distance(location) > 1:
        time.sleep(0.1)

# * steer direction
def getDirection(pedestrian, waypoint):
    pedestrian_location = pedestrian.get_location()
    direction = carla.Vector3D(
        x=waypoint.x - pedestrian_location.x,
        y=waypoint.y - pedestrian_location.y,
        z=waypoint.z - pedestrian_location.z
    )
    # normalize direction
    length = np.sqrt(direction.x**2 + direction.y**2 + direction.z**2)
    direction.x /= length
    direction.y /= length

    return direction

def send_unsafe_info():
    print("Sending unsafe info")
    url = 'http://localhost:8080/ajan/agents/Carla?capability=DataTransfer'
    data = '''@prefix carla: <http://www.carla.org/> .
    carla:Pedestrian carla:unsafe carla:True .'''

    headers = {'Content-Type': 'application/trig'}
    response = requests.post(url, data=data, headers=headers)

    if response.status_code == 200:
        print('POST > send_revert_info successful')
    else:
        print('POST > send_revert_info failed', response.status_code)

def send_newCrossingRequest():
    print("Sending new crossing request")
    url = 'http://localhost:8080/ajan/agents/Carla?capability=ICTS-Endpoint'

    headers = {'Content-Type': 'application/trig'}
    response = requests.post(url, data='', headers=headers)

    if response.status_code == 200:
        print('POST > send_newCrossingRequest successful')
    else:
        print('POST > send_newCrossingRequest failed', response.status_code)

def walkToWaypoint(pedestrian, waypoint, async_request_uri):
    direction = getDirection(pedestrian, waypoint)
    # set pedestrian speed
    pedestrian.apply_control(carla.WalkerControl(direction=direction, speed = 1.42))
    while True:
        if distance_check(pedestrian, waypoint, 1.0):
            pedestrian.apply_control(carla.WalkerControl(speed=0.0))
            print("Pedestrian reached waypoint")
            send_async_request(async_request_uri)
            break
        time.sleep(0.1)

def get_actor_blueprints(world, filter, generation):
    bps = world.get_blueprint_library().filter(filter)

    if generation.lower() == "all":
        return bps

    if len(bps) == 1:
        return bps

    try:
        int_generation = int(generation)
        if int_generation in [1, 2, 3]:
            bps = [x for x in bps if int(x.get_attribute('generation')) == int_generation]
            return bps
        else:
            print("   Warning! Actor Generation is not valid. No actor will be spawned.")
            return []
    except:
        print("   Warning! Actor Generation is not valid. No actor will be spawned.")
        return []

def execMain():
    url = 'http://localhost:8080/ajan/agents/Carla?capability=Carla-AJAN'
    data = ''''''

    headers = {'Content-Type': 'application/trig'}
    response = requests.post(url, data=data, headers=headers)

    if response.status_code == 200:
        print('Execute Main successful')
    else:
        print('Execute Main failed')
        print(response.text)
        print(response.status_code)

# ! Routes
# * Implements routes for Behavior Tree Node Endpoints

@app.route('/set_async_uri', methods=['POST'])
def set_async_uri():
    global global_async_uri
    data = request.json
    global_async_uri = data.get('async_uri')
    return jsonify({"message": "Async URI updated"}), 200

@app.route('/execute_main', methods=['GET','POST'])
def execute_main():
    execMain()
    return Response('<http://carla.org> <http://execute> <http://main> .', mimetype='text/turtle', status=200)

@app.route('/walk_to_waypoint', methods=['POST'])
def walk_to_waypoint():
  pedestrian, async_request_uri = getInformation(request)
  print(pedestrian)

   # if pedestrian and vehicle and async_request_uri:
    #    print("Walking to waypoint")
        # Starten der Aktion in einem separaten Thread
     #   action_thread = threading.Thread(target=walkToWaypoint, args=(pedestrian, waypoint1, async_request_uri))
    #    action_thread.start()
    #else:
    #    print("Not walking to waypoint")

  print("Walking to waypoint PLACEHOLDER")
  return Response('<http://carla.org> <http://walk> <http://toWaypoint> .', mimetype='text/turtle', status=200)

@app.route('/walk_random', methods=['POST'])
def walk_random():
    pedestrian, vehicle, async_request_uri = getInformation(request)
    #waypoints = [waypoint1, waypoint2, waypoint3, waypoint_bus]
    #pedestrian_location = pedestrian.get_location()
    #nearest = min(waypoints, key=lambda x: pedestrian_location.distance(x))
    # disregard nearest waypoint
    #waypoints.remove(nearest)
    # choose random between waypoint1, waypoint2, waypoint 3 and spawn point of pedestrian
    if pedestrian and vehicle and async_request_uri:
        print("Walking randomly")
        #waypoint = np.random.choice(waypoints)
        waypoint = waypoint2
        action_thread = threading.Thread(target=walkToWaypoint, args=(pedestrian, waypoint, async_request_uri))
        action_thread.start()

    return Response('<http://carla.org> <http://walk> <http://random> .', mimetype='text/turtle', status=200)

@app.route('/revert', methods=['POST'])
def revert():
    global actor_list
    ajan_entity, async_request_uri = getInformation(request)
    print("AJAN Entity: ", ajan_entity)
    print("Async request URI: ", async_request_uri)
    actor = get_carla_entity_by_ajan_id(ajan_entity)
    print("\n ======= CARLA Entity by AJAN ID: ", actor)
    make_walker_move_forward(ajan_entity)
    send_async_request(async_request_uri)
    return Response('<http://carla.org> <http://confirm> <http://action> .', mimetype='text/turtle', status=200)
    # pedestrian, vehicle, async_request_uri = getInformation(request)
    # if pedestrian and vehicle and async_request_uri:
    #     print("Reverting crossing")
    #     action_thread = threading.Thread(target=walkToWaypoint, args=(pedestrian, waypoint3, async_request_uri))
    #     action_thread.start()
    # return Response('<http://carla.org> <http://revert> <http://action> .', mimetype='text/turtle', status=200)

@app.route('/restart', methods=['POST'])
def restart():
    return Response('<http://carla.org> <http://restart> <http://tree> .', mimetype='text/turtle', status=200)

# ? Optimize
@app.route('/unsafe', methods=['POST'])
def unsafe():
    pedestrian, vehicle, async_request_uri = getInformation(request)
    if pedestrian and vehicle and async_request_uri:
        print("===")
        action_thread = threading.Thread(target=isUnsafe, args=(pedestrian, vehicle, async_request_uri))
        action_thread.start()
    return Response('<http://carla.org> <http://unsafe> <http://crossing> .', mimetype='text/turtle', status=200)

@app.route('/walkToBus', methods=['POST'])
def walkToBus():
    pedestrian, vehicle, async_request_uri = getInformation(request)
    if pedestrian and vehicle and async_request_uri:
        print("Walking to bus station")
        action_thread = threading.Thread(target=walkToWaypoint, args=(pedestrian, waypoint_bus, async_request_uri))
        action_thread.start()
    return Response('<http://carla.org> <http://walk> <http://toBus> .', mimetype='text/turtle', status=200)

# ? Add variable for timer
@app.route('/idle_wait', methods=['POST'])
def idleWait():
    ajan_entity, async_request_uri = getInformation(request)
    print("AJAN entity: ", ajan_entity)
    print("Async request URI: ", async_request_uri)

    time.sleep(5)
    return Response('<http://example.org> <http://has> <http://data2.org> .', mimetype='text/turtle', status=200)

@app.route("/hi", methods=["GET"])
def hi():
    return "Hello, World!"

@app.route('/health_check', methods=['GET'])
def health_check():
    return jsonify({"status": "OK"}), 200

@app.route('/send_data', methods=['GET'])
def send_data():
    result = generate_actor("PeTESTrian")

    if result["status"] == "success":
        return jsonify({"status": "success", "message": result["message"]}), 200

    else:
        return jsonify({"status": "error", "message": result["message"]}), 400

@app.route('/reset_carla', methods=['GET'])
def reset_carla():
    global carla_client
    try:
        world = carla_client.reload_world()

        # Setze die Karte zurück (lädt die Standardkarte)
        map_name = "Town01"  # Du kannst hier eine andere Standardkarte festlegen, falls nötig
        carla_client.load_world(map_name)

        # Setze das Wetter zurück (auf klare Bedingungen)
        weather = carla.WeatherParameters.ClearNoon
        world.set_weather(weather)

        # Entferne alle vorhandenen Entities (Fahrzeuge und Fußgänger)
        actors = world.get_actors()
        for actor in actors:
            if actor.type_id.startswith('vehicle') or actor.type_id.startswith('walker.pedestrian'):
                actor.destroy()

        # Setze die Kamera zurück (auf eine Standardposition über dem Ursprung)
        spectator = world.get_spectator()
        transform = carla.Transform(carla.Location(x=0, y=0, z=50), carla.Rotation(pitch=-90))
        spectator.set_transform(transform)

        return jsonify({"status": "Carla environment reset to default settings"})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/start_agent', methods=['POST'])
def start_agent():
    try:
        data = request.json
        entity_id = data.get('id')

        if not entity_id:
            return jsonify({"status": "error", "message": "No entity ID provided"}), 400

        print(f"Sending data to AJAN agent for entity: {entity_id}")

        # Beispiel-Daten, die an AJAN gesendet werden sollen
        example_data = {
            "id": entity_id,
            "type": "pedestrian",
            "timestamp": "2024-10-09T10:00:00Z",
            "location": {
                "x": 1.5,
                "y": 2.5,
                "z": 0.0
            }
        }

        send_data(example_data)  # Nutzt die `send_data`-Funktion aus requestAJAN.py

        return jsonify({"status": "success", "message": f"Data sent for {entity_id}"})
    except Exception as e:
        print(f"Error in send_data: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

# ! TODO
#   TODO
#   TODO

@app.route('/follow_path', methods=['POST'])
def follow_path():
    global actor_list, pathsPerEntity, paths, entityList
    print("\n ==== Following path ==== \n")
    print("Actor list: ", actor_list)
    print("Paths per entity: ", pathsPerEntity)

    # Extrahiere die AJAN-Agent-ID und andere Informationen aus der Anfrage
    ajan_entity_id, async_request_uri = getInformation(request)

    # Finde die entsprechende CARLA-Entity
    carla_entity_id = get_carla_entity_by_ajan_id(ajan_entity_id)
    if not carla_entity_id:
        print(f"Kein CARLA-Entity mit AJAN-Agent-ID '{ajan_entity_id}' gefunden.")
        return jsonify({"status": "error", "message": "CARLA Entity not found"}), 404

    # Abrufen des Walkers
    walker = world.get_actor(carla_entity_id)
    if not walker:
        print(f"Kein Walker mit CARLA-Entity-ID '{carla_entity_id}' gefunden.")
        return jsonify({"status": "error", "message": "Walker not found"}), 404

    # Finde den aktuellen Pfad, den der Agent verfolgt
    path = get_follows_path_for_entity(ajan_entity_id)
    print(f"Path for AJAN agent ID '{ajan_entity_id}': {path}")
    if not path or len(path["waypoints"]) < 2:
        print(f"Pfad für AJAN-Agent-ID '{ajan_entity_id}' ist leer oder ungültig.")
        return jsonify({"status": "error", "message": "Invalid path"}), 400


    print("Found path to follow: \n", path)

    # Finde den aktuellen Standort des Fußgängers
    walker_location = walker.get_location()

    # Finde den nächsten Wegpunkt
    next_waypoint_index, next_waypoint = get_next_waypoint(path, walker_location)
    if not next_waypoint:
        print(f"Kein nächster Wegpunkt für AJAN-Agent-ID '{ajan_entity_id}' gefunden.")
        return jsonify({"status": "error", "message": "No next waypoint"}), 404

    # Bewege den Walker zum nächsten Wegpunkt
    end_point = carla.Location(
        x=float(next_waypoint["x"]),
        y=float(next_waypoint["y"]),
        z=walker_location.z
    )
    walker.apply_control(carla.WalkerControl(
        direction=get_direction(walker_location, end_point),
        speed=1.5
    ))

    # Warte, bis der Walker den Ziel-Wegpunkt erreicht
    while walker.get_location().distance(end_point) > 1.0:
        time.sleep(0.1)

    # Walker hat den Wegpunkt erreicht, sende ein Signal an die async URI
    if async_request_uri:
        send_async_request(async_request_uri)
        print(f"Signal an Async-URI gesendet: {async_request_uri}")

    print(f"Walker '{carla_entity_id}' hat den Wegpunkt '{next_waypoint}' erreicht.")
    return jsonify({"status": "success", "message": "Walker reached the waypoint"}), 200

@app.route('/follow_sidewalk', methods=['POST'])

@app.route('/adjust_speed', methods=['POST'])

@app.route('/check_decision_point', methods=['POST'])

@app.route('/check_vehicle_proximity', methods=['POST'])

@app.route('/turn_head', methods=['POST'])


# ! Main Functions / Routes
# * Implements the main functions of the pipeline.

# * Starts the CARLA client and connects to it.
@app.route("/start_carla", methods=["GET"])
def start_carla():
    global carla_client, world
    try:
        if is_port_in_use(2000):
            print("Port 2000 is in use. Attempting to clear it.")
            kill_process_on_port(2000)
            time.sleep(2)

        # Laden der Umgebungsvariable für den CARLA-Pfad
        dotenv_path = os.path.join(os.path.dirname(__file__), '..', '.env')
        load_dotenv(dotenv_path=dotenv_path)
        carla_path = os.getenv("CARLA_PATH")

        # Pfad-Überprüfung
        if not carla_path:
            print("Error: CARLA path is not defined in .env file.")
            return jsonify({"error": "CARLA path is not defined in .env file"}), 400

        try:
            subprocess.Popen(carla_path)
            print("CARLA client started successfully.")
        except FileNotFoundError:
            print("Failed to start CARLA: Invalid path.")
            return jsonify({"error": "Invalid CARLA path. Please check the file path."}), 400
        except Exception as e:
            print(f"Unexpected error while starting CARLA: {e}")
            return jsonify({"error": f"Unexpected error: {str(e)}"}), 500

        try:
            time.sleep(10)
            carla_client = carla.Client("localhost", 2000)
            carla_client.set_timeout(20.0)
            world = carla_client.get_world()
            print("Connected to CARLA server on Port 2000.")
            return jsonify({"status": "CARLA started and connected successfully."}), 200

        except Exception as e:
            print(f"Failed to connect to CARLA: {e}")
            return jsonify({"error": "CARLA client started, but connection to server failed. Please check the server status."}), 500

    except Exception as e:
        print(f"An error occurred in start_carla: {e}")
        return jsonify({"error": "Internal server error occurred while starting CARLA.", "details": str(e)}), 500

# * Loads all scenario information into the CARLA world.
@app.route('/load_scenario', methods=['POST'])
def load_scenario():
    global carla_client, entityList, paths
    try:
        # Empfange JSON-Daten vom Request
        data = request.get_json()
        print("JSON data received successfully", flush=True)

        # Extrahiere die Hauptszenarionamen und Szenariodetails
        scenario_name = data.get("scenarioName")
        scenario_list = data.get("scenario", {}).get("scenarios", [])

        # Finde das spezifische Szenario in der Liste, das 'scenarioName' entspricht
        scenario = next(
            (s for s in scenario_list if s.get("scenarioName", "").split("#")[-1] == scenario_name),
            None
        )

        # Fehlerbehandlung, falls kein passendes Szenario gefunden wurde
        if scenario is None:
            return jsonify({"error": "Scenario not found in the provided data"}), 404

        # Extrahiere die benötigten Felder
        scenario_name = scenario.get("scenarioName")
        scenario_map = scenario.get("scenarioMap")
        entities = scenario.get("entities", [])
        entityList = entities
        waypoints = scenario.get("waypoints", [])
        paths = scenario.get("paths", [])
        camera_position = scenario.get("cameraPosition")
        weather = scenario.get("weather")
        show_paths = scenario.get("showPaths", "false")
        show_grid = scenario.get("showGrid", "false")
        load_layers = scenario.get("loadLayers", "false")


        # Lade die Welt basierend auf der Map und den Entitäten
        load_world(weather, scenario_map)
        if (load_layers == "false"):
            unload_stuff()
        print("world loaded")

        # Setze den Ankerpunkt für die Karte
        set_anchor_point(scenario_map)

        # Lade die Waypoints und Pfade
        load_paths(paths, entities, show_paths)
        print("paths loaded")

        # Lade Entitäten
        load_entities(entities, paths)
        print("entities loaded")

        # Lade die Kamera
        load_camera(camera_position)
        print("camera loaded")

        # Füge das Gitter hinzu, falls gewünscht
        if show_grid == "true":
            load_grid()
            print("grid loaded")

        # listen_for_enter_key()

        return jsonify({"status": "Loaded scenario successfully."}), 200

    except Exception as e:
        print(f"Error in load_scenario: {str(e)}", flush=True)
        return jsonify({"error": str(e)}), 500

@app.route('/destroy_actors', methods=['GET'])
def destroy_actors():
    try:
        agents_url = 'http://localhost:8080/ajan/agents'
        response = requests.get(agents_url)

        if response.status_code != 200:
            return jsonify({"status": "error", "message": "Failed to fetch agents"}), 500

        agents = parse_agents(response.text)  # Verwende die parse_agents-Funktion
        deleted_agents = []

        for agent in agents:
            delete_response = requests.delete(agent['url'])
            if delete_response.status_code == 200:
                deleted_agents.append(agent['id'])
            else:
                print(f"Failed to delete agent {agent['id']}: {delete_response.text}")

        return jsonify({"status": "success", "deleted_agents": deleted_agents}), 200
    except Exception as e:
        print(f"Error in destroy_actors: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500


if __name__ == '__main__':
    app.run(host="127.0.0.1", port=5000)
