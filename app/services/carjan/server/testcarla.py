import carla
import time

def connect_to_carla():
    try:
        client = carla.Client("localhost", 2000)
        client.set_timeout(20.0)  # Timeout auf 20 Sekunden erhöhen

        world = client.get_world()
        print("CARLA connected successfully.")
        return True

    except Exception as e:
        print("Failed to connect to CARLA:", e)
        return False

if __name__ == "__main__":
    print("Attempting to connect to CARLA...")
    if connect_to_carla():
        print("Connection to CARLA was successful.")
    else:
        print("Unable to connect to CARLA. Please make sure CARLA is running.")
