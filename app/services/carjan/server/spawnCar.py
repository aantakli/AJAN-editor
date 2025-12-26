import carla
import time

def spawn_vehicle_under_spectator(world, speed=5):
    """
    Spawn a vehicle under the spectator camera and make it drive straight at the specified speed.

    :param world: CARLA world object
    :param speed: Desired speed of the vehicle in m/s
    """
    # Get spectator transform
    spectator = world.get_spectator()
    spectator_transform = spectator.get_transform()

    # Adjust spawn location slightly below the spectator camera
    spawn_location = carla.Transform(
        location=carla.Location(
            x=spectator_transform.location.x,
            y=spectator_transform.location.y,
            z=spectator_transform.location.z - 3
        ),
        rotation=spectator_transform.rotation
    )

    # Get the blueprint library and select a random vehicle blueprint
    blueprint_library = world.get_blueprint_library()
    vehicle_blueprint = blueprint_library.filter('vehicle.*')[0]

    # Spawn the vehicle
    vehicle = world.try_spawn_actor(vehicle_blueprint, spawn_location)
    if vehicle is None:
        print("Failed to spawn vehicle. Ensure the location is free.")
        return

    print(f"Vehicle {vehicle.id} spawned at {spawn_location.location}")

    # Set up a vehicle control to drive straight
    vehicle.set_autopilot(False)

    control = carla.VehicleControl()
    control.throttle = 0.5  # Adjust throttle to control acceleration
    control.steer = 0.0  # Steer straight

    # Function to maintain constant speed
    def maintain_speed():
        while True:
            current_velocity = vehicle.get_velocity()
            current_speed = (current_velocity.x**2 + current_velocity.y**2 + current_velocity.z**2)**0.5
            if current_speed < speed:
                control.throttle = min(control.throttle + 0.01, 1.0)  # Gradually increase throttle
            elif current_speed > speed:
                control.throttle = max(control.throttle - 0.01, 0.0)  # Gradually decrease throttle

            vehicle.apply_control(control)
            time.sleep(0.1)

    try:
        maintain_speed()
    except KeyboardInterrupt:
        print("Stopping vehicle.")
        vehicle.destroy()

# Example usage
if __name__ == "__main__":
    client = carla.Client('localhost', 2000)
    client.set_timeout(10.0)
    world = client.get_world()

    spawn_vehicle_under_spectator(world, speed=5)
