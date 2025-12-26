import carla
import random
import time

def turn_and_lean_pedestrian_head(pedestrian, pitch=0.0, yaw=0.0, roll=0.0, lean_distance=0.1):
    """
    Dreht den Kopf eines Fußgängers mit WalkerBoneControlIn und lehnt ihn nach vorne.

    :param pedestrian: Der Fußgänger-Actor (Walker).
    :param pitch: Drehung nach oben/unten (in Grad).
    :param yaw: Drehung nach links/rechts (in Grad).
    :param roll: Seitliche Neigung (in Grad, optional).
    :param lean_distance: Distanz, um den Kopf nach vorne zu lehnen (in Metern).
    """
    if not pedestrian or "walker" not in pedestrian.type_id:
        print("Der gegebene Actor ist kein Fußgänger.")
        return

    # Kopf-Knochen definieren
    head_bone = "crl_Head__C"  # Name des Kopfknochens laut Skeleton-Referenz

    # Transform für den Kopf erstellen
    head_transform = carla.Transform()
    head_transform.rotation = carla.Rotation(yaw=yaw, pitch=pitch, roll=roll)
    head_transform.location = carla.Location(x=0.0, y=-0.1, z=-lean_distance)  # Kopf nach vorne lehnen

    # WalkerBoneControlIn erstellen
    bone_control = carla.WalkerBoneControlIn([(head_bone, head_transform)])

    # Setze die Bone-Control auf den Fußgänger
    pedestrian.set_bones(bone_control)
    pedestrian.blend_pose(1.0)  # Setzt die Bones sofort sichtbar
    print(f"Kopf des Fußgängers wurde gedreht und nach vorne gelehnt: Yaw={yaw}, Pitch={pitch}, Roll={roll}, Lean={lean_distance}")


def main():
    # Verbindung mit dem CARLA-Server herstellen
    client = carla.Client('localhost', 2000)
    client.set_timeout(10.0)
    world = client.get_world()

    try:
        # Blueprint-Library laden
        blueprint_library = world.get_blueprint_library()

        # Spectator abrufen und dessen Position erhalten
        spectator = world.get_spectator()
        spectator_transform = spectator.get_transform()

        # Fußgänger-Blueprint auswählen
        walker_blueprint = random.choice(blueprint_library.filter("walker.pedestrian.*"))

        # Spawn-Position unter der Spectator-Kamera festlegen
        spawn_location = carla.Location(
            x=spectator_transform.location.x,
            y=spectator_transform.location.y,
            z=spectator_transform.location.z - 1.0  # Leicht unterhalb der Kamera
        )

        # Fußgänger spawnen
        walker_transform = carla.Transform(spawn_location)
        pedestrian = world.try_spawn_actor(walker_blueprint, walker_transform)

        if pedestrian:
            print(f"Fußgänger erfolgreich gespawnt: {pedestrian.id} an {spawn_location}")

            # Kopf des Fußgängers nach vorne lehnen und neigen
            time.sleep(5)  # Warten, damit der Fußgänger vollständig gespawnt ist
            turn_and_lean_pedestrian_head(pedestrian, pitch=45.0, lean_distance=0.1)

            # Halte das Skript aktiv, damit der Fußgänger sichtbar bleibt
            time.sleep(5)
        else:
            print("Konnte keinen Fußgänger spawnen.")

    finally:
        print("Beende das Skript.")

if __name__ == '__main__':
    main()
