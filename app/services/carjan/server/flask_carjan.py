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

app = Flask(__name__)
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
seen_actors = set()

global_async_uri = None


VEHICLE = Namespace("http://carla.org/vehicle/")
PEDESTRIAN = Namespace("http://carla.org/pedestrian/")
LOCATION = Namespace("http://carla.org/location/")
BASE = Namespace("http://carla.org/")

def set_anchor_point(map_name):
    """
    Setzt den Ankerpunkt basierend auf dem Karten-Namen und zeigt einen blauen Debug-Punkt an.

    :param world: Die CARLA-Weltinstanz
    :param map_name: Der Name der Karte
    :return: Der Ankerpunkt als carla.Location
    """
    global anchor_point, world

    if map_name == "map04":
        anchor_point = carla.Location(x=240, y=57.5, z=0.1)
    else:
        # Fallback für unbekannte Karten
        anchor_point = carla.Location(x=0, y=0, z=0)

    # Debug-Punkt anzeigen
    world.debug.draw_point(
        anchor_point,
        size=1.0,  # Größe des Punktes
        color=carla.Color(0, 0, 255),  # Blau
        life_time=60.0,  # Lebensdauer des Punktes in Sekunden
        persistent_lines=True  # Linie bleibt sichtbar
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
  pedestrian_id = None
  async_request_uri = None

  request_data = request.data.decode('utf-8')

  # Parsen der RDF-Daten mit rdflib
  g = rdflib.Graph()
  g.parse(data=request_data, format='turtle')

  # Extrahieren der asynchronen Request URI
  query_uri = """
  PREFIX actn: <http://www.ajan.de/actn#>
  SELECT ?requestURI WHERE {
      ?action actn:asyncRequestURI ?requestURI .
  }
  """
  uri_result = g.query(query_uri)
  for row in uri_result:
      async_request_uri = row.requestURI
      print(f"Async Request URI: {async_request_uri}")
  # Extrahieren der Pedestrian ID
  query_id = """
  PREFIX ajan: <http://www.ajan.de/ajan-ns#>
  SELECT ?id WHERE {
      ?s ajan:agentId ?id
  }
  """
  id_result = g.query(query_id)
  pedestrian_id = None
  for row in id_result:
      pedestrian_id = str(row.id)
      print(f"Pedestrian ID: {pedestrian_id}")

  return pedestrian_id, async_request_uri

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

def load_entities(entities, waypoints, paths):
    global world, anchor_point
    blueprint_library = world.get_blueprint_library()
    cell_width = 4.0  # Einheitsgröße für die Breite der Zellen
    cell_height = 4.0  # Einheitsgröße für die Höhe der Zellen

    offset_x = -5.5  # Basierend auf der Grid-Verschiebung in X-Richtung
    offset_y = -3.0  # Basierend auf der Grid-Verschiebung in Y-Richtung

    # Initiale halbe Zellenverschiebung, um die Entitäten in der Mitte der Zellen zu platzieren
    half_cell_offset_x = - cell_width / 2
    half_cell_offset_y = 0

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
            z=anchor_point.z + 0.5  # Leicht über dem Boden
        )

        # Zeichne einen Debug-Kreis an der Spawnposition
        world.debug.draw_point(
            spawn_location,
            size=0.3,
            color=carla.Color(0, 0, 255),  # Blau
            life_time=10.0,  # Sichtbar für 10 Sekunden
            persistent_lines=False
        )

        if entity["type"] == "Pedestrian":
            # Dynamische Modellzuordnung für Pedestrian
            model_suffix = entity["model"][-4:] if len(entity["model"]) >= 4 else "0001"
            pedestrian_model = f"walker.pedestrian.{model_suffix}"
            pedestrian_blueprint = blueprint_library.find(pedestrian_model)

            pedestrian_transform = carla.Transform(spawn_location)
            pedestrian_actor = world.try_spawn_actor(pedestrian_blueprint, pedestrian_transform)

            if pedestrian_actor:
                print(f"Pedestrian '{entity['label']}' spawned at: {spawn_location}")
                spawned_entities.add(entity_id)  # Markiere die Entity als gespawned
            else:
                print(f"Failed to spawn Pedestrian '{entity['label']}' at: {spawn_location}")

        elif entity["type"] == "Vehicle":
            vehicle_blueprint = blueprint_library.find('vehicle.micro.microlino')
            vehicle_transform = carla.Transform(spawn_location)
            vehicle_actor = world.try_spawn_actor(vehicle_blueprint, vehicle_transform)

            if vehicle_actor:
                print(f"Vehicle '{entity['label']}' spawned at: {spawn_location}")
                spawned_entities.add(entity_id)  # Markiere die Entity als gespawned
            else:
                print(f"Failed to spawn Vehicle '{entity['label']}' at: {spawn_location}")

        # # Logge zugehörige Waypoints und Paths
        # if entity.get("followsPath"):
        #     entity_path = next((path for path in paths if path["path"] == entity["followsPath"]), None)
        #     if entity_path:
        #         print(f"Entity '{entity['label']}' follows Path: {entity_path['description']} (Color: {entity_path['color']})")
        #         for waypoint in entity_path["waypoints"]:
        #             print(f"  Waypoint: {waypoint['waypoint']} -> X: {waypoint['x']}, Y: {waypoint['y']}")

        # print(f"Entity '{entity['label']}' processed.\n")

def load_paths(paths):
    global carla_client, world, anchor_point
    cell_width = 4.0  # Einheitsgröße für die Breite der Zellen
    cell_height = 4.0  # Einheitsgröße für die Höhe der Zellen

    offset_x = -5.5  # Basierend auf der Grid-Verschiebung in X-Richtung
    offset_y = -3.0  # Basierend auf der Grid-Verschiebung in Y-Richtung

    # Initiale halbe Zellenverschiebung, um die Entitäten in der Mitte der Zellen zu platzieren
    half_cell_offset_y = -cell_width / 2
    half_cell_offset_x = 0

    print(f"Processing paths: {paths}")

    for path in paths:
        path_color_hex = path.get("color")  # Farbe des Pfads
        print(f"Processing path: {path['description']} with color: {path_color_hex}")
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

        # Zweiter Durchlauf: Zeichne Linien zwischen aufeinanderfolgenden Wegpunkten
        for i in range(len(waypoint_locations) - 1):
            start = waypoint_locations[i]
            end = waypoint_locations[i + 1]

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
    :param anchor_point: Der global definierte Ankerpunkt als carla.Transform
    :param camera_position: Die gewünschte Kameraposition ('up', 'down', 'left', 'right', 'birdseye')
    """
    spectator = world.get_spectator()  # Zugriff auf den CARLA Spectator (Kamera)

    # Die Position des Ankerpunkts abrufen
    base_transform = anchor_point  # anchor_point ist bereits carla.Transform, also direkt verwenden

    # Positionen definieren
    if camera_position == 'up':
        # Kamera nach oben verschieben
        new_location = carla.Location(base_transform.location.x, base_transform.location.y, base_transform.location.z + 10)

    elif camera_position == 'down':
        # Kamera nach unten verschieben
        new_location = carla.Location(base_transform.location.x, base_transform.location.y, base_transform.location.z - 10)

    elif camera_position == 'left':
        # Kamera nach links verschieben
        new_location = carla.Location(base_transform.location.x - 10, base_transform.location.y, base_transform.location.z)

    elif camera_position == 'right':
        # Kamera nach rechts verschieben
        new_location = carla.Location(base_transform.location.x + 10, base_transform.location.y, base_transform.location.z)

    elif camera_position == 'birdseye':
        # Vogelperspektive: Kamera von oben
        new_location = carla.Location(base_transform.location.x, base_transform.location.y, base_transform.location.z + 30)

    else:
        # Standard: Keine Verschiebung
        new_location = base_transform.location

    # Die neue Transformation für den Spectator
    spectator.set_transform(carla.Transform(new_location, base_transform.rotation))
    print(f"Camera set to {camera_position} position: {new_location}")

def unload_stuff():
    global world
    print("Unloading stuff...")
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

def walking(pedestrian_id):
    # walk to crosswalk, then to crosswalk 2 and then the bus stop
    pedestrian = world.get_actor(pedestrian_id)
    sprint_to(pedestrian, crosswalk2.location, speed=2.0)
    print("Walking to bus station 1")
    sprint_to(pedestrian, crosswalk.location, speed=2.0)
    print("Walking to bus station 2")
    sprint_to(pedestrian, bus_stop.location, speed=2.0)
    print("Walking to bus station 3")
    return

def distance_check(actor, target_location, threshold):
    actor_location = actor.get_location()
    distance = actor_location.distance(target_location)
    return distance < threshold

def get_nearest_road_id(actor):
    actor_location = actor.get_location()
    waypoint = world.get_map().get_waypoint(actor_location)
    road_id = waypoint.road_id

    return road_id

def is_pedestrian_on_road(pedestrian):
    pedestrian_location = pedestrian.get_location()
    waypoint = current_map.get_waypoint(pedestrian_location)

    return waypoint and waypoint.lane_type == carla.LaneType.Driving

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

def json_to_turtle(data):
    g = Graph()
    if 'type' in data and 'vehicle' in data['type']:
        vehicle = URIRef(f"http://carla.org/vehicle/{data['id']}")
        g.add((vehicle, RDF.type, VEHICLE.Vehicle))
        g.add((vehicle, VEHICLE.id, Literal(data['id'])))
        g.add((vehicle, VEHICLE.type, Literal(data['type'])))
        g.add((vehicle, VEHICLE.timestamp, Literal(data['timestamp'])))
    elif 'type' in data and 'pedestrian' in data['type']:
        pedestrian = URIRef(f"http://carla.org/pedestrian/{data['id']}")
        g.add((pedestrian, RDF.type, PEDESTRIAN.Pedestrian))
        g.add((pedestrian, PEDESTRIAN.id, Literal(data['id'])))
        g.add((pedestrian, PEDESTRIAN.type, Literal(data['type'])))
        g.add((pedestrian, PEDESTRIAN.timestamp, Literal(data['timestamp'])))

    location = URIRef(f"http://carla.org/location/{data['id']}")
    g.add((location, LOCATION.x, Literal(data['location']['x'])))
    g.add((location, LOCATION.y, Literal(data['location']['y'])))
    g.add((location, LOCATION.z, Literal(data['location']['z'])))

    if 'type' in data and 'vehicle' in data['type']:
        g.add((vehicle, VEHICLE.location, location))
    elif 'type' in data and 'pedestrian' in data['type']:
        g.add((pedestrian, PEDESTRIAN.location, location))

    return g

def reset_settings():
    world = client.get_world()
    settings = world.get_settings()
    settings.synchronous_mode = False
    settings.fixed_delta_seconds = None
    world.apply_settings(settings)

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

def aiController(pedestrian_id):
    all_id = []
    world = client.get_world()
    settings = world.get_settings()

    try:
        pedestrian = world.get_actor(pedestrian_id)
        if not pedestrian:
            raise ValueError("No pedestrian with the specified ID found.")

        if not settings.synchronous_mode:
            settings.synchronous_mode = True
            settings.fixed_delta_seconds = 0.05
            world.apply_settings(settings)

        print("Spawning AI controller for the pedestrian.")

        walker_controller_bp = blueprint_library.find('controller.ai.walker')
        controller = world.spawn_actor(walker_controller_bp, carla.Transform(), pedestrian)

        if not controller:
            raise ValueError("Couldn't spawn AI controller for the pedestrian.")

        all_id.append(controller.id)
        all_id.append(pedestrian.id)

        world.tick()

        controller.start()
        controller.go_to_location(world.get_random_location_from_navigation())
        controller.set_max_speed(1.0)

        for _ in range(1000):
            world.tick()
            time.sleep(0.0001)


    finally:
        reset_settings()
        time.sleep(0.5)

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

@app.route('/cross', methods=['POST'])
def cross():
    pedestrian, vehicle, async_request_uri = getInformation(request)
    if pedestrian and vehicle and async_request_uri:
        print("Crossing the street")
        action_thread = threading.Thread(target=walkToWaypoint, args=(pedestrian, waypoint2, async_request_uri))
        action_thread.start()
        print(f"Pedestrian location: {pedestrian.get_location()}")
    else:
        print("Not crossing the street")
    return Response('<http://carla.org> <http://cross> <http://street> .', mimetype='text/turtle', status=200)

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
    pedestrian, vehicle, async_request_uri = getInformation(request)
    if pedestrian and vehicle and async_request_uri:
        print("Reverting crossing")
        action_thread = threading.Thread(target=walkToWaypoint, args=(pedestrian, waypoint3, async_request_uri))
        action_thread.start()
    return Response('<http://carla.org> <http://revert> <http://action> .', mimetype='text/turtle', status=200)

@app.route('/restart', methods=['POST'])
def restart():
    return Response('<http://carla.org> <http://restart> <http://tree> .', mimetype='text/turtle', status=200)

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

'''
@app.route('/walk_to_bus_station', methods=['POST'])
def walk_to_bus_station():
    request_data = request.data.decode('utf-8')
    print(f"Received request data: {request_data}")

    # Parsen der RDF-Daten mit rdflib
    g = rdflib.Graph()
    g.parse(data=request_data, format='turtle')

    # Extrahieren der asynchronen Request URI
    query_uri = """
    PREFIX actn: <http://www.ajan.de/actn#>
    SELECT ?requestURI WHERE {
        ?action actn:asyncRequestURI ?requestURI .
    }
    """
    uri_result = g.query(query_uri)
    for row in uri_result:
        async_request_uri = row.requestURI
        print(f"Async Request URI: {async_request_uri}")

    # Extrahieren der Pedestrian ID
    query_id = """
    SELECT ?id WHERE {
        ?s <http://carla.org/pedestrian/id> ?id .
    }
    """
    id_result = g.query(query_id)
    pedestrian_id = None
    for row in id_result:
        pedestrian_id = int(row.pedestrianId)
        print(f"Pedestrian ID: {pedestrian_id}")

    if pedestrian_id is not None:
        print("Walking to bus station")
        pedestrian = world.get_actor(pedestrian_id)
        walk_to_waypoint(pedestrian, waypoint1, async_request_uri)

    # Antwort auf den asynchronen Request senden
    response = requests.post(async_request_uri, data='<http://carla.org> <http://walk> <http://toBus> .', headers={'Content-Type': 'text/turtle'})
    print(f"Response status: {response.status_code}")

    return Response('<http://carla.org> <http://walk> <http://toBus> .', mimetype='text/turtle', status=200)


@app.route('/run_to_bus_station', methods=['POST'])
def run_to_bus_station():
    try:
        pedestrian_data = request.get_data(as_text=True).split("\r\n")[1].split(" ")[2]
        pedestrian_id = int(pedestrian_data[1:-1])
        pedestrian = world.get_actor(pedestrian_id)
        print("Running to bus station")
        sprint_to(pedestrian, bus_stop, speed=5.0)
    finally:
        return Response('<http://carla.org> <http://run> <http://toBus> .', mimetype='text/turtle', status=200)

@app.route('/wants_bus', methods=['GET', 'POST'])
def wants_bus():
    print("Pedestrian wants bus")
    return Response('<http://carla.org> "wantsBus" "True" .', mimetype='text/turtle', status=200)

@app.route('/start_random_walk', methods=['POST'])
def start_random_walk():
    try:
        print("Starting random walk")

        pedestrian_data = request.get_data(as_text=True).split("\r\n")[1].split(" ")[2]
        pedestrian_id = int(pedestrian_data[1:-1])

        if not pedestrian_id:
            return Response('<http://carla.org> "hasResponse" "No Pedestrian ID" .', mimetype='text/turtle', status=400)

        aiController(pedestrian_id)
    finally:
        reset_settings()
        pedestrian = world.get_actor(pedestrian_id)
        pedestrian.apply_control(carla.WalkerControl(speed=0.0))
        return Response('<http://example.org> <http://has> <http://data.org> .', mimetype='text/turtle', status=200)

@app.route('/trigger_toBus', methods=['GET', 'POST'])
def trigger_toBus():
    if(request.method == 'POST'):
        data = request.data
        print(data)
        return Response('<http://example.org> <http://has> <http://data.org> .', mimetype='text/turtle', status=200)
    elif(request.method == 'GET'):
        # get the worlds pedestrian
        all_actors = world.get_actors()
        pedestrians = all_actors.filter('walker.pedestrian.*')
        vehicles = all_actors.filter('vehicle.*')
        pedestrian = pedestrians[0]
        vehicle = vehicles[0]
        while True:
            time.sleep(1)  # Warte 1 Sekunde
            sprint_to(pedestrian, vehicle.get_location(), speed=5.0)
            if pedestrian.get_location().distance(vehicle.get_location()) < 10:
                pedestrian.apply_control(carla.WalkerControl(speed=0.0))  # Sprinten mit 5.0 m/s
                vehicle.set_autopilot(False)
                break
        return jsonify({'status': 'Running!', 'vehicle_id': vehicle.id})
'''
@app.route('/idle_wait', methods=['POST'])
def idleWait():
    reset_settings()
    print("Idle Wait for 5 seconds")

    time.sleep(5)
    return Response('<http://example.org> <http://has> <http://data2.org> .', mimetype='text/turtle', status=200)

@app.route("/hi", methods=["GET"])
def hi():
    return "Hello, World!"

@app.route('/health_check', methods=['GET'])
def health_check():
    return jsonify({"status": "OK"}), 200

@app.route("/start_carla", methods=["GET"])
def start_carla():
    global carla_client, world
    try:
        print("Starting CARLA server...")
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

        # CARLA-Server starten
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
            print("Connected to CARLA server.")
            return jsonify({"status": "CARLA started and connected successfully."}), 200

        except Exception as e:
            print(f"Failed to connect to CARLA: {e}")
            return jsonify({"error": "CARLA started, but connection to server failed. Please check the server status."}), 500

    except Exception as e:
        print(f"An error occurred in start_carla: {e}")
        return jsonify({"error": "Internal server error occurred while starting CARLA.", "details": str(e)}), 500

@app.route('/load_scenario', methods=['POST'])
def load_scenario():
    try:
        # Empfange JSON-Daten vom Request
        data = request.get_json()
        print("JSON data received successfully", flush=True)
        print(data, flush=True)


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
        waypoints = scenario.get("waypoints", [])
        paths = scenario.get("paths", [])
        camera_position = scenario.get("cameraPosition")
        weather = scenario.get("weather")
        show_grid = scenario.get("showGrid", "false")


        # Lade die Welt basierend auf der Map und den Entitäten
        load_world(weather, scenario_map)

        set_anchor_point(scenario_map)

        unload_stuff()



        print("world loaded")
        # Lade die Waypoints und Pfade
        load_paths(paths)


        print("paths loaded")

        # Lade Entitäten
        load_entities(entities, waypoints, paths)

        print("entities loaded")
        # Lade die Kamera
        load_camera(camera_position)

        print("camera loaded")

        # # Initialisiere den AI-Controller für Fußgänger
        # for entity in entities:
        #     if entity["type"] == "Pedestrian":
        #         print("Starting AI controller for pedestrian with ID:", entity["entity"])
        #         generate_actor(entity["entity"])

        # Füge das Gitter hinzu, falls gewünscht
        if show_grid == "true":
            load_grid()

        return jsonify({"status": "success", "map": scenario_map, "entities": entities}), 200

    except Exception as e:
        print(f"Error in load_scenario: {str(e)}", flush=True)
        return jsonify({"error": str(e)}), 500

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

@app.route('/destroy_actors', methods=['GET'])
def destroy():
    for entity in entityList:
            if entity["type"] == "Pedestrian":
              print("Removing AI controller for pedestrian with ID: ", entity["entity"])
              destroy_actor(entity["entity"])

if __name__ == '__main__':
    app.run(host="127.0.0.1", port=5000)
