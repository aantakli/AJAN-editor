from http import client
import sys
from webbrowser import get

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
import json
import math
import asyncio
import multiprocessing
# import keyboard
from helpers import hex_to_rgb, cubic_bezier_curve, get_direction, parse_agents
from jumping import make_pedestrian_jump
from decision_box_manager import DecisionBoxManager
from bs4 import BeautifulSoup


app = Flask(__name__)

car_models_path = os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', 'public', 'assets', 'carjan', 'car_models.json')

with open(car_models_path, 'r') as f:
    vehicle_models = json.load(f)

app_data = {}
turtle_data_store = Graph()
app.logger.setLevel(logging.INFO)

actor_list = []
agent_speeds = {}
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
    Setzt den Ankerpunkt basierend auf dem Karten-Namen and zeigt einen blauen Debug-Punkt an.

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

    # draw debug für den Ankerpunkt
    world.debug.draw_string(
        anchor_point,
        "O",
        draw_shadow=False,
        color=carla.Color(0, 0, 255),
        life_time=10000  # Dauerhaft sichtbar
    )

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

def set_spectator_view(world, location, rotation):
    spectator = world.get_spectator()
    transform = carla.Transform(location, rotation)
    spectator.set_transform(transform)
    print(f"Spectator set at position {location} with rotation {rotation}")

def get_anchor_point(mapName):
    if mapName == "map01":
        return carla.Location(x=240, y=57.5, z=0.1)

def generate_agent_for_entity(entity):
    """
    Generates an agent for a given entity based on its behaviors.

    :param entity: A dictionary representing the entity with at least "label" and optionally "behavior".
    :return: The name of the agent if successful, None otherwise.
    """
    # Agent-Name aus Entity extrahieren
    agent_name = entity.get("label", "unknown")
    if not agent_name:
        print("Entity does not have a valid label.")
        return None

    # Verhalten (Behaviors) dynamisch erkennen
    behavior = entity.get("behavior")
    if isinstance(behavior, str):
        # Einzelnes Behavior in Liste umwandeln
        behaviors = [behavior]
    elif isinstance(behavior, list):
        # Liste von Behaviors direkt übernehmen
        behaviors = behavior
    else:
        # Kein gültiges Behavior angegeben
        print(f"No valid behavior found for entity {entity['entity']}.")
        return None

    result = generate_actor(agent_name, behaviors)

    # Erfolgsprüfung
    if result["status"] == "success":
        print(f"Successfully generated agent '{agent_name}' with behaviors: {behaviors}")
        return agent_name
    else:
        print(f"Failed to generate AJAN agent for entity {entity['entity']}: {result['message']}")
        return None


def get_carla_entity_by_ajan_id(ajan_entity_id):
    global actor_list
    for mapping in actor_list:
        if mapping["ajan_agent_id"] == ajan_entity_id:
            return mapping["carla_entity_id"]
    return None

def make_walker_move_forward(ajan_entity_id):
    global actor_list, carla_client, agent_speeds
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
    speed = agent_speeds.get(walker.id, 1.5)  # Standardgeschwindigkeit
    walker_control = carla.WalkerControl(direction=direction, speed=speed)

    # Steuerung auf den Walker anwenden
    walker.apply_control(walker_control)
    print(f"Walker mit ID '{carla_entity_id}' läuft vorwärts mit Geschwindigkeit {speed} m/s.")

def get_next_waypoint(path, walker_location, ajan_entity_id):
    global pathsPerEntity
    """
    Bestimmt den nächsten Wegpunkt im Pfad basierend auf der aktuellen Position des Walkers
    and gibt die Carla Location des Wegpunkts zurück.
    """

    if ajan_entity_id not in pathsPerEntity or not pathsPerEntity[ajan_entity_id]:
        print(f"No path found for AJAN entity ID '{ajan_entity_id}' or path is empty.")
        return None

    # Hole den nächsten Wegpunkt aus pathsPerEntity
    next_waypoint = pathsPerEntity[ajan_entity_id].pop(0)

    # Berechne die Carla Location des nächsten Wegpunkts
    try:
        next_waypoint_location = get_carla_location_from_waypoint(next_waypoint)
        return next_waypoint_location
    except Exception as e:
        print(f"Error calculating Carla location for waypoint: {e}")
        return None

def follow_bezier_curve(walker, bezier_points, async_request_uri):
    """
    Lässt den Walker entlang einer Bezier-Kurve laufen, überprüft auf Kollisionen und teleportiert ihn basierend auf seiner Blickrichtung.
    """
    global carla_client, agent_speeds

    # Collision Sensor erstellen und anhängen
    blueprint_library = carla_client.get_world().get_blueprint_library()
    collision_sensor_bp = blueprint_library.find('sensor.other.collision')
    collision_sensor = carla_client.get_world().spawn_actor(collision_sensor_bp, carla.Transform(), attach_to=walker)

    collision_detected = False

    # Callback für Kollision
    def on_collision(event):
        nonlocal collision_detected
        collision_detected = True
        print("Kollision erkannt!")
        print(f"Kollidiert mit: {event.other_actor.type_id}")
        print(f"Impuls: {event.normal_impulse}")

        # Walker-Position und Blickrichtung abrufen
        current_transform = walker.get_transform()
        current_location = current_transform.location
        forward_vector = current_transform.get_forward_vector()  # Vorwärtsrichtung basierend auf der Blickrichtung

        # Walker leicht nach vorne und oben teleportieren
        walker.set_location(carla.Location(
            x=current_location.x + forward_vector.x * 0.2,  # Nach vorne
            y=current_location.y + forward_vector.y * 0.2,
            z=current_location.z + 0.5  # Leicht nach oben
        ))
        collision_detected = False  # Zurücksetzen, um weiterzulaufen

    collision_sensor.listen(on_collision)

    # Walker der Bezier-Kurve folgen lassen
    try:
        for point in bezier_points:
            direction = get_direction(walker.get_location(), point)
            speed = agent_speeds.get(walker.id, 1.5)
            walker.apply_control(carla.WalkerControl(direction=direction, speed=speed))

            while walker.get_location().distance(point) > 1:  # Warte, bis der Walker den Punkt erreicht
                if collision_detected:
                    print("Walker wurde teleportiert, Bewegung wird fortgesetzt.")
                time.sleep(0.05)

        print(f"Walker '{walker}' hat das Ende des Pfads erreicht.")
        send_async_request(async_request_uri)
    finally:
        collision_sensor.destroy()

    return True

def get_follows_path_for_entity(ajan_entity_id):
    global entityList, paths
    print("\n in get_follows_path_for_entity: \n")
    print("entity list: ", entityList)
    print("paths: ", paths)
    entity = next((entity for entity in entityList if entity["label"] == ajan_entity_id), None)
    if entity:
        return next((path for path in paths if path["path"] == entity["followsPath"]), None)

def send_async_success(async_request_uri):
    """
    Sends a success response to the provided async request URI.
    """
    if async_request_uri:
        data = '<http://carla.org> <http://hasStatus> <http://success> .'
        headers = {'Content-Type': 'text/turtle'}
        url = 'http://localhost:8080/ajan/agents/Carla?capability=' + async_request_uri
        response = requests.post(url, data=data, headers=headers)
        if response.status_code == 200:
            print(f"Successfully sent success response to {async_request_uri}")
        else:
            print(f"Failed to send success response to {async_request_uri}: {response.status_code}")

def get_carla_location_from_waypoint(waypoint):

    global anchor_point
    cell_width = 4.0
    cell_height = 4.0
    offset_x = -5.5
    offset_y = -3.0
    half_cell_offset_y = -cell_width / 2
    half_cell_offset_x = 0

    # Berechne die Carla-Koordinaten des Wegpunkts
    waypoint_x = (float(waypoint["y"]) + offset_y) * cell_height + half_cell_offset_y
    waypoint_y = (float(waypoint["x"]) + offset_x) * cell_width + half_cell_offset_x

    # Adjust the waypoint location based on the positionInCell attribute
    position_in_cell = waypoint.get("positionInCell", "middle-center")
    if position_in_cell == "top-left":
        waypoint_x -= cell_height / 3
        waypoint_y -= cell_width / 3
    elif position_in_cell == "middle-left":
        waypoint_x -= cell_height / 3
    elif position_in_cell == "bottom-left":
        waypoint_x -= cell_height / 3
        waypoint_y += cell_width / 3
    elif position_in_cell == "top-center":
        waypoint_y -= cell_width / 3
    elif position_in_cell == "bottom-center":
        waypoint_y += cell_width / 3
    elif position_in_cell == "top-right":
        waypoint_x += cell_height / 3
        waypoint_y -= cell_width / 3
    elif position_in_cell == "middle-right":
        waypoint_x += cell_height / 3
    elif position_in_cell == "bottom-right":
        waypoint_x += cell_height / 3
        waypoint_y += cell_width / 3

    waypoint_location = carla.Location(
        x=anchor_point.x + waypoint_y,
        y=anchor_point.y - waypoint_x,
        z=anchor_point.z + 0.5
    )

    return waypoint_location

# ! Loaders

def load_paths(paths, entities, show_paths):
    global carla_client, anchor_point
    cell_width = 4.0  # Einheitsgröße für die Breite der Zellen
    world = carla_client.get_world()
    follows_paths = set()
    for entity in entities:
        if isinstance(entity.get('followsPath', None), str):
            follows_paths.add(entity['followsPath'])  # Füge die Pfad-ID zum Set hinzu

    # Nur die Pfade berücksichtigen, die von den Entitäten verfolgt werden
    filtered_paths = [path for path in paths if path["path"] in follows_paths]


    for path in filtered_paths:
        path_color_hex = path.get("color")  # Farbe des Pfads
        path_color_rgb = hex_to_rgb(path_color_hex)  # Farbe von Hex nach RGB umwandeln

        # Extrahiere r, g, b and caste sie als int
        r, g, b = path_color_rgb
        path_color = carla.Color(r, g, b)

        waypoint_locations = []  # Liste für alle Wegpunkt-Positionen

        # Erster Durchlauf: Berechne Wegpunkt-Positionen and speichere sie
        for waypoint in path["waypoints"]:
            waypoint_location = get_carla_location_from_waypoint(waypoint)

            # Füge die Wegpunkt-Position zur Liste hinzu
            waypoint_locations.append(waypoint_location)

            # Zeichne den Debug-Punkt für diesen Wegpunkt
            world.debug.draw_string(
                waypoint_location,
                "O",
                draw_shadow=False,
                color=carla.Color(255, 0, 200),
                life_time=1000  # Dauerhaft sichtbar
            )

        if show_paths == "true":
          # Berechne die Bezier-Kurve and zeichne sie
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

def load_grid(grid_width=12, grid_height=12, cw=5, ch=5):
    global carla_client, anchor_point
    world = carla_client.get_world()
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

        # Vertauschte Achsen and kleinere Zellen
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
    global carla_client, anchor_point, actor_list, pathsPerEntity

    world = carla_client.get_world()
    blueprint_library = world.get_blueprint_library()
    cell_width = 4.0  # Einheitsgröße für die Breite der Zellen
    cell_height = 4.0  # Einheitsgröße für die Höhe der Zellen

    offset_x = -5.5  # Basierend auf der Grid-Verschiebung in X-Richtung
    offset_y = -3.0  # Basierend auf der Grid-Verschiebung in Y-Richtung

    # Initiale halbe Zellenverschiebung, um die Entitäten in der Mitte der Zellen zu platzieren
    half_cell_offset_y = -cell_width / 2
    half_cell_offset_x = 0

    spawned_entities = set()  # Verhindert doppelte Spawns


    for entity in entities:
        entity_id = entity["entity"]

        # Überprüfen, ob die Entity schon gespawned wurde
        if (entity_id in spawned_entities) or (entity["label"] == "null"):
            print(f"Skipping duplicate entity: {entity_id}")
            continue

        # Berechne neue Position basierend auf dem Ankerpunkt, den Skalierungsfaktoren and dem Offset
        new_x = (float(entity["y"]) + offset_y) * cell_height + half_cell_offset_y  # Vertikal (spawnPointY -> y + Offset)
        new_y = (float(entity["x"]) + offset_x) * cell_width + half_cell_offset_x  # Horizontal (spawnPointX -> x + Offset)
        spawn_location = carla.Location(
            x=anchor_point.x + new_y,  # x-Offset
            y=anchor_point.y - new_x,  # y-Offset (invertiert für CARLA-Koordinaten)
            z=anchor_point.z + 1  # Leicht über dem Boden
        )

        print("spawn location: ", spawn_location)

        # Bestimme die Rotation (Heading)
        heading = entity.get("heading", None)
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

        pedestrian_actor = None
        vehicle_actor = None

        # Spawne die Entität (Pedestrian or Vehicle)
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
                agent_speeds[pedestrian_actor.id] = 1.5

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

            agent_speeds[vehicle_actor.id] = 5
            if vehicle_actor:
                print(f"Vehicle '{entity['label']}' spawned at: {spawn_location} with rotation: {rotation}")
                spawned_entities.add(entity_id)
            else:
                print(f"Failed to spawn Vehicle '{entity['label']}' at: {spawn_location}")


        if ("followsPath" in entity):
            follows_path = entity["followsPath"]
            matching_path = next((p for p in paths if p["path"] == follows_path), None)

            if matching_path:
                pathsPerEntity[entity["label"]] = list(matching_path["waypoints"])
        print("Pedestrian actor id: ", pedestrian_actor.id)


def load_camera(camera_position):
    global carla_client, anchor_point
    """
    Setzt die Kameraposition relativ zum gegebenen anchor_point.

    :param world: Die CARLA-Weltinstanz
    :param anchor_point: Der global definierte Ankerpunkt als carla.Location
    :param camera_position: Die gewünschte Kameraposition ('up', 'down', 'left', 'right', 'birdseye')
    """
    world = carla_client.get_world()
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

def load_decisionboxes():
    global carla_client, anchor_point

    # Define the Decision Box coordinates relative to the grid offsets
    start_x = 6  # Initial X offset
    start_y = 2  # Initial Y offset
    end_x = 4    # End X offset
    end_y = 5    # End Y offset

    # Z-coordinate range for the Decision Box
    min_z = 0.5
    max_z = 8

    # CARLA world reference
    world = carla_client.get_world()

    # Grid scaling and offsets
    cell_width = 4.0
    cell_height = 4.0
    offset_x = -5.5
    offset_y = -3.0
    half_cell_offset_x = 0
    half_cell_offset_y = -cell_width / 2

    # Compute the corners of the Decision Box using the offset and scaling system
    box_corners = [
        carla.Location(
            x=anchor_point.x + ((start_x + offset_x) * cell_width + half_cell_offset_x),
            y=anchor_point.y - ((start_y + offset_y) * cell_height + half_cell_offset_y),
            z=min_z
        ),
        carla.Location(
            x=anchor_point.x + ((start_x + offset_x) * cell_width + half_cell_offset_x),
            y=anchor_point.y - ((end_y + offset_y) * cell_height + half_cell_offset_y),
            z=min_z
        ),
        carla.Location(
            x=anchor_point.x + ((end_x + offset_x) * cell_width + half_cell_offset_x),
            y=anchor_point.y - ((end_y + offset_y) * cell_height + half_cell_offset_y),
            z=min_z
        ),
        carla.Location(
            x=anchor_point.x + ((end_x + offset_x) * cell_width + half_cell_offset_x),
            y=anchor_point.y - ((start_y + offset_y) * cell_height + half_cell_offset_y),
            z=min_z
        ),
    ]

    # Debug: Print corner positions for validation
    for i, corner in enumerate(box_corners):
        print(f"Corner {i+1}: x={corner.x}, y={corner.y}, z={corner.z}")

    # Draw the Decision Box in CARLA
    for i in range(len(box_corners)):
        start_bottom = box_corners[i]
        end_bottom = box_corners[(i + 1) % len(box_corners)]

        # Draw bottom face
        world.debug.draw_line(
            start_bottom, end_bottom, thickness=0.05, color=carla.Color(200, 0, 100, 80), life_time=0
        )

        # Draw top face
        start_top = carla.Location(x=start_bottom.x, y=start_bottom.y, z=max_z)
        end_top = carla.Location(x=end_bottom.x, y=end_bottom.y, z=max_z)
        world.debug.draw_line(
            start_top, end_top, thickness=0.05, color=carla.Color(200, 0, 100, 80), life_time=0
        )

        # Draw vertical lines connecting bottom and top
        world.debug.draw_line(
            start_bottom, start_top, thickness=0.05, color=carla.Color(200, 0, 100, 80), life_time=0
        )

    print("Decision Box loaded and displayed.")

    # Instantiate and initialize the DecisionBoxManager
    manager = DecisionBoxManager(world, box_corners)
    manager.create_trigger_box()

    def monitor_decision_box(manager):
      while True:
          manager.check_trigger_box()
          time.sleep(0.1)  # Überprüfungsfrequenz

    monitor_thread = threading.Thread(target=monitor_decision_box, args=(manager,))
    monitor_thread.daemon = True
    monitor_thread.start()

def unload_stuff():
    global carla_client
    world = carla_client.get_world()
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
        global carla_client
        world = carla_client.get_world()
        # Deaktivieren der entsprechenden Objektkategorien
        object_labels = [
            carla.CityObjectLabel.Other,  # Dies könnte Bushaltestellen, Mülleimer, usw. umfassen
            carla.CityObjectLabel.Static,  # Statische Objekte, die nicht spezifiziert sind
            carla.CityObjectLabel.Vegetation,  # Bäume, Sträucher, etc.
            carla.CityObjectLabel.Fences, # Zäune
            carla.CityObjectLabel.RoadLines,  # Straßenmarkierungen
            carla.CityObjectLabel.Poles,  # Laternenpfähle, Verkehrsschilder, etc.
            carla.CityObjectLabel.TrafficSigns,  # Verkehrsschilder,
            carla.CityObjectLabel.Dynamic,  # Dynamische Objekte wie Fahrzeuge and Fußgänger,
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
    global carla_client, agent_speeds
    direction = getDirection(pedestrian, waypoint)
    # set pedestrian speed
    speed = agent_speeds.get(pedestrian.id, 1.5)
    pedestrian.apply_control(carla.WalkerControl(direction=direction, speed=speed))
    while True:
        if distance_check(pedestrian, waypoint, 1.0):
            print("Pedestrian reached waypoint")
            send_async_request(async_request_uri)
            break
        time.sleep(0.1)

def get_actor_blueprints(filter, generation):
    global carla_client
    world = carla_client.get_world()
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

def get_speed_information(request):
    """
    Parses the speed information from the request.
    """
    speed = None

    request_data = request.data.decode('utf-8')

    # Parsen der RDF-Daten mit rdflib
    g = rdflib.Graph()
    g.parse(data=request_data, format='turtle')

    # Extrahiere die Speed-Information
    query_speed = """
    PREFIX actn: <http://www.ajan.de/actn#>
    SELECT ?speed WHERE {
        ?action actn:speed ?speed .
    }
    """
    speed_result = g.query(query_speed)
    for row in speed_result:
        speed = float(row.speed)

    return speed

def get_direction_information(request):
    """
    Parses the direction information from the request.
    """
    direction = None

    request_data = request.data.decode('utf-8')

    # Parsen der RDF-Daten mit rdflib
    g = rdflib.Graph()
    g.parse(data=request_data, format='turtle')

    # Extrahiere die Direction-Information
    query_direction = """
    PREFIX actn: <http://www.ajan.de/actn#>
    SELECT ?direction WHERE {
        ?action actn:direction ?direction .
    }
    """
    direction_result = g.query(query_direction)
    for row in direction_result:
        direction = str(row.direction)

    return direction

def get_waypoint_information(request):
    """
    Parses the waypoint information from the request.
    """
    waypoint_data = {
        "x": None,
        "y": None,
        "positionInCell": None
    }

    request_data = request.data.decode('utf-8')

    # Parsen der RDF-Daten mit rdflib
    g = rdflib.Graph()
    g.parse(data=request_data, format='turtle')

    # Extrahiere die Waypoint-Informationen
    query_waypoint = """
    PREFIX actn: <http://www.ajan.de/actn#>
    SELECT ?x ?y ?positionInCell WHERE {
        ?waypoint actn:x ?x .
        ?waypoint actn:y ?y .
        ?waypoint actn:positionInCell ?positionInCell .
    }
    """

    waypoint_result = g.query(query_waypoint)
    for row in waypoint_result:
        waypoint_data["x"] = int(row.x)
        waypoint_data["y"] = int(row.y)
        waypoint_data["positionInCell"] = str(row.positionInCell)

    return waypoint_data

def get_path_information(request):
    """
    Parses the new path to follow.
    """
    path = None

    request_data = request.data.decode('utf-8')

    # Parsen der RDF-Daten mit rdflib
    g = rdflib.Graph()
    g.parse(data=request_data, format='turtle')

    # Extrahiere die Path-Information
    query_newpath = """
    PREFIX actn: <http://www.ajan.de/actn#>
    SELECT ?newPath WHERE {
        ?action actn:newPath ?newPath .
    }
    """
    path_result = g.query(query_newpath)
    for row in path_result:
        path = str(row.newPath)

    return path

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

        # Entferne alle vorhandenen Entities (Fahrzeuge and Fußgänger)
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
    try:
        if len(actor_list) == 0:
            print(" !=!=!=!=!=! Keine Actor-Liste vorhanden.")
        if len(pathsPerEntity) == 0:
            print(" !=!=!=!=!=! Keine Pfade pro Entity vorhanden.")

        # Extrahiere die AJAN-Agent-ID und andere Informationen aus der Anfrage
        ajan_entity_id, async_request_uri = getInformation(request)

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
        if not path or len(path["waypoints"]) < 2:
            print(f"Pfad für AJAN-Agent-ID '{ajan_entity_id}' ist leer oder ungültig.")
            return jsonify({"status": "error", "message": "Invalid path"}), 400

        # Finde den aktuellen Standort des Fußgängers
        walker_location = walker.get_location()
        print("\nWalker location: ", walker_location)

        end_point = get_next_waypoint(path["waypoints"], walker_location, ajan_entity_id)

        start_point = walker_location

        print(f"Start point: {start_point}")
        print(f"End point: {end_point}")

        if not end_point:
            print("Am Ziel angekommen.")
            return jsonify({"status": "error", "message": "No end point found"}), 400
        #asdasd
        control_point_1 = carla.Location(
            x=start_point.x + (end_point.x - start_point.x) / 2,
            y=start_point.y,
            z=start_point.z
        )
        control_point_2 = carla.Location(
            x=end_point.x - (end_point.x - start_point.x) / 2,
            y=end_point.y,
            z=end_point.z
        )

        print(f"Control point 1: {control_point_1}")
        print(f"Control point 2: {control_point_2}")

        # Berechne die Punkte auf der Bezier-Kurve
        bezier_points = cubic_bezier_curve(start_point, control_point_1, control_point_2, end_point)

        # Zeichne die Bezier-Kurve in Weiß
        for i in range(len(bezier_points) - 1):
            world.debug.draw_line(
                bezier_points[i],
                bezier_points[i + 1],
                thickness=0.01,
                color=carla.Color(255, 255, 255),  # Weiß
                life_time=1000.0
            )

        # Start a new process for follow_bezier_curve
        follow_line = threading.Thread(target=follow_bezier_curve, args=(walker, bezier_points, async_request_uri))
        follow_line.start()

        # Return an RDF triple immediately
        return Response('<http://Agent> <http://follows> <http://path> .', mimetype='text/turtle', status=200)

    except Exception as e:
        print(f"Error in follow_path: {str(e)}")
        return Response('<http://Agent> <http://followsNot> <http://path> .', mimetype='text/turtle', status=500)

@app.route('/wait', methods=['POST'])
def wait():
    ajan_entity_id, async_request_uri = getInformation(request)

    # Get CARLA entity ID from mapping
    carla_entity_id = get_carla_entity_by_ajan_id(ajan_entity_id)
    if not carla_entity_id:
        print(f"No CARLA entity found with AJAN ID '{ajan_entity_id}'")
        return jsonify({"status": "error", "message": "Entity not found"}), 404

    # Get entity
    entity = world.get_actor(carla_entity_id)
    if not entity:
        print(f"No entity found with CARLA ID '{carla_entity_id}'")
        return jsonify({"status": "error", "message": "Entity not found"}), 404

    def wait_and_stop(entity, async_request_uri):
        while True:
            # Check entity type and apply appropriate control
            if isinstance(entity, carla.Walker):
                # Handle pedestrian
                entity.apply_control(carla.WalkerControl(
                    speed=0.0,
                    direction=carla.Vector3D(0,0,0),
                    jump=False
                ))
                send_async_request(async_request_uri)
                break

            elif isinstance(entity, carla.Vehicle):
                # Handle vehicle
                vehicle_control = carla.VehicleControl()
                vehicle_control.brake = 1.0
                vehicle_control.throttle = 0.0
                entity.apply_control(vehicle_control)
                while entity.get_velocity() > 0.1:
                    time.sleep(0.1)
                send_async_request(async_request_uri)
                break

            time.sleep(1)  # Wait for 1 second before checking again

    # Start a new thread for waiting
    wait_thread = threading.Thread(target=wait_and_stop, args=(entity, async_request_uri))
    wait_thread.start()

    # Return an RDF triple immediately
    return Response('<http://Agent> <http://waits> <http://indefinitely> .', mimetype='text/turtle', status=200)

@app.route('/follow_direction', methods=['POST'])
def follow_direction():
    global carla_client
    try:
        # Extract information from request
        ajan_entity_id, async_request_uri = getInformation(request)
        carla_entity_id = get_carla_entity_by_ajan_id(ajan_entity_id)

        if not carla_entity_id:
            print(f"No CARLA entity found with AJAN ID '{ajan_entity_id}'")
            return jsonify({"status": "error", "message": "CARLA Entity not found"}), 404

        # Get the walker actor
        world = carla_client.get_world()
        walker = world.get_actor(carla_entity_id)

        if not walker:
            print(f"No walker found with CARLA ID '{carla_entity_id}'")
            return jsonify({"status": "error", "message": "Walker not found"}), 404

        # Parse the direction from request JSON
        direction_input = get_direction_information(request)
        # trim input
        direction_input = direction_input.strip()

        print(f"\n\nDirection input: {direction_input}")
        print(f"Direction input type: {type(direction_input)}")
        print(f"Length of direction input: {len(direction_input)}")
        if direction_input not in ["Up", "Down", "Left", "Right"]:
            return jsonify({"status": "error", "message": "Invalid direction. Must be one of: Up, Down, Left, Right"}), 400
        print("After if")
        # Map the direction to a CARLA Vector3D
        direction_map = {
            "Up": carla.Vector3D(-1, 0, 0),  # x-
            "Down": carla.Vector3D(1, 0, 0),  # x+
            "Left": carla.Vector3D(0, 1, 0),  # y+
            "Right": carla.Vector3D(0, -1, 0)  # y-
        }
        direction = direction_map[direction_input]
        print(f"Direction: {direction}")
        # Function to move the pedestrian in a thread
        def move_walker(walker, direction, async_request_uri):
            print(f"Walker {walker.id} moving in direction {direction_input}")
            walker.apply_control(carla.WalkerControl(direction=direction, speed=1.5))

            print(f"Walker {walker.id}  moving indefinetely in direction {direction_input}")

        # Start movement in a new thread
        movement_thread = threading.Thread(target=move_walker, args=(walker, direction, async_request_uri))
        movement_thread.start()
        print(f"Movement thread started for walker {walker.id}")

        # Return immediate response
        return Response('<http://Agent> <http://follows> <http://direction> .', mimetype='text/turtle', status=200)

    except Exception as e:
        print(f"Error in follow_direction: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/adjust_speed', methods=['POST'])
def adjust_speed():
    global agent_speeds
    try:
        ajan_entity_id, ununsed = getInformation(request)
        carla_entity_id = get_carla_entity_by_ajan_id(ajan_entity_id)

        if not carla_entity_id:
            print(f"No CARLA entity found with AJAN ID '{ajan_entity_id}'")
            return jsonify({"status": "error", "message": "CARLA Entity not found"}), 404

        new_speed = get_speed_information(request)

        if new_speed is None or new_speed < 0:
            print("Invalid speed value, using default speed value of 1.5 m/s")
            new_speed = 1.5

        agent_speeds[carla_entity_id] = new_speed

        return Response('<http://Agent> <http://waits> <http://indefinitely> .', mimetype='text/turtle', status=200)

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/check_waypoint_proximity', methods=['POST'])
def check_waypoint_proximity():
    global carla_client
    try:
        # Extract information from request
        ajan_entity_id, async_request_uri = getInformation(request)
        carla_entity_id = get_carla_entity_by_ajan_id(ajan_entity_id)

        if not carla_entity_id:
            print(f"No CARLA entity found with AJAN ID '{ajan_entity_id}'")
            return jsonify({"status": "error", "message": "CARLA Entity not found"}), 404

        # Get the walker actor
        world = carla_client.get_world()
        walker = world.get_actor(carla_entity_id)

        if not walker:
            print(f"No walker found with CARLA ID '{carla_entity_id}'")
            return jsonify({"status": "error", "message": "Walker not found"}), 404

        # Parse the direction from request JSON
        waypoint = get_waypoint_information(request)

        if not waypoint:
            return jsonify({"status": "error", "message": "Invalid direction. Must be one of: Up, Down, Left, Right"}), 400

        waypoint_location = get_carla_location_from_waypoint(waypoint)

        # Function to move the pedestrian in a thread
        def move_walker(walker, waypoint_location, async_request_uri):


            while True:
              walker_location = walker.get_location()
              distance = walker_location.distance(waypoint_location)
              if distance < 1.0:
                  print(f"Walker {walker.id} reached the waypoint within 1 meter radius.")
                  send_async_request(async_request_uri)
                  break

              time.sleep(0.1)

        # Start movement in a new thread
        movement_thread = threading.Thread(target=move_walker, args=(walker, waypoint_location, async_request_uri))
        movement_thread.start()

        # Return immediate response
        return Response('<http://Agent> <http://follows> <http://direction> .', mimetype='text/turtle', status=200)

    except Exception as e:
        print(f"Error in follow_direction: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/change_path', methods=['POST'])
def change_path():
    global pathsPerEntity, paths, entityList
    try:
        print("Current paths per entity: ", pathsPerEntity)
        print("Current paths: ", paths)
        print("Current entity list: ", entityList)
        # Extract information from request
        ajan_entity_id, async_request_uri = getInformation(request)

        # Get CARLA entity ID from mapping
        carla_entity_id = get_carla_entity_by_ajan_id(ajan_entity_id)
        if not carla_entity_id:
            print(f"No CARLA entity found with AJAN ID '{ajan_entity_id}'")
            return jsonify({"status": "error", "message": "Entity not found"}), 404

        # Get entity
        entity = world.get_actor(carla_entity_id)
        if not entity:
            print(f"No entity found with CARLA ID '{carla_entity_id}'")
            return jsonify({"status": "error", "message": "Entity not found"}), 404

        new_path = get_path_information(request)
        # Update the pathsPerEntity dictionary
        pathsPerEntity[ajan_entity_id] = list(new_path["waypoints"])
        print(f"New path for entity {ajan_entity_id}: {pathsPerEntity[ajan_entity_id]}")
        print("Updated paths per entity: ", pathsPerEntity)
        # Return an RDF triple immediately
        return Response('<http://Agent> <http://follows> <http://newPath> .', mimetype='text/turtle', status=200)

    except Exception as e:
        print(f"Error in change_path: {str(e)}")
        return Response('<http://Agent> <http://followsNot> <http://newPath> .', mimetype='text/turtle', status=500)

@app.route('/check_decision_point', methods=['POST'])

@app.route('/check_vehicle_proximity', methods=['POST'])

@app.route('/turn_head', methods=['POST'])

def get_grid_cell(location):
    """
    Determines the grid cell based on the given location.
    """
    global anchor_point
    cell_width = 4.0
    cell_height = 4.0
    offset_x = -5.5
    offset_y = -3.0

    x = int((location.y - anchor_point.y) / cell_width - offset_x)
    y = int((location.x - anchor_point.x) / cell_height - offset_y)

    return x, y


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

        # Extrahiere die Hauptszenarionamen and Szenariodetails
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


        # Lade die Welt basierend auf der Map and den Entitäten
        load_world(weather, scenario_map)
        if (load_layers == "false"):
            unload_stuff()
        print("world loaded")

        # Setze den Ankerpunkt für die Karte
        set_anchor_point(scenario_map)

        # Lade die Waypoints and Pfade
        load_paths(paths, entities, show_paths)
        print("paths loaded")

        # Lade Entitäten
        load_entities(entities, paths)
        print("entities loaded")

        # Lade die Kamera
        load_camera(camera_position)
        print("camera loaded")

        load_decisionboxes()
        print("decision boxes loaded")

        # Füge das Gitter hinzu, falls gewünscht
        if (show_grid == "true"):
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

@app.route('/proxy', methods=['GET'])
def proxy():
    target_url = request.args.get('url')
    if not target_url:
        return "Missing URL parameter", 400

    # Request the target page
    response = requests.get(target_url)
    if response.status_code != 200:
        return f"Failed to fetch {target_url}", response.status_code

    # Parse the content and extract the desired div
    soup = BeautifulSoup(response.text, 'html.parser')
    split_middle = soup.find(id="split-middle")
    if split_middle is None:
        return "Div with ID 'split-middle' not found", 404

    # Return the extracted content
    return Response(str(split_middle), content_type='text/html')

if __name__ == '__main__':
    app.run(host="127.0.0.1", port=5000)
