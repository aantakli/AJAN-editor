import glob
import os
import sys
import carla
import numpy as np
import time
import cv2
import datetime
from requestAJAN import destroy_actor, generate_actor, send_data, send_initialKnowledge

IM_WIDTH = 1280
IM_HEIGHT = 720


n = int(sys.argv[1])

# Pfad zum CARLA-Paket, anpassen falls notwendig
carla_path = '../../carla'
sys.path.append(carla_path)


try:
    sys.path.append(glob.glob('../../carla/dist/carla-*%d.%d-%s.egg' % (
        sys.version_info.major,
        sys.version_info.minor,
        'win-amd64' if os.name == 'nt' else 'linux-x86_64'))[0])
except IndexError:
    pass

def process_img(image):
    i = np.array(image.raw_data)
    i2 = i.reshape((IM_HEIGHT, IM_WIDTH, 4))
    i3 = i2[:, :, :3]  # Entfernen des Alpha-Kanals
    cv2.imshow("CARLA Camera", i3)
    cv2.waitKey(1)
    return i3 / 255.0

actor_list = []
seen_actors = set()

def set_spectator_view(world, location, rotation):
    spectator = world.get_spectator()
    transform = carla.Transform(location, rotation)
    spectator.set_transform(transform)
    print(f"Spectator set at position {location} with rotation {rotation}")


def sprint_to_bus(pedestrian, bus_location):
    # Berechne die Richtung zum Bus
    pedestrian_location = pedestrian.get_location()
    direction = carla.Vector3D(
        x=bus_location.x - pedestrian_location.x,
        y=bus_location.y - pedestrian_location.y,
        z=bus_location.z - pedestrian_location.z
    )
    # Normiere die Richtung
    length = np.sqrt(direction.x**2 + direction.y**2 + direction.z**2)
    direction.x /= length
    direction.y /= length
    direction.z /= length

    # Setze die Geschwindigkeit des Fußgängers
    pedestrian.apply_control(carla.WalkerControl(direction=direction, speed=5.0))  # Sprinten mit 5.0 m/s

def destroy(world):
    all_actors = world.get_actors()
    vehicles = all_actors.filter('vehicle.*')
    pedestrians = all_actors.filter('walker.pedestrian.*')
    
    print(f'Destroying {len(vehicles)} vehicles and {len(pedestrians)} pedestrians...')
    
    for vehicle in vehicles:
        vehicle.destroy()
        
    for pedestrian in pedestrians:
        pedestrian.destroy()
    
    print('All vehicles and pedestrians have been destroyed.')

def distance_check(actor, target_location, threshold):
    actor_location = actor.get_location()
    distance = actor_location.distance(target_location)
    return distance < threshold

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


def main():
    client = carla.Client("localhost", 2000)
    client.set_timeout(10.0)
    world = client.load_world('Town01_Opt')
    current_map = world.get_map()
    world.set_weather(carla.WeatherParameters.CloudySunset)

    # Entladen von Kartenobjekten
    unload_stuff(client)

    blueprint_library = world.get_blueprint_library()
    waypoints = client.get_world().get_map().generate_waypoints(distance=1.0)

    def draw_waypoints_road(waypoints, road_id=None, life_time=50.0):
        for waypoint in waypoints:
            if(waypoint.road_id == road_id):
                world.debug.draw_string(waypoint.transform.location, 'O', draw_shadow=False,
                                            color=carla.Color(r=0, g=255, b=0), life_time=life_time,
                                            persistent_lines=True)
                                        
    draw_waypoints_road(waypoints, road_id=5, life_time=20)

    filtered_waypoints = []
    for waypoint in waypoints:
        if(waypoint.road_id == 5):
            filtered_waypoints.append(waypoint)

    # spawn_transforms will be a list of carla.Transform objects
    spawn_transforms = current_map.get_spawn_points()
    waypoints = spawn_transforms[:3]

    spawn_point_pedestrian = spawn_transforms[6]
    spawn_point_vehicle = spawn_transforms[3]
    spawn_point_vehicle.location.x += 20
    spawn_point_vehicle.location.y -= 1
    spawn_point_vehicle.location.z += 10
    spawn_point_vehicle.rotation.yaw = 180
    spawn_point_vehicle = carla.Transform(spawn_point_vehicle.location, spawn_point_vehicle.rotation)


    spawn_point_pedestrian.location.x -= 0
    spawn_point_pedestrian.location.y -= 8
    spawn_point_pedestrian.location.z += 2
    spawn_point_pedestrian.rotation.yaw = 180

    print(spawn_point_pedestrian.location)
    bus_position = carla.Transform(carla.Location(x=220, y=62.5, z=2))
    set_spectator_view(world, carla.Location(x=248, y=56.5, z=15), carla.Rotation(pitch=-30, yaw=-180, roll=0))

    

    waypoint1 = carla.Location(x=220.374664, y=51.549622, z=1.792728)
    waypoint2 = carla.Location(x=210.185577, y=63.183430, z=1.438360)
    waypoint3 = carla.Location(x=217.374664, y=51.549622, z=1.792728)

    def draw_waypoint_ball(waypoint):
        world.debug.draw_string(waypoint, 'O', draw_shadow=False,
                                color=carla.Color(r=0, g=255, b=0), life_time=30, persistent_lines=True)

    for w in [waypoint1, waypoint2, waypoint3]:
        draw_waypoint_ball(w)
    generate_actor()
   

    try:
        # pedestrian:
        bp = blueprint_library.filter("0007")[0]

        # make the pedestrian
        pedestrian = world.spawn_actor(bp, spawn_point_pedestrian)
        actor_list.append(pedestrian)

        # Fahrzeug
        vehicle_bp = blueprint_library.find('vehicle.tesla.model3')
        vehicle = world.spawn_actor(vehicle_bp, spawn_point_vehicle)
        actor_list.append(vehicle)

        draw_waypoint_ball(waypoint1)
        send_initialKnowledge(pedestrian, vehicle)

        # Fahrzeug fahren lassen
        time.sleep(n)
        vehicle.set_autopilot(True)
        # Sensor für Hinderniserkennung (für den Fußgänger)
        obstacle_sensor_bp = blueprint_library.find('sensor.other.obstacle')
        obstacle_sensor_bp.set_attribute('distance', '60')
        obstacle_sensor_bp.set_attribute('hit_radius', '3')
        obstacle_sensor_bp.set_attribute('only_dynamics', 'True')
        sensor_transform = carla.Transform(carla.Location(x=0.7, z=2.5), carla.Rotation(yaw=90))
        obstacle_sensor = world.spawn_actor(obstacle_sensor_bp, sensor_transform, attach_to=pedestrian)
        actor_list.append(obstacle_sensor)

        def print_spectator_position():
            world = client.get_world()  # Erhalte die aktuelle Welt
            spectator = world.get_spectator()  # Erhalte den Zuschauer
            
            # Erhalte die Transform-Daten des Zuschauers
            transform = spectator.get_transform()
            print("---------------------Spectator Position:", transform.location)
            #print("Spectator Rotation:", transform.rotation)

        def obstacle_callback(event):
            if event.other_actor.id not in seen_actors:
                print(f"Found new actor: ID={event.other_actor.id}, Type={event.other_actor.type_id}")
                seen_actors.add(event.other_actor.id)
                timestamp = datetime.datetime.now().isoformat()
                # Daten des erkannten Hindernisses
                data = {
                    'id': event.other_actor.id,
                    'type': event.other_actor.type_id,
                    'timestamp': timestamp,
                    'location': {
                        'x': event.other_actor.get_location().x,
                        'y': event.other_actor.get_location().y,
                        'z': event.other_actor.get_location().z
                    }
                }
                if data['type'] == 'walker.pedestrian.0007':
                    send_data(data)

        obstacle_sensor.listen(obstacle_callback)
        input("Press Enter to stop the simulation...")
    finally:
        cv2.destroyAllWindows()
        for actor in actor_list:
            actor.destroy()
        print("========= All cleaned up!")
        destroy_actor()
        destroy(world)

if __name__ == '__main__':
    main()
