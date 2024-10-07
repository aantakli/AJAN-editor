from flask import Flask, Response, jsonify, request
import carla
import logging
import time
import numpy as np
import requests
import threading
from rdflib import Graph, URIRef, Literal, Namespace, RDF
import rdflib
import logging


app = Flask(__name__)
app_data = {}
turtle_data_store = Graph()
app.logger.setLevel(logging.INFO)
actor_list = []
client = carla.Client("localhost", 2000)
client.set_timeout(10.0)
world = client.get_world()
blueprint_library = world.get_blueprint_library()
current_map = world.get_map()

seen_actors = set()

global_async_uri = None


VEHICLE = Namespace("http://carla.org/vehicle/")
PEDESTRIAN = Namespace("http://carla.org/pedestrian/")
LOCATION = Namespace("http://carla.org/location/")
BASE = Namespace("http://carla.org/")

def getInformation(request):
    pedestrian_id = None
    vehicle_id = None
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
    PREFIX carla: <http://carla.org/>
    SELECT ?id WHERE {
        carla:Pedestrian carla:id ?id .
    }
    """
    id_result = g.query(query_id)
    for row in id_result:
        pedestrian_id = int(row.id)
        print(f"Pedestrian ID: {pedestrian_id}")

    # Extrahieren der Vehicle ID
    query_id2 = """
    PREFIX carla: <http://carla.org/>
    SELECT ?id WHERE {
        carla:Vehicle carla:id ?id .
    }
    """
    id_result2 = g.query(query_id2)
    for row in id_result2:
        vehicle_id = int(row.id)
        print(f"Vehicle ID: {vehicle_id}")

    pedestrian = world.get_actor(pedestrian_id)
    vehicle = world.get_actor(vehicle_id)

    return pedestrian, vehicle, async_request_uri

def set_spectator_view(world, location, rotation):
    spectator = world.get_spectator()
    transform = carla.Transform(location, rotation)
    spectator.set_transform(transform)
    print(f"Spectator set at position {location} with rotation {rotation}")


def load_grid(center_x=248, center_y=50, grid_size=10, cell_size=5):
    try:
        client = carla.Client("localhost", 2000)
        client.set_timeout(10.0)
        world = client.get_world()
        print(world)
        # Blaupause für die Linien
        debug = world.debug
        print(debug)
        # Farben
        grid_color = carla.Color(0, 255, 0)  # Grün

        # Das Zentrum des Rasters
        center_location = carla.Location(x=center_x, y=center_y, z=0.1)

        # Rastergröße und Zellenanzahl
        half_grid_size = grid_size // 2

        # Zeichne vertikale Linien
        for i in range(-half_grid_size, half_grid_size + 1):
            start_x = center_location.x + i * cell_size
            start_location = carla.Location(x=start_x, y=center_location.y - half_grid_size * cell_size, z=center_location.z)
            end_location = carla.Location(x=start_x, y=center_location.y + half_grid_size * cell_size, z=center_location.z)

            debug.draw_line(start_location, end_location, thickness=0.1, color=grid_color, life_time=0)

        # Zeichne horizontale Linien
        for i in range(-half_grid_size, half_grid_size + 1):
            start_y = center_location.y + i * cell_size
            start_location = carla.Location(x=center_location.x - half_grid_size * cell_size, y=start_y, z=center_location.z)
            end_location = carla.Location(x=center_location.x + half_grid_size * cell_size, y=start_y, z=center_location.z)

            debug.draw_line(start_location, end_location, thickness=0.1, color=grid_color, life_time=0)

        print("Grid drawn successfully at center (248, 50)")
        return {"status": "Grid drawn successfully"}

    except Exception as e:
        print(f"Error in load_grid: {str(e)}")
        return {"error": str(e)}



def load_world(entities):
    try:
        client = carla.Client("localhost", 2000)
        client.set_timeout(10.0)
        world = client.load_world('Town01_Opt')
        log_path = "C:/Users/leona/Documents/carla_simulation.log"
        print(f"Recording will be saved at: {log_path}")
        client.start_recorder(log_path)

        blueprint_library = world.get_blueprint_library()

        unload_stuff(client)

        # Filtern der Wegpunkte (z.B. nur Wegpunkte auf einer bestimmten Straße)
        waypoints = client.get_world().get_map().generate_waypoints(distance=1.0)
        filtered_waypoints = [waypoint for waypoint in waypoints if waypoint.road_id == 5]

        # Spawnpunkte abrufen
        spawn_transforms = world.get_map().get_spawn_points()

        # Scenario mit den Entities spawnen
        for entity in entities:
            if entity["type"] == "Pedestrian":
                spawn_point_pedestrian = spawn_transforms[6]
                spawn_point_pedestrian.location.x += float(entity["spawnPointX"])
                spawn_point_pedestrian.location.y -= float(entity["spawnPointY"])
                spawn_point_pedestrian.location.z += 10.0

                pedestrian_blueprint = blueprint_library.find('walker.pedestrian.0001')
                world.try_spawn_actor(pedestrian_blueprint, spawn_point_pedestrian)
                print(f"Pedestrian spawned at: {spawn_point_pedestrian.location}")

            elif entity["type"] == "Vehicle":
                spawn_point_vehicle = spawn_transforms[3]
                spawn_point_vehicle.location.x += float(entity["spawnPointX"])
                spawn_point_vehicle.location.y -= float(entity["spawnPointY"])
                spawn_point_vehicle.location.z += 10.0

                vehicle_blueprint = blueprint_library.find('vehicle.audi.a2')
                world.try_spawn_actor(vehicle_blueprint, spawn_point_vehicle)
                print(f"Vehicle spawned at: {spawn_point_vehicle.location}")

            elif entity["type"] == "AutonomousVehicle":
                spawn_point_autonomous = spawn_transforms[5]
                spawn_point_autonomous.location.x += float(entity["spawnPointX"])
                spawn_point_autonomous.location.y -= float(entity["spawnPointY"])
                spawn_point_autonomous.location.z += 10.0

                autonomous_blueprint = blueprint_library.find('vehicle.tesla.model3')
                world.try_spawn_actor(autonomous_blueprint, spawn_point_autonomous)
                print(f"Autonomous vehicle spawned at: {spawn_point_autonomous.location}")


        set_spectator_view(world, carla.Location(x=248, y=56.5, z=15), carla.Rotation(pitch=-30, yaw=-180, roll=0))
        return {"status": "Entities spawned successfully"}

    except Exception as e:
        print(f"Error in load_world: {str(e)}")
        return {"error": str(e)}

def unload_stuff(client):
    world = client.get_world()
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
        print(f"Unloaded map layer {layer}")

    def disable_specific_objects(client):
        world = client.get_world()

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
                print(f"Disabled {len(env_obj_ids)} objects of type {label}")
            except RuntimeError as e:
                print(f"Error disabling objects of type {label}: {e}")

    disable_specific_objects(client)

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
    pedestrian, vehicle, async_request_uri = getInformation(request)
    if pedestrian and vehicle and async_request_uri:
        print("Walking to waypoint")
        # Starten der Aktion in einem separaten Thread
        action_thread = threading.Thread(target=walkToWaypoint, args=(pedestrian, waypoint1, async_request_uri))
        action_thread.start()
    else:
        print("Not walking to waypoint")

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

@app.route('/load_scenario', methods=['GET'])
def load_scenario():
    rdf_url = "http://localhost:8090/rdf4j/repositories/carjan/statements"

    try:
        response = requests.get(rdf_url)
        if response.status_code == 200:
            rdf_data = response.text
        else:
            return jsonify({"error": "Failed to load scenario data"}), 500

        print("RDF data loaded successfully")
        print(rdf_data)

        g = Graph()
        g.parse(data=rdf_data)

        scenario = URIRef("http://example.com/carla-scenario#CurrentScenario")
        entities = []

        for s, p, o in g.triples((scenario, URIRef("http://example.com/carla-scenario#hasEntity"), None)):
            entity_type = None
            spawn_x = None
            spawn_y = None

            for _, _, entity_type_uri in g.triples((o, URIRef("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"), None)):
                entity_type = str(entity_type_uri).split("#")[-1]

            for _, _, x in g.triples((o, URIRef("http://example.com/carla-scenario#spawnPointX"), None)):
                spawn_x = str(x)
            for _, _, y in g.triples((o, URIRef("http://example.com/carla-scenario#spawnPointY"), None)):
                spawn_y = str(y)

            entities.append({
                "entity": str(o).split("#")[-1],
                "type": entity_type,
                "spawnPointX": spawn_x,
                "spawnPointY": spawn_y
            })

        load_world(entities)
        load_grid()
        return jsonify({"status": "success", "entities": entities}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host="127.0.0.1", port=5000)