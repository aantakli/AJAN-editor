import carla
import random

def spawn_object_below_spectator(client, blueprint_filter="static.prop.streetbarrier"):
    """
    Spawns an object directly below the current spectator camera in CARLA.
    :param client: CARLA client instance
    :param blueprint_filter: Blueprint ID for the object to spawn
    """
    try:
        # Connect to the CARLA world
        world = client.get_world()

        # Get the spectator (camera) transform
        spectator = world.get_spectator()
        camera_transform = spectator.get_transform()
        camera_location = camera_transform.location

        # Adjust the spawn location (slightly below the camera)
        spawn_location = carla.Location(
            x=camera_location.x,
            y=camera_location.y,
            z=camera_location.z - 2.0  # Spawn 2 meters below the camera
        )

        # Get a random blueprint from the filter
        blueprint_library = world.get_blueprint_library()
        blueprint = random.choice(blueprint_library.filter(blueprint_filter))

        # Spawn the object
        spawned_object = world.try_spawn_actor(blueprint, carla.Transform(spawn_location))

        if spawned_object:
            print(f"Spawned object '{blueprint.id}' at {spawn_location}")
            return spawned_object
        else:
            print("Failed to spawn the object. Ensure the location is free.")
            return None

    except Exception as e:
        print(f"Error in spawning object: {e}")
        return None


if __name__ == "__main__":
    # Connect to the CARLA server
    client = carla.Client("localhost", 2000)
    client.set_timeout(10.0)

    # Call the function to spawn the object
    spawned_actor = spawn_object_below_spectator(client, blueprint_filter="static.prop.streetbarrier")

    if spawned_actor:
        print("Object spawned successfully!")
    else:
        print("Object could not be spawned.")
