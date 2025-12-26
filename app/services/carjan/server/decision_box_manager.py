import time
import carla

class DecisionBoxManager:
    def __init__(self, world, box_corners, dbox_id, callback):
        self.world = world
        self.box_corners = box_corners
        self.dbox_id = dbox_id
        self.callback = callback
        self.trigger_area = None  # Triggerbox wird hier definiert
        self.vehicles_in_box = set()  # Set zur Nachverfolgung der Fahrzeuge in der Box

    def is_in_trigger_box(self, location):
        """
        Prüft, ob eine Position innerhalb der Triggerbox liegt.
        """
        center = self.trigger_area["center"]
        extent = self.trigger_area["extent"]

        in_x = abs(location.x - center.x) <= extent.x
        in_y = abs(location.y - center.y) <= extent.y
        return in_x and in_y

    def create_trigger_box(self):
        """
        Erstellt die Triggerbox basierend auf den Box-Eckpunkten.
        """
        x_min = min(corner.x for corner in self.box_corners)
        x_max = max(corner.x for corner in self.box_corners)
        y_min = min(corner.y for corner in self.box_corners)
        y_max = max(corner.y for corner in self.box_corners)
        z_min = self.box_corners[0].z
        z_max = z_min + 10

        # Berechne Mittelpunkt und Extents
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
        print(f"Triggerbox erstellt: {self.trigger_area}")

    def check_trigger_box(self):
        """
        Überwacht Fahrzeuge in und außerhalb der Triggerbox.
        """
        actors = self.world.get_actors().filter("vehicle.*")
        current_vehicles_in_box = set()

        for actor in actors:
            actor_location = actor.get_location()
            if self.is_in_trigger_box(actor_location):
                current_vehicles_in_box.add(actor.id)

                # Fahrzeug ist in der Box, aber noch nicht markiert
                if actor.id not in self.vehicles_in_box:
                    print(f"Fahrzeug {actor.id} hat Decision Box {self.dbox_id} betreten.")
                    self.callback(self.dbox_id, [actor], in_box=True)

        # Fahrzeuge, die die Box verlassen haben
        vehicles_left_box = self.vehicles_in_box - current_vehicles_in_box
        for vehicle_id in vehicles_left_box:
            vehicle = self.world.get_actor(vehicle_id)
            if vehicle:
                print(f"Fahrzeug {vehicle_id} hat Decision Box {self.dbox_id} verlassen.")
                self.callback(self.dbox_id, [vehicle], in_box=False)

        # Aktualisiere den Status der Fahrzeuge in der Box
        self.vehicles_in_box = current_vehicles_in_box

class DecisionBoxMonitor:
    def __init__(self, world):
        self.world = world
        self.managers = []  # Liste aller DecisionBoxManager

    def add_manager(self, manager):
        """
        Fügt einen DecisionBoxManager zur Überwachung hinzu.
        """
        self.managers.append(manager)

    def start_monitoring(self):
        """
        Startet die zentrale Überwachung aller Decision Boxes.
        """
        print("Starte zentrale Überwachung aller Decision Boxes.")
        while True:
            for manager in self.managers:
                manager.check_trigger_box()  # Überprüft die Trigger-Bedingung
            time.sleep(0.5)  # Prüf-Frequenz

