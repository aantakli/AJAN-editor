import time
import carla

class DecisionBoxManager:
    def __init__(self, world, box_corners):
        self.world = world
        self.box_corners = box_corners
        self.active_checking = False  # Indicates if periodic checking is active
        self.trigger_area = None  # Holds trigger box properties

    def is_in_trigger_box(self, location):
      """
      Check if a location is inside the trigger box.
      """
      center = self.trigger_area["center"]
      extent = self.trigger_area["extent"]

      in_x = abs(location.x - center.x) <= extent.x
      in_y = abs(location.y - center.y) <= extent.y

      return in_x and in_y


    def start_periodic_checking(self):
        """
        Start periodically checking if vehicles are in the trigger box.
        """
        print("Starting periodic check for vehicles in Decision Box.")
        self.active_checking = True

        while self.active_checking:
            actors = self.world.get_actors().filter("vehicle.*")
            vehicles_in_box = [
                actor for actor in actors
                if self.is_in_trigger_box(actor.get_location())
            ]

            if vehicles_in_box:
                print(f"Vehicles in Decision Box: {[actor.id for actor in vehicles_in_box]}")
            else:
                print("No vehicles in Decision Box. Stopping periodic check.")
                self.active_checking = False

            time.sleep(0.1)  # Adjust the frequency of checks

    def create_trigger_box(self):
        """
        Create a trigger box for the Decision Box.
        """
        x_min = min(corner.x for corner in self.box_corners)
        x_max = max(corner.x for corner in self.box_corners)
        y_min = min(corner.y for corner in self.box_corners)
        y_max = max(corner.y for corner in self.box_corners)
        z_min = self.box_corners[0].z
        z_max = z_min + 10

        # Calculate center and extents for the trigger box
        center_x = (x_min + x_max) / 2
        center_y = (y_min + y_max) / 2
        center_z = (z_min + z_max) / 2
        extent_x = (x_max - x_min) / 2
        extent_y = (y_max - y_min) / 2
        extent_z = (z_max - z_min) / 2

        self.trigger_area = {
            "center": carla.Location(x=center_x, y=center_y, z=center_z),
            "extent": carla.Vector3D(x=extent_x, y=extent_y, z=extent_z),
        }
        print(f"Trigger box created at center {self.trigger_area['center']} with extent {self.trigger_area['extent']}.")

    def check_trigger_box(self):
        """
        Periodically check if any actors are in the trigger box.
        """
        actors = self.world.get_actors().filter("vehicle.*")
        for actor in actors:
            actor_location = actor.get_location()
            if self.is_in_trigger_box(actor_location):
                return True
        return False

    def on_collision(self, event):
        """
        Simulate a trigger to start periodic checking.
        """
        print("Collision detected.")
        actor = event.other_actor
        print(f"Collision detected with vehicle {actor.id}.")
        if not self.active_checking:
            self.start_periodic_checking()

# Example usage
if __name__ == "__main__":
    client = carla.Client('localhost', 2000)
    client.set_timeout(10.0)
    world = client.get_world()

    # Define the corners of the Decision Box (example values)
    box_corners = [
        carla.Location(x=230, y=60, z=0.5),
        carla.Location(x=230, y=50, z=0.5),
        carla.Location(x=240, y=50, z=0.5),
        carla.Location(x=240, y=60, z=0.5)
    ]

    manager = DecisionBoxManager(world, box_corners)
    manager.create_trigger_box()

    # Start a periodic check manually for testing
    while True:
        manager.check_trigger_box()
        time.sleep(0.5)
