import carla
import time

def spawn_pedestrian(world, blueprint_library, spawn_point):
    pedestrian_bp = blueprint_library.find('walker.pedestrian.0001')
    pedestrian = world.try_spawn_actor(pedestrian_bp, spawn_point)
    return pedestrian

def make_pedestrian_walk(pedestrian, duration=5, speed=1.5):
    direction = carla.Vector3D(1.0, 0.0, 0.0)  # Forward in X direction
    walker_control = carla.WalkerControl(direction=direction, speed=speed)
    pedestrian.apply_control(walker_control)
    time.sleep(duration)

def make_pedestrian_jump(pedestrian, jump_duration=0.05):
    direction = carla.Vector3D(1.0, 0.0, 0.2)  # Forward in X direction with a small upward component
    walker_control = carla.WalkerControl(direction=direction, jump=True)
    pedestrian.apply_control(walker_control)
    time.sleep(jump_duration)
    walker_control.jump = False  # End the jump
    pedestrian.apply_control(walker_control)

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

def stop_pedestrian(pedestrian):
    walker_control = carla.WalkerControl()
    pedestrian.apply_control(walker_control)

def stop_animation(pedestrian):
  # Stop the pedestrian animation using WalkerBoneControlIn
  if not pedestrian or "walker" not in pedestrian.type_id:
    print("Der gegebene Actor ist kein Fußgänger.")
    return

  # Create a WalkerBoneControlIn with no transformations to stop the animation
  bone_control = carla.WalkerBoneControlIn([])

  # Apply the bone control to the pedestrian
  pedestrian.set_bones(bone_control)
  pedestrian.blend_pose(1.0)  # Apply the bone control immediately
  print("Animation des Fußgängers wurde gestoppt.")

def main():
    client = carla.Client('localhost', 2000)
    client.set_timeout(10.0)
    world = client.get_world()
    blueprint_library = world.get_blueprint_library()

    # destroy all existing pedestrians
    for actor in world.get_actors().filter('walker.pedestrian.*'):
        actor.destroy()

    spectator = world.get_spectator()
    spawn_point = spectator.get_transform()  # Get the camera's transform for the spawn point

    pedestrian = spawn_pedestrian(world, blueprint_library, spawn_point)

    if pedestrian:
        print(f"Spawned pedestrian with ID: {pedestrian.id}")
        make_pedestrian_walk(pedestrian)
        make_pedestrian_jump(pedestrian)
        make_pedestrian_walk(pedestrian)
        stop_pedestrian(pedestrian)
        stop_animation(pedestrian)
        turn_and_lean_pedestrian_head(pedestrian, pitch=45.0, lean_distance=0.05)
        time.sleep(5)
        pedestrian.destroy()
    else:
        print("Failed to spawn pedestrian.")

if __name__ == '__main__':
    main()
